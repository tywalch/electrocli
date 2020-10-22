import fs from "fs";
import path from "path";
import { ElectroInstanceType } from "./instance";

type InstanceConfig = {
  filePath: string;
};

type Configuration = Record<string, InstanceConfig>;

export abstract class File<T extends string | object> {
  public abstract filePath: string;
  
  read(): T {
    let contents = fs.readFileSync(this.filePath, 'utf8');
    try {
      let parsed = JSON.parse(contents);
      return parsed;
    } catch(err) {
      return contents as T
    }
  }

  write(data: T): T {
    let payload = typeof data === "string" ? data : JSON.stringify(data);
    fs.writeFileSync(this.filePath, payload, {encoding: 'utf8', flag: 'w'});
    return data;
  }

  test(): boolean {
    return fs.existsSync(this.filePath);
  }

  path(): string {
    return this.filePath
  }

  name(): string {
    return path.basename(this.filePath, this.extention());
  }

  dir(): string {
    return path.dirname(this.filePath);
  }

  extention(): string {
    return path.extname(this.filePath);
  }
}

export class LocalFile<T extends string | object> extends File<T> {
  public filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = path.resolve(__dirname, filePath);
  }
}

export class RemoteFile<T extends string | object> extends File<T> {
  public filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = path.resolve(process.cwd(), filePath);
  }
}

export class InstanceReader {
  public filePath: string;

  constructor(filePath: string) {
    this.filePath = InstanceReader.resolve(filePath);
  }

  static AllowedFileTypes = [".js", ".json"];

  static resolve(filePath: string): string {
    let file = new RemoteFile(filePath);
    if (!file.test()) {
        throw new Error(`File ${file.path()} does not exist.`);
    } else if (!InstanceReader.AllowedFileTypes.includes(file.extention())) {
        throw new Error(`Only files of type "${InstanceReader.AllowedFileTypes.join(", ")}", are allowed. File also must export instance of Entity, Service, or Model`);
    } else {
      return file.path();
    }
  }

  get(): ElectroInstanceType {
    let instance = require(this.filePath);
    if (instance && instance._instance) {
        return instance;
    } else if (false) {
      // placeholder for importing model;
    } else {
      throw new Error("File must instance of Entity, Service, or Model.");
    }
  }
}

export type AppendConfiguration = {
  overwrite?: boolean;
}

export class ServiceConfig {
  public file: File<Configuration>;
  constructor(filePath: string) {
    this.file = new RemoteFile<Configuration>(filePath);
  }

  private write(payload: Configuration): Configuration {
    return this.file.write(payload);
  }

  private read(): Configuration {
    return this.file.read();
  }

  get(): Configuration {
    if (!this.file.test()) {
      return this.write({});
    }
    return this.read();
  }

  append(filePath: string, name: string, {overwrite = false}: AppendConfiguration = {}): Configuration {
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
    config[name] = {filePath: file.path()};
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