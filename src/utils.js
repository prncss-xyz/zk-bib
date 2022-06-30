export function processEXIFToolDate(str) {
  const words = str.split(" ");
  words[0] = words[0].replace(/:/g, "-");
  str = words.join(" ");
  return str;
}
