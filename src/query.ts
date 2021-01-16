import { QueryOperation } from "./instance";
import {QueryMethod, Attribute, Facet, QueryConfiguration} from "./instance";

const FILTER_OPERATIONS = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

export type BuildQueryParameters = {name: string, query: QueryMethod, attributes: Attribute[], facets: Facet[], actions: {remove?: QueryMethod}};

export type ExecuteQueryOptions = {
  raw?: boolean;
  params?: boolean;
  table?: string;
  limit: string;
  filter: FilterOption[]
  delete?: boolean;
}

type FilterOperation = (typeof FILTER_OPERATIONS)[number];

export type FilterOption = {
  attribute: string;
  operation: FilterOperation
  value1: string;
  value2?: string;
}

export type RequestFilters = string | string[];

export function getFilterParser(attributes: string[]) {
  return (val: string, arr: FilterOption[] = []): FilterOption[] => {
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

export function parseFilters(attributes: string[], filters: RequestFilters) {
  let parser = getFilterParser(attributes);
  if (typeof filters === "string") {
    return parser(filters);
  } else {
    return filters.reduce((result: FilterOption[], value: string) => {
      return parser(value, result)
    }, []);
  }
}

export function applyFilter(query: QueryOperation, filters: FilterOption[]): QueryOperation {
  for (let filter of filters) {
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
  return query;
}

export function isOperation(operation: string): operation is FilterOperation {
  return !!FILTER_OPERATIONS.find(op => op  === operation)
}

async function removeRecords(data: object[], remove: QueryMethod, options: ExecuteQueryOptions): Promise<object> {
  let results: [string, object][] = await Promise.all(data.map((result: object) => {
    return execute(remove(result), Object.assign({}, options))
      .then((): [string, object] => {
        return ["", result];
      })
      .catch((err: Error): [string, object] => {
        return [err.message, result];
      })
  }));
  // let errors = Array.from(new Set(results.map(([err]) => err))).filter(Boolean);
  // let success = [];
  let failure = [];
  for (let [err, result] of results) {
    if (err) {
      failure.push(result);
    }
  }
  return failure;
}

export function parseFacets(args: string[], facets: Facet[]): object {
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

export async function execute(query: QueryOperation, options: ExecuteQueryOptions): Promise<any> {
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
  if (options.raw) {
    config.raw = true;
  }

  if (options.params) {
    return console.log(query.params(config));
  }

  return query.go(config);
}

export async function query(params: BuildQueryParameters, options: ExecuteQueryOptions, ...args: string[]) {
  if (options.raw && options.delete) {
    throw new Error("Sorry but the options '--raw' and '--delete' currently cannot be used together.");
  }
  let facets = parseFacets(args, params.facets);
  let data: any = await execute(params.query(facets), options);
  if (options.delete && params.actions.remove !== undefined) {
    data = await removeRecords(data, params.actions.remove, options);
  }
  return data;
}