import { readFile, stat as _stat } from "node:fs/promises";
import mkEpubRaw from "./mk-epub-raw.js";
import fs from "node:fs/promises";
import path from "node:path";
import visit from "unist-util-visit";

import { parse } from "parse5";
import fromParse5 from "hast-util-from-parse5";

import config from "../utils/config.js";
import { getAdapter } from "./adapters.js";
import { toText } from "./helpers.js";
import { authorsToString } from "../utils/index.js";

const { pluralFields, tags: _tags } = config;

function register(res, priority, field, value) {
  if (!value) return;
  if (field === "authors" && (value.includes("@") || value.includes("://"))) {
    return;
  }
  res[field] ??= {};
  if (
    typeof res[field].priority === "number" &&
    res[field].priority > priority
  ) {
    return;
  }
  if (pluralFields.includes(field)) {
    res[field].priority = priority;
    res[field].value ??= [];
    res[field].value.push(value);
    return;
  }
  if (res[field].priority === priority) return;
  res[field].priority = priority;
  res[field].value = value;
}

const rules = {};
let rules_counter;
function registerRule(key, field) {
  key = key.toLowerCase();
  rules[key] = {
    priority: rules_counter++,
    field,
  };
}
function applyRules(reg, node) {
  let key = node.properties.name ?? node.properties.property;
  key = key?.toLowerCase();
  const content = node.properties.content;
  const rule = rules[key];
  if (!rule) return;
  register(reg, rule.priority, rule.field, content);
}

function ld_graph(obj) {
  if (obj["@graph"]) return obj["@graph"][0];
  return obj;
}

function merge(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    target[k] = v;
  }
}

function readMeta(tree) {
  const reg = {};
  visit(tree, (node) => {
    if (node.tagName === "h1") {
      register(reg, 0, "title", toText(node));
    } else if (node.tagName === "meta") {
      applyRules(reg, node);
    } else if (
      node.tagName === "link" &&
      node.properties?.rel === "canonical"
    ) {
      register(reg, 1, "URL", node.properties?.href);
    } else if (node.tagName === "base") {
      register(reg, 2, "URL", toText(node));
    } else if (node.tagName === "title") {
      register(reg, 3, "title", toText(node));
    } else if (
      node.tagName === "script" &&
      node.properties?.type === "application/ld+json"
    ) {
      const raw = toText(node);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {}
      if (parsed) {
        const graph = ld_graph(JSON.parse(toText(node)));
        register(reg, rules_counter, "URL", graph.url);
        register(reg, rules_counter, "authors", graph.author?.name);
        register(reg, rules_counter, "issued", graph.datePublished);
        register(reg, rules_counter, "modified", graph.dateModified);
      }
    }
  });

  const citation = {};
  for (const [field, { value }] of Object.entries(reg)) {
    citation[field] = value;
  }
  if (citation.URL) {
    let { hostname } = new URL(citation.URL);
    const ndx0 = hostname?.indexOf(".lib-ezproxy");
    if (ndx0 > -1) {
      hostname = citation.hostname.slice(0, ndx0);
      hostname = hostname.replace(/-/gu, ".");
      const URL = new URL(citation.URL);
      citation.URL = URL.toString();
    }
    if (hostname.startsWith("www.")) hostname = hostname.slice(4);
    if (!citation.language && hostname[3] === ".") {
      citation.language = hostname.slice(0, 2);
    }
  }
  citation.language ??= "en";
  const adapter = getAdapter(citation.URL);
  merge(citation, adapter.meta);
  if (citation.title && adapter.titleSplit) {
    const ndx = citation.title.lastIndexOf(citation.titleSplit);
    if (ndx !== -1) {
      citation.title = citation.title.slice(1, ndx).trim();
    }
  }
  citation.issued = citation.issued ?? citation.modified;
  return {
    citation,
    thumbPath: adapter?.thumbPath,
    includes: adapter?.includes,
    excludes: adapter?.excludes,
  };
}

rules_counter = 4;
registerRule("article:published_time", "issued");
registerRule("article:author", "authors");
registerRule("citation_year", "issued");
registerRule("citation_publication_date", "issued");
registerRule("citation_title", "title");
registerRule("citation_author", "authors");
registerRule("twitter:data1", "authors");
registerRule("twitter:creator", "authors");
registerRule("author", "authors");
registerRule("authors", "authors");
registerRule("dc:language", "language");
registerRule("dc:publisher", "publisher");
registerRule("dc:creator", "authors");
registerRule("dc:description", "description");
registerRule("dc:date", "issued");
registerRule("dc.date.created", "issued");
registerRule("dcterms.issued", "issued");
registerRule("dcterms.modified", "modified");
registerRule("dc.date.modified", "modified");
registerRule("og:title", "title");
registerRule("og:url", "URL");
registerRule("og:type", "type");
registerRule("og:author", "authors");
for (const field of [
  "title",
  "firstpage",
  "lastpage",
  "doi",
  "journal_title",
  "journal_abbrev",
]) {
  registerRule("og:" + field, field);
  registerRule("citation_" + field, field);
}

export async function parseTree(raw) {
  const ast = parse(raw);
  const tree = fromParse5(ast);
  return tree;
}

export async function getMeta(filename) {
  let stat;
  try {
    stat = await _stat(filename);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    console.error(`File ${filename} not found.`);
    return null;
  }
  const raw = await readFile(filename, "utf-8");
  const tree = parseTree(raw);
  const meta = readMeta(tree);

  meta.issued ??= stat.mtime.toISOString();
  for (const field of ["issued", "modified", "archived"]) {
    if (typeof meta[field] == "string") {
      meta[field] = new Date(meta[field]);
    }
  }
  return { meta, tree };
}

export async function mkEpub(data, destDir) {
  const ZKDir = process.env.ZK_NOTEBOOK_DIR;
  let dest = path.basename(data.asset);
  const ext = path.extname(data.asset);
  if (ext === ".html" || ext === ".ext") {
    dest = path.basename(dest, ext) + ".epub";
    let authors;
    if (data.citation.authors) {
      authors = data.citation.authors
        .map(({ family, given }) => (given ? family + ", " + given : family))
        .join("; ");
    } else {
      authors = "unknown";
    }
    let meta = {
      ...data.citation,
      authors: authorsToString(data.citation.authors),
    };
    const source = path.resolve(ZKDir, data.asset);
    const raw = await readFile(source, "utf-8");
    const tree = parseTree(raw);
    const adapter = getAdapter(data.citation.URL);
    meta.includes = adapter.includes;
    meta.excludes = adapter.excludes;
    meta.thumbPath = adapter.thumbPath;
    // TODO: have includes and excludes as independant parameters
    dest = path.resolve(destDir, dest);
    console.log("creating " + dest);
    await mkEpubRaw(tree, meta, dest);
  } else {
    dest = path.resolve(destDir, dest);
    console.log("creating " + dest);
    fs.copyFile(path.resolve(ZKDir, data.asset), dest);
  }
}
