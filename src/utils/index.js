import { spawn } from "node:child_process";
import accents from "remove-accents";
import path from "node:path";

export function argsSub(args, arg) {
  const res = [...args];
  const index = args.indexOf("{}");
  if (index === -1) {
    res.push(arg);
  } else {
    res.splice(index, 1, arg);
  }
  return res;
}

function authorToString(author) {
  if (typeof author === "object") {
    return author.given ? author.family + ", " + author.given : author.family;
  }
  return author;
}

export function authorsToString(authors) {
  if (Array.isArray(authors)) {
    return authors.map(authorToString).join("; ");
  }
  return authors ?? "unknown";
}

export function processEXIFToolDate(str) {
  const words = str.split(" ");
  words[0] = words[0].replace(/:/g, "-");
  str = words.join(" ");
  return str;
}

export function sdrPath(filePath) {
  const ext = path.extname(filePath);
  return filePath.slice(0, -ext.length) + ".sdr";
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

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function removeTitleParts(title, opts) {
  opts = opts ?? {};
  let words = opts.words ?? [];
  words = words.concat(words.map(capitalizeFirstLetter));
  let prefixes = opts.prefixes ?? [];
  prefixes = prefixes.concat(prefixes.map(capitalizeFirstLetter));
  title = title
    .replaceAll(/\s+/g, " ")
    .split(" ")
    .filter((word) => !words.includes(word))
    .map((word) => {
      for (const pre of prefixes) {
        if (word.startsWith(pre)) {
          return word.slice(pre.length);
        }
      }
      return word;
    })
    .join(" ");
  const chars = opts.characters ?? "";
  for (let i = 0; i < chars.length; i++) {
    const char = chars.charAt(i);
    title = title.replaceAll(char, "");
  }
  if (opts.accents) {
    title = accents.remove(title);
  }
  return title;
}
