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
      ubo: [
        { snapshotField: 'architect.confidence', uboChannelIndex: 0, defaultValue: 0.5 },
        { snapshotField: 'architect.planComplexity', uboChannelIndex: 1, defaultValue: 0.5 },
        // ... other architect fields
        { snapshotField: 'extractor.load', uboChannelIndex: 8, defaultValue: 0.1 },
        // ... other extractor fields
        {
          snapshotField: 'focus.temperature',
          uboChannelIndex: 16,
          defaultValue: 0.5, // Mid-range for normalized output
          transform: { name: 'linearScale', domain: [0.1, 2.0], range: [0, 1] }
        },
        // ... other focus fields
        { snapshotField: 'ppp_data.activeProjections', uboChannelIndex: 24, defaultValue: 0},
        { snapshotField: 'thought_buffer_data.activityLevel', uboChannelIndex: 25, defaultValue: 0},

      ],
      direct: {
        'schema.type': {
          coreStateName: 'geometryType',
          defaultValue: 'hypercube',
          transform: (value) => { // Inline transform function example
            const schemaToGeometryMap = {
              'document': 'hypercube',
              'code': 'duocylinder',
              'data_stream': 'hypersphere',
              'hierarchical_logic': 'hypertetrahedron',
              'complex_event': 'fullscreenlattice', // Example for a more abstract type
              'default': 'hypercube'
            };
            return schemaToGeometryMap[value?.toLowerCase()] || 'hypercube';
          }
        },
        'system.glitchLevel': { // Example: PMK might output a direct glitch level
            coreStateName: 'glitchIntensity',
            defaultValue: 0.0
        },
        'system.errorState': { // Example: PMK indicates an error state
            coreStateName: 'colorScheme', // This will merge with existing colorScheme
            defaultValue: null, // No change if not present
            transform: (value, currentColorScheme) => {
                if (value === 'critical') return { ...currentColorScheme, primary: [1,0,0], secondary: [0.8,0,0]};
                if (value === 'warning') return { ...currentColorScheme, primary: [1,0.5,0], secondary: [0.8,0.4,0]};
                return currentColorScheme; // No change or revert to a default
            }
        }
      }
    };

    if (mappingRules) {
      this.viz.setDataMappingRules(mappingRules);
    } else {
      console.log("PMKDataAdapter: Applying default mapping rules.");
      this.viz.setDataMappingRules(this.defaultMappingRules);
    }
    console.log("PMKDataAdapter initialized.");
  }

  _getVisualStyleForSchema(schema) {
    const style = { core: {}, colors: {} };
    if (!schema || typeof schema.confidence === 'undefined') {
        // Default stable look if no schema confidence
        style.core = { patternIntensity: 0.5, rotationSpeed: 0.3 };
        style.colors = { primary: [0.2, 0.7, 1.0], secondary: [0.5, 1.0, 1.0] }; // Cool blues
        return style;
    }

    if (schema.confidence > 0.9) {
      style.core.patternIntensity = 0.3; // More stable look
      style.core.rotationSpeed = 0.25;
      style.colors.primary = [0.2, 0.8, 1.0]; // Cool, stable color
      style.colors.secondary = [0.4, 0.9, 1.0];
    } else if (schema.confidence < 0.5) {
      style.core.patternIntensity = 1.5; // More chaotic look
      style.core.rotationSpeed = 0.7;
      style.colors.primary = [1.0, 0.6, 0.2]; // Warmer, volatile color
      style.colors.secondary = [1.0, 0.8, 0.4];
    } else { // Mid-confidence
      style.core.patternIntensity = 0.8;
      style.core.rotationSpeed = 0.4;
      style.colors.primary = [0.1, 1.0, 0.7]; // Balanced green/cyan
      style.colors.secondary = [0.3, 1.0, 0.8];
    }
    // Example: Use schema complexity to adjust line thickness
    if (schema.complexity && schema.complexity > 5) {
        style.core.lineThickness = 0.015; // Thinner lines for complex schemas
    } else {
        style.core.lineThickness = 0.03; // Standard thickness
    }
    return style;
  }

  processPMKUpdate(pmkDataSnapshot) {
    console.log("PMKDataAdapter: processPMKUpdate called with snapshot:", JSON.stringify(pmkDataSnapshot, null, 2).substring(0, 500) + "...");

    // Handle Data Update (will apply transforms defined in rules)
    this.viz.updateData(pmkDataSnapshot);

    // Schema-Driven Visualization (Geometry and Style)
    if (pmkDataSnapshot.schema) {
      const schema = pmkDataSnapshot.schema;
      // Geometry selection is handled by the 'schema.type' direct mapping rule.
      // Style selection:
      const visualStyle = this._getVisualStyleForSchema(schema);
      if (Object.keys(visualStyle.core).length > 0 || Object.keys(visualStyle.colors).length > 0) {
          console.log("PMKDataAdapter: Applying visual style for schema", schema.type, visualStyle);
          this.viz.setVisualStyle(visualStyle);
      }
    }

    // Bayesian Focus/PPP/Thought Buffer Data Handling (Logging Placeholders)
    if (pmkDataSnapshot.ppp_data) {
        console.log("PMKDataAdapter: Received PPP data. Example fields could be:",
          JSON.stringify(pmkDataSnapshot.ppp_data, null, 2).substring(0, 200) + "...",
          "Potential mappings: activeProjections, temporalDistribution, probabilityDensity.");
        // Example: this.viz.updateData({ ppp_active_projections: pmkDataSnapshot.ppp_data.activeProjectionsCount });
    }
    if (pmkDataSnapshot.thought_buffer_data) {
        console.log("PMKDataAdapter: Received Thought Buffer data. Example fields could be:",
          JSON.stringify(pmkDataSnapshot.thought_buffer_data, null, 2).substring(0, 200) + "...",
          "Potential mappings: activityLevel, bufferSize, recentEntryTypes.");
        // Example: this.viz.updateData({ thought_buffer_level: pmkDataSnapshot.thought_buffer_data.activityLevel });
    }

    // Error and Anomaly Handling
    let currentGlitchIntensity = this.viz.core.state.glitchIntensity || 0;
    let visualStyleUpdate = { core: {}, colors: {} };
    let needsStyleUpdate = false;

    if (pmkDataSnapshot.circularDependencies?.detected === true) {
        console.warn("PMKDataAdapter: Circular dependency detected! Switching to fullscreenlattice.");
        this.viz.setPolytope('fullscreenlattice'); // Switch to a specific visualization for this state
        // Update specific lattice parameters via updateData, assuming they are mapped
        this.viz.updateData({
            lattice_distortionFactor: pmkDataSnapshot.circularDependencies.severity || 0.5,
            lattice_moireIntensity: 0.8
        });
        visualStyleUpdate.core.glitchIntensity = 0.7; // High glitch for this specific anomaly
        visualStyleUpdate.colors.primary = [0.8, 0.1, 0.8]; // Distinct color for circular dependency
        needsStyleUpdate = true;
    } else if (pmkDataSnapshot.errors && Array.isArray(pmkDataSnapshot.errors) && pmkDataSnapshot.errors.length > 0) {
        console.warn(`PMKDataAdapter: Visualizing ${pmkDataSnapshot.errors.length} errors.`);
        visualStyleUpdate.core.glitchIntensity = Math.min(currentGlitchIntensity + pmkDataSnapshot.errors.length * 0.1, 1.0);
        visualStyleUpdate.colors.primary = [1.0, 0.0, 0.0]; // Red for errors
        visualStyleUpdate.colors.secondary = [0.8, 0.0, 0.0];
        needsStyleUpdate = true;
    } else if (pmkDataSnapshot.hasOwnProperty('errors') || pmkDataSnapshot.hasOwnProperty('circularDependencies')) {
        // Reset to normal if error/anomaly fields are present but clear
        if (currentGlitchIntensity > 0) { // Only reset if it was previously glitched by errors
            visualStyleUpdate.core.glitchIntensity = 0.0;
            // Consider reverting colors to schema-default or a neutral default
            // This might require getting the current schema's style again or having a "neutral" style.
            // For now, just resetting glitch. Color will be reset by next schema style update.
            needsStyleUpdate = true;
        }
    }

    if(needsStyleUpdate){
        this.viz.setVisualStyle(visualStyleUpdate);
    }
  }

  async processAndVisualize(pmkInstance, input, context = {}) {
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
