import colors from "colors";
import commander from "commander";
import {ReferenceStore, ReferenceConfiguration, AddReferenceConfiguration} from "./store";
import {ElectroInstance, InstanceReader, QueryMethod, Attribute, Facet, QueryOperation, QueryConfiguration, Instance} from "./instance";
import generate from "./generate";
import serve from "./serve";
import {getFilterParser, FilterOption, applyFilter} from "./query";
import os from "os";

const ConfigurationLocation = `${os.homedir()}/.electro_config`;

export default function(program: commander.Command) {

  program
    .command("typedef <filepath>")
    .description("Specify a file that exports an ElectroDB Service or Entity and Electro will automatically generate a typescript type definition file.")
    .option("-o, --output <filepath>", "Specify an output filepath for the generated type definition file.")
    .action((filepath: string, {output}: {output?: string} = {}) => {
      let display = generate(filepath, output);
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
      const store = new ReferenceStore(ConfigurationLocation);
      const config = new ReferenceConfiguration(store);
      let instanceReader = new InstanceReader(filePath);
      let [, instance] = instanceReader.get({table, endpoint, region});
      let electro = new ElectroInstance(instance);
      let display = config.add(filePath, electro, label, {overwrite, table, endpoint, region});
      console.log(display);
    });

  program
    .command("remove <service>")
    .alias("rm")
    .description("Remove references added to the Electro CLI")
    .action((service: string) => {
      const store = new ReferenceStore(ConfigurationLocation);
      const config = new ReferenceConfiguration(store);
      let display = config.remove(service);
      console.log(display);
    });

  program
    .command("list")
    .alias("ls")
    .description("List all ElectroDB instances that have been imported into the Electro cli")
    .action(() => {
      const store = new ReferenceStore(ConfigurationLocation);
      const config = new ReferenceConfiguration(store);
      let display = config.list();
      console.log(display);
    });

  program
    .command("serve <port>")
    .description("Stand up a local http endpoint based on your models")
    .action((port: number) => {
      let services = getElectroInstances(ConfigurationLocation);
      serve(port, services);
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

type ServiceCommand = (program: commander.Command, service: ElectroInstance) => void;

function getElectroInstances(location: string): ElectroInstance[] {
  const store = new ReferenceStore(location);
  let services = store.get();
  let instances: ElectroInstance[] = [];
  for (let name of Object.keys(services)) {
    let reader;
    let instance;
    try {
      reader = new InstanceReader(services[name].filePath);
      [,instance] = reader.get(services[name]);
    } catch(err) {
      console.log(colors.red(`Error loading service "${name}": ${err.message} - Remove this entity using 'remove' command or use the 'add' command with the --force flag to update the file path.`))
    }
    if (instance === undefined || reader === undefined) {
      continue;
    }
    let e = new ElectroInstance(instance);
    e.setName(name);
    instances.push(e);
  }
  return instances;
}

export function createQueryCommand(name: string, description: string, serviceCommand: ServiceCommand) {
  let program = new commander.Command(name).description(description);
  let services = getElectroInstances(ConfigurationLocation);
  for (let service of services) {
    let command = new commander.Command(service.name.toLowerCase()) //.description(`Commands for the ${service.service} service.`);
    serviceCommand(command, service);
    program.addCommand(command);
  }
  return program;
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
    let instance = service.instances.find(instance => instance.name === entity)
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

type QueryCommandParams = {name: string, query: QueryMethod, attributes: Attribute[], facets: Facet[], actions: {remove?: QueryMethod}};

function validateQueryParams(params: InstanceCommandOptions): void {
  let errors = [];
  let limitIsNotANumber = params.limit !== undefined && isNaN(parseInt(params.limit))
  if (limitIsNotANumber) {
    errors.push(`Query option '-l, --limit' is not a number: "${params.limit}"`);
  }
}

async function removeRecords(data: object[], remove: QueryMethod, options: InstanceCommandOptions): Promise<object> {
  let results: [string, object][] = await Promise.all(data.map((result: object) => {
    return execute(remove(result), Object.assign({}, options))
      .then((): [string, object] => {
        return ["", result];
      })
      .catch((err: Error): [string, object] => {
        return [err.message, result];
      })
  }));
  let success = [];
  let failure = [];
  let errors = Array.from(new Set(results.map(([err]) => err))).filter(Boolean);
  for (let [err, result] of results) {
    if (err) {
      failure.push(result);
    } else {
      success.push(result);
    }
  }
  return {success, failure, errors};
}

function executeQuery(program: commander.Command, params: QueryCommandParams): commander.Command {
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
      let options = args[args.length - 1] as InstanceCommandOptions;
      let facets = parseFacets(args, params.facets);
      validateQueryParams(options);
      let data: any = await execute(params.query(facets), options);
      if (options.delete && params.actions.remove !== undefined) {
        data = await removeRecords(data, params.actions.remove, options);
      }
      if (data) {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch(err) {
      console.log(colors.red(err.message))
    }
  });
  return program;
}

function parseFacets(args: string[], facets: Facet[]): object {
  let result: {[key: string]: string} = {};
  for (let i = 0; i < facets.length; i++) {
    let name = facets[i].name;
    let value: undefined | string = args[i];
    if (value) {
      result[name] = value;
    }
  }
  return result;
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


// const FILTER_OPERATIONS = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

// type FilterOperation = (typeof FILTER_OPERATIONS)[number];

// type FilterOption = {
//   attribute: string;
//   operation: FilterOperation
//   value1: string;
//   value2?: string;
// }

type InstanceCommandOptions = {
  raw?: boolean;
  params?: boolean;
  table?: string;
  limit: string;
  filter: FilterOption[]
  delete?: boolean;
}

async function execute(query: QueryOperation, options: InstanceCommandOptions): Promise<any> {
  query = applyFilter(query, options.filter);

  let config: QueryConfiguration = {};
  if (options.table) {
    config.params = config.params || {};
    config.params.TableName = options.table;
  }
  if (options.limit) {
    config.params = config.params || {};
    config.params.Limit = parseInt(options.limit)
  }

  if (options.params) {
    return console.log(query.params(config));
  }

  return query.go(config);
}

// TODO: MAKE TABLE THE STANDARD OUTPUT