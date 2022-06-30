import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import readline from "node:readline";
import yaml from "js-yaml";
import { parseFullName } from "parse-full-name";

import { customAlphabet } from "nanoid";

import { processEXIFToolDate } from "./utils.js";
import config from "./config.js";
import { getMeta } from "./meta-reader.js";

const idLength = 5;
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", idLength);

function createId(citation) {
  let res = "";
  if (citation.authors) {
    res = citation.authors[0].family.split(" ")[0].toLowerCase();
  } else res = "unknown";
  if (citation.issued instanceof Date) res += citation.issued.getFullYear();
  if (typeof citation.issued === "string") res += citation.issued.slice(0, 4);
  res += nanoid();
  return res;
}

function createNoteHeader(citation) {
  let res = "#";
  if (citation.authors) {
    res += " " + citation.authors[0].family.split(" ")[0];
  }
  if (citation.issued instanceof Date)
    res += " " + citation.issued.getFullYear();
  if (typeof citation.issued === "string")
    res += " " + citation.issued.slice(0, 4);
  if (citation.title) res += " - " + citation.title;
  res += "\n";
  return res;
}

function open(filename) {
  let stderr = "";
  const proc = spawn("xdg-open", [filename]);

  proc.stderr.on("data", (data) => {
    stderr += data;
  });

  proc.on("close", (code) => {
    if (code !== 0) {
      throw {
        code: "ERR_EXIF",
        no: code,
        message: stderr,
      };
    }
  });

  proc.unref();
}

function getMetaExiftool(filename) {
  let stdout = "";
  let stderr = "";
  return new Promise((resolve, reject) => {
    const proc = spawn("exiftool", ["-json", filename]);

    proc.stdout.on("data", (data) => {
      stdout += data;
    });

    proc.stderr.on("data", (data) => {
      stderr += data;
    });

    proc.on("close", (code) => {
      if (code === 0) {
        const json = JSON.parse(stdout);
        resolve(json[0]);
      } else {
        reject({
          code: "ERR_EXIF",
          no: code,
          message: stderr,
        });
      }
    });
  });
}

function confirm(question, answer, ask) {
  answer ??= "";
  if (ask)
    return new Promise((resolve) => {
      const rl = readline.createInterface(process.stdin, process.stdout);
      rl.question(question + "> ", function (answer_) {
        rl.close();
        resolve(answer_);
      });
      rl.write(answer);
    });
  console.log(question + "> ", answer);
  return answer;
}

function join(as) {
  let res = "";
  for (const a of as) {
    if (a) {
      if (res !== "") res += " ";
    }
    res += a;
  }
  if (res != "") return res;
}

function processAuthor(author) {
  if (!author) return;
  if (author.indexOf(",") !== -1) {
    const parts = author.split(",");
    const family = parts[0].trim();
    let given = parts[1]?.trim();
    if (given === "") given = undefined;
    return {
      family,
      given,
    };
  }
  const parsed = parseFullName(author);
  if (parsed.error.length === 0) {
    return {
      family: join([parsed.last, parsed.nick, parsed.suffix]),
      given: join([parsed.title, parsed.first, parsed.middle]),
    };
  }
  console.error(parsed.error);
  return { family: author };
}

export default async function eat(filename, options) {
  // TODO: check if needed config is here
  let stat;
  try {
    stat = await fs.stat(filename);
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
    console.error(`File ${filename} do not exist.`);
    process.exit(1);
  }
  if (options.open) {
    open(filename);
  }

  const ext = path.extname(filename);
  let citation = {};
  // trying to have te citation object close of what is defined at:
  // https://docs.citationstyles.org/en/stable/specification.html
  let authors = [];
  let subdir;
  if (ext === ".html" || ext === ".htm") {
    const res = await getMeta(filename);
    const meta = res.meta;
    if (options.dryRun) {
      console.log(meta);
    }
    citation.URL = meta.url;
    citation.title = meta.title;
    citation.language = meta.lang;
    citation.issued = meta.issued;
    authors = meta.authors;
    subdir = meta.hostname;
  } else {
    const meta = await getMetaExiftool(filename);
    if (options.dryRun) {
      console.log(meta);
    }
    let author;
    author ??= meta["Author_sort"];
    author ??= meta["Author"];
    author ??= meta["Creator"];
    citation.title ??= meta["Title"];
    citation.title ??= meta["Title_sort"];
    citation.issued = processEXIFToolDate(meta["CreateDate"]);
    citation.pages = meta["PageCount"];
    citation.language = meta["Language"];
    citation.publisher = meta["Publisher"];
    authors = [author];
    subdir = ext.slice(1);
  }
  citation.issued ??= stat.ctime;
  let tags = [];
  tags = tags.concat(config.baseTags || [], options.tags || []);
  tags.sort();
  citation.title ??= path.basename(filename, ext);
  if (ext === ".epub") citation.type ??= "book";
  const ask = !(options.yes || options.dryRun);
  authors ??= [];
  authors[0] = await confirm("author", authors?.[0] || "unknown", ask);
  citation.authors = authors?.map(processAuthor);
  let issued;
  if (citation.issued instanceof Date) issued = citation.issued?.toISOString();
  else issued = citation.issued;
  citation.issued = await confirm("issued", issued, ask);
  citation.title = await confirm("title", citation.title, ask);
  if (citation.title && !citation["title-short"]) {
    for (const sep of [" - ", " – ", ": ", " — "]) {
      if (citation.title.indexOf(sep) !== -1) {
        citation["title-short"] = citation.title.split(sep)[0];
      }
    }
  }
  let titlePart;
  if (citation["title-short"]) {
    titlePart = citation["title-short"];
  } else if (citation.title) {
    titlePart = citation.title;
  }
  titlePart = await confirm("title part", titlePart, ask);
  if (titlePart !== "") titlePart = " " + titlePart;
  const id = createId(citation);
  citation.id = id;
  subdir = await confirm("subdir", subdir, ask);
  const destAssetDir = path.resolve(config.assetDir, subdir);
  const destAsset = path.join(destAssetDir, id + titlePart + ext);
  console.log("moving ", destAsset);
  const destNote = path.resolve(config.noteDir, id + titlePart + ".md");
  console.log("creating ", destNote);

  if (!options.dryRun) {
    let rawOut = "---\n";
    rawOut += yaml.dump({ tags, citation });
    rawOut += "---\n";
    rawOut += "\n";
    rawOut += createNoteHeader(citation);
    rawOut += "\n";

    await fs.mkdir(path.dirname(destAsset), { recursive: true });
    await fs.rename(filename, destAsset);
    await fs.writeFile(destNote, rawOut);
    if (options.edit) {
      const editor = process.env.VISUAL || process.env.EDITOR;
      if (editor) {
        spawn(editor, [destNote]);
      }
    }

    // TODO: epub
    // TODO: sync
    // TODO: readme
  }
}