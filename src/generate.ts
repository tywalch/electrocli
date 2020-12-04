import Templater from "./templater";
import {RemoteFile} from "./files";
import {InstanceReader} from "./instance";
import path from "path";

const TEMPLATE_FILE = "../../templates/template.handlebars";

function modifyExtension(filePath: string, extension: string) {
  let file = new RemoteFile(filePath);
  return path.resolve(`${file.dir()}/${file.name()}.${extension}`);
}

export default function generate(inFile: string, outFile: string = "") {
  try {
    let reader = new InstanceReader(inFile);
    let [type, instance] = reader.get();
    let templater = new Templater(instance);
    let compiled = templater.compile(TEMPLATE_FILE, type);
    outFile = outFile || modifyExtension(reader.filePath, "d.ts");
    let writer = new RemoteFile(outFile);
    writer.write(compiled);
    return outFile;
  } catch(err) {
    console.log(err);
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// todo: Item needs to be more specific for Instance implementations so that the `type` of the item attributes can make use of "enum";

// main(process.argv[2]);
