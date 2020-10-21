import Handlebars from "./handlebars";
import fs from "fs";
import {ElectroInstance, ElectroInstanceType, IndexTypes, InstanceAccessType, Instance, Facet, Attribute} from "./instance";

type AttributeDetail = {
  type: string;
  name: string;
  optional: boolean;
  readonly: boolean;
}

type AttributeEnums = {
  name: string;
  values: string[];
}

export type FacetDetail = {
  key: IndexTypes;
  name: string;
  type: string;
}

type IndexDetail = {
  hasSK: boolean;
  name: string;
  typeName: string;
  index?: string;
  facets: FacetDetail[];
}

type TemplateDataInstance = {
  name: string;
  type: InstanceAccessType;
  attributes: AttributeDetail[];
  enums: AttributeEnums[];
  facets: FacetDetail[];
  item: Object;
  keyNames: string[];
  tableIndexName: string;
  tableIndexFields: string[];
  indexes: IndexDetail[];
  attributeNames: string[]
}

type TemplateData = {
  isService: boolean;
  export: string;
  instances: TemplateDataInstance[];
}

export default class InstanceTemplater extends ElectroInstance {
  private handlebars = Handlebars;
  
  constructor(electro: ElectroInstanceType) {
    super(electro);
    this.handlebars = Handlebars;
  }

  private formatAttributeType(name: string, type: string): string { 
    if (type === "enum") {
      return `${name}_enum`;
    } else {
      return type;
    }
  }

  private formatAccessPatternName(name: string): string {
    return `${name}_index`;
  }

  private formatAttributes(attributes: Record<string, Attribute>): AttributeDetail[] {
    return Object.values(attributes).map(attr => {
      let type = this.formatAttributeType(attr.name, attr.type);
      return {
        name: attr.name,
        type: type,
        readonly: attr.readOnly,
        optional: !attr.required,
      }
    });
  }

  private formatAttributeEnums(attributes: Record<string, Attribute>): AttributeEnums[] {
    let attributeEnums: AttributeEnums[] = [];
    for (let attribute of Object.values(attributes)) {
      if (attribute.type === "enum") {
        attributeEnums.push({
          name: this.formatAttributeType(attribute.name, attribute.type),
          values: [...attribute.enumArray]
        })
      }
    }
    return attributeEnums;
  }

  private formatFacets(facets: Facet[], attributes: Record<string, Attribute>): FacetDetail[] {
    let facetDetail: FacetDetail[] = [];
    for (let facet of facets) {
      facetDetail.push({
        key: facet.type,
        name: facet.name,
        type: this.formatAttributeType(facet.name, attributes[facet.name].type)
      });
    }
    return facetDetail;
  }

  private formatIndexes(instance: Instance): IndexDetail[] {
    let indexes = instance.getIndexes();
    return indexes.map(index => {
      let accessPattern = instance.getAccessPatternName(index.index)
      return {
        typeName: this.formatAccessPatternName(accessPattern),
        name: accessPattern,
        hasSK: instance.hasSK(),
        index: index.index === "" ? undefined : accessPattern,
        facets: this.formatFacets(instance.getFacets(index.index), instance.getAttributes())
      }
    })
  }

  private template(data: TemplateData, templateFileName: string): string {
    let templateFile = fs.readFileSync(templateFileName, "utf8");
    let templater = this.handlebars.compile(templateFile);
    return templater(data);
  }

  compile(templateFileName: string): string {
    let templateData: TemplateData = {
      isService: this.isService,
      export: this.name,
      instances: []
    };
    for (let instance of this.instances) {
      let attributes = instance.getAttributes();
      let facets = instance.getFacets();
      templateData.instances.push({
        name: instance.name,
        type: instance.type,
        attributes: this.formatAttributes(attributes),
        enums: this.formatAttributeEnums(attributes),
        facets: this.formatFacets(facets, attributes),
        item: instance.getItem(),
        keyNames: instance.getAllKeyFieldNames(),
        tableIndexName: this.formatAccessPatternName(instance.getAccessPatternName()),
        tableIndexFields: instance.getKeyFieldNames(),
        indexes: this.formatIndexes(instance),
        attributeNames: Object.keys(attributes)
      })
    }
    return this.template(templateData, templateFileName);
  }

  async write(fileName: string, contents: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, contents, {encoding: 'utf8', flag: 'w'}, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
      });
    });
  }
}