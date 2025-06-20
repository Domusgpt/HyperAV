# Component Manifest: PMKDataAdapter

## 1. Purpose and Role

`PMKDataAdapter.js` acts as an adapter layer between the output of the PMK system (specifically, the result object from `KerbelizedParserator.parseWithContext()`) and the `VisualizerController`. Its primary purpose is to translate the detailed, often complex, PMK result into a more generic and structured `dataSnapshot` that `VisualizerController` can easily consume. It also triggers changes in geometry and visual style based on the PMK's state and output.

It decouples the `KerbelizedParserator` from the specific data mapping rules and API of the `VisualizerController`, allowing each to evolve more independently.

## 2. Key Responsibilities

*   **Data Transformation:** Receives the result object from `KerbelizedParserator`.
*   **Snapshot Creation:** Extracts relevant information (e.g., confidence, schema details, focus parameters, error counts, payload size) from the PMK result and populates a new `snapshotForViz` object. This object uses consistent, descriptive field names (e.g., `kp_confidence`, `kp_schema_id_used`) that `VisualizerController`'s mapping rules can target.
*   **Data Submission:** Passes the created `snapshotForViz` to `VisualizerController.updateData()`.
*   **Geometry Control:** Determines the appropriate geometry type based on the `schemaIdUsed` in the PMK result (using its internal `schemaToGeometryMap`) and calls `VisualizerController.setPolytope()`.
*   **Visual Style Control:** Conditionally calls `VisualizerController.setVisualStyle()` to reflect system states derived from the PMK result, such as error conditions or high parsing confidence.

## 3. Core Logic and Key Methods

### Initialization (`constructor(visualizerController)`)
*   Requires a valid instance of `VisualizerController`.
*   Stores this instance as `this.vizController`.
*   Initializes `this.schemaToGeometryMap` with a predefined set of mappings from schema IDs (or base types) to geometry names (e.g., 'hypercube', 'hypersphere'). This map can be extended.
*   Note: Unlike earlier versions, `PMKDataAdapter` no longer maintains its own complex `mappingRules` for UBOs/direct params, as this detailed mapping is now handled by `VisualizerController`.

### Main Processing (`processPMKUpdate(pmkResult)`)
This is the primary method called (e.g., by the integration test or a higher-level orchestrator like `HOASBridge` after a parsing task).

1.  **Input Validation:** Checks if `pmkResult` is provided.
2.  **Log Input:** Logs the received `pmkResult`.
3.  **Prepare `snapshotForViz`:**
    *   Creates an empty object `snapshotForViz`.
    *   Populates it by extracting and renaming fields from `pmkResult`. Example mappings:
        *   `pmkResult.confidence` -> `snapshotForViz.kp_confidence`
        *   `pmkResult.iterations` -> `snapshotForViz.kp_iterations`
        *   `pmkResult.metadata.schemaIdUsed` -> `snapshotForViz.kp_schema_id_used`
        *   `pmkResult.metadata.focusParams.temperature` -> `snapshotForViz.kp_focus_temp`
        *   `pmkResult.errors` (length) -> `snapshotForViz.kp_error_count`
        *   `pmkResult.data` (stringified length) -> `snapshotForViz.kp_payload_size`
    *   This step ensures that the data sent to `VisualizerController` has consistent field names, regardless of minor changes in `pmkResult`'s structure, as long as the extraction logic here is updated.
4.  **Call `vizController.updateData()`:**
    *   If `snapshotForViz` is not empty, it's passed to `this.vizController.updateData()`.
5.  **Call `vizController.setPolytope()`:**
    *   Retrieves `schemaIdUsed` from `pmkResult.metadata`.
    *   Looks up the corresponding `geometryName` in `this.schemaToGeometryMap`. Includes fallback logic (e.g., trying base schema type, then a default).
    *   Calls `this.vizController.setPolytope(geometryName)`.
6.  **Call `vizController.setVisualStyle()`:**
    *   Applies conditional styling:
        *   If `snapshotForViz.kp_error_count > 0`, sets an "error style" (e.g., high `glitchIntensity`, reddish colors).
        *   Else if `pmkResult.confidence > 0.9` (high confidence), sets a "high-confidence style" (e.g., no glitch, greenish colors).
        *   Else, sets a "normal/default style" (e.g., `glitchIntensity: 0.0`).

## 4. Interaction with `VisualizerController`

`PMKDataAdapter` is a direct client of `VisualizerController`. It uses the following key methods on its `this.vizController` instance:

*   **`updateData(snapshotForViz)`:** To send the main set of processed data values that will be mapped by `VisualizerController` to UBOs and direct shader parameters.
*   **`setPolytope(geometryName)`:** To change the rendered geometry based on the PMK's active schema.
*   **`setVisualStyle(styleParams)`:** To change global visual styles based on the PMK's operational state (e.g., errors, confidence).

It does *not* interact directly with `HypercubeCore`.

## 5. Configuration

*   The primary configuration for `PMKDataAdapter` is the `visualizerController` instance passed to its constructor.
*   The `schemaToGeometryMap` is currently hardcoded but could be made configurable in the future if needed.
*   It does not currently have its own section in `docs/kerbelized_parser_config_api.md` as its behavior is mostly driven by the structure of `pmkResult` and its interaction with `VisualizerController`.

PMKDataAdapter plays a vital role in the data flow pipeline, ensuring that the visualization reflects the state and output of the adaptive parsing engine.
