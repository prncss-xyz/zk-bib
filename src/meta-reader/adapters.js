function IEPAuthors(tree) {
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
}

const override = [
  {
    pattern: "mrmoneymustache.com",
    meta: {
      authors: ["Mr. Money Mustache"],
      type: "blog",
    },
    includes: ["#site_title", ".post_box"],
    excludes: [".num_comments_link"],
  },
  {
    pattern: "contretemps.eu",
    meta: {
      type: "magazine",
    },
    splitTitle: "–",
    post: (res, tree) => {
      visit(tree, (node) => {
        if (node.properties?.rel === "author") {
          res.author = toText(node);
        } else if (node.properties?.className?.includes("published")) {
          res = node.properties.title;
        }
      });
    },
  },
  {
    pattern: "freecodecamp.org",
    meta: {
      type: "blog",
    },
  },
  {
    pattern: "iep.utm.edu",
    meta: {
      type: "article",
      publisher: "Internet Encyclopedia of Phylosophy",
    },
    post: (res, tree) => {
      visit(tree, (node) => {
        if (node.properties?.className?.includes("entry-content")) {
          res.authors = IEPAuthors(node);
        }
      });
    },
    titleSplit: "|",
    includes: ["#site-header", ".entry-content"],
    thumbPath: "img.headimage",
  },
  {
    pattern: "histoireengagee.ca",
    meta: {
      type: "magazine",
      language: "fr",
    },
    post: (res, tree) => {
      const authors = [];
      visit(tree, (node) => {
        if (node.tagName === "a" && node.properties?.rel === "category tag") {
          if (node.properties.href.match(/collaborat/))
            authors.push(toText(node));
        }
      });
      res.authors = authors;
    },
    includes: [".header", ".post-inner"],
    excludes: [".sharedaddy", ".jp-relatedposts"],
  },
  {
    pattern: "plato.stanford.edu",
    meta: {
      type: "article",
    },
    thumbPath: 'img[alt="SEP logo"]',
  },
  {
    pattern: "signosemio.com",
    meta: {
      publisher: "Signo",
      type: "blog",
      language: "fr",
    },
    thumbPath: "#theoriciansIcon img",
    includes: ["#content"],
    excludes: ["#contentRight", ".droitsAuteur", ".right"],
  },
  {
    pattern: "cairn.info",
    meta: {
      language: "fr",
      type: "article",
    },
    thumbPath: "img.img-thumbnail",
    includes: ["img.img-thumbnail", ".media-body li>*", ".corps"],
    excludes: [".no-para", ".amorce", ".sf-hidden"],
  },
  {
    pattern: "radio-canada.ca",
    meta: {
      type: "news article",
      language: "fr",
    },
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
    meta: {
      authors: ["Wikipedia"],
      type: "wiki",
      publisher: "Wikipedia",
    },
    splitTitle: ["-"],
    includes: ["#content"],
    excludes: [".mw-editsection", ".navbox", ".sf-hidden", ".mw-jump-link"],
  },
  {
    pattern: "psychologytoday.com",
    meta: {
      type: "magazine article",
    },
  },
  {
    pattern: "academic.oup.com",
    meta: {
      type: "article",
    },
    includes: [".core-reader .content", "#maincontent"],
    excludes: [".resolver-links", ".core-reader-footer"],
  },
];

export function getAdapter(urlOrKey) {
  if (!urlOrKey) return {};
  let hostname;
  try {
    const url = new URL(urlOrKey);
    hostname = url.hostname;
  } catch (err) {}
  if (hostname) {
    const specific =
      override.find((value) => hostname?.endsWith(value.pattern)) || {};
    // TODO: deep merge conf
    return specific;
  }
  return override.find((value) => value === urlOrKey) || {};
}
