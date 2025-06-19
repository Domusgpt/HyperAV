// controllers/PMKDataAdapter.js

// Placeholder for schemaToGeometryMap, actual map would be more extensive
// This map helps PMKDataAdapter decide which geometry to request from VisualizerController
// based on the type of schema currently active in the PMK (e.g., KerbelizedParserator).
const schemaToGeometryMap = {
  'default': 'hypercube', // Fallback geometry
  'base_schema': 'hypersphere', // Example mapping
  'contact_extraction_v1': 'duocylinder', // Example mapping
  'email_templ_v0': 'hypertetrahedron', // Example mapping for a generated schema
  'date_templ_v0': 'hypercube', // Example
  // ... other mappings for known schema IDs or types
};

export class PMKDataAdapter {
  constructor(visualizerController) {
    if (!visualizerController) {
      console.error("PMKDataAdapter: VisualizerController instance is required.");
      throw new Error("PMKDataAdapter: VisualizerController instance is required.");
    }
    this.vizController = visualizerController;
    // schemaToGeometryMap can be made configurable if needed in the future
    this.schemaToGeometryMap = { ...schemaToGeometryMap };
    console.log("PMKDataAdapter initialized (simplified - passes structured dataSnapshot to VisualizerController).");
  }

  // The `setDataMappingRules` method, if it existed here, would be for PMKDataAdapter's own internal
  // transformation rules if it were doing more complex field mapping beyond direct extraction.
  // Since VisualizerController now handles the detailed mapping from snapshotField to UBO/directCoreParam,
  // PMKDataAdapter's primary job is to create a well-structured snapshotForViz.

  processPMKUpdate(pmkResult) {
    if (!pmkResult) {
      console.error("PMKDataAdapter.processPMKUpdate: No pmkResult provided.");
      return;
    }
    console.log("PMKDataAdapter.processPMKUpdate received pmkResult:", JSON.stringify(pmkResult, null, 2));

    // 1. Prepare a generic dataSnapshot for VisualizerController's updateData method
    const snapshotForViz = {};

    if (pmkResult.confidence !== undefined) snapshotForViz.kp_confidence = pmkResult.confidence;
    if (pmkResult.iterations !== undefined) snapshotForViz.kp_iterations = pmkResult.iterations;
    if (pmkResult.schemaVersion !== undefined) snapshotForViz.kp_schema_version = pmkResult.schemaVersion;

    if (pmkResult.metadata) {
      if (pmkResult.metadata.schemaIdUsed) snapshotForViz.kp_schema_id_used = pmkResult.metadata.schemaIdUsed;
      if (pmkResult.metadata.focusParams) {
        if (pmkResult.metadata.focusParams.temperature !== undefined) snapshotForViz.kp_focus_temp = pmkResult.metadata.focusParams.temperature;
        if (pmkResult.metadata.focusParams.abstractionWeight !== undefined) snapshotForViz.kp_focus_weight = pmkResult.metadata.focusParams.abstractionWeight;
        if (pmkResult.metadata.focusParams.decisionSource) snapshotForViz.kp_focus_decision_source = pmkResult.metadata.focusParams.decisionSource;
        if (pmkResult.metadata.focusParams.goalUsed) snapshotForViz.kp_focus_goal_used = pmkResult.metadata.focusParams.goalUsed;
      }
      // Example: if pppProjectionDetails contains something simple to visualize
      if (pmkResult.metadata.pppProjectionDetails && pmkResult.metadata.pppProjectionDetails.relevanceScore !== undefined) {
          snapshotForViz.kp_ppp_relevance = pmkResult.metadata.pppProjectionDetails.relevanceScore;
      }
    }

    // Conceptual error count - assuming pmkResult might have an 'errors' array or similar field in future
    snapshotForViz.kp_error_count = (pmkResult.errors && Array.isArray(pmkResult.errors)) ? pmkResult.errors.length : 0;
    snapshotForViz.kp_payload_size = pmkResult.data ? JSON.stringify(pmkResult.data).length : 0;

    // 2. Call VisualizerController.updateData
    if (Object.keys(snapshotForViz).length > 0) {
        console.log("PMKDataAdapter: Calling vizController.updateData with snapshotForViz:", JSON.stringify(snapshotForViz, null, 2));
        this.vizController.updateData(snapshotForViz);
    } else {
        console.log("PMKDataAdapter: No data extracted from pmkResult for snapshotForViz. Skipping vizController.updateData.");
    }

    // 3. Call VisualizerController.setPolytope based on schema type
    if (pmkResult.metadata && pmkResult.metadata.schemaIdUsed) {
        const schemaId = pmkResult.metadata.schemaIdUsed;
        // Attempt to find a specific match, then a match based on generic part of ID, then default
        let geometryName = this.schemaToGeometryMap[schemaId];
        if (!geometryName) {
            const baseSchemaType = schemaId.split('_')[0]; // e.g., "email" from "email_templ_v0"
            geometryName = this.schemaToGeometryMap[baseSchemaType] || this.schemaToGeometryMap['default'] || 'hypercube';
        }

        console.log(`PMKDataAdapter: Calling vizController.setPolytope('${geometryName}') based on schemaId '${schemaId}'.`);
        this.vizController.setPolytope(geometryName);
    }

    // 4. Call VisualizerController.setVisualStyle based on conditions
    if (snapshotForViz.kp_error_count > 0) {
        console.log("PMKDataAdapter: Setting error visual style due to kp_error_count > 0.");
        this.vizController.setVisualStyle({ glitchIntensity: 0.6, colorScheme: { primary: [0.8,0.1,0.1,1.0], secondary: [1,0.5,0.5,1.0] } });
    } else if (pmkResult.confidence !== undefined && pmkResult.confidence > 0.9) {
        console.log("PMKDataAdapter: Setting high-confidence visual style.");
        this.vizController.setVisualStyle({ glitchIntensity: 0.0, colorScheme: { primary: [0.1,0.8,0.1,1.0], secondary: [0.5,1,0.5,1.0] } });
    } else {
        console.log("PMKDataAdapter: Setting/resetting to default/no-error visual style.");
        this.vizController.setVisualStyle({ glitchIntensity: 0.0 }); // Explicitly reset or set to a 'normal' style
    }
  }
}
