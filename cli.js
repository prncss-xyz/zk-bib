#!/bin/node

import { program } from "commander";
import eat from "./src/eat.js";
import spit from "./src/spit.js";
import spitNote from "./src/spit-note.js";
import sync from "./src/sync.js";
import asset from "./src/asset.js";

program
  .command("eat <filename>")
  .description("move a file into the assets and create its reference note")
  .option("-d, --dry-run", "dry-run")
  .option("-y, --yes", "do not confirm")
  .option("-t, --tags <taglist>", "comma seperated tags")
  .option("-e, --edit", "open note in editor")
  .option("-o, --open", "open document in GUI before eating")
  .action(eat);

program
  .command("spit <id>")
  .description("generate an epub file from given ressource id")
  .action(spit);

program
  .command("spit-note <relPath>")
  .description("generate an epub file from given relpath")
  .action(spitNote);

program
  .command("asset <id>")
  .description(
    "print on stdout the absolute filepath of asset corresponding to given id, mostly intended for scripting purposes"
  )
  .action(asset);

program
  .command("sync")
  .option("-d, --dry-run", "dry-run")
  .description(
    "sync a targets directories of epub from with corresponding tagged notes"
  )
  .action(sync);

program.parseAsync(process.argv);
