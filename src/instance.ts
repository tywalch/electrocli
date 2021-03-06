import {RemoteFile} from "./files";
import {pascal} from "./handlebars";
import DynamoDB from "aws-sdk/clients/dynamodb";

const {Entity} = require("electrodb");
const ElectroLibTypes = require("electrodb/src/types");

const FilterOperations = ["eq","gt","lt","gte","lte","between","begins","exists","notExists","contains","notContains"] as const;

export type IndexTypes = 'pk' | 'sk';

export type AttributeType = 'string' | 'number' | 'boolean' | 'any' | 'enum';

export type Attribute = {
  type: AttributeType;
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
  _instance: symbol;
  _instanceType?: string;
  _getTableName(): string;
  _setTableName(name: string): void;
  client: DynamoDB.DocumentClient;
  identifiers: {
    model: string;
    version: string;
  };
  query: QueryRecord;
  get(val: any): any;
  delete: QueryMethod;
  create: QueryMethod;
  patch: QueryMethod;
  scan: QueryOperation;
  find: any;
  model: {
    entity: string;
    service: string;
    facets: {
      byIndex: Record<string, IndexFacet>;
      fields: string[];
    }
    schema: {
      attributes: Record<string, Attribute>;
    },
    indexes: Record<string, Index>;
    translations: {
      indexes: {
        fromIndexToAccessPattern: Record<string, string>;
        fromAccessPatternToIndex: Record<string, string>;
      }
    }
  }
}

export type Service = {
  _instance: symbol;
  _instanceType?: string;
  _getTableName(): string;
  _setTableName(name: string): void;
  client: DynamoDB.DocumentClient;
  entities: Record<string, Entity>;
  service: {
    name: string;
    table: string;
  }
  collectionSchema: Record<string, CollectionSchema>;
  collections: QueryRecord;
  find: Record<string, any>;
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
    // This logic should definitely not be here. find out why it is.
    if (attr.type === "enum") {
        return `${pascal(attribute)}Enum`;
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
    super(name, service, ElectroLibTypes.ElectroInstanceTypes.entity);
    // @ts-ignore
    if (!instance || instance._instance === undefined || instance._instance.description !== ElectroLibTypes.ElectroInstanceTypes.entity || (instance._instanceType !== undefined && instance._instanceType !== ElectroLibTypes.ElectroInstanceTypes.entity)) {
      let message = `Instance is not of type Entity`;
      if (service) {
        message = `${service} ${message}`;
      }
      if (name) {
        message = `${name} ${message}`;
      }
      throw message;
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

export type InstanceActions = {
  remove?: QueryMethod, 
  create?: QueryMethod, 
  patch?: QueryMethod
};

export class ElectroInstance {
  public name: string;
  public isService: boolean;
  public instances: Instance[];
  public service: string;
  public electro: ElectroInstances;
  public queries: QueryRecord;
  public scans: QueryRecord;
  public actions: Record<string, InstanceActions>;
  public type: ElectroInstanceType;

  static isEntity(electro: ElectroInstances): electro is Entity {
    if (typeof electro._instance !== "symbol") {
      return false;
    //  @ts-ignore
    } else if (electro._instance.description !== undefined) {
      //  @ts-ignore
      return electro._instance.description === ElectroLibTypes.ElectroInstanceTypes.entity;
    } else if (electro._instanceType !== undefined) {
      return electro._instanceType === ElectroLibTypes.ElectroInstanceTypes.entity;
    } else {
      return false;
    }
  }

  static isService(electro: ElectroInstances): electro is Service {
    if (typeof electro._instance !== "symbol") {
      return false;
      //  @ts-ignore
    } else if (electro._instance.description !== undefined) {
      //  @ts-ignore
      return electro._instance.description === ElectroLibTypes.ElectroInstanceTypes.service;
    } else if (electro._instanceType !== undefined) {
      return electro._instanceType === ElectroLibTypes.ElectroInstanceTypes.service;
    } else {
      return false;
    }
    return electro._instance === ElectroLibTypes.ElectroInstance.service;
  }

  static parse(electro: ElectroInstances): {name: string, instances: Instance[], queries: QueryRecord, actions: Record<string, {remove?: QueryMethod}>, scans: QueryRecord} {
    let name: string;
    let instances: Instance[] = [];
    let queries: QueryRecord = {};
    let actions: Record<string, InstanceActions> = {};
    let scans: QueryRecord = {};
    if (ElectroInstance.isEntity(electro)) {
      name = electro.model.entity;
      let instance = new EntityInstance(name, electro.model.service, electro)
      scans[name] = () => electro.scan;
      instances.push(instance);
      for (let accessPattern in electro.query) {
        /** Using `find` instead of `query` here to allow queries to turn into scans if not all values are provided **/
        queries[accessPattern] = (facets: object) => electro.query[accessPattern](facets);
        // queries[accessPattern] = electro.query[accessPattern];
        /** -------------------------------------------------------------------------------------------------------- **/
      }
      actions[name] = {
        remove: (facets: object) => electro.delete(facets), 
        create: (facets: object) => electro.create(facets),
        patch: (facets: object) => electro.patch(facets),
      };
    } else if (ElectroInstance.isService(electro)) {
      name = electro.service.name;
      for (let entity of Object.values(electro.entities)) {
        instances.push(new EntityInstance(entity.model.entity, electro.service.name, entity));
        scans[entity.model.entity] = () => entity.scan;
        for (let accessPattern in entity.query) {
          /** Using `find` instead of `query` here to allow queries to turn into scans if not all values are provided **/
          // queries[accessPattern] = (facets: object) => entity.find(facets);
          queries[accessPattern] = (facets: object) => entity.query[accessPattern](facets);
          /** -------------------------------------------------------------------------------------------------------- **/
        }
        actions[entity.model.entity] = {
          remove: (facets: object) => entity.delete(facets), 
          create: (facets: object) => entity.create(facets),
          patch: (facets: object) => entity.patch(facets),
        };
        // queries.delete = entity.delete;
      }
      for (let collection of Object.keys(electro.collectionSchema)) {
        instances.push(new CollectionInstance(collection, electro.service.name, electro.collectionSchema[collection]));
      }
      for (let collection in electro.collections) {
        queries[collection] = electro.collections[collection];
      }
    } else {
      throw new Error("File does not export instance of either Entity or Service. Additionally, make sure are using the latest ElectroDB.");
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
    this.type = this.isService ? "service" : "entity";
  }

  setName(name: string) {
    this.name = name;
  }

  getInstance(accessPattern: string): undefined | Instance {
    return this.instances.find(instance => instance.hasAccessPattern(accessPattern));
  }

  eachQuery(cb: EachQueryCallback) {
    for (let [accessPattern, query] of Object.entries(this.queries)) {
      let instance = this.getInstance(accessPattern);
      if (instance) {
        cb(this.name, accessPattern, instance, query, this.actions[instance.name])
      }
    }
    return this;
  }

  eachRemove(cb: EachQueryCallback) {
    for (let instance of this.instances) {
      let actions = this.actions[instance.name];
      if (actions && actions.remove) {
        cb(this.name, instance.getAccessPatternName(), instance, actions.remove, actions);
      }
    }
    return this;
  }

  eachCreate(cb: EachQueryCallback) {
    for (let instance of this.instances) {
      let actions = this.actions[instance.name];
      if (actions && actions.create) {
        cb(this.name, instance.getAccessPatternName(), instance, actions.create, actions);
      }
    }
    return this;
  }

  eachPatch(cb: EachQueryCallback) {
    for (let instance of this.instances) {
      let actions = this.actions[instance.name];
      if (actions && actions.patch) {
        cb(this.name, instance.getAccessPatternName(), instance, actions.patch, actions);
      }
    }
    return this;
  }
}

export type EachQueryCallback = (serviceName: string, accessPatternName: string, entity: Instance, query: QueryMethod, actions: InstanceActions) => void;

type AttributeFilterOperation = Record<FilterOperation, (value1: string, value2?: string) => string>
type AttributeFilter = Record<string, AttributeFilterOperation>
const whereAttributeSymbol: unique symbol = Symbol("where");
type WhereAttribute = typeof whereAttributeSymbol
export type AttributeWhere = Record<string, WhereAttribute>
export type OperationWhere = Record<FilterOperation, (attr: WhereAttribute, value1?: string|number|boolean, value2?: string|number|boolean) => string>

export type QueryConfiguration = {params?: {TableName?: string, Limit?: number}, raw?: boolean, table?: string};

export type QueryOperation = {
  set?: (facets: object) => QueryOperation;
  go: (config: QueryConfiguration) => Promise<object>;
  params: (config: QueryConfiguration) => object;
  filter: (cb: (attr: AttributeFilter) => string) => QueryOperation
  where: (cb: (attr: AttributeWhere, op: OperationWhere) => string) => QueryOperation
};

export type QueryMethod = (facets: object) => QueryOperation;

function parseClientParams(params?: string): [boolean, object] {
  if (params) {
    try {
      let p = JSON.parse(params);
      return [true, p];
    } catch(err) {
      return [false, {}];
    }
  }
  return [true, {}];
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

  isElectroInstance(instance: any): instance is ElectroInstances {
      return instance && instance._instance !== undefined;
  }

  get({table, params}: {table?: string, params?: string} = {}): [ElectroInstanceType, ElectroInstances] {
    try {
      let [isValid, parameters] = parseClientParams(params);
      if (!isValid) {
        throw new Error(`Provided parameters are not valid JSON: ${params}`);
      }
      const instance = require(this.filePath);
      const config: DynamoDB.Types.ClientConfiguration = parameters || {};
      const client = new DynamoDB.DocumentClient(config);
      if (this.isElectroInstance(instance)) {
        if (Object.keys(config).length) {
          instance.client = client;
        }
        if (table) {
          instance._setTableName(table)
        }
        // @ts-ignore
        return [instance._instance.description || instance._instanceType, instance];
      } else {
        // expecting Entity Model, use constructor to validate entity: constructor will throw in invalid.
        try {
          new Entity(instance, {table: "_", client});
        } catch(err) {
          throw new Error(`File specified (${this.filePath}) is not a valid ElectroDB Service, Entity, or Model: \r\n\t${err.message}`);
        }
        let entity = new Entity(instance, {table, client});
        if (table) {
          entity._setTableName(table);
        }
        return ["model", entity];
      }
    } catch(err) {
      throw err;
    }
  }
}