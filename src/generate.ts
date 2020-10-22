import Templater from "./templater";
import fs from "fs";
import path from "path";

const ALLOWED_FILES_TYPES = [".js"];
const TEMPLATE_FILE = path.resolve(__dirname, "../templates/template.handlebars");

function getInstance(fileName: string) {
  let instance = require(fileName);
  if (instance && instance._instance) {
      return instance
  } else {
      throw new Error("File must export instance of either Entity or Service.");
  }
}

function makeOutputFileName(fileName: string) {
  return path.resolve(path.dirname(fileName), `${path.basename(fileName, path.extname(fileName))}.d.ts`);
}

function resolveFileName(fileName: string): string {
  fileName = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(fileName)) {
      throw new Error(`File ${fileName} does not exist.`);
  } else  if (!ALLOWED_FILES_TYPES.includes(path.extname(fileName))) {
      throw new Error(`Only files of type "${ALLOWED_FILES_TYPES.join(", ")}", are allowed. File also must export instance of either Entity or Service.`);
  } else {
    return fileName;
  }
}

function writeFile(fileName: string, contents: string): void {
  return fs.writeFileSync(fileName, contents, {encoding: 'utf8', flag: 'w'});
}

export default function generate(inFile: string, outFile: string = "") {
  try {
    let fileName = resolveFileName(inFile);
    let instance = getInstance(fileName);
    let templater = new Templater(instance);
    let compiled = templater.compile(TEMPLATE_FILE);
    let outfile = outFile || makeOutputFileName(fileName);
    writeFile(outfile, compiled);
  } catch(err) {
    console.log(err);
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// todo: Item needs to be more specific for Instance implementations so that the `type` of the item attributes can make use of "enum";

// main(process.argv[2]);
