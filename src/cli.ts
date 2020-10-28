import colors from "colors";
import commander from "commander";
import {ReferenceStore, ReferenceConfiguration} from "./store";
import {ElectroInstance, InstanceReader, QueryMethod, Attribute, Facet, QueryOperation, QueryConfiguration, Instance} from "./instance";
import generate from "./generate";

export default function(program: commander.Command) {
  const query = new commander.Command("query").description("Query local instances that have been added to the CLI");

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
    .option("-s, --service <name>", "Specify a custom tag for this service to appear in the CLI")
    .option("-o, --overwrite", "Overwrite existing tag if already exists")
    .action((filePath: string, {name, overwrite}: {name?: string, overwrite?: boolean} = {}) => {
      const store = new ReferenceStore("./.electro_config");
      const config = new ReferenceConfiguration(store);
      let instanceReader = new InstanceReader(filePath);
      let instance = new ElectroInstance(instanceReader.get());
      let display = config.add(filePath, instance, name, {overwrite});
      console.log(display);
    });

  program
    .command("remove <service>")
    .alias("rm <service>")
    .description("Remove references added to the Electro CLI")
    .action((service: string) => {
      const store = new ReferenceStore("./.electro_config");
      const config = new ReferenceConfiguration(store);
      let display = config.remove(service);
      console.log(display);
    });

  program
    .command("list")
    .alias("ls")
    .description("List all ElectroDB instances that have been imported into the Electro cli")
    .action(() => {
      const store = new ReferenceStore("./.electro_config");
      const config = new ReferenceConfiguration(store);
      let display = config.list();
      console.log(display);
    });

  try {
    loadServices(query);
    program.addCommand(query);
    commander.parse(process.argv);
  } catch(err) {
    console.log("Error:", err, err.message);
    process.exit(1);
  }
}

export function loadServices(program: commander.Command) {
  const store = new ReferenceStore("./.electro_config");
  let services = store.get();
  for (let name of Object.keys(services)) {
    let reader = new InstanceReader(services[name].filePath);
    let instance;
    try {
      instance = reader.get();
    } catch(err) {
      console.log(`Error loading service "${name}": ${err.message}`)
    }
    if (instance === undefined) {
      continue;
    }
    let service = new ElectroInstance(reader.get());
    let command = new commander.Command(name.toLowerCase()) //.description(`Commands for the ${service.service} service.`);
    serviceCommand(command, service);
    program.addCommand(command);
  }
}

function serviceCommand(program: commander.Command, service: ElectroInstance): void {
  for (let accessPattern in service.queries) {
    let instance = service.getInstance(accessPattern);
    if (instance && instance.type === "entity") {
      queryCommand(program, {
        name: accessPattern.toLowerCase(),
        description: `Query the entity "${instance.name}" by "${accessPattern}".`,
        query: service.queries[accessPattern],
        attributes: Object.values(instance.getAttributes()),
        facets: instance.getFacets(instance.getIndexName(accessPattern)).map(facet => {
          facet.type = "sk"
          return facet;
        }),
        actions: service.actions[instance.name]
      });
    } else if (instance && instance.type === "collection") {
      queryCommand(program, {
        name: accessPattern.toLowerCase(),
        description: `Query the collection "${accessPattern}".`,
        query: service.queries[accessPattern],
        attributes: Object.values(instance.getAttributes()),
        facets: instance.getFacets(instance.getIndexName(accessPattern)),
        actions: service.actions[instance.name]
      });
    } else {
      continue;
    }
  }
}


/** THIS CODE WILL NEST ENTITY ACCESS PATTERNS BENEATH THE ENTITY **/
// function serviceCommand(program: commander.Command, service: ElectroInstance): void {
//   let instanceSubCommands: Record<string, commander.Command> = {};
//   for (let instance of service.instances) {
//     if (instance.type === "entity") {
//       let subCommand = new commander.Command(instance.name) //.description(`Queries and operations for ${instance.name}.`)
//       instanceSubCommands[instance.name] = subCommand;
//     }
//   }
//   for (let accessPattern in service.queries) {
//     let instance = service.getInstance(accessPattern);
//     let subCommand: commander.Command;
//     if (instance && instance.type === "entity") {
//       subCommand = instanceSubCommands[instance.name];
//       queryCommand(subCommand, {
//         name: accessPattern.toLowerCase(),
//         description: `Query the entity "${instance.name}" by "${accessPattern}".`,
//         query: service.queries[accessPattern],
//         attributes: Object.values(instance.getAttributes()),
//         facets: instance.getFacets(instance.getIndexName(accessPattern)).map(facet => {
//           facet.type = "sk"
//           return facet;
//         }),
//         actions: service.actions[instance.name]
//       });
//     } else if (instance && instance.type === "collection") {
//       subCommand = program;
//       queryCommand(subCommand, {
//         name: accessPattern.toLowerCase(),
//         description: `Query the collection "${accessPattern}".`,
//         query: service.queries[accessPattern],
//         attributes: Object.values(instance.getAttributes()),
//         facets: instance.getFacets(instance.getIndexName(accessPattern)),
//         actions: service.actions[instance.name]
//       });
//     } else {
//       continue;
//     }
//   }
//   for (let subCommand of Object.values(instanceSubCommands)) {
//     program.addCommand(subCommand);
//   }
// }

type QueryCommandParams = {name: string, description: string, query: QueryMethod, attributes: Attribute[], facets: Facet[], actions: {remove?: QueryMethod}};

function validateQueryParams(params: InstanceCommandOptions): void {
  let errors = [];
  let limitIsNotANumber = params.limit !== undefined && isNaN(parseInt(params.limit))
  if (limitIsNotANumber) {
    errors.push(`Query option '-l, --limit' is not a number: "${params.limit}"`);
  }
}

function queryCommand(program: commander.Command, params: QueryCommandParams): commander.Command {
  let attributeNames = params.attributes.map(attribute => attribute.name);
  program = program
    .command(`${params.name.toLowerCase()} ${formatFacetParams(params.facets)}`)
    .description(params.description)
    .option("-r, --raw", "Retrun raw field response.")
    .option("-p, --params", "Return docClient params as results.")
    .option("-t, --table <table>", "Override table defined on model")
    .option("-l, --limit <number>", "Limit the number of results returned")
    .option(`-f, --filter <expression>`, `Supply a filter expression "<attribute> <operation> <value>". Available attributes include ${attributeNames.join(", ")}`, filter(attributeNames), []);
  
  if (params.actions && params.actions.remove) {
    program = program.option("-d, --delete", "Delete items returned from query");
  }

  program.action((...args: any) => {
      let options = args[args.length - 1];
      let facets = parseFacets(args, params.facets);
      validateQueryParams(options);
      execute(params.query(facets), options)
        .then(async data => {
          if (options.delete && params.actions.remove !== undefined) {
            let results = await Promise.all(data.map((result: object) => {
              if (params.actions.remove) {
              return execute(params.actions.remove(result), Object.assign({}, options))
                .then(() => {
                  return ["", result];
                })
                .catch((err: Error) => {
                  return [err.message, result];
                })
              }
            }));
            results.forEach((results: any) => {
              let [err, result]: [string, object] = results;
              if (err) {
                console.log(colors.red(JSON.stringify(result, null, 2)))
              }
            });
          } else {
            return data;
          }
        })
        .then(data => {
          if (data !== undefined) {
            console.log(JSON.stringify(data, null, 2))
          }
        })
        .catch(err => colors.red(err.message));
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


const FILTER_OPERATIONS = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

type FilterOperation = (typeof FILTER_OPERATIONS)[number];

type FilterOption = {
  attribute: string;
  operation: FilterOperation
  value1: string;
  value2?: string;
}

function isOperation(operation: string): operation is FilterOperation {
  return !!FILTER_OPERATIONS.find(op => op  === operation)
}

function filter(attributes: string[]) {
  return (val: string, arr: FilterOption[]): FilterOption[] => {
    let [name = "", operation, value1 = "", value2] = val.split(" ");
    let attribute = attributes.find(attribute => attribute.toLowerCase() === name.toLowerCase());
    if (name === undefined || operation === undefined || value1 === undefined) {
      throw new Error(`Where expressions must be in the format of "<attribute> <operation> <value1> [value2]"`);
    }
    if (!attribute) {
      throw new Error(`Where attribute ${name} is not a valid attribute. Valid attributes include ${attributes.join(", ")}.`);
    }
    if (!isOperation(operation)) {
      throw new Error(`Where operation ${operation} is not a valid attribute. Valid attributes include ${FILTER_OPERATIONS.join(", ")}.`);
    }
    arr.push({attribute, operation, value1, value2});
    return arr;
  }
}

type InstanceCommandOptions = {
  raw?: boolean;
  params?: boolean;
  table?: string;
  limit: string;
  filter: FilterOption[]
}

type AttributeFilterOperation = Record<FilterOperation, (value1: string, value2?: string) => string>
type AttributeFilter = Record<string, AttributeFilterOperation>

async function execute(query: QueryOperation, options: InstanceCommandOptions): Promise<any> {
  for (let filter of options.filter) {
    query.where((attr, op) => {
      if (filter.value2) {
        return `${op[filter.operation](attr[filter.attribute], filter.value1, filter.value2)}`
      } else if (filter.value1) {
        return `${op[filter.operation](attr[filter.attribute], filter.value1)}`
      } else {
        return `${op[filter.operation](attr[filter.attribute])}`
      }
    })
  }
  
  let config: QueryConfiguration = {};
  if (options.table) {
    config.params = config.params || {};
    config.params.Table = options.table;
  }
  if (options.limit) {
    config.params = config.params || {};
    config.params.Limit = parseInt(options.limit)
  }

  if (options.params) {
    return console.log(query.params(config));
  }

  return query.go(config)
}

// TODO: MAKE TABLE THE STANDARD OUTPUT