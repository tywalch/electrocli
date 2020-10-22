import commander from "commander";
import {InstanceReader, ServiceConfig, AppendConfiguration} from "./files";
import {ElectroInstance} from "./instance";
import Table from "cli-table";

const config = new ServiceConfig("./.electro_config");

export function appendService(filePath: string, name: string = "", {overwrite}: AppendConfiguration = {}) {
  let instanceReader = new InstanceReader(filePath);
  let instance = new ElectroInstance(instanceReader.get());
  let serviceName = typeof name === "string" && name.length > 0 ? name : instance.name;
  let services = config.append(filePath, serviceName, {overwrite});
  console.log(serviceName);
}

export function removeService(name: string) {
  let service = config.remove(name);
  if (service) {
    console.log(service);
  }
}

export function list() {
  let configuration = config.get();
  let table = new Table({head: ["service", "location"]});
  for (let name of Object.keys(configuration)) {
    table.push([name, configuration[name].filePath]);
  }
  console.log(table.toString());
}

export function loadServices(program: commander.Command) {

}

async function getServiceConfig(filePath: string) {

}