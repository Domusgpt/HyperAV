// controllers/PMKDataAdapter.js
/**
 * @file PMKDataAdapter.js
 * @description Adapts data from the Parserator Micro-Kernel (PMK)
 * for the VisualizerController.
 */

export class PMKDataAdapter {
  constructor(visualizerController, mappingRules = null) {
    if (!visualizerController) {
      throw new Error("PMKDataAdapter requires a VisualizerController instance.");
    }
    this.viz = visualizerController;
    this.defaultMappingRules = {
        // Example default rules:
        // ubo: [
        //   { snapshotField: 'pmk_confidence', uboChannelIndex: 0, defaultValue: 0 },
        //   { snapshotField: 'pmk_complexity', uboChannelIndex: 1, defaultValue: 0.5 }
        // ],
        // direct: {
        //   'pmk_status': { coreStateName: 'statusColor', defaultValue: [0.5,0.5,0.5], transform: {name: 'stringToEnum', map: {}, defaultOutput: [0.5,0.5,0.5]}}
        // }
    };

    if (mappingRules) {
      this.viz.setDataMappingRules(mappingRules);
    } else if (Object.keys(this.defaultMappingRules).length > 0 && (this.defaultMappingRules.ubo?.length || this.defaultMappingRules.direct)) { // Check if default rules are non-empty
      console.log("PMKDataAdapter: Applying default mapping rules.");
      this.viz.setDataMappingRules(this.defaultMappingRules);
    }
    console.log("PMKDataAdapter initialized.");
  }

  processPMKUpdate(pmkDataSnapshot) {
    console.log("PMKDataAdapter: processPMKUpdate called with", pmkDataSnapshot);
    // Example: Direct data update
    this.viz.updateData(pmkDataSnapshot);

    // Example: Schema-driven visualization changes
    if (pmkDataSnapshot.schema && pmkDataSnapshot.schema.type) {
      const schemaType = pmkDataSnapshot.schema.type;
      // This map would need to be defined or configurable
      const schemaToGeometryMap = {
          'contact': 'hypersphere',
          'document': 'hypercube',
          'default_schema': 'duocylinder', // Matched default from AdaptiveSchemaGraph
          'text_block': 'hypertetrahedron' // Example
      };
      const targetPolytope = schemaToGeometryMap[schemaType.toLowerCase()] || 'hypercube'; // Use toLowerCase for robustness
      console.log(`PMKDataAdapter: Setting polytope to '${targetPolytope}' based on schema type '${schemaType}'`);
      this.viz.setPolytope(targetPolytope);
    }

    // Example: Error or anomaly visualization
     if (pmkDataSnapshot.errors && Array.isArray(pmkDataSnapshot.errors) && pmkDataSnapshot.errors.length > 0) { // Check if array
         console.log(`PMKDataAdapter: Visualizing ${pmkDataSnapshot.errors.length} errors.`);
         this.viz.setVisualStyle({
             core: { glitchIntensity: Math.min(pmkDataSnapshot.errors.length * 0.1, 1.0) }
             // Maybe change color scheme too, e.g., shift to red tones
         });
     } else if (pmkDataSnapshot.hasOwnProperty('errors')) { // Reset if errors property exists but is empty or not an array
        this.viz.setVisualStyle({ core: { glitchIntensity: 0.0 }});
     }
  }

  async processAndVisualize(pmkInstance, input, context = {}) { // Added context as param
     // Example of a more complete processing loop if PMK instance is passed
     if (!pmkInstance || typeof pmkInstance.parseWithContext !== 'function') {
         console.error("PMKDataAdapter: Invalid PMK instance provided to processAndVisualize.");
         return null;
     }
     // Use provided context or default if not provided
     const parseContext = { temperature: 0.7, abstractionWeight: 0.5, ...context };
     const parseResults = await pmkInstance.parseWithContext(input, parseContext);

     // Prepare a snapshot for the visualizer
     const vizSnapshot = {
         pmk_metrics: parseResults.metadata, // Contains focusParams, pppProjection
         parsed_data: parseResults.data,
         confidence: parseResults.confidence,
         iterations: parseResults.iterations,
         errors: parseResults.errors || [], // Ensure errors array exists
         schema: parseResults.schema || { type: 'unknown' }, // Ensure schema object exists
         timestamp: Date.now()
     };
     this.processPMKUpdate(vizSnapshot); // Use the existing method to update viz
     return parseResults;
  }
}
export default PMKDataAdapter;
