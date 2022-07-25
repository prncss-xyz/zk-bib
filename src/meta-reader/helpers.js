import toText_ from 'hast-util-to-text';

export const toText = node => toText_(node)?.trim()

export const pipe = (...fns) => function(arg) {
  for (const fn of fns) {
    const val = fn(arg);
    if (!val && val !== 0) return;
    arg = fn(arg);
  }
  return arg;
};

export const contains = str => tree => {
  let text = toText(tree);
  if (!text) return;
  if (text.indexOf(str) >= 0)
  return true;
};

export const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
