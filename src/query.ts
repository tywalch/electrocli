import { QueryOperation } from "./instance";

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

export type RequestFilters = string | string[];

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

const FILTER_OPERATIONS = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

type FilterOperation = (typeof FILTER_OPERATIONS)[number];

export type FilterOption = {
  attribute: string;
  operation: FilterOperation
  value1: string;
  value2?: string;
}

// type AttributeFilterOperation = Record<FilterOperation, (value1: string, value2?: string) => string>
// type AttributeFilter = Record<string, AttributeFilterOperation>

export function isOperation(operation: string): operation is FilterOperation {
  return !!FILTER_OPERATIONS.find(op => op  === operation)
}

