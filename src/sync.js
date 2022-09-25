import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import config from "./utils/config.js";
import { zk, sdrPath } from "./utils/index.js";
import { mkEpub } from "./meta-reader/index.js";

export default async function sync(options) {
  const plan = {};
  const promFrom = Object.entries(config.export).map(async ([_, dir]) => {
    dir = path.resolve(process.env.HOME, dir);
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      const stat = await fs.stat(path.join(dir, entry));
      if (stat.isFile()) {
        plan[entry] ??= {};
        plan[entry].from = path.join(dir, entry);
      }
    }
  });
  const promTo = Object.entries(config.export).map(async ([tag, dir]) => {
    {
      const res = await zk([
        "list",
        "--tag",
        tag,
        "--format",
        "{{abs-path}}",
        config.noteDir,
      ]);
      const filePaths = res.split("\n");
      for (const filePath of filePaths) {
        if (filePath === "") continue;
        try {
          const raw = await fs.readFile(filePath, "utf-8");
          const data = matter(raw).data;
          let dest = data.asset;
          if (!data.asset) {
            console.error(`note '${filePath}' does not have an asset.`);
            continue;
          }
          const ext = path.extname(dest);
          if (ext === ".html" || ext === ".ext") {
            dest = path.basename(dest, ext) + ".epub";
          } else dest = path.basename(dest);
          plan[dest] ??= {};
          plan[dest].to_ = path.resolve(process.env.HOME, dir);
          plan[dest].data = data;
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
          console.error(`file '${filePath}' not available`);
        }
      }
    }
  });
  await Promise.all(promFrom);
  await Promise.all(promTo);

  const promDo = Object.entries(plan).map(
    async ([filename, { from, to_, data }]) => {
      {
        if (from && to_) {
          if (from !== path.join(to_, filename)) {
            if (options.dryRun)
              console.log("mv", from, path.join(to_, filename));
            else {
              await fs.rename(from, path.join(to_, filename));
              try {
                await fs.rename(
                  sdrPath(from),
                  sdrPath(path.join(to_, filename))
                );
              } catch (err) {
                if (err.code !== "ENOENT") throw err;
              }
            }
          }
        } else if (from) {
          if (options.dryRun) console.log("rm", from);
          else {
            await fs.rm(from);
            try {
              await fs.rm(sdrPath(from));
            } catch (err) {
              if (err.code !== "ENOENT") throw err;
            }
          }
        } else if (to_) {
          if (options.dryRun) console.log("mk", path.join(to_, filename));
          else {
            try {
              await mkEpub(data, to_);
            } catch (err) {
              console.error(`Error while creating ${filename}.`);
              console.error(err);
            }
          }
        } else {
          assert(false);
        }
      }
    }
  );
  await Promise.all(promDo);
}
