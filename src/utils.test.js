import { processEXIFToolDate } from "./utils.js";

test("properly format date", () => {
  expect(processEXIFToolDate("2021:12:13 14:35:31-05:00")).toBe(
    "2021-12-13 14:35:31-05:00"
  );
});
