- Remove all comments added to the code
- Refactor config command. When called with `jsonr config --init` is should
  produce config file. When called with `jsonr config` it should print resulting
  merged configuration. If no config found in current working directory it
  should print instruction to run `jsonr config --init` to initialize config
- Extend jsonr runtime so all `jsonr` instructions will also leverage config
  files and cli args.
