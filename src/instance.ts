import {RemoteFile} from "./files";
const {Entity} = require("electrodb");

const FilterOperations = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

export type IndexTypes = 'pk' | 'sk';

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
export type ElectroInstanceType = "service" | "entity" | "model";
export type ElectroInstances = Service | Entity;

export type Entity = {
  _instance: {description: "entity"} // really a `symbol` but typescript doesnt understand
  identifiers: {
    model: string
    version: string
  };
  query: QueryRecord,
  get(val: any): any
  delete: QueryMethod
  scan: QueryOperation,
  find: any
  model: {
    entity: string
    service: string
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
  collections: QueryRecord
  find: Record<string, any>
}

type CollectionSchema = {
  attributes: Record<string, Attribute>,
  entities: Record<string, Entity>
  keys: Index & {name: string}
}

export type FilterOperation = (typeof FilterOperations)[number];

export abstract class Instance {
  public name: string;
  public service: string;
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
  abstract getStaticProperties(): {name: string, value: string}[];
  abstract hasAccessPattern(accessPattern: string): boolean;
  static readonly FilterOperations = FilterOperations;
  static isOperation(operation: string = ""): operation is FilterOperation {
    return !!Instance.FilterOperations.find(op => op.toLowerCase() === operation.toLowerCase());
  }

  constructor(name: string, service: string, type: InstanceAccessType) {
    this.name = name;
    this.type = type;
    this.service = service;
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
        return `${attribute}Enum`;
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
  public instance: Entity;
  constructor(name: string, service: string, instance: Entity) {
    super(name, service, "entity");
    if (!instance || instance._instance.description !== "entity") {
      throw new Error("Instance is not of type Service");
    }
    this.instance = instance;
  }

  hasAccessPattern(accessPattern: string): boolean {
    return this.instance.model.translations.indexes.fromAccessPatternToIndex[accessPattern] !== undefined
  }

  getStaticProperties(): {name: string, value: string}[] {
    return [
      {name: "model", value: JSON.stringify(this.instance.model)},
      {name: "identifiers", value: JSON.stringify(this.instance.identifiers)}
    ]
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
  public instance: CollectionSchema;

  constructor(name: string, service: string, instance: CollectionSchema) {
    super(name, service, "collection");
    this.instance = instance;
  }

  hasAccessPattern(accessPattern: string): boolean {
    return this.name === accessPattern;
  }

  getStaticProperties(): {name: string, value: string}[] {
    return []
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
        let entityInstance = new EntityInstance(entity.model.entity, entity.model.service, entity);
        let attributes = Object.values(entityInstance.getAttributes());
        let name = entityInstance.name;
        item[name] = attributes.map((attribute) => {
          return Object.assign({}, attribute, {type: this.getAttributeTypeName(attribute.name)});
        });
    }
    return item;
  }
}

type QueryRecord = Record<string, QueryMethod>;

export class ElectroInstance {
  public name: string;
  public isService: boolean;
  public instances: Instance[];
  public service: string;
  public electro: ElectroInstances;
  public queries: QueryRecord;
  public scans: QueryRecord;
  public actions: Record<string, {remove?: QueryMethod}>

  static isEntity(electro: ElectroInstances): electro is Entity {
    return electro._instance.description === "entity";
  }

  static isService(electro: ElectroInstances): electro is Service {
    return electro._instance.description === "service";
  }

  static parse(electro: ElectroInstances): {name: string, instances: Instance[], queries: QueryRecord, actions: Record<string, {remove?: QueryMethod}>, scans: QueryRecord} {
    let name: string;
    let instances: Instance[] = [];
    let queries: QueryRecord = {};
    let actions: Record<string, {remove?: QueryMethod}> = {};
    let scans: QueryRecord = {};
    if (ElectroInstance.isEntity(electro)) {
      name = electro.model.entity;
      let instance = new EntityInstance(name, electro.model.service, electro)
      scans[name] = (facets: object) => electro.scan;
      instances.push(instance);
      for (let accessPattern in electro.query) {
        /** Using `find` instead of `query` here to allow queries to turn into scans if not all values are provided **/
        queries[accessPattern] = (facets: object) => electro.find(facets);
        // queries[accessPattern] = electro.query[accessPattern];
        /** -------------------------------------------------------------------------------------------------------- **/
      }
      actions[name] = {remove: (facets: object) => electro.delete(facets)};
    } else if (ElectroInstance.isService(electro)) {
      name = electro.service.name;
      for (let entity of Object.values(electro.entities)) {
        instances.push(new EntityInstance(entity.model.entity, electro.service.name, entity));
        scans[entity.model.entity] = (facets: object) => entity.scan;
        for (let accessPattern in entity.query) {
          /** Using `find` instead of `query` here to allow queries to turn into scans if not all values are provided **/
          // queries[accessPattern] = (facets: object) => entity.find(facets);
          queries[accessPattern] = entity.query[accessPattern];
          /** -------------------------------------------------------------------------------------------------------- **/
        }
        actions[entity.model.entity] = {remove: (facets: object) => entity.delete(facets)};
        // queries.delete = entity.delete;
      }
      for (let collection of Object.keys(electro.collectionSchema)) {
        instances.push(new CollectionInstance(collection, electro.service.name, electro.collectionSchema[collection]));
      }
      for (let collection in electro.collections) {
        queries[collection] = electro.collections[collection];
      }
    } else {
      throw new Error("File does not export instance of either Entity or Service.");
    }

    return {name, instances, queries, actions, scans};
  }

  constructor(electro: ElectroInstances) {
    let {name, queries, instances, actions, scans} = ElectroInstance.parse(electro);
    this.scans = scans;
    this.name = name;
    this.electro = electro;
    this.queries = queries;
    this.instances = instances;
    this.service = instances[0].service;
    this.actions = actions;
    this.isService = ElectroInstance.isService(electro);
  }

  getInstance(accessPattern: string): undefined | Instance {
    return this.instances.find(instance => instance.hasAccessPattern(accessPattern));
  }
}

type InstanceQueryMethod = "get" | "delete" | "query" | "find";

type AttributeFilterOperation = Record<FilterOperation, (value1: string, value2?: string) => string>
type AttributeFilter = Record<string, AttributeFilterOperation>
const whereAttributeSymbol: unique symbol = Symbol("where");
type WhereAttribute = typeof whereAttributeSymbol
export type AttributeWhere = Record<string, WhereAttribute>
export type OperationWhere = Record<FilterOperation, (attr: WhereAttribute, value1?: string, value2?: string) => string>

export type QueryConfiguration = {params?: {Table?: string, Limit?: number}};

export type QueryOperation = {
  go: (config: QueryConfiguration) => Promise<object>;
  params: (config: QueryConfiguration) => object;
  filter: (cb: (attr: AttributeFilter) => string) => QueryOperation
  where: (cb: (attr: AttributeWhere, op: OperationWhere) => string) => QueryOperation
};

export type QueryMethod = (facets: object) => QueryOperation;

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

  isElectroInstance(instance: any): instance is ElectroInstances {
      return instance && instance._instance !== undefined;
  }

  get({table, endpoint, region}: {table?: string, endpoint?: string, region?: string} = {}): [ElectroInstanceType, ElectroInstances] {
    let instance = require(this.filePath);
    if (this.isElectroInstance(instance)) {
      return [instance._instance.description, instance];
    } else if (instance.attributes) {
      try {
        const DynamoDB = require("aws-sdk/clients/dynamodb");
        const config: {endpoint?: string, region?: string} = {};
        if (endpoint) {
          config.endpoint = endpoint; 
        }
        if (region) {
          config.region = region;
        }
        const client = new DynamoDB.DocumentClient(config);
        const default_table_name = "your_table_name";
        return ["model", new Entity(instance, {table: table || default_table_name, client})];
      } catch(err) {
        throw new Error("File must instance of Entity, Service, or Model.");
      }
      // placeholder for importing model;
    } else {
      throw new Error("File must instance of Entity, Service, or Model.");
    }
  }
}