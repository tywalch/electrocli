// import {Attribute} from "./instance";
// const FilterOperationValues = ["=","<","<=","<>",">",">=","eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;
// const ConditionValues = ["and","or"] as const;
// type FilterCondition = typeof ConditionValues[number];
// type FilterOperation = typeof FilterOperationValues[number];
// type FilterExpression = {attribute: string, operation: FilterOperation, value1?: any, value2?: any} | FilterCondition;

// enum SyntaxFormatKeyword {attributes, operations, conditions, value1, value2};

// const SyntaxFormats = [
// 	[SyntaxFormatKeyword.attributes, SyntaxFormatKeyword.operations, SyntaxFormatKeyword.conditions],
// 	[SyntaxFormatKeyword.attributes, SyntaxFormatKeyword.operations, SyntaxFormatKeyword.value1, SyntaxFormatKeyword.conditions],
// 	[SyntaxFormatKeyword.attributes, SyntaxFormatKeyword.operations, SyntaxFormatKeyword.value1, SyntaxFormatKeyword.value2, SyntaxFormatKeyword.conditions],
// ] as const;

// function deconstruct(value: string = ""): string[] {
//   return value
//     .split(" ")
//     .map(part => {
//       if (typeof part === "string" && part.trim().length > 0) {
//         return part.trim().toLowerCase();
//       }
//       return "";
//     })
//     .filter(Boolean);
// }


// class ExpressionTester {
//   private attributes: Attribute[];
//   constructor(attributes: Attribute[]) {
//     this.attributes = attributes;
//   }

//   test(keyword: SyntaxFormatKeyword, value?: string) {
//     switch(keyword) {
//       case SyntaxFormatKeyword.attributes:
//         this.test
//       case SyntaxFormatKeyword.conditions:
//       case SyntaxFormatKeyword.operations:
//       default:
//     }
//   }
// }

// function parse(expression: string, attributes: Attribute[]): FilterExpression[] {
//   const tests = {
//     [SyntaxFormatKeyword.attributes]: (value: string) => {
//       return attributes.find(attr => attr.name.toLowerCase() === value);
//     },
//     [SyntaxFormatKeyword.operations]: (value: string) => {
      
//     }
//   }
//   let parts = deconstruct(expression);
//   let expressions = [];
//   let current = {};
//   let format = 0;
//   for (let i = 0; i < parts.length; i++) {
//     let value = parts[i];
//     let keywords = 
//   }
// }