import { attribute, pipe, toText } from "./meta-reader/helpers.js";

// TODO: use thumbPath
// TODO: separate files for specific adapters

const ld_graph = (obj) => {
  if (obj["@graph"]) return obj["@graph"][0];
  return obj;
};

const IEPAuthors = (tree) => {
  const ret = [];
  let inp = false;
  for (const children of tree.children) {
    if (children.tagName === "h3") {
      if (
        children.children &&
        children.children[0].value === "Author Information"
      ) {
        inp = true;
      }
      continue;
    }
    if (inp) {
      if (children.tagName === "p") {
        ret.push(children.children[0].value);
      }
    }
  }
  return ret;
};

const histoireEngageeAuthors = (tree) => {
  if (tree.properties.href.match(/collaborat/)) return toText(tree);
};

export const site = {
  queries: [
    {
      field: "_ld_json",
      query: "script[type='application/ld+json']",
      value: pipe(toText, JSON.parse, ld_graph),
    },
    { field: "url", meta: "og:url" },
    { field: "url", query: 'link[rel="canonical"]', value: attribute("href") },
    { field: "url", head: "base", value: attribute("href") },
    {
      field: "url",
      meta: "savepage-url",
    },
    { field: "url", constant: ({ _ld_json }) => _ld_json?.url },
  ],
  post: (res) => {
    const ndx0 = res.hostname?.indexOf(".lib-ezproxy");
    if (ndx0 > -1) {
      let hostname = res.hostname.slice(0, ndx0);
      hostname = hostname.replace(/-/gu, ".");
      const url = new URL(res.url);
      res.hostname = hostname;
      url.hostname = hostname;
      res.url = url.toString();
    }
  },
};

export const specifics = [
  {
    pattern: "mrmoneymustache.com",
    queries: [
      { field: "authors", constant: ["Mr. Money Mustache"] },
      { field: "type", constant: "blog" },
    ],
    includes: ["#site_title", ".post_box"],
    excludes: [".num_comments_link"],
  },
  {
    pattern: "contretemps.eu",
    queries: [
      { field: "type", constant: "magazine" },
      { field: "authors", query: "[rel=author]", value: toText },
      { field: "issued", query: ".published", value: attribute("title") },
    ],
    post: (res) => {
      res.title = res.title.split("–")[0].trim();
    },
  },
  {
    pattern: "freecodecamp.org",
    queries: [
      {
        field: "authors",
        head: 'meta[name="twitter:data1"]',
      },
      { field: "type", constant: "blog" },
    ],
  },
  {
    pattern: "iep.utm.edu",
    queries: [
      { field: "type", constant: "article" },
      { field: "authors", query: ".entry-content", value: IEPAuthors },
      { field: "publisher", constant: "Internet Encyclopedia of Phylosophy" },
      // res.title = toText(select('h1', entryContent));
    ],
    post: (res) => {
      res.title = res.title.split("|")[0].trim();
    },
    includes: ["#site-header", ".entry-content"],
    thumbPath: "img.headimage",
  },
  {
    pattern: "histoireengagee.ca",
    queries: [
      {
        field: "authors",
        query: 'a[rel="category tag"]',
        value: histoireEngageeAuthors,
      },
      { field: "type", constant: "magazine" },
      {
        field: "language",
        constant: "fr",
      },
    ],
    includes: [".header", ".post-inner"],
    excludes: [".sharedaddy", ".jp-relatedposts"],
  },
  {
    pattern: "plato.stanford.edu",
    queries: [{ field: "type", constant: "article" }],
    thumbPath: 'img[alt="SEP logo"]', // TODO:
  },
  {
    pattern: "mega-vrac.com",
    queries: [
      { field: "author", constant: ["Mega-Vrac"] },
      { field: "type", constant: "data" },
      {
        field: "data.amount",
        query: "#SingleOptionSelector-0",
        value: (node) => {
          const child = node.children.find((n) => n.tagName === "option");
          const str = toText(child);
          let [, value, unit] = str.match(/(\d+)(.*)/);
          value = Number(value);
          if (unit == "gr") unit = "g";
          return { value, unit };
        },
      },
      {
        field: "data.items",
        query: ".price__regular .price-item",
        value: (node) => {
          let value = Number(toText(node).slice(1));
          return [
            {
              name: "price",
              value,
              unit: "$",
            },
          ];
        },
      },
    ],
  },
  {
    pattern: "signosemio.com",
    queries: [
      { field: "publisher", constant: "Signo" },
      { field: "language", constant: "fr" },
      { field: "type", constant: "blog" },
      {
        field: "language",
        constant: "fr",
      },
    ],
    thumbPath: "#theoriciansIcon img",
    includes: ["#content"],
    excludes: ["#contentRight", ".droitsAuteur", ".right"],
  },
  {
    pattern: "cairn.info",
    queries: [
      {
        field: "language",
        constant: "fr",
      },
      { field: "type", constant: "article" },
    ],
    thumbPath: "img.img-thumbnail",
    includes: ["img.img-thumbnail", ".media-body li>*", ".corps"],
    excludes: [".no-para", ".amorce", ".sf-hidden"],
  },
  {
    pattern: "radio-canada.ca",
    queries: [
      { field: "type", constant: "news article" },
      {
        field: "language",
        constant: "fr",
      },
    ],
    includes: [
      ".e-breadcrumb-link svg ~ span",
      ".document-simple-header-container",
      ".main-multimedia-item",
      "article main",
    ],
    excludes: [
      "nav",
      ".newsstory-share-social-layout-wrapper",
      ".hidden-tag",
      ".signature-container-footer",
    ],
  },
  {
    pattern: "wikipedia.org",
    queries: [
      { field: "authors", constant: ["Wikipedia"] },
      { field: "type", constant: "wiki" },
      { field: "publisher", constant: "Wikipedia" },
      { field: "language", constant: ({ hostname }) => hostname.slice(0, 2) },
    ],
    post: (res) => {
      res.title = res.title.match(/(.*) - Wikipedia$/)?.[1];
    },
    includes: ["#content"],
    excludes: [".mw-editsection", ".navbox", ".sf-hidden", ".mw-jump-link"],
  },
  // res.language = res.hostname.slice(0, 2);
  {
    pattern: "psychologytoday.com",
    queries: [{ field: "type", constant: "magazine article" }],
  },
  {
    pattern: "academic.oup.com",
    // pattern: "cambridge.org",
    queries: [
      // { field: "publisher", constant: "Cambridge University Press" },
      { field: "type", constant: "article" },
      {
        field: "publisher",
        constant: [".core-reader .content", "#maincontent"],
      },
      {
        field: "publisher",
        constant: [".resolver-links", ".core-reader-footer"],
      },
    ],
  },
  {
    pattern: "fdc.nal.usda.gov",
    test: {
      query: "span.usda-page-title--main",
      value: (node) => toText(node) == "FoodData Central",
    },
    queries: [
      {
        query: "div.sk_banner",
        field: "url",
        value: (node) => toText(node).slice("Copied: ".length),
      },
      {
        field: "authors",
        constant: ["USDA"],
      },
      {
        field: "type",
        constant: "data",
      },
      {
        field: "title",
        query: "#foodDetailsDescription",
        value: toText,
      },
      {
        field: "data.portion",
        query: "#nutrient-per-selection-Survey-or-branded",
        value: (node) => {
          const raw = toText(node);
          let [value, unit] = raw.split(" ");
          value = Number(value);
          return { value, unit };
        },
      },
      {
        field: "data.items",
        query: "tr.ng-star-inserted",
        plural: true,
        value: (node) => {
          let name, value, unit;
          for (child of node.children || []) {
            if (child.tagName == "td") {
              if (child.properties.colSpan) {
                continue;
              }
              if (child.properties.headers?.includes("food-nutrient-name")) {
                name = toText(child);
              }
              if (child.properties.headers?.includes("food-nutrient-value")) {
                value = Number(toText(child));
              }
              if (child.properties.headers?.includes("food-nutrient-unit")) {
                unit = toText(child);
              }
              if (unit && value && name) {
                return { name, value, unit };
              }
            }
          }
        },
      },
    ],
  },
];

export const generic = {
  queries: [
    {
      field: "authors",
      constant: ({ _ld_json }) => {
        const author = _ld_json?.author?.name;
        if (author) return [author];
      },
    },
    { field: "issued", constant: ({ _ld_json }) => _ld_json?.datePublished },
    { field: "modified", constant: ({ _ld_json }) => _ld_json?.dateModified },
    {
      field: "archived",
      meta: "savepage-date",
    },
    {
      field: "issued",
      meta: "DCTERMS.modified",
    },
    {
      field: "issued",
      meta: "DCTERMS.issued",
    },
    {
      field: "issued",
      meta: "dc.date.modified",
    },
    {
      field: "issued",
      meta: "dc.date.created",
    },
    {
      field: "issued",
      meta: "citation_publication_date",
    },
    {
      field: "issued",
      meta: "citation_date",
    },
    {
      field: "issued",
      meta: "article:published_time",
    },
    {
      field: "issued",
      query: 'time[itemprop="dateCreated"]',
      value: attribute("datetime"),
    },
    {
      field: "title",
      meta: "citation_title",
    },
    {
      field: "title",
      meta: "DC.title",
    },
    {
      field: "title",
      meta: "og:title",
    },
    {
      field: "title",
      meta: "twitter:title",
    },
    { field: "title", head: "title" },
    { field: "title", query: "h1" },
    {
      field: "authors",
      meta: "citation_author",
      value: (x) => [x],
    },
    {
      field: "authors",
      meta: "article:author",
      value: (x) => !x.includes("://") && [x],
    },
    {
      field: "authors",
      meta: "DC.creator",
      value: (x) => [x],
    },
    {
      field: "authors",
      meta: "author",
      value: (x) => [x],
    },
    {
      field: "authors",
      meta: "twitter:creator",
      value: (x) => [x],
    },
    {
      field: "authors",
      meta: "twitter:data1",
      value: (x) => [x],
    },
    {
      field: "language",
      meta: "dc.language",
    },
    {
      field: "issued",
      meta: "dcterms.issued",
    },
    {
      field: "modified",
      meta: "dcterms.modified",
    },
    {
      field: "publisher",
      meta: "dc.publisher",
    },
    {
      field: "language",
      constant: "en",
    },
    {
      field: "issued",
      meta: "citation_year",
    },
    {
      field: "site-name",
      meta: "og:site_name",
    },
    {
      field: "type",
      meta: "og:type",
    },
    {
      field: "title",
      meta: "og:title",
    },
  ],
  post: (res, tree) => {},
};

// for (const field of ['author', 'title', 'firstpage', 'lastpage', 'doi', 'journal_title', 'journal_abbrev', '']) {
//   generic.queries.insert({
//     field,
//     meta: 'og:' + field,
//   })
//   generic.queries.insert({
//     field,
//     meta: 'citation_' + field,
//   })
// }

export default {
  generic,
  site,
  specifics,
};
