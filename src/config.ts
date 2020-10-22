import {File, RemoteFile} from "./files";

type InstanceConfig = {
  filePath: string;
};

type Configuration = Record<string, InstanceConfig>;

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