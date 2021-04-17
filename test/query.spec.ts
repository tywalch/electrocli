import {parseFilterParameterString} from "../src/query";
import {expect} from "chai";

describe("Query utilities", async () => {
  describe("getFilterParser", async () => {
    // empty val string
    // invalid filter string
      // no name
      // no operation
      // no value
      // not not a valid attribute
      // not a valid operation
    // string casing all caps
    // each filter operation type
  });

  describe("parseFilters", async () => {
    // happy path
    // filters as string?
  });

  describe("applyFilter", async () => {
    // has value1
    // has value2
    // no values
  });

  describe("isOperation", async () => {
    // every operation
    // non operation
  });

  describe("removeRecords", async () => {

  });

  describe("parseFacets", async () => {

  });

  describe("execute", async () => {

  });

  describe("query", async () => {

  });

  describe("parseFilterParameterString", () => {
    let tests: any = [
      {
        description: "should allow spaces",
        success: true,
        input: "manager, eq, tyler walch",
        output: ["manager", "eq", "tyler walch"]
      },
      {
        description: "should parse all four values as independent",
        success: true,
        input: "manager, eq, tyler, walch",
        output: ["manager", "eq", "tyler", "walch"]
      },
      {
        description: "should allow a backslash to escape a comma",
        success: true,
        input: "manager, eq, tyler,, walch",
        output: ["manager", "eq", "tyler, walch"]
      },
      {
        description: "should allow a second comma to escape a comma",
        success: true,
        input: "manager, eq, tyler,, walch",
        output: ["manager", "eq", "tyler, walch"]
      },
      {
        description: "should allow a second comma to escape a comma with a separater comma at the end",
        success: true,
        input: "manager, eq, tyler,,, walch",
        output: ["manager", "eq", "tyler,", "walch"]
      },
      {
        description: "should throw when the result of parsing yields less than 2 values",
        success: false,
        input: "manager",
        output: `Invalid filter string 'manager'. Where expressions must be in the format of '<attribute>,<operation>,[value1],[value2]'`
      },
      {
        description: "should throw when the result of parsing yields more than 4 values",
        success: false,
        input: "manager, is, a, big, jerk",
        output: `Invalid filter string 'manager, is, a, big, jerk'. Where expressions must be in the format of '<attribute>,<operation>,[value1],[value2]'`
      },
    ];
    for (let test of tests) {
      it(test.description, () => {
        if (test.success) {
          let results = parseFilterParameterString(test.input);
          expect(results).to.deep.equal(test.output);
        } else {
          expect(() => parseFilterParameterString(test.input)).to.throw(test.output);
        }
      })
    }
  })

})
