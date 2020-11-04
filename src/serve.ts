import express from "express";
import bodyParser from "body-parser";
import {ElectroInstance, Facet, Instance, InstanceActions, QueryMethod} from "./instance";
import {getFacetPermutations} from "./handlebars";
import {applyFilter, parseFilters, RequestFilters} from "./query";

const app = express();

function queryController(name: string, accessPattern: string, entity: Instance, query: QueryMethod, actions: InstanceActions) {
  let index = entity.getIndexName(accessPattern);
  let facets: Facet[] = entity.getFacets(index);
  let facetDetail = facets.map(facet => ({key: facet.type, name: facet.name, type: facet.type}));
  let attributes = Object.keys(entity.getAttributes());
  for (let permutation of getFacetPermutations(facetDetail)) {
    let endpoint = formatEndpoint(permutation, name, accessPattern)
    console.log("   GET", endpoint);
    app.get(endpoint, async (req, res, next) => {
      try {
        let filters = (req.query.filter || []) as RequestFilters;
        let parsed = parseFilters(attributes, filters);
        let db = applyFilter(query(req.params), parsed);
        let data: any = [];
        if (req.query.params) {
          data = db.params({});
        } else {
          data = await applyFilter(query(req.params), parsed).go({}); 
        }
        return res.send({data, message: ""});
      } catch(err) {
        res.status(500).send({
          message: err.message,
          data: {}
        });
      }
    });
  }
}

function patchController(name: string, accessPattern: string, entity: Instance, patch: QueryMethod, actions: InstanceActions) {
  let facets = entity.getFacets() || [];
  let attributes = Object.keys(entity.getAttributes());
  let endpoint = formatEndpoint(facets, name, accessPattern);
  console.log("   PUT", endpoint);
  app.put(endpoint, async (req, res, next) => {
    try {
      let filters = (req.query.filter || []) as RequestFilters;
      let parsed = parseFilters(attributes, filters);
      let data = req.params;
      let message = "Updated!";
      let query = patch(req.params)
      if (query.set) {
        query = query.set(req.body)
      }
      query = applyFilter(query, parsed);
      await query.go({});
      return res.send({data, message});
    } catch(err) {
      res.status(500).send({
        message: err.message,
        data: {}
      });
    }
  });
}

function createController(name: string, accessPattern: string, entity: Instance, create: QueryMethod, actions: InstanceActions) {
  let attributes = Object.keys(entity.getAttributes());
  let endpoint = formatEndpoint([], name, accessPattern);
  console.log("  POST", endpoint);
  app.post(endpoint, async (req, res, next) => {
    try {
      let filters = (req.query.filter || []) as RequestFilters;
      let parsed = parseFilters(attributes, filters);
      let data = await applyFilter(create(req.body), parsed).go({});
      let message = "Created!";
      return res.send({data, message});
    } catch(err) {
      res.status(500).send({
        message: err.message,
        data: {}
      });
    }
  });
}

function deleteController(name: string, accessPattern: string, entity: Instance, remove: QueryMethod, actions: InstanceActions) {
  let facets = entity.getFacets() || [];
  let attributes = Object.keys(entity.getAttributes());
  let endpoint = formatEndpoint(facets, name, accessPattern);
  console.log("DELETE", endpoint);
  app.delete(endpoint, async (req, res, next) => {
    try {
      let filters = (req.query.filter || []) as RequestFilters;
      let parsed = parseFilters(attributes, filters);
      let data = req.params;
      let message = "Removed!";
      await applyFilter(remove(req.params), parsed).go({});
      return res.send({data, message})
    } catch(err) {
      res.status(500).send({
        message: err.message,
        data: {}
      });
    }
  });
}

function formatEndpoint(facets: {name: string, type: string}[], ...prefixes: string[]) {
  let endpoint = ""
  for (let prefix of prefixes) {
    endpoint += `/${prefix.toLowerCase()}`;
  }
  return [endpoint, ...facets.map(facet => `:${facet.name}`)].join("/");
}

export default function(port: number, electroInstances: ElectroInstance[]) {
  if (electroInstances.length === 0) {
    console.log("No services found. Add some with 'electro add <filePath>'.")
  }
  
  app.set("port", port);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  for (let service of electroInstances) {
    console.log("");
    service
      .eachCreate(createController)
      .eachRemove(deleteController)
      .eachPatch(patchController)
      .eachQuery(queryController)
  }

  app.listen(app.get("port"), () => {
    console.log("");
    console.log(
        "   App is running at http://localhost:%d in %s mode",
        app.get("port"),
        app.get("env")
    );
    console.log("   Press CTRL-C to stop\n");
  });
}
