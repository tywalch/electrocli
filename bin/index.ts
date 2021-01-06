#!/usr/bin/env node

import commander from "commander";
import app from "../src/app";
import * as config from "../package.json";

(function exec() {
  try {
    const program = app(
      commander
        .description(config.description)
        .version(config.version)
    );
    program.parse(process.argv);
  } catch(err) {
    console.log("Error:", err.message);
    process.exit(1);
  }
})();