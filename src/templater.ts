import Handlebars from "./handlebars";
import {ElectroInstance, ElectroInstances, IndexTypes, InstanceAccessType, Instance, Facet, Attribute, ElectroInstanceType} from "./instance";
import {LocalFile} from "./files";
import {pascal} from "./handlebars";

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
  staticProperties: {name: string, value: string}[]
}

type TemplateData = {
  type: ElectroInstanceType
  isService: boolean;
  export: string;
  instances: TemplateDataInstance[];
}

export default class InstanceTemplater extends ElectroInstance {
  private handlebars = Handlebars;
  
  constructor(electro: ElectroInstances) {
    super(electro);

    this.handlebars = Handlebars;
  }

  private formatAttributeType(name: string, type: string): string { 
    if (type === "enum") {
      return `${pascal(name)}Enum`;
    } else {
      return type;
    }
  }

  private formatAccessPatternName(name: string): string {
    return `${name}Index`;
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
      let hasSK = !!instance.getFacets(index.index).find(facet => facet.type === "sk");
      return {
        typeName: this.formatAccessPatternName(accessPattern),
        name: accessPattern,
        hasSK: hasSK,
        index: index.index === "" ? undefined : accessPattern,
        facets: this.formatFacets(instance.getFacets(index.index), instance.getAttributes())
      }
    })
  }

  private template(data: TemplateData, template: string): string {
    let templater = this.handlebars.compile(template);
    return templater(data);
  }

  compile(filePath: string, type: ElectroInstanceType): string {
    let file = new LocalFile<string>(filePath);
    file.test();
    let templateData: TemplateData = {
      type,
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
        attributeNames: Object.keys(attributes),
        staticProperties: instance.getStaticProperties()
      })
    }
    return this.template(templateData, file.read());
  }
}