import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import config from "./config.js";
import { zk, mk, sdrPath } from "./utils.js";

export default async function export_(options) {
  const plan = {};
  for (let [_, dir] of Object.entries(config.export)) {
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
  }
  for (let [tag, dir] of Object.entries(config.export)) {
    const res = await zk([
      "list",
      "--tag",
      tag,
      "--format",
      "{{abs-path}}",
      config.noteDir,
    ]);
    for (const filePath of res.split("\n")) {
      if (filePath === "") continue;
      const raw = await fs.readFile(filePath, "utf-8");
      const data = matter(raw).data;
      let dest = data.asset;
      const ext = path.extname(dest);
      if (ext === ".html" || ext === ".ext") {
        dest = path.basename(dest, ext) + ".epub";
      } else dest = path.basename(dest);
      plan[dest] ??= {};
      plan[dest].to_ = path.resolve(process.env.HOME, dir);
      plan[dest].data = data;
    }
  }
  for (const [filename, { from, to_, data }] of Object.entries(plan)) {
    if (from && to_) {
      if (from !== path.join(to_, filename)) {
        if (options.dryRun) console.log("mv", from, path.join(to_, filename));
        else {
          await fs.rename(from, path.join(to_, filename));
          try {
            await fs.rename(sdrPath(from), sdrPath(path.join(to_, filename)));
          } catch (e) {
            // TODO: rethrow
          }
        }
      }
    } else if (from) {
      if (options.dryRun) console.log("rm", from);
      else await fs.rm(from);
    } else if (to_) {
      if (options.dryRun) console.log("mk", path.join(to_, filename));
      else await mk(data, to_);
    } else {
      assert(false);
    }
  }
}
