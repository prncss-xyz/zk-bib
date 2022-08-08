import {
  processEXIFToolDate,
  sdrPath,
  argsSub,
  removeTitleParts,
} from "./index.js";

test('subsitute "{}" with arg', () => {
  expect(argsSub(["a", "{}", "c"], "b")).toEqual(["a", "b", "c"]);
});

test('add arg when ther is no "{}" in args', () => {
  expect(argsSub(["a", "b"], "c")).toEqual(["a", "b", "c"]);
});

test("properly format date", () => {
  expect(processEXIFToolDate("2021:12:13 14:35:31-05:00")).toBe(
    "2021-12-13 14:35:31-05:00"
  );
});

test("properly create sdr name", () => {
  expect(sdrPath("test.epub")).toBe("test.sdr");
});

test("remove unwanted words from title", () => {
  expect(
    removeTitleParts("The  green a tomatoe", { words: ["the", "a"] })
  ).toBe("green tomatoe");
  expect(
    removeTitleParts("D'amour et d'eau fraîche", { prefixes: ["d'"] })
  ).toBe("amour et eau fraîche");
});

test("remove unwanted chars from title", () => {
  expect(removeTitleParts("a: b", { characters: ":" })).toBe("a b");
  expect(removeTitleParts("a? b", { characters: "?" })).toBe("a b");
});

test("remove accents from title", () => {
  expect(removeTitleParts("école", { accents: true })).toBe("ecole");
});
