import commander from "commander";
import app from "../src/app";
import Handlebars from "../src/handlebars";
import * as config from "../package.json";
import {AbsoluteFile} from "../src/files";

type Option = {
  name: string;
  flags: string;
  required: boolean;
  description: string;
}

type Arg = {
  name: string;
  required: boolean;
}

type CommandDetail = {
  name: string;
  usage: string;
  description: string;
  help: string;
  options: Option[]
  args: Arg[],
  children: CommandDetail[],
}

type ReadmeTemplate = {
  usage: string;
  commands: CommandDetail[]
  examples: CommandDetail[]
}

function getCommandDetail(program: commander.Command): CommandDetail {
  return {
    name: program.name(),
    usage: program.usage(),
    description: program.description(),
    help: program.helpInformation(),
    options: program.options.map((option: any) => {
      return {
        flags: option.flags,
        required: !option.optional,
        description: option.description,
        name: option.long.replace("--", "")
      } as Option;
    }),
    args: program._args.map((arg: any) => {
      return {
        name: arg.name,
        required: arg.required
      } as Arg
    }),
    children: []
  }
}

function getSubCommands(program: commander.Command, commands: CommandDetail[] = []) {
  let detail = getCommandDetail(program);
  commands.push(detail);
  let children: CommandDetail[] = [];
  for (let subcommand of program.commands) {
    getSubCommands(subcommand, children);
  }
  detail.children = children;
  return commands;
}

function template(data: ReadmeTemplate): string {
  const body = new AbsoluteFile<string>("/Users/tylerw.walch/Desktop/media/code/projects/electrocli/util/readme.handlebars");
  body.test();

  const commandPartial = new AbsoluteFile<string>("/Users/tylerw.walch/Desktop/media/code/projects/electrocli/util/command.handlebars")
  commandPartial.test();
  const commandPartialText = commandPartial.read();

  const examplePartial = new AbsoluteFile<string>("/Users/tylerw.walch/Desktop/media/code/projects/electrocli/util/examples.handlebars")
  examplePartial.test();
  const examplePartialText = examplePartial.read();

  Handlebars.registerPartial("command", (context) => {
    const templater = Handlebars.compile(commandPartialText);
    return templater(context);
  });

  Handlebars.registerPartial("examples", (context) => {
    const templater = Handlebars.compile(examplePartialText);
    return templater(context);
  });
  
  const templater = Handlebars.compile(body.read());
  return templater(data);
}

function exec() {
  try {
    console.log(__dirname);
    const file = new AbsoluteFile<string>("/Users/tylerw.walch/Desktop/media/code/projects/electrocli/util/README.md");
    const program = app(commander.description(config.description).version(config.version));
    const commands = getSubCommands(program);
    const readme = template({
      usage: program.helpInformation(),
      commands: commands[0].children,
      examples: commands[0].children.filter(command => command.name === "query")
    });
    file.write(readme);
  } catch(err) {
    console.log(err);
  }
}

exec();