import fs from "node:fs/promises";
import matter from "gray-matter";
import yaml from "js-yaml";

export default async function adjustMeta(absPath, cb) {
  let rawIn;
  try {
    rawIn = await fs.readFile(absPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`file ${absPath} does not exist`);
      return;
    } else throw error;
  }
  let { content, data } = matter(rawIn);
  data = await cb(data);
  if (!data) return;
  let rawOut = "---\n";
  rawOut += yaml.dump(data);
  rawOut += "---\n";
  rawOut += content;
  await fs.writeFile(absPath, rawOut);
}
