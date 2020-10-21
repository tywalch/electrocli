import commander from "commander";
import generate from "./src/generate";

commander
  .command("typedef <filepath>")
  .description("Specify a file that exports an ElectroDB Service or Entity and automatically generate a typescript type definition file.")
  .option("-o, --output <filepath>", "Specify an output filepath for the generated type definition file.")
  .action((filepath: string, {output}: {output?: string} = {}) => generate(filepath, output));

commander.version("0.0.1");
commander.parse(process.argv);
