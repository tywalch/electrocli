import { expect } from 'chai';
import helpers from "../src/handlebars";

describe("Handlebars helpers", () => {
  describe("prefix", () => {
    // values with prefix
    // values without prefix
    // empty array
    // one
  });

  describe("stringUnion", () => {
    // empty array
    // one
    // includeQuotes
    // not include quotes
  });

  describe("union", () => {
    // empty array
    // one
    // multiple
  });

  describe("getFacetPermutations", () => {
    // one
    // none
    // no pk
    // no sk
    // both
  });

  describe("buildIndexType", () => {
    // one
    // none
    // no pk
    // no sk
    // both
    // no facetStart match
    // no facetStart
  });

  describe("concatIndexType", () => {
    // one
    // multiple
    // none
  });

  describe("filterIndexType", () => {
    
  });

  describe("eq", () => {
    // both undefined
    // match
    // no match
  });

  describe("ne", () => {
    // both undefined
    // match
    // no match
  });

  describe("properCase", () => {
    // empty string
    // all caps
    // no caps
  });
})