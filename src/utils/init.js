import { spawn } from "node:child_process";
import mkEpub from "./mk-epub.js";
import { readTree, getAdapter } from "./meta-reader.js";
import path from "node:path";
import fs from "node:fs/promises";

export function processEXIFToolDate(str) {
  const words = str.split(" ");
  words[0] = words[0].replace(/:/g, "-");
  str = words.join(" ");
  return str;
}

export function sdrPath(filePath) {
  const ext = path.extname(filePath);
  return filePath.slice(0, -ext.length) + '.sdr';
}

export function zk(args) {
  let stdout = "";
  let stderr = "";
  return new Promise((resolve, reject) => {
    const ls = spawn("zk", args);

    ls.stdout.on("data", (data) => {
      stdout += data;
    });

    ls.stderr.on("data", (data) => {
      stderr += data;
    });

    ls.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject({
          code: "ERR_ZK",
          no: code,
          message: stderr,
        });
      }
    });
  });
}

export async function mk(data, destDir) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  let dest = path.basename(data.asset);
  const ext = path.extname(data.asset);
  if (ext === ".html" || ext === ".ext") {
    dest = path.basename(dest, ext) + ".epub";
    let authors;
    if (data.citation.authors) {
      authors = data.citation.authors
        .map(({ family, given }) => (given ? family + ", " + given : family))
        .join("; ");
    } else {
      authors = "unknown";
    }
    let meta = {
      ...data.citation,
      authors,
    };
    const source = path.resolve(ZKDir, data.asset);
    const tree = await readTree(source);
    //TODO: can we get adapter only with url?
    const adapter = getAdapter(meta, tree);
    meta.includes = adapter.includes;
    meta.excludes = adapter.excludes;
    // TODO: have includes and excludes as independant parameters
    dest = path.resolve(destDir, dest);
    console.log("creating " + dest);
    await mkEpub(tree, data, dest);
  } else {
    dest = path.resolve(destDir, dest);
    console.log("creating " + dest);
    fs.copyFile(path.resolve(ZKDir, data.asset), dest);
  }
}
