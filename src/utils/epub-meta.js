import * as unzipper from "unzipper";
import * as fs from "node:fs";
import fromXml from "xast-util-from-xml";
import visit from "unist-util-visit";

function streamToString(filename) {
  let first = true;
  const chunks = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(unzipper.Parse())
      .on("entry", function (entry) {
        const filename_ = entry.path;
        if (first && filename_.endsWith(".opf")) {
          first = false;
          entry.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          entry.on("error", (err) => reject(err));
          entry.on("end", () =>
            resolve(Buffer.concat(chunks).toString("utf8"))
          );
        } else {
          entry.autodrain();
        }
      });
  });
}

const value = (node) => node.children.find((c) => c.value).value;

export async function EPUBreadMeta(filename) {
  let meta = { authors: [] };
  const raw = await streamToString(filename);
  const tree = fromXml(raw);
  visit(tree, (node) => {
    if (node.name === "metadata") {
      for (const child of node.children) {
        if (child.name === "dc:date") {
          meta.issued = value(child);
        } else if (child.name === "dc:title") {
          meta.title = value(child);
        } else if (child.name === "dc:language") {
          meta.language = value(child);
        } else if (child.name === "dc:publisher") {
          meta.publisher = value(child);
        } else if (child.name === "dc:creator") {
          meta.authors.push(value(child));
        } else if (child.name === "description") {
          meta.description = value(child);
        } else if (child.type === "element") {
          // console.log(child);
        }
      }
    }
  });
  return meta;
}
