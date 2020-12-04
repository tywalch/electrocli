import Handlebars from "handlebars";
import {FacetDetail} from "./templater";

function prefix(values: string[], prefix: string) {
  return values.map(value => `${prefix || ""}${value}`);
}

function stringUnion(values: string[], includeQuotes: boolean) {
  if (!Array.isArray(values)) {
      throw new Error("Invalid context");
  }
  return values
    .map(value => includeQuotes ? `"${value}"` : value)
    .join(" | ");
}

function union(values: string[]) {
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

function buildIndexType(values: FacetDetail[], facetStart?: string) {
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

function concatIndexType(values: IndexType[][] = []) {
  return values.map(facets => {
      return `{ ${facets.map(facet => `${facet.name}: ${facet.type}`).join(", ")} }`
  }).join(" | ") || "{}";
}

function filterIndexType(values: FacetDetail[], key: 'pk' | 'sk' | 'all') {
  return values.filter(indexType => {
      return key === "all" || indexType.key === key
  })
}

function eq(this: typeof Handlebars, type: any, value: any, options: Handlebars.HelperOptions) {
  return type === value
    ? options.fn(this)
    : options.inverse(this);
}

function ne(this: typeof Handlebars, type: any, value: any, options: Handlebars.HelperOptions) {
  return type === value
    ? options.inverse(this)
    : options.fn(this);
}

function properCase(value: string) {
  if (typeof value !== "string") {
    throw new Error("Can only proper case strings.");
  }
  let cased = "";
  for (let i = 0; i < value.length; i++) {
    if (i === 0) {
      cased += value[i].toUpperCase()
    } else {
      cased += value[i];
    }
  }
  return cased;
}

Handlebars.registerHelper({
  ne,
  eq,
  union,
  prefix,
  properCase,
  stringUnion,
  buildIndexType,
  concatIndexType,
  filterIndexType,
});

export default Handlebars;