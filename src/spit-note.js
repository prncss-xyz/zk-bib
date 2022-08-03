import { spawn } from "node:child_process";
import path, { extname } from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import { getAdapter } from "./meta-reader/adapters.js";
import { argsSub, authorsToString } from "./utils/index.js";
import mkEpubRaw from "./meta-reader/mk-epub-raw.js";
import { parseTree } from "./meta-reader/index.js";
import conf from "./utils/config.js";

function cmd(name, args, target) {
  let stdout = "";
  let stderr = "";
  args = argsSub(args, target);
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(name, args);
    } catch (err) {
      // FIX: handle spawn errors
      console.error(err);
      return;
    }

    child.stdout.on("data", (data) => {
      stdout += data;
    });

    child.stderr.on("data", (data) => {
      stderr += data;
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject({
          code: "ERR_CMD",
          no: code,
          message: stderr,
          command: name,
        });
      }
    });
  });
}

export default async function spitNote(relPath, options) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  const filePath = path.resolve(ZKDir, relPath);
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.error(`file "${filePath}" do not exist`);
    return 1;
  }
  const data = matter(raw).data;
  data.authors = authorsToString(data.authors ?? data.author);
  const adapter = getAdapter("zk");
  data.includes = adapter.includes;
  data.excludes = adapter.excludes;
  data.thumbPath = adapter.thumbPath;
  const outfile = path.basename(relPath, extname(relPath)) + ".epub";
  const toHTML = conf.toHTML;
  const name = toHTML?.name;
  const args = toHTML?.args ?? [];
  if (!name) {
    console.error(`"toHTML.name" is not defined`);
    process.exit(1);
  }
  const content = await cmd(name, args, relPath);
  const hast = await parseTree(content);
  console.log(`creating file "${outfile}"`);
  await mkEpubRaw(hast, data, outfile);
}
