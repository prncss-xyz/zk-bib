#!/bin/node

import { program } from "commander";
import eat from "./src/eat.js";
import spit from "./src/spit.js";
import sync from "./src/export.js";

program
  .command("eat <filename>")
  .option("-d, --dry-run", "dry-run")
  .option("-y, --yes", "do not confirm")
  .option("-t, --tags <taglist>", "comma seperated tags")
  .option("-e, --edit", "open note in editor")
  .option("-o, --open", "open document in GUI before eating")
  .action(eat);

program.command("spit <id>").action(spit);

program.command("sync").option("-d, --dry-run", "dry-run").action(sync);
program.parseAsync(process.argv);
