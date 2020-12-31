import { expect } from 'chai';
import * as helpers from "../src/handlebars";

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

  describe("pascal", () => {
    it("should pascal case a single string", () => {
      let cased = helpers.pascal("myValue");
      expect(cased).to.equal("MyValue");
    });
    it("should pascal case a single string in an array", () => {
      let cased = helpers.pascal(["myValue"]);
      expect(cased).to.deep.equal(["MyValue"]);
    });
    it("should pascal case a multiple strings in an array", () => {
      let cased = helpers.pascal(["myValue1", "myValue2"]);
      expect(cased).to.deep.equal(["MyValue1", "MyValue2"]);
    });
    it("should handle an empty array gracefully", () => {
      let cased = helpers.pascal("");
      expect(cased).to.equal("");
    });
    it("Shouldnt impact an already pascal cased word", () => {
      let cased = helpers.pascal("MyValue");
      expect(cased).to.equal("MyValue");
    });
    // string
      // empty string
      // all caps
      // no caps
    // array
      // empty string
      // all caps
      // no caps
  });
})