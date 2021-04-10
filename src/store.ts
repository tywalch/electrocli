import Table from "cli-table";
import {File, LocalFile, RemoteFile} from "./files";
import { ElectroInstance } from "./instance";

type ReferenceDetail = {
  filePath: string;
  table?: string;
  params?: string;
};

type InstanceReferences = Record<string, ReferenceDetail>;

export type AddReferenceConfiguration = {
  label?: string;
  overwrite?: boolean;
  table?: string;
  params?: string;
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

  append(filePath: string, name: string, {overwrite = false, table, params}: AddReferenceConfiguration = {}): InstanceReferences {
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
    config[name] = {filePath: file.path(), table, params};
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

  add(filePath: string, instance: ElectroInstance, name: string = "", {overwrite, table, params}: AddReferenceConfiguration = {}) {
    let serviceName = typeof name === "string" && name.length > 0 ? name : instance.name; 
    this.store.append(filePath, serviceName, {overwrite, table, params});
    return serviceName;
  }

  remove(name: string) {
    let serviceName = this.store.remove(name);
    return serviceName
  }

  private listJson(instance?: string) {
    let services = this.store.get();
    if (instance && instance in services) {
      return JSON.stringify(services[instance], null, 4);
    } else {
      return JSON.stringify(services, null, 4);
    }
  }

  private listTable(instance?: string) {
    let services = this.store.get();
    let table: Table;
    if (instance && instance in services) {
      table = new Table({head: ["service", "location", "table", "params"]});
      table.push([instance || "", services[instance].filePath || "", services[instance].table || "", services[instance].params || "{}"]);
    } else {
      table = new Table({head: ["service", "location", "table"]});
      for (let name of Object.keys(services)) {
        table.push([name || "", services[name].filePath || "",  services[name].table || ""]);
      }
    }
    return table.toString();
  }

  list(format: string = "table", instance?: string) {
    switch (format) {
      case "table":
        return this.listTable(instance);
      case "json":
        return this.listJson(instance);
      default:
        return `Unknown format ${format}. Valid formats include 'json', 'table'.`
    }
  }
}