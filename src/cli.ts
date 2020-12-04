import colors from "colors";
import {ReferenceStore, ReferenceConfiguration, AddReferenceConfiguration} from "./store";
import {ElectroInstance, InstanceReader} from "./instance";
import generate from "./generate";
import httpServer from "./serve";

export function typeDef(filepath: string, output?: string): string | undefined {
  return generate(filepath, output);
}

export function add(configurationLocation: string, filePath: string, {label, overwrite, table, endpoint, region}: AddReferenceConfiguration = {}): string {
  const store = new ReferenceStore(configurationLocation);
  const config = new ReferenceConfiguration(store);
  let instanceReader = new InstanceReader(filePath);
  let [, instance] = instanceReader.get({table, endpoint, region});
  let electro = new ElectroInstance(instance);
  return config.add(filePath, electro, label, {overwrite, table, endpoint, region});
}

export function remove(configurationLocation: string, service: string): string {
  const store = new ReferenceStore(configurationLocation);
  const config = new ReferenceConfiguration(store);
  return config.remove(service);
}

export function list(configurationLocation: string): string {
  const store = new ReferenceStore(configurationLocation);
  const config = new ReferenceConfiguration(store);
  return config.list();
}

export function serve(configurationLocation: string, port: number) {
  let services = getElectroInstances(configurationLocation);
  httpServer(port, services);
}

export function getElectroInstances(location: string): ElectroInstance[] {
  const store = new ReferenceStore(location);
  let services = store.get();
  let instances: ElectroInstance[] = [];
  for (let name of Object.keys(services)) {
    let reader;
    let instance;
    try {
      reader = new InstanceReader(services[name].filePath);
      [,instance] = reader.get(services[name]);
    } catch(err) {
      console.log(colors.red(`Error loading service "${name}": ${err.message} - Remove this entity using 'remove' command or use the 'add' command with the --force flag to update the file path.`))
    }
    if (instance === undefined || reader === undefined) {
      continue;
    }
    let e = new ElectroInstance(instance);
    e.setName(name);
    instances.push(e);
  }
  return instances;
}