export type IndexTypes = 'pk' | 'sk'

export type Attribute = {
  type: 'string' | 'number' | 'boolean' | 'any' | 'enum';
  name: string;
  required: boolean;
  readOnly: boolean;
  enumArray: string[];
}

export type Facet = {
  type: IndexTypes;
  name: string;
}

type IndexKey = {field: string, facets: string[]};

type Index = {
  index: string;
  pk: IndexKey;
  sk?: IndexKey;
}

type IndexFacet = {
  all: Facet[];
}

export type InstanceAccessType = "entity" | "collection";

export type ElectroInstanceType = Service | Entity;

export type Entity = {
  _instance: {description: "entity"} // really a `symbol` but typescript doesnt understand
  model: {
    entity: string
    facets: {
      byIndex: Record<string, IndexFacet>
      fields: string[]
    }
    schema: {
      attributes: Record<string, Attribute>
    },
    indexes: Record<string, Index>,
    translations: {
      indexes: {
        fromIndexToAccessPattern: Record<string, string>;
        fromAccessPatternToIndex: Record<string, string>;
      }
    }
  }
}

export type Service = {
  _instance: {description: "service"}
  entities: Record<string, Entity>
  service: {
    name: string;
    table: string;
  }
  collectionSchema: Record<string, CollectionSchema>
}

type CollectionSchema = {
  attributes: Record<string, Attribute>,
  entities: Record<string, Entity>
  keys: Index & {name: string}
}

export abstract class Instance {
  public name: string;
  public type: InstanceAccessType;
  private __hasSK: boolean|undefined;
  abstract getItem(): Object;
  abstract getAccessPatternName(index?: string): string;
  abstract getIndexName(accessPattern?: string): string;
  abstract getAccessPattern(accessPattern?: string): Index;
  abstract getAllKeyFieldNames(): string[];
  abstract getAttributes(): Record<string, Attribute>;
  abstract getFacets(name?: string): Facet[];
  abstract getIndexes(): Index[]

  constructor(name: string, type: InstanceAccessType) {
    this.name = name;
    this.type = type;
  }

  getIndexTypeName(accessPattern: string): string {
    return `${accessPattern}Index`;
  }

  getKeyFieldNames(indexName: string = ""): string[] {
    let accessPattern = this.getAccessPatternName(indexName)
    let index = this.getAccessPattern(accessPattern);
    let names = [index.pk.field];
    if (index.sk !== undefined) {
      names.push(index.sk.field);
    }
    return names;
  }

  getAttribute(name: string): Attribute {
    let attributes = this.getAttributes();
    let attribute = attributes[name];
    if (attribute === undefined) {
      throw new Error(`Attribute invalid: ${name}`);
    }
    return attribute;
  }

  getAttributeTypeName(attribute: string): string {
    let attr = this.getAttribute(attribute);
    if (attr.type === "enum") {
        return `${attribute}_enum`;
    }
    return attr.type;
  }

  getEnums(): Record<string, string[]> {
    let attributes = this.getAttributes();
    let enums: Record<string, string[]> = {};
    for (let name of Object.keys(attributes)) {
      let attribute = attributes[name];
      if (attribute.type === "enum") {
        enums[name] = [...attribute.enumArray]
      }
    }
    return enums;
  }

  hasSK(): boolean {
    // same;
    if (typeof this.__hasSK === "boolean") {
      return this.__hasSK;
    }

    let facets = this.getFacets();
    for (let i = 0; i < facets.length; i++) {
      if (facets[i].type === "sk") {
        return this.setHasSKCache(true);
      }
    }

    return this.setHasSKCache(false);
  }

  private setHasSKCache(value: boolean): boolean {
    this.__hasSK = value;
    return value;
  }
}

export class EntityInstance extends Instance {
  private instance: Entity;
  constructor(name: string, instance: Entity) {
    super(name, "entity");
    if (!instance || instance._instance.description !== "entity") {
      throw new Error("Instance is not of type Service");
    }
    this.instance = instance;
  }

  getAccessPatternName(index: string = ""): string {
    return this.instance.model.translations.indexes.fromIndexToAccessPattern[index];
  }

  getIndexName(accessPattern: string = "") {
    return this.instance.model.translations.indexes.fromAccessPatternToIndex[accessPattern];
  }

  getAccessPattern(accessPattern: string = ""): Index {
    return this.instance.model.indexes[accessPattern];
  }

  getAttributes(): Record<string, Attribute> {
    return this.instance.model.schema.attributes;
  }

  getFacets(name: string = ""): Facet[] {
    return this.instance.model.facets.byIndex[name].all;
  }

  getAllKeyFieldNames(): string[] {
    return this.instance.model.facets.fields;
  }

  getItem(): Object {
    return this.getAttributes();
  }

  getIndexes(): Index[] {
    return Object.values(this.instance.model.indexes);
  }
}

export class CollectionInstance extends Instance {
  private instance: CollectionSchema;

  constructor(name: string, instance: CollectionSchema) {
    super(name, "collection");
    this.instance = instance;
  }

  getAccessPatternName(): string {
    return this.name;
  }

  getIndexName(): string {
    return this.instance.keys.name;
  }

  getAccessPattern(): Index {
    return this.instance.keys;
  }

  getIndexes(): Index[] {
    return [this.instance.keys] 
  }

  getAttributes(): Record<string, Attribute> {
    return this.instance.attributes;
  }

  getFacets(): Facet[] {
    let index = this.getAccessPattern();
    let facets: Facet[] = [];

    for (let pkFacet of index.pk.facets) {
      facets.push({type: "pk", name: pkFacet});
    }

    if (index.sk !== undefined) {
      for (let skFacet of index.sk.facets) {
        facets.push({type: "sk", name: skFacet});
      }
    }

    return facets;
  }

  getAllKeyFieldNames(): string[] {
    let fields: string[] = [];
    for (let entity of Object.values(this.instance.entities)) {
      fields = [...fields, ...entity.model.facets.fields];
    }
    return Array.from(new Set(fields));
  }

  getItem(): {[key: string]: Object} {
    let item: {[key: string]: Object} = {};
    for (let entity of Object.values(this.instance.entities)) {
        let entityInstance = new EntityInstance(entity.model.entity, entity);
        let attributes = Object.values(entityInstance.getAttributes());
        let name = entityInstance.name;
        item[name] = attributes.map((attribute) => {
          return Object.assign({}, attribute, {type: this.getAttributeTypeName(attribute.name)});
        });
    }
    return item;
  }
}

export function isEntity(electro: ElectroInstanceType): electro is Entity {
  return electro._instance.description === "entity";
}

export function isService(electro: ElectroInstanceType): electro is Service {
  return electro._instance.description === "service";
}

export class ElectroInstance {
  public name: string;
  public isService: boolean;
  public instances: Instance[];

  static parse(electro: ElectroInstanceType): [string, Instance[]] {
    let name: string;
    let instances: Instance[] = [];
    if (isEntity(electro)) {
      name = electro.model.entity;
      instances.push(new EntityInstance(name, electro));
    } else if (isService(electro)) {
      name = electro.service.name;
      for (let entity of Object.keys(electro.entities)) {
        instances.push(new EntityInstance(entity, electro.entities[entity]));
      }
      for (let collection of Object.keys(electro.collectionSchema)) {
        instances.push(new CollectionInstance(collection, electro.collectionSchema[collection]));
      }
    } else {
      throw new Error("File does not export instance of either Entity or Service.");
    }
    return [name, instances];
  }

  constructor(electro: ElectroInstanceType) {
    let [name, instances] = ElectroInstance.parse(electro);
    this.name = name;
    this.instances = instances;
    this.isService = isService(electro);
  }
}