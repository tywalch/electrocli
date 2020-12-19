import colors from "colors";
import {typeDef, add, remove, list, serve, getElectroInstances, } from "./cli";
import {AddReferenceConfiguration} from "./store";
import {ElectroInstance, Facet} from "./instance";
import {getFilterParser, ExecuteQueryOptions, BuildQueryParameters, query} from "./query";
import commander from "commander";
import os from "os";

type ServiceCommand = (program: commander.Command, service: ElectroInstance) => void;

const ConfigurationLocation = `${os.homedir()}/.electro_config`;

export default function(program: commander.Command) {
  program
    .command("typedef <filepath>")
    .description("Specify a file that exports an ElectroDB Service or Entity and Electro will automatically generate a typescript type definition file.")
    .option("-o, --output <filepath>", "Specify an output filepath for the generated type definition file.")
    .action((filepath: string, {output}: {output?: string} = {}) => {
      let display = typeDef(filepath, output);
      console.log(display);
    });
  
  program
    .command("add <filepath>")
    .description("Specify a file that exports an ElectroDB Service or Entity and Electro will add that Instance to the CLI")
    .option("-l, --label <label>", "Specify a custom label for this service to appear in the CLI")
    .option("-t, --table <table>", "Specify a default table to use with this instance")
    .option("-e, --endpoint <url>", "Specify a default dynamodb endpoint to use with this instance (model imports only)")
    .option("-r, --region <region>", "Specify a default aws region to use with this instance (model imports only)")
    .option("-o, --overwrite", "Overwrite existing tag if already exists")
    .action((filePath: string, {label, overwrite, table, endpoint, region}: AddReferenceConfiguration = {}) => {
      let display = add(ConfigurationLocation, filePath, {label, overwrite, table, endpoint, region});
      console.log(display);
    });

  program
    .command("remove <service>")
    .alias("rm")
    .description("Remove references added to the Electro CLI")
    .action((service: string) => {
      let display = remove(ConfigurationLocation, service);
      console.log(display);
    });

  program
    .command("list")
    .alias("ls")
    .description("List all ElectroDB instances that have been imported into the Electro cli")
    .action(() => {
      let display = list(ConfigurationLocation);
      console.log(display);
    });

  program
    .command("serve <port>")
    .description("Stand up a local http endpoint based on your models")
    .action((port: number) => {
      serve(ConfigurationLocation, port);
    });

  try {
    let query = createQueryCommand("query", "Query local instances that have been added to the CLI", queryCommand);
    let scan = createQueryCommand("scan", "Scan for local instances that have been added to the CLI", scanCommand);
    program.addCommand(scan);
    program.addCommand(query);
    program.parse(process.argv);
  } catch(err) {
    console.log("Error:", err.message, err);
    process.exit(1);
  }
}

export function createQueryCommand(name: string, description: string, serviceCommand: ServiceCommand) {
  let program = new commander.Command(name).description(description);
  let services = getElectroInstances(ConfigurationLocation);
  for (let service of services) {
    let command = new commander.Command(service.name.toLowerCase());
    serviceCommand(command, service);
    program.addCommand(command);
  }
  return program;
}

function formatFacetParams(facets: Facet[]): string {
  let params: string[] = [];
  for (let facet of facets) {
    if (facet.type === "pk") {
      params.push(`<${facet.name}>`);
    } else {
      params.push(`[${facet.name}]`);
    }
  }
  return params.join(" ");
}

function queryCommand(program: commander.Command, service: ElectroInstance): void {
  for (let accessPattern in service.queries) {
    let instance = service.getInstance(accessPattern);
    if (instance) {
      let facets = instance.getFacets(instance.getIndexName(accessPattern));
      let query = service.queries[accessPattern];
      let name = accessPattern.toLowerCase();
      let attributes = Object.values(instance.getAttributes());
      let actions = service.actions[instance.name];
      let description = "";
      if (instance.type === "entity") {
        description = `Query the entity "${instance.name}" by "${accessPattern}".`
      } else if (instance.type === "collection") {
        description = `Query the collection "${accessPattern}".`;
      } else {
        continue;
      }

      let command = program.command(`${name} ${formatFacetParams(facets)}`).description(description);
      executeQuery(command, {name, query, attributes, facets, actions});
    }
  }
}

function scanCommand(program: commander.Command, service: ElectroInstance): void {
  for (let entity in service.scans) {
    let instance = service.instances.find(instance => instance.name === entity);
    if (instance && instance.type === "entity") {
      let command = program.command(entity.toLowerCase()).description(`Perform scan on ${entity} entities`);
      executeQuery(command, {
        name: entity.toLowerCase(),
        query: service.scans[entity],
        attributes: Object.values(instance.getAttributes()),
        facets: [],
        actions: service.actions[entity]
      });
    }
  }
}

function validateQueryParams(params: ExecuteQueryOptions): void {
  let errors = [];
  let limitIsNotANumber = params.limit !== undefined && isNaN(parseInt(params.limit))
  if (limitIsNotANumber) {
    errors.push(`Query option '-l, --limit' is not a number: "${params.limit}"`);
  }
}

function executeQuery(program: commander.Command, params: BuildQueryParameters): commander.Command {
  let attributeNames = params.attributes.map(attribute => attribute.name);
  let shouldRemove = !!(params.actions && params.actions.remove);

  program
    .option("-r, --raw", "Retrun raw field response.")
    .option("-p, --params", "Return docClient params as results.")
    .option("-t, --table <table>", "Override table defined on model")
    .option("-l, --limit <number>", "Limit the number of results returned")
    .option(`-f, --filter <expression>`, `Supply a filter expression "<attribute> <operation> <value>". Available attributes include ${attributeNames.join(", ")}`, getFilterParser(attributeNames), []);
  
  if (shouldRemove) {
    program = program.option("-d, --delete", "Delete items returned from query");
  }
  
  program.action(async (...args: any) => {
    try {
      let options = args.pop() as ExecuteQueryOptions;
      validateQueryParams(options);
      let data = await query(params, options, ...args);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    } catch(err) {
      console.log(colors.red(err.message))
    }
  });
  return program;
}