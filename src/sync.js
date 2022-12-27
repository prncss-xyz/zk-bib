import syncFiles from "./syncFiles.js";
import syncTags from "./syncTags.js";

export default async function sync(options) {
  await syncTags(options);
  await syncFiles(options);
}
