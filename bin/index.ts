#!/usr/bin/env node

import commander from "commander";
import app from "../src/app";
import * as config from "../package.json";
commander
  .description("Electro is a CLI utility toolbox for extending the functionality of the node library ElectroDB to the terminal.")
  .version(config.version)
  
app(commander);