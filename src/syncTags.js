import fs from "node:fs/promises";
import path from "node:path";
import config, { sourceFile } from "./utils/config.js";
import adjustMeta from "./utils/adjustMeta.js";

function removeFilter(value, remove) {
  for (const key of remove) {
    if (value === key) return false;
    if (value.startsWith(key + "/")) return false;
  }
  return true;
}

function normalize(elemsIn) {
  let elems = [...elemsIn];
  elems.sort();
  let lastElem;
  elems = elems.filter((elem) => {
    const res = lastElem !== elem;
    lastElem = elem;
    return res;
  });
  return elems;
}

function deepEq(l1, l2) {
  if (l1.length !== l2.length) return false;
  for (let i = 0; i < l1.length; ++i) if (l1[i] !== l2[i]) return false;
  return true;
}

function adjustTags(meta, newTags, remove) {
  let tags;
  if (meta.tags === undefined) tags = [];
  else if (!Array.isArray(meta.tags)) tags = [tags];
  else tags = [...meta.tags];
  tags = tags.filter((tag) => removeFilter(tag, remove));
  tags = tags.concat(newTags);
  tags = normalize(tags);
  if (deepEq(tags, normalize(meta.tags))) return;
  meta.tags = tags;
  return meta;
}

async function syncFile(dirent, newTags) {
  if (dirent.isFile()) {
    const name = dirent.name;
    const id = path.basename(name, path.extname(name)) + ".md";
    const absPath = sourceFile(id);
    await adjustMeta(absPath, (meta) =>
      adjustTags(meta, newTags, config.rmTags)
    );
  }
}

async function syncTag(dir, newTags) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return;
  }
  await Promise.all(entries.map((dirent) => syncFile(dirent, newTags)));
}

export default async function syncTags() {
  await Promise.all(
    Object.entries(config.importTags).map(([dir, newTags]) =>
      syncTag(path.resolve(process.env.HOME, config.exportDir, dir), newTags)
    )
  );
}
