import { spawn } from "node:child_process";
import path from "node:path";

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

export function remove(title, opts) {
  opts = opts || {};
  let words = opts.words || [];
  words = words.concat(words.map(capitalizeFirstLetter));
  let prefixes = opts.prefixes || [];
  prefixes = prefixes.concat(prefixes.map(capitalizeFirstLetter));
  return title
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
}
