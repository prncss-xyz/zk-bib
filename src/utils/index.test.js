import { processEXIFToolDate, sdrPath, remove } from "./index.js";

test("properly format date", () => {
  expect(processEXIFToolDate("2021:12:13 14:35:31-05:00")).toBe(
    "2021-12-13 14:35:31-05:00"
  );
});

test("properly create sdr name", () => {
  expect(sdrPath("test.epub")).toBe("test.sdr");
});

test("remove unwanted words from title", () => {
  expect(remove("The  green a tomatoe", { words: ["the", "a"] })).toBe(
    "green tomatoe"
  );
  expect(remove("D'amour et d'eau fraîche", { prefixes: ["d'"] })).toBe(
    "amour et eau fraîche"
  );
});
