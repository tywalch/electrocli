#!/usr/bin/env node

import commander from "commander";
import cli from "../src/cli";
import * as config from "../package.json";
commander
  .description("Electro is a CLI utility toolbox for extending the functionality of the node library ElectroDB to the terminal.")
  .version(config.version)
  
cli(commander);