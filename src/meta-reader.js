import { readFile, stat as _stat } from "node:fs/promises";

import { select, selectAll } from "hast-util-select";
import { parse } from "parse5";
import fromParse5 from "hast-util-from-parse5";

import config from "./config.js";
import { attribute, toText } from "./helpers.js";
import { specifics, generic, site } from "./adapters.js";

const { pluralFields, tags: _tags } = config;
const testDomain = (hostname, domain) => hostname?.endsWith(domain);

const defaultValue = (tree) => {
  let res;
  res = attribute("content")(tree);
  if (res) return res;
  res = attribute("content")(tree);
  if (res) return res;
  res = toText(tree);
  if (res) return res;
};

// key must be lowercase
const findMeta = (meta, value, head) => {
  meta = meta.toLowerCase();
  for (const element of head?.children) {
    if (!element.properties) continue;
    if (element.tagName?.toLowerCase === "meta") continue;
    let key0 = element.properties.name || element.properties.property || "";
    key0 = key0.toLowerCase();
    if (key0 === meta) {
      let res = element.properties.content;
      if (value) res = value(res);
      return res;
    }
  }
};

function find(query, value, tree) {
  let res;
  res = select(query, tree);
  if (res) return value(res);
}

function findAll(query, value, tree) {
  let res = selectAll(query, tree);
  if (!res) return;
  let ret = [];
  for (const e of res) {
    const val = value(e);
    if (val) {
      ret = ret.concat(val);
    }
  }
  if (ret.length > 0) {
    return ret;
  }
}

function getPath(table, strPath) {
  const keys = strPath.split(".");
  const last = keys.pop();
  for (let key of keys) {
    table[key] ??= {};
    table = table[key];
  }
  return table[last];
}

function adjust(table, strPath, value) {
  const keys = strPath.split(".");
  const last = keys.pop();
  for (let key of keys) {
    table[key] ??= {};
    table = table[key];
  }
  table[last] = value;
}

function queries(res, queries, tree, headTree) {
  if (!queries) return;
  for (let {
    field,
    query,
    head,
    meta,
    value,
    constant,
    hostname,
    plural,
  } of queries) {
    const val = getPath(res, field);
    if (val) continue;
    if (hostname) {
      if (!testDomain(res.hostname, hostname)) continue;
    }
    if (constant) {
      if (typeof constant === "function") adjust(res, field, constant(res));
      else adjust(res, field, constant);
      if (val && pluralFields.includes(field) && typeof val != "object") {
        console.warn(`Field ${field} expects an array, got ${val}`);
      }
      continue;
    }
    if (meta) {
      adjust(res, field, findMeta(meta, value, headTree));
      continue;
    }
    let q, t;
    if (query) {
      q = query;
      t = tree;
    }
    if (head) {
      q = head;
      t = headTree;
    }
    if (q) {
      value = value ?? defaultValue;
      if (plural || pluralFields.includes(field)) {
        const r = findAll(q, value, t);
        if (r || r === 0) {
          adjust(res, field, r);
        }
      } else {
        const r = find(q, value, t);
        if (r || r === 0) {
          adjust(res, field, r);
        }
      }
    }
  }
}

function getAdapter_(hostname, tree) {
  let specific;
  if (hostname) {
    for (const q of specifics) {
      if (q.pattern && hostname.endsWith(q.pattern)) {
        specific = q;
        break;
      }
    }
  }
  if (!specific) {
    for (const q of specifics) {
      const t = q.test;
      if (t) {
        const value = t.value || (() => true);
        if (find(t.query, value, tree)) {
          specific = q;
          break;
        }
      }
    }
  }
  const res = { ...generic };
  if (!specific) return res;
  for (const [k, v] of Object.entries(specific)) {
    res[k] = v;
  }
  res.queries = res.queries || [];
  res.queries = res.queries.concat(generic.queries);
  return res;
}

function getAdapter(res, tree) {
  if (res.url) {
    const { hostname } = new URL(res.url);
    res.hostname = hostname;
  }
  site?.post(res);
  // hostname might be modified by post()
  return getAdapter_(res.hostname, tree);
}

function readMeta(tree) {
  const head = select("head", tree);
  const res = {};

  queries(res, site.queries, tree, head);
  const adapter = getAdapter(res, tree);

  queries(res, adapter.queries, tree, head);
  adapter?.post?.(res, tree);
  generic.post?.(res, tree);
  for (const { pattern, tags } of _tags) {
    if (res.hostname?.endsWith(pattern)) {
      res.tags = tags;
      break;
    }
  }
  return res;
}

const postTitles = ["phd", "jr", "sr"];
function lastName(name) {
  let strs = name.split(",");
  if (strs.length === 2) {
    return strs[0];
  }
  strs = name.split(" ");
  for (let i = strs.length - 1; i >= 0; --i) {
    let w = strs[i];
    w = w.toLowerCase();
    w = w.replace(/\./g, "");
    if (!postTitles.includes(w)) {
      return strs[i];
    }
  }
}

async function readTree(filename) {
  const raw = await readFile(filename, "utf-8");
  const ast = parse(raw);
  const tree = fromParse5(ast);
  return tree;
}

export const getMeta = async (filename) => {
  let stat;
  try {
    stat = await _stat(filename);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    console.error(`File ${filename} not found.`);
    return null;
  }
  const tree = await readTree(filename);
  const meta = readMeta(tree);

  meta.issued ??= stat.mtime.toISOString();
  for (const field of ["issued", "modified", "archived"]) {
    if (typeof meta[field] == "string") {
      meta[field] = new Date(meta[field]);
    }
  }
  return { meta, tree };
};

export default { getMeta, readTree, getAdapter };
