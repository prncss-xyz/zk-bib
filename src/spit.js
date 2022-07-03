import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import config from "./config.js";
import { mk } from "./utils.js";

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
  if (!data.asset) {
    console.error(`file ${filePath} do not have linked asset`);
  }
  await mk(data, ".");
}
