import { createWriteStream, createReadStream } from "fs";
import { extname, resolve as _resolve } from "path";
import fromXML from "xast-util-from-xml";
import { select, selectAll } from "hast-util-select";
import toText from "hast-util-to-text";
import toXast from "hast-util-to-xast";
import headingRank from "hast-util-heading-rank";
import visit from "unist-util-visit";

import toXml from "xast-util-to-xml";
import u from "unist-builder";
import x from "xastscript";
import h from "hastscript";

import archiver from "archiver";

const allowedXhtmlAttributes = [
  "content",
  "alt",
  "id",
  "title",
  "src",
  "href",
  "about",
  "accesskey",
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-controls",
  "aria-describedat",
  "aria-describedby",
  "aria-disabled",
  "aria-dropeffect",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",
  "classname",
  "content",
  "contenteditable",
  "contextmenu",
  "datatype",
  "dir",
  "draggable",
  "dropzone",
  "hidden",
  "hreflang",
  "id",
  "inlist",
  "itemid",
  "itemref",
  "itemscope",
  "itemtype",
  "lang",
  "media",
  "ns1:type",
  "ns2:alphabet",
  "ns2:ph",
  "onabort",
  "onblur",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "oncontextmenu",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onmousedown",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onmousewheel",
  "onpause",
  "onplay",
  "onplaying",
  "onprogress",
  "onratechange",
  "onreadystatechange",
  "onreset",
  "onscroll",
  "onseeked",
  "onseeking",
  "onselect",
  "onshow",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "onvolumechange",
  "onwaiting",
  "prefix",
  "property",
  "rel",
  "resource",
  "rev",
  "role",
  "spellcheck",
  "tabindex",
  "target",
  "title",
  "type",
  "typeof",
  "vocab",
  "xml:base",
  "xml:lang",
  "xml:space",
  "colspan",
  "rowspan",
  "epub:type",
  "epub:prefix",
];
const allowedXhtmlTags = [
  "figure",
  "figcaption",
  "svg",
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "address",
  "hr",
  "pre",
  "blockquote",
  "center",
  "ins",
  "del",
  "a",
  "span",
  "bdo",
  "br",
  "em",
  "strong",
  "dfn",
  "code",
  "samp",
  "kbd",
  "bar",
  "cite",
  "abbr",
  "acronym",
  "q",
  "sub",
  "sup",
  "tt",
  "i",
  "b",
  "big",
  "small",
  "u",
  "s",
  "strike",
  "basefont",
  "font",
  "object",
  "param",
  "img",
  "table",
  "caption",
  "colgroup",
  "col",
  "thead",
  "tfoot",
  "tbody",
  "tr",
  "th",
  "td",
  "embed",
  "applet",
  "iframe",
  "img",
  "map",
  "ns:svg",
  "object",
  "table",
  "tt",
  "var",
];

const removedXhtmlTags = ["style", "script", "noscript", "math"];

function uuid() {
  let res = "";
  for (let ndx = 0; ndx < 32; ndx++) {
    res += String.fromCharCode(0x61 + Math.random() * 26);
  }
  return res;
}
// cleanup could convert from html to xhtml
// tagName => name
// attributes => properties
// { type: 'text', value: 'Table of contents' }

function cleanup(treeIn, coverNode, excludes) {
  const images = [];
  let coverSrc;
  const treeOut = [];
  const toc = [];
  let svg = false;

  cleanup0(treeIn, treeOut);

  return {
    coverSrc,
    images,
    svg,
    toc,
    tree: treeOut,
  };

  function cleanup0(nodesIn, nodesOut) {
    if (!nodesIn) return;
    for (const node of nodesIn) {
      if (excludes.has(node)) {
        continue;
      }
      if (node.type === "element") {
        const tagName = node.tagName.toLowerCase();
        const properties = {};
        if (node.properties) {
          for (const [key, value] of Object.entries(node.properties)) {
            properties[key.toLowerCase()] = value;
          }
        }
        if (removedXhtmlTags.includes(tagName)) continue;
        if (tagName === "svg") {
          svg = true;
          properties.xmlns = "http://www.w3.org/2000/svg";
          nodesOut.push(h(tagName, properties));
          continue;
        }
        if (tagName === "img") {
          if (!node.properties) {
            continue;
          }
          if (!properties.src) continue;
          let name;
          if (properties.src.startsWith("data:image/")) {
            let buffer;
            const p0 = properties.src.indexOf("/");
            const p1 = properties.src.indexOf(";");
            const p2 = properties.src.indexOf(",");
            let format = properties.src.slice(p0 + 1, p1);
            if (format === "svg+xml") format = "svg";
            const encoding = properties.src.slice(p1 + 1, p2);
            const encoded = properties.src.slice(p2 + 1);
            if (encoded.length < 64) {
              continue;
            }
            if (encoding === "data:image/svg+xml") {
              const nodeOut = fromXML(encoded).children[0];
              nodeOut.attributes.style = node.properties.style;
              svg = true;
              visit(nodeOut, (node) => {
                if (node.name) node.tagName = node.name;
                if (node.attributes) node.properties = node.attributes;
              });
              nodesOut.push(nodeOut);
              continue;
            }
            buffer = Buffer.from(encoded, encoding);
            name = `images/${images.length}.${format}`;
            images.push({
              name,
              buffer,
              format,
            });
          } else {
            const format = extname(properties.src).slice(1);
            if (!format) continue;
            const file = decodeURI(properties.src);
            name = `images/${images.length}.${format}`;
            images.push({
              name,
              file,
              format,
            });
          }
          // TODO download from source url
          if (node === coverNode) coverSrc = name;
          nodesOut.push(
            h(tagName, {
              src: name,
              alt: properties.alt || "image placeholder",
            })
          );
          continue;
        }
        if (allowedXhtmlTags.includes(tagName)) {
          const children = [];
          cleanup0(node.children, children);
          const propertiesOut = {};
          for (const [key, value] of Object.entries(properties)) {
            if (allowedXhtmlAttributes.includes(key)) {
              propertiesOut[key] = value;
            }
          }
          const rank = headingRank(node);
          if (rank) propertiesOut.id ||= uuid();
          const nodeOut = h(tagName, propertiesOut, children);
          if (rank) {
            toc.push({
              rank: Math.max(rank, 2),
              text: toText(nodeOut),
              id: propertiesOut.id,
            });
          }
          nodesOut.push(nodeOut);
          continue;
        }
        // otherwise, children of unspecified element are inserted in place, skipping the tag
        cleanup0(node.children, nodesOut);
        continue;
      }
      // preserve text node
      if (node.type === "text") {
        nodesOut.push(u("text", node.value));
      }
    }
  }
}

function tocToList(hs) {
  if (hs.length === 0) return null;
  const out = [];
  let sub = [];
  const rank = hs[0].rank;
  let hOld, h;
  for (let i = 0; i <= hs.length; i++) {
    h = hs[i];
    // let hRank = h.rank;
    if (i < hs.length && h.rank > rank) {
      if (sub.length === 0) out.push();
      sub.push(h);
      continue;
    }
    if (hOld) {
      out.push(
        x(
          "li",
          {},
          x("a", { href: "index.xhtml#" + hOld.id }, u("text", {}, hOld.text)),
          tocToList(sub)
        )
      );
      sub = [];
    }
    hOld = h;
  }
  return x("ol", {}, out);
}

async function mkEpub(hast, meta, outFile) {
  const coverNode = meta.thumbPath && select(meta.thumbPath, hast);

  const excludes = new Set();
  for (const query of meta.excludes || []) {
    for (const node of selectAll(query, hast)) {
      excludes.add(node);
    }
  }

  const contents = [];
  for (const query of meta.includes || ['body']) {
    for (const node of selectAll(query, hast)) {
      contents.push(h("div", {}, node));
    }
  }

  const imgElems = selectAll("img", contents) || [];
  await Promise.all(
    imgElems.map(async (node) => {
      const raw = node.properties?.src;
      if (raw.startsWith("data:")) return;
      if (!raw) return;
      const file = decodeURI(raw);
      if (file) {
        try {
          await fsp.stat(_resolve(dir, file));
        } catch (e) {
          if (e.code === "ENOENT") {
            console.error(`File "${file}" is missing.`);
            excludes.add(node);
            return;
          } else {
            throw e;
          }
        }
      }
    })
  );

  let { images, coverSrc, tree, toc, svg } = cleanup(
    contents,
    coverNode,
    excludes
  );
  const body = {
    type: "element",
    tagName: "body",
    children: tree,
  };

  if (!coverSrc) {
    for (const { name, buffer } of images) {
      if (!buffer || buffer.length > 2048) {
        coverSrc = name;
        break;
      }
    }
  }

  const index = u("root", [
    u("instruction", { name: "xml" }, 'version="1.0" encoding="utf-8"'),
    u("doctype", { name: "html" }),
    x(
      "html",
      { xmlns: "http://www.w3.org/1999/xhtml" },
      x("head", {}),
      x("body", {}, toXast(body).children)
    ),
  ]);

  const container = u("root", [
    u("instruction", { name: "xml" }, 'version="1.0" encoding="utf-8"'),
    u("text", "\n"),
    x(
      "container",
      {
        version: "1.0",
        xmlns: "urn:oasis:names:tc:opendocument:xmlns:container",
      },
      x(
        "rootfiles",
        {},
        x("rootfile", {
          "full-path": "OEBPS/content.opf",
          "media-type": "application/oebps-package+xml",
        })
      )
    ),
  ]);

  const nav = u("root", [
    u("instruction", { name: "xml" }, 'version="1.0" encoding="utf-8"'),
    u("doctype", { name: "html" }),
    x(
      "html",
      { xmlns: "http://www.w3.org/1999/xhtml" },
      x("head", {}),
      x(
        "body",
        {},
        x(
          "nav",
          {
            "epub:type": "toc",
            id: "toc",
            "xmlns:epub": "http://www.idpf.org/2007/ops",
          },
          [
            x("h1", {}, u("text", "Table of contents")),
            tocToList(toc),
          ]
        )
      )
    ),
  ]);

  // required: dc:identifier, dc:title, dc:language
  // https://www.w3.org/publishing/epub3/epub-packages.html#sec-metadata-elem
  const id = meta.url || uuid();
  const modified = new Date().toJSON().slice(0, 19) + "Z";
  const opf = u("root", [
    u("instruction", { name: "xml" }, 'version="1.0" encoding="utf-8"'),
    u("text", "\n"),
    x(
      "package",
      {
        "unique-identifier": "id",
        version: "3.0",
        xmlns: "http://www.idpf.org/2007/opf",
      },
      x("metadata", { "xmlns:dc": "http://purl.org/dc/elements/1.1/" }, [
        x("meta", { property: "dcterms:modified" }, modified),
        x("dc:identifier", { id: "id" }, id),
        x("dc:title", {}, meta.title),
        x("dc:language", {}, meta.language || "en"),
        meta.authors && x("dc:creator", {}, meta.authors),
        meta.date && x("dc:date", {}, JSON.stringify(meta.date)),
      ]),
      x("manifest", [
        x("item", {
          href: "index.xhtml",
          id: "index",
          "media-type": "application/xhtml+xml",
          properties: svg ? "svg" : null,
        }),
        x("item", {
          href: "nav.xhtml",
          id: "nav",
          "media-type": "application/xhtml+xml",
          properties: "nav",
        }),
        ...images.map(({ name, format }, index) =>
          x("item", {
            href: name,
            id: `img-${index}`,
            "media-type": `image/${format}`,
            properties: name === coverSrc ? "cover-image" : null,
          })
        ),
      ]),
      x("spine", [x("itemref", { idref: "index" })])
    ),
  ]);

  const outStream = createWriteStream(outFile);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const done = new Promise((resolve) => {
    outStream.on("close", resolve);
    archive.pipe(outStream);
    archive.append("application/epub+zip", { store: true, name: "mimetype" });
    archive.append(toXml(container), { name: "META-INF/container.xml" });
    for (const image of images) {
      if (image.buffer) {
        archive.append(image.buffer, { name: "OEBPS/" + image.name });
        continue;
      }
      if (image.file) {
        const stream = createReadStream(_resolve(dir, image.file));
        archive.append(stream, { name: "OEBPS/" + image.name });
        continue;
      }
      throw "Unexpected!";
    }
    archive.append(toXml(opf), { name: "OEBPS/content.opf" });
    archive.append(toXml(nav), { name: "OEBPS/nav.xhtml" });
    archive.append(toXml(index), { name: "OEBPS/index.xhtml" });
    archive.finalize();
  });
  await done;
}

export default mkEpub;
