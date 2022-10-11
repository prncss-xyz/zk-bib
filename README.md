# zk-bib

zk-bib is a companion to [zk](https://github.com/mickael-menu/zk) aimed to deal with bibliographical resources in a flat-file based way. You can "ingest" a ressource file. It will move the file in a standardized location and create a note corresponding to that ressource. You can then create link to that ressource as you would do with any other notes.

As it is a personnal utility for now, some things are hardcoded that could be moved to configuration if interest was expressed.

## Installation

Clone the repo and create a symlink named `zk-bib` from your local `bin` directory to the file `cli.js`

## Metadata

`src/meta-reader/adapters.js` configures how metadata is extracted from html files. zk-bib also directly reads epub metadata. It uses `exiftool` commandline utility to extract metadata for other filetypes. 

## Subcommands

As an epub converter, one special feature is the ability to deal with inlined images, in order to work well with files produced by [SingleFile](https://github.com/gildas-lormeau/SingleFile) browser extension. 

`eat` moves and rename a ressource file to configured directory, and create a zk note. It extracts metadata to yaml preambule.

`spit` convert an html ressource to epub, conversion can be tuned by modifiing `src/meta-reader/adapters.js` (this sould eventually make it to config file)

`spit-note` convert a note content to epub; the command to convert markdown to html has to be supplied in configuration.

`asset` simply prints the absolute filepath of the ressource file. Useful as part of a script or editor plugin.

`sync` will create, delete or move files according to configuration. Html files will be converted to epub, other formats will be copied as is.

Options for each subcommand can be displayed with `zk-bib <subcommand> --help`. 

## Configuration

`ZK_NOTEBOOK_DIR` enviroment variable must be defined and point to de directory where notes are created. Ressources will be stored in the `assets` subdirectory.

zk-bib reads its configuration from the file `config.yaml` in xdg config directory.

`tags` is a list of tags added to the notes metadata by subcommand `eat`
`noteDir` is the directory where subcommand `eat` stores the created notes.

`removeTitle` describes what is remove from ressource title while creating filename of note and ressource file. It has following subparameters:

- `words` is a list of words to remove
- `prefixes` is a list of strings to remove at the begening of a word. Useful to remove elided articles in French. eg. "L'étoile" -> "étoile"
- `characters` is a string of characters to remove. Useful when dealing with filesystems allowing different character sets.
- `accents` is a boolean defining wether to remove diacritics.

`exports` is a dictionary where the keys represents tags and the values represent directories where to export ressources of corresponding keys

`toHTML` describes the command used to convert markdown notes to html (and indirectly to epub). It has following subparameters:

- `name` is the name of the command
- `args` is a list of arguments. If `{}` is figures in the arguements, it is replaced by a filename, else the filename is appended to the list.
