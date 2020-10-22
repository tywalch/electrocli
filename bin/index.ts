#!/usr/bin/env node

import commander from "commander";
import generate from "../src/generate";
import * as cli from "../src/cli";
import * as config from "../package.json";

// const db = new commander.Command("db").description("Operations related to Service or Entity instances.");

commander
  .command("typedef <filepath>")
  .description("Specify a file that exports an ElectroDB Service or Entity and Electro will automatically generate a typescript type definition file.")
  .option("-o, --output <filepath>", "Specify an output filepath for the generated type definition file.")
  .action((filepath: string, {output}: {output?: string} = {}) => generate(filepath, output));

commander
  .command("add <filepath>")
  .description("Specify a file that exports an ElectroDB Service or Entity and Electo will add that Instance to the cli")
  .option("-s, --service <name>", "Specify a custom tag for this service to appear in the cli")
  .option("-o, --overwrite", "Overwrite existing tag if already exists")
  .action((filePath: string, {name, overwrite}: {name?: string, overwrite?: boolean} = {}) => cli.appendService(filePath, name, {overwrite}));

commander
  .command("remove <service>")
  .alias("rm <service>")
  .description("Specify a file that exports an ElectroDB Service or Entity and Electo will add that Instance to the cli")
  .action((service: string) => cli.removeService(service));

commander
  .command("list")
  .alias("ls")
  .description("List all ElectroDB instances that have been imported into the Electro cli")
  .action(() => cli.list());

// commander.addCommand(services);
commander.version(config.version);

try {
  commander.parse(process.argv);
} catch(err) {
  console.log("Error:", err, err.message);
}