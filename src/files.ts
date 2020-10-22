import fs from "fs";
import path from "path";

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