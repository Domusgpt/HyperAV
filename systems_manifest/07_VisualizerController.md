# Component Manifest: VisualizerController

## 1. Purpose and Role

`VisualizerController.js` serves as the primary high-level interface for controlling and interacting with the visualization engine (`HypercubeCore.js`). It abstracts many of the direct complexities of `HypercubeCore` and provides a more semantically organized API for external systems like `PMKDataAdapter` or other application logic.

Its main roles are to:
*   Receive data snapshots from data sources (e.g., PMK output via `PMKDataAdapter`).
*   Translate these data snapshots into low-level parameters for `HypercubeCore` using a configurable set of mapping rules.
*   Manage overall visual styles, polytope (geometry) selection, and other high-level visual attributes.
*   Provide an interface for capturing snapshots of the visualization.

## 2. Key Responsibilities

*   **Data Reception and Mapping:** Accepts generic `dataSnapshot` objects and uses internal `mappingRules` to convert `snapshotField` values into UBO channel data and direct `HypercubeCore` state parameter updates.
*   **Mapping Rule Management:** Initializes with default or configured mapping rules and allows these rules to be dynamically updated at runtime via `setDataMappingRules()`.
*   **Transformation Application:** Applies transformation functions (e.g., `normalize`, `logScale`, custom functions) as defined in the mapping rules to data values.
*   **Style and Geometry Control:** Provides methods (`setVisualStyle`, `setPolytope`) to change the overall look and the geometric form being rendered.
*   **Core Interaction:** Acts as the sole interface to `HypercubeCore` for most parameter updates, calling methods like `this.core.updateParameters()`, `this.core.setPolytope()`, and `this.core.updateUBOChannels()`.
*   **Configuration:** Is configured at instantiation with a `HypercubeCore` instance and an optional configuration object for base parameters, initial mapping rules, and custom transformations.

## 3. Key Data Structures

*   **`this.core`:** An instance of `HypercubeCore.js`.
*   **`this.config`:** The configuration object passed during instantiation.
*   **`this.mappingRules` (Object):**
    *   Defines how incoming `dataSnapshot` fields are mapped to the visualization.
    *   Contains two main properties:
        *   `ubo` (Array): Rules for mapping snapshot fields to UBO channels. Each rule object specifies:
            *   `snapshotField` (String): The key in the `dataSnapshot`.
            *   `uboChannelIndex` (Number): The target UBO channel.
            *   `defaultValue` (Number): Value to use if `snapshotField` is missing.
            *   `transform` (String | Function, Optional): Name of a registered transform or a custom function.
            *   `transformMin`, `transformMax` (Number, Optional): Parameters for transforms like `normalize`.
        *   `direct` (Object): Rules for mapping snapshot fields to direct `HypercubeCore` state parameters. Each key is a `snapshotField`, and its value is an object specifying:
            *   `coreStateName` (String): The target state parameter name in `HypercubeCore`.
            *   `defaultValue` (any): Value to use if `snapshotField` is missing.
            *   `transform` (String | Function, Optional).
*   **`this.transformations` (Object):**
    *   A key-value store of transformation functions (e.g., `normalize`, `logScale`) that can be referenced by name in `mappingRules`. Initialized with defaults and can be extended via `config.customTransformations`.

## 4. Core Logic and Key Methods

Refer to [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) for detailed API method signatures.

### Initialization (`constructor(hypercubeCoreInstance, config = {})`)
*   Requires a `HypercubeCore` instance.
*   Sets up `this.transformations`.
*   Initializes `this.mappingRules`:
    *   If `config.mappingRules` is provided, it's used directly (deep copied).
    *   Else if `config.dataChannelDefinition` is provided (legacy), `_generateInitialMappingRules()` is called to create rules from it.
    *   Else, `_generateInitialMappingRules({})` is called to create default placeholder rules.
*   Applies `config.baseParameters` to `HypercubeCore` if provided.

### Data Input and Mapping (`updateData(dataSnapshot)`)
*   Receives a `dataSnapshot` object.
*   Iterates through `this.mappingRules.ubo`:
    *   For each rule, extracts a value from `dataSnapshot` using `_getValueFromPath(dataSnapshot, rule.snapshotField)`.
    *   Uses `rule.defaultValue` if the field is missing.
    *   Applies `rule.transform` if specified, using `this.transformations`.
    *   Populates a `uboDataArray` at the `rule.uboChannelIndex`.
*   Iterates through `this.mappingRules.direct`:
    *   Similar extraction, default handling, and transformation logic.
    *   Populates a `directParamsToUpdate` object where keys are `rule.coreStateName`.
*   Calls `this.core.updateUBOChannels(uboDataArray)`. (Note: The current actual implementation of `VisualizerController` uses `this.core.updateUBOChannels(uboDataArray)` after preparing the full array, which is consistent with dedicated UBO updates).
*   Calls `this.core.updateParameters(directParamsToUpdate)`.
*   Logs unmapped fields from the `dataSnapshot` (Conceptual - current logging shows the full snapshot and prepared data).

### Internal Helpers
*   **`_generateInitialMappingRules(dataChannelDefinition)`:** Populates `this.mappingRules` based on a simpler `dataChannelDefinition` or creates default rules.
*   **`_getValueFromPath(obj, path)`:** Utility to retrieve potentially nested values from an object using a dot-notation string path (e.g., "prop.subProp[0].value").

### Other API Methods
*   **`setPolytope(polytopeName, styleParams = {})`:** Calls `this.core.setPolytope(polytopeName, styleParams)`.
*   **`setVisualStyle(styleParams)`:** Calls `this.core.updateParameters(styleParams)` to apply global style changes.
*   **`setDataMappingRules(newRules)`:** Allows complete replacement or merging of `this.mappingRules.ubo` and `this.mappingRules.direct`.
*   **`setSpecificUniform(uniformName, value)`:** Calls `this.core.setUniform(uniformName, value)` (as per current `VisualizerController` implementation).
*   **`async getSnapshot(config)`:** Delegates to `this.core.getSnapshot(config)`.
*   **`dispose()`:** Calls `this.core.dispose()`.

## 5. Configuration

*   **`hypercubeCoreInstance` (Mandatory):** The instance of `HypercubeCore` it will control.
*   **`config.baseParameters` (Object, Optional):** Initial parameters passed directly to `HypercubeCore` upon construction.
*   **`config.mappingRules` (Object, Optional):** Pre-defines the `ubo` and `direct` mapping rules. Takes precedence over `dataChannelDefinition`.
*   **`config.dataChannelDefinition` (Object | Array, Optional):** Alternative way to define initial UBO mapping rules, processed by `_generateInitialMappingRules`.
*   **`config.customTransformations` (Object, Optional):** Allows adding or overriding transformation functions available for mapping rules.

## 6. Interaction with Other Components

*   **`HypercubeCore`:** `VisualizerController` directly owns and calls methods on its `HypercubeCore` instance to update visual parameters, change geometry, and manage the rendering lifecycle.
*   **`PMKDataAdapter`:** `PMKDataAdapter` is a typical client of `VisualizerController`. It calls:
    *   `updateData()` with a `snapshotForViz` object.
    *   `setPolytope()` based on schema type from PMK results.
    *   `setVisualStyle()` based on conditions like errors or high confidence from PMK results.

`VisualizerController` acts as a crucial abstraction layer, simplifying the control of the complex `HypercubeCore` and providing a clear, data-driven API for visualization updates.
