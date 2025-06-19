// Placeholder for schemaToGeometryMap, actual map would be more extensive
const schemaToGeometryMap = {
  'default': 'hypercube',
  'contact': 'hypersphere',
  // ... other mappings
};

// Default PMK to Visualization Mappings (from pmk-integration.md)
const defaultPmkMappingRules = {
  ubo: {
    'architect.confidence': { channelIndex: 0 },
    'architect.planComplexity': { channelIndex: 1 },
    'architect.activeNodes': { channelIndex: 2, transform: 'normalize' },
    'extractor.load': { channelIndex: 8 },
    'extractor.throughput': { channelIndex: 9, transform: 'logScale' },
    'focus.temperature': { channelIndex: 16 },
    'focus.abstractionLevel': { channelIndex: 17 },
    'focus.contextWindow[0]': { channelIndex: 18 },
    'focus.contextWindow[1]': { channelIndex: 19 }
  },
  direct: {
    'schema.type': {
      stateName: 'geometryType',
      transform: (type) => schemaToGeometryMap[type] || 'hypercube'
    },
    'system.glitchLevel': { stateName: 'glitchIntensity' },
    'system.morphState': { stateName: 'morphFactor' }
  }
};

export class PMKDataAdapter {
  constructor(visualizerController, initialRules) {
    if (!visualizerController) {
      throw new Error("PMKDataAdapter: VisualizerController instance is required.");
    }
    this.vizController = visualizerController;
    this.schemaToGeometryMap = { ...schemaToGeometryMap }; // Allow modification later
    this.mappingRules = JSON.parse(JSON.stringify(initialRules || defaultPmkMappingRules));
    this.transformations = {
      normalize: (value) => { console.log(`Transform: normalize(${value})`); return value; /* Placeholder */ },
      logScale: (value) => { console.log(`Transform: logScale(${value})`); return value > 0 ? Math.log(value) : 0; /* Basic placeholder */ }
    };
    console.log("PMKDataAdapter initialized.");
  }

  setDataMappingRules(rules) {
    if (!rules) {
      console.warn("PMKDataAdapter.setDataMappingRules: No rules provided. Using default rules.");
      this.mappingRules = JSON.parse(JSON.stringify(defaultPmkMappingRules));
    } else {
      this.mappingRules = JSON.parse(JSON.stringify(rules)); // Deep copy
    }
    console.log("PMKDataAdapter: Mapping rules updated.");
  }

  // Helper to get nested values from object based on string path
  getValueFromPath(obj, path) {
    if (obj === undefined || obj === null) return undefined;
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.'); // Handle array indices like '[0]'
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined; // Path does not exist
      }
    }
    return current;
  }

  processPMKUpdate(dataSnapshot) {
    if (!dataSnapshot) {
      console.error("PMKDataAdapter.processPMKUpdate: No dataSnapshot provided.");
      return;
    }
    console.log("PMKDataAdapter.processPMKUpdate received snapshot:", dataSnapshot);

    const uboData = {}; // Using an object for sparse updates, controller can map to array
    const directParams = {};

    // Process UBO mappings
    if (this.mappingRules.ubo) {
      for (const path in this.mappingRules.ubo) {
        const rule = this.mappingRules.ubo[path];
        let value = this.getValueFromPath(dataSnapshot, path);

        if (value !== undefined && rule.transform && this.transformations[rule.transform]) {
          value = this.transformations[rule.transform](value);
        } else if (value !== undefined && rule.transform && typeof rule.transform === 'function') {
          // Support inline transform functions in rules if ever needed
          value = rule.transform(value);
        }

        if (value !== undefined) {
          uboData[rule.channelIndex] = value;
        } else {
          console.warn(`PMKDataAdapter: Value for UBO path "${path}" not found in snapshot or rule problem.`);
        }
      }
    }

    // Process direct parameter mappings
    if (this.mappingRules.direct) {
      for (const path in this.mappingRules.direct) {
        const rule = this.mappingRules.direct[path];
        let value = this.getValueFromPath(dataSnapshot, path);

        if (value !== undefined && rule.transform && this.transformations[rule.transform]) {
          // This specific direct rule has a custom transform in the example not in this.transformations
          if (path === 'schema.type' && typeof rule.transform === 'function') {
             value = rule.transform(value); // Uses the lambda from the rule
          } else {
             value = this.transformations[rule.transform](value);
          }
        } else if (value !== undefined && typeof rule.transform === 'function') {
          value = rule.transform(value);
        }

        if (value !== undefined) {
          directParams[rule.stateName] = value;
        } else {
          console.warn(`PMKDataAdapter: Value for direct param path "${path}" not found in snapshot.`);
        }
      }
    }

    // Log what would be sent to VisualizerController
    // In a real scenario, you'd call methods on this.vizController
    console.log("PMKDataAdapter: Processed UBO data:", uboData);
    console.log("PMKDataAdapter: Processed Direct Parameters:", directParams);

    // Example calls (assuming these methods exist on VisualizerController)
    if (this.vizController && typeof this.vizController.updateUBOChannels === 'function') {
       // this.vizController.updateUBOChannels(uboData); // Assuming uboData is an object { channelIdx: value, ... }
    } else {
       // console.warn("PMKDataAdapter: vizController.updateUBOChannels is not a function or vizController not set.");
    }
    if (this.vizController && typeof this.vizController.updateDirectParameters === 'function') {
       // this.vizController.updateDirectParameters(directParams);
    } else {
       // console.warn("PMKDataAdapter: vizController.updateDirectParameters is not a function or vizController not set.");
    }
     if (this.vizController && typeof this.vizController.updateData === 'function') {
        // The VisualizerController from previous setup has an updateData method
        // that might take a combined object or handle UBOs/direct params internally.
        // For now, this is a placeholder for how PMKDataAdapter communicates.
        // This might be the primary method to call.
        // Let's assume for now it expects an object similar to what VisualizerController's own updateData expects
        // The current VisualizerController.updateData() seems to handle nested objects directly.
        // So PMKDataAdapter's role is to *transform* the PMK snapshot into the structure
        // that VisualizerController.updateData() can most easily consume.

        // For this step, we'll just log the processed data. Integration with actual
        // VisualizerController methods will be part of a later step or test.
     }

  }
}
