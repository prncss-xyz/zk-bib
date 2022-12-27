import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { xdgConfig } from "xdg-basedir";

const name = "zk-bib";

async function getConf() {
  let config;
  try {
    const raw = await fs.readFile(
      path.resolve(xdgConfig, name, "config.yaml"),
      "utf-8"
    );
    config = yaml.load(raw);
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
    config = {};
  }
  config.name = name;
  config.pluralFields = ["authors"];
  config.tags ??= [];
  return config;
}

const conf = await getConf();

export function sourceFile(id) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  const filePath = path.resolve(ZKDir, conf.noteDir, id);
  return filePath;
}

export default conf;
