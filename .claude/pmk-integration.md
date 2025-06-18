# PMK Integration Guide for HyperAV

This document outlines the integration strategy for the Parserator Micro-Kernel (PMK) with the HyperAV (Headless Agentic Polytope Visualizer).

## 1. Overview

The PMK processes input data (text, code, etc.) through a series of parsing stages, guided by adaptive schemas and focus optimization. The HyperAV visualizer provides a dynamic, N-dimensional representation of the PMK's internal state, data structures, and processing metrics. The goal is to create a "semantic dashboard" that reflects the PMK's understanding and reasoning processes.

## 2. Data Flow PMK -> HyperAV

1.  **PMK Processing:** PMK ingests input, applies parsing logic using `KerbelizedParserator`, adapts schemas via `AdaptiveSchemaGraph`, and optimizes focus with `BayesianFocusOptimizer` and `TimestampedThoughtBuffer`.
2.  **Output Snapshot:** At key stages or upon request, PMK (or an adapter) generates a `dataSnapshot` object. This snapshot contains:
    *   Raw and processed data elements.
    *   Confidence scores, ambiguity metrics.
    *   Active schema identifiers and parameters.
    *   Focus optimizer state (e.g., temperature, weights).
    *   PPP (Probabilistic Projection Parsing) projection data.
    *   Error and anomaly information.
    *   Computational cost / iteration counts.
3.  **`PMKDataAdapter`:** A dedicated adapter class (`controllers/PMKDataAdapter.js`) receives the `dataSnapshot` from PMK.
4.  **Data Transformation & Mapping:**
    *   `PMKDataAdapter` uses `VisualizerController.setDataMappingRules()` to configure how snapshot fields map to UBO channels or direct visualizer parameters. These rules can include transformations from `TransformFunctions.js`.
    *   `PMKDataAdapter` then calls `VisualizerController.updateData(transformedSnapshot)` to send the processed data to the visualizer.
5.  **Visualization Update:** `HypercubeCore` updates its UBOs and internal state based on the data received from `VisualizerController`, leading to a change in the visualization.

## 3. Key Integration Points & Visualization Strategies

### 3.1. Schema-Driven Visualization

*   **Concept:** The active schema in PMK's `AdaptiveSchemaGraph` dictates the "shape" and "style" of the visualization.
*   **Mechanism:**
    *   `PMKDataAdapter` receives the current `schemaType` or `schemaID` in the `dataSnapshot`.
    *   It maintains a mapping (configurable) from `schemaType` to `VisualizerController` settings:
        *   `setPolytope(polytopeName)`: Different polytopes (hypercube, hypersphere, duocylinder) can represent different schema complexities or data types (e.g., hierarchical data in a hypertetrahedron, relational data in a duocylinder).
        *   `setVisualStyle(styleParams)`: Colors, line styles, morph factors can change based on the schema.
    *   Specific schema parameters (e.g., `schema.complexity`, `schema.numExtractionSteps`) can be mapped to UBO channels to drive shader behavior.
*   **Example:**
    *   A "document_analysis_schema" might map to a 'hypercube' polytope with cool blue tones.
    *   A "code_parsing_schema" might map to a 'duocylinder' with green/cyan tones and higher grid density.

### 3.2. Real-time Data Channel Mapping

*   **Concept:** Key metrics and data arrays from PMK are mapped to `HypercubeCore`'s UBO data channels (`u_dataChannels[0-63]`).
*   **Mechanism:** `setDataMappingRules` defines these mappings.
    *   `snapshotField`: Key from PMK's `dataSnapshot` (e.g., `pmk_confidence`, `token_entropy_vector`).
    *   `uboChannelIndex`: Target UBO channel.
    *   `transform`: Optional processing (e.g., `linearScale` to map confidence `0-1` to UBO range `0-1`, or `logScale` for entropy).
*   **Shader Interaction:** WGSL shaders in `HypercubeCore` use `u_dataChannels` to modulate visual properties (e.g., line thickness, color intensity, particle density, morph speed).

### 3.3. Bayesian Focus Optimization Visualization

*   **Concept:** Visualize the state and output of `BayesianFocusOptimizer`.
*   **Mechanism:**
    *   Optimizer parameters (e.g., `temperature`, `abstractionWeight`, `contextWeight`) are included in the `dataSnapshot`.
    *   These can be mapped to:
        *   Specific UBO channels to directly influence shader aesthetics (e.g., temperature -> color warmth).
        *   Direct `HypercubeCore` parameters (e.g., `rotationSpeed` modulated by `contextWeight`).
    *   The `reason` or `confidence` of the optimizer's current parameter choice can also be visualized, perhaps as a pulsing effect or text overlay (if supported).
*   **Example:** Higher `temperature` might map to more vibrant or "hotter" colors in the visualizer.

### 3.4. PPP Projection and Timestamped Thought Buffer Visualization

*   **Concept:** Represent the probabilistic projections and the contents/activity of the `TimestampedThoughtBuffer`.
*   **Mechanism for PPP:**
    *   `PPPProjector` output (projections with timestamps, probabilities, focus weights) can be part of the `dataSnapshot`.
    *   These could be visualized as:
        *   Transient elements (e.g., brief flashes or particles) whose intensity/color is based on probability/weight.
        *   A "timeline" or spatial representation if multiple projections are sent at once.
*   **Mechanism for Thought Buffer:**
    *   `TimestampedThoughtBuffer.getActivityLevel()` can be mapped to a UBO channel to show overall "cognitive load" or processing intensity.
    *   Recent entries from `getRecentContext()` could be used to influence short-term visual memory effects (e.g., trails, afterimages).
    *   The `type` of thoughts/events in the buffer could influence colors or particle effects.

## 4. Mapping Rules Configuration

*   **Initial Setup:** `VisualizerController` can be initialized with a default `dataChannelDefinition`.
*   **Dynamic Updates:** `PMKDataAdapter` (or PMK itself) can call `vizController.setDataMappingRules(newRules)` to change how data is interpreted and visualized based on context or schema changes. This is crucial for adaptive visualization.
*   **Structure:** See `API_REFERENCE.md` and `VisualizerController.js` JSDoc for the detailed structure of mapping rules, including the `transform` property.

## 5. Error Handling and Anomaly Visualization

*   PMK errors or identified anomalies (e.g., low confidence parse, schema violations) should be part of the `dataSnapshot`.
*   `PMKDataAdapter` can define rules to map these to specific visual cues:
    *   `glitchIntensity` parameter in `HypercubeCore`.
    *   Shifting color schemes (e.g., towards red or desaturated colors).
    *   Specific UBO channels that trigger warning indicators in shaders.

## 6. Performance Considerations

*   **Snapshot Frequency:** PMK should not send `dataSnapshot` updates too frequently (e.g., not necessarily on every single micro-operation). Updates should be batched or sent at meaningful intervals.
*   **Snapshot Size:** Keep `dataSnapshot` objects reasonably sized. Send only data relevant for visualization.
*   **Transform Complexity:** Complex client-side JavaScript transforms in mapping rules can impact performance. Optimize critical transforms or consider moving them to shaders if possible (though this reduces dynamic reconfigurability).
*   **UBO Updates:** `HypercubeCore` efficiently updates UBOs, but frequent large updates can still be a bottleneck.

## 7. Example: `PMKVisualizationBridge` (Conceptual)

While `PMKDataAdapter` is the primary class, a higher-level bridge might coordinate interactions if PMK is a complex, multi-instance system.

```javascript
// Conceptual: A higher-level coordinator if needed.
// For now, PMKDataAdapter handles most of this.
class PMKVisualizationBridge {
    constructor(pmkInstances, visualizerController) {
        this.pmkInstances = Array.isArray(pmkInstances) ? pmkInstances : [pmkInstances];
        this.vizController = visualizerController;
        this.adapters = this.pmkInstances.map(pmk => new PMKDataAdapter(visualizerController));

        this.pmkInstances.forEach((pmk, index) => {
            pmk.on('update', (snapshot) => { // Assuming PMK emits 'update' events
                this.adapters[index].processPMKUpdate(snapshot);
            });
            pmk.on('schemaChange', (newSchema) => {
                // More complex logic to update mapping rules based on schema
                const newRules = this.generateRulesForSchema(newSchema);
                this.vizController.setDataMappingRules(newRules);
            });
        });
    }

    generateRulesForSchema(schema) {
        // Placeholder: Logic to create specific mapping rules based on schema properties
        console.log("Generating rules for schema:", schema);
        return { ubo: [], direct: {} };
    }

    // ... other methods to manage multiple PMK instances and their visualization ...
}
```

This guide provides a foundational strategy. Specific implementation details will evolve as both PMK and HyperAV mature.
