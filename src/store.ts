import Table from "cli-table";
import {File, LocalFile, RemoteFile} from "./files";
import { ElectroInstance } from "./instance";

type ReferenceDetail = {
  filePath: string;
  endpoint?: string;
  table?: string;
  region?: string;
};

type InstanceReferences = Record<string, ReferenceDetail>;

export type AddReferenceConfiguration = {
  label?: string;
  overwrite?: boolean;
  region?: string;
  table?: string;
  endpoint?: string;
}

export class ReferenceStore {
  public file: File<InstanceReferences>;
  constructor(filePath: string) {
    this.file = new LocalFile<InstanceReferences>(filePath);
  }

  private write(payload: InstanceReferences): InstanceReferences {
    return this.file.write(payload);
  }

  private read(): InstanceReferences {
    return this.file.read();
  }

  get(): InstanceReferences {
    if (!this.file.test()) {
      return this.write({});
    }
    return this.read();
  }

  append(filePath: string, name: string, {overwrite = false, endpoint, region, table}: AddReferenceConfiguration = {}): InstanceReferences {
    let config = this.get();
    let existing = config[name];
    let file = new RemoteFile(filePath);
    if (!overwrite && existing !== undefined) {
      if (file.path() === filePath) {
        // already in place, no need to append;
        return config;
      } else {
        // append would cause duplicate name;
        throw new Error(`Service name ${name} is already associated with file ${existing.filePath}. Remove this service first if you still wish to use the name ${name}.`)
      }
    }
    config[name] = {filePath: file.path(), endpoint, region, table};
    this.write(config);
    return config;
  }

  remove(name: string = ""): string {
    let config = this.get();
    let removed = "";
    for (let service of Object.keys(config)) {
      if (service.toLowerCase() === name.toLowerCase()) {
        delete config[service];
        removed = service;
        break;
      }
    }
    this.write(config);
    return removed;
  }
}

export class ReferenceConfiguration {
  private store: ReferenceStore
  
  constructor(store: ReferenceStore) {
    this.store = store;
  }

  add(filePath: string, instance: ElectroInstance, name: string = "", {overwrite, endpoint, region, table}: AddReferenceConfiguration = {}) {
    let serviceName = typeof name === "string" && name.length > 0 ? name : instance.name;
    this.store.append(filePath, serviceName, {overwrite, endpoint, region, table});
    return serviceName;
  }

  remove(name: string) {
    let serviceName = this.store.remove(name);
    return serviceName
  }

  list() {
    let services = this.store.get();
    let table = new Table({head: ["service", "location", "table", "endpoint", "region"]});
    for (let name of Object.keys(services)) {
      table.push([name, services[name].filePath, services[name].table || "na", services[name].endpoint || "na", services[name].region || "na"]);
    }
    return table.toString();
  }
}