import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import config from "./utils/config.js";

export default async function asset(id) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  const filePath = path.resolve(ZKDir, config.noteDir, id);
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.error(`file ${filePath} do not exist`);
    return 1;
  }
  const data = matter(raw).data;
  if (!data.asset) {
    console.error(`file ${filePath} do not have linked asset`);
  }
  console.log(data.asset);
}
