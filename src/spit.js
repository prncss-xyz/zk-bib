import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import config from "./config.js";
import mkEpub from "./mk-epub.js";
import { readTree, getAdapter } from "./meta-reader.js";

export default async function spit(id, options) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  const filePath = path.resolve(ZKDir, config.noteDir, id);
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    // TODO: rethrow
    console.error(`file ${filePath} do not exist`);
    return 1;
  }
  const data = matter(raw).data;
  let dest = path.basename(data.asset);
  if (!data.asset) {
    console.error(`file ${filePath} do not have linked asset`);
    // mkEpub(hast, meta, dest);
  }
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
    console.log("creating " + dest);
    await mkEpub(tree, data, dest);
  } else {
    fs.copyFile(path.resolve(ZKDir, data.asset), dest);
  }
}
