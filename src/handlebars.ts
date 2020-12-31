import Handlebars from "handlebars";
import {FacetDetail} from "./templater";

export function prefix(values: string[], prefix: string) {
  return values.map(value => `${prefix || ""}${value}`);
}

export function stringUnion(values: string[], includeQuotes: boolean) {
  if (!Array.isArray(values)) {
      throw new Error("Invalid context");
  }
  return values
    .map(value => includeQuotes ? `"${value}"` : value)
    .join(" | ");
}

export function union(values: string[]) {
  if (!Array.isArray(values)) {
    throw new Error("Invalid context");
  }
  return values.join(" | ");
}

type IndexType = {name: string, type: string};

export function getFacetPermutations(values: FacetDetail[]): IndexType[][] {
  if (!Array.isArray(values)) {
    throw new Error("Invalid context");
  }
  let permutations: IndexType[][] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i].key === "pk" && values[i+1] !== undefined && values[i+1].key === "pk") {
        continue;
    }
    let facets: IndexType[] = [];
    for (let j = 0; j <= i; j++) {
        let item = values[j];
        facets.push({
            name: item.name,
            type: item.type
        });
    }
    permutations.push(facets);
  }
  return permutations;
}

export function buildIndexType(values: FacetDetail[], facetStart?: string) {
  if (!Array.isArray(values)) {
      throw new Error("Invalid context");
  }
  if (typeof facetStart !== "string") {
    facetStart = values[0] && values[0].name;
  }
  let facets: FacetDetail[] = [];
  let hasBegun = false;
  for (let value of values) {
    if (hasBegun) {
      facets.push(value);
    } else if (value.name === facetStart) {
      facets.push(value);
      hasBegun = true;
    }
  }
  let tableIndex = getFacetPermutations(facets);
  return concatIndexType(tableIndex);
}

export function concatIndexType(values: IndexType[][] = []) {
  return values.map(facets => {
      return `{ ${facets.map(facet => `${facet.name}: ${facet.type}`).join("; ")} }`
  }).join(" | ") || "{}";
}

export function filterIndexType(values: FacetDetail[], key: 'pk' | 'sk' | 'all') {
  return values.filter(indexType => {
      return key === "all" || indexType.key === key
  })
}

export function eq(this: typeof Handlebars, type: any, value: any, options: Handlebars.HelperOptions) {
  return type === value
    ? options.fn(this)
    : options.inverse(this);
}

export function ne(this: typeof Handlebars, type: any, value: any, options: Handlebars.HelperOptions) {
  return type === value
    ? options.inverse(this)
    : options.fn(this);
}
export function pascal(value: string): string;
export function pascal(value: string[]): string[];
export function pascal(value: string|string[]) {
  if (typeof value !== "string" && !Array.isArray(value)) {
    console.log({value, type: typeof value});
    throw new Error("Can only proper case strings and string arrays");
  }

  let values: string[] = Array.isArray(value) ? value: [value];
  let casedValues: string[] = [];

  for (let i = 0; i < values.length; i++) {
    let cased = "";
    for (let j = 0; j < values[i].length; j++) {
      if (j === 0) {
        cased += values[i][j].toUpperCase()
      } else {
        cased += values[i][j];
      }
    }
    casedValues.push(cased);
  }

  if (typeof value === "string") {
    return casedValues[0];
  } else {
    return casedValues;
  }
}

Handlebars.registerHelper({
  ne,
  eq,
  union,
  prefix,
  pascal,
  stringUnion,
  buildIndexType,
  concatIndexType,
  filterIndexType,
});

export default Handlebars;