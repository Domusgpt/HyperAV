# Visualizer API Reference

This document specifies the API for controlling the Headless Agentic Polytope Visualizer, designed for integration with systems like the Parserator Micro-Kernel (PMK) and Adaptive Schema Intelligence (ASI).

The visualizer is controlled via a JavaScript module, tentatively named `VisualizerController`, which wraps the core WebGL rendering engine (`HypercubeCore`).

## Initialization

### `new VisualizerController(config: VisualizerConfig): VisualizerControllerInstance`

Creates and initializes a new visualizer instance.

**`VisualizerConfig` Object:**

*   `canvasId?: string`: (Optional) The ID of an existing HTML canvas element to render to. If not provided, an offscreen canvas might be used, suitable for programmatic image extraction.
*   `initialDimensions?: int`: (Default: 4) Initial N-dimensions for polytope calculations.
*   `initialPolytope?: string`: (Default: 'hypercube') The name of the initial polytope to display.
*   `initialProjection?: string`: (Default: 'perspective') The initial projection method.
*   `baseParameters?: object`: (Optional) An object containing initial values for core visual parameters (see `setVisualStyle` for examples).
*   `mappingRules?: object`: (Optional) The initial mapping rules object. See `setDataMappingRules` for structure. This defines how fields in the `dataSnapshot` (passed to `updateData`) are mapped to UBO channels or direct core parameters.

## Runtime Control API Methods

All methods are part of the `VisualizerControllerInstance`.

### `setPolytope(polytopeName: string, styleParams?: object): Promise<void>`
Changes the currently displayed polytope (geometry) and optionally sets initial style parameters specific to this polytope instance.

*   `polytopeName: string`: The registered name of the geometry to switch to (e.g., 'hypercube', 'hypersphere', 'duocylinder'). `PMKDataAdapter` would typically call this based on schema type information from the PMK.
*   `styleParams?: object`: (Optional) An object with parameters to apply specifically to this polytope, potentially overriding global styles for certain features if the geometry supports it (e.g., specific line thickness for this polytope, initial morph state).

### `updateData(dataSnapshot: object): Promise<void>`
Provides a new snapshot of data, typically from `PMKDataAdapter` after processing PMK output, to drive the visualization.

*   `dataSnapshot: object`: An object where keys are "snapshot fields" (strings) and values are the data to be visualized. This object is typically prepared by a data adapter like `PMKDataAdapter`.
    *   **Example `dataSnapshot` (potentially from `PMKDataAdapter`):**
        ```json
        {
          "pmk_architect_confidence": 0.95,
          "pmk_plan_complexity": 0.7,
          "pmk_active_nodes": 42,
          "pmk_extractor_load": 0.3,
          "pmk_focus_temperature": 0.8,
          "system_error_level": 0.1,
          "current_schema_type": "contact_parser_v3"
        }
        ```
*   **`VisualizerController`'s Internal Mapping:**
    *   `VisualizerController` uses its internal `mappingRules` (initialized at construction or updated via `setDataMappingRules`) to process this `dataSnapshot`.
    *   These rules map the `snapshotField` keys from `dataSnapshot` to:
        1.  Specific UBO (Uniform Buffer Object) channels. Example rule:
            `{ snapshotField: "pmk_architect_confidence", uboChannelIndex: 0, defaultValue: 0.5, transform: "normalize" }`
            This would take the value of `"pmk_architect_confidence"` from the snapshot, apply a "normalize" transform (if defined in `VisualizerController`), and update UBO channel 0.
        2.  Direct `HypercubeCore` state parameters. Example rule:
            `{ snapshotField: "system_error_level", coreStateName: "glitchIntensity", transform: "logScale" }`
            This would take `"system_error_level"`, apply a "logScale" transform, and update the `glitchIntensity` parameter in `HypercubeCore`.
    *   If a field in `dataSnapshot` does not have a corresponding rule in `VisualizerController.mappingRules`, it might be logged as unmapped or ignored, depending on the controller's implementation.
    *   Transformations (e.g., for scaling, normalization, custom functions) defined in the mapping rules are applied by `VisualizerController` before updating the UBOs or core parameters.

### `setVisualStyle(styleParams: object): Promise<void>`
Sets global visual style parameters for the visualization. Can be used by `PMKDataAdapter` to reflect system states like errors or high confidence.

*   `styleParams: object`: An object containing parameters that generally map to `HypercubeCore.state` keys.
    *   **Direct Core Parameters:** Keys in `styleParams` can directly match settable properties in `HypercubeCore.DEFAULT_STATE` (e.g., `glitchIntensity: 0.8`, `rotationSpeed: 0.1`, `morphFactor: 0.5`).
    *   **Structured Parameters:** Some parameters are objects, like `colorScheme`.
        ```json
        {
          "glitchIntensity": 0.8,
          "rotationSpeed": 0.1,
          "colorScheme": {
            "primary": [1.0, 0.0, 0.0, 1.0],
            "secondary": [0.0, 1.0, 0.0, 1.0],
            "background": [0.1, 0.1, 0.1, 1.0]
          },
          "dimensions": 5
        }
        ```
    *   Refer to `HypercubeCore.DEFAULT_STATE` for available parameter names and their expected types and structures. `VisualizerController` attempts to map these to the core state. Unrecognized parameters may be ignored or logged.

### `setSpecificUniform(uniformName: string, value: any): Promise<void>`
Allows direct setting of a specific GLSL shader uniform. This provides fine-grained, low-level control.

*   `uniformName: string`: The exact name of the uniform in the shader (e.g., `u_customEffectStrength`).
*   `value: any`: The value to set. Must match the uniform's type (float, vec2, vec3, vec4, mat4, int, bool, arrays of these).

### `setDataMappingRules(newRules: object): Promise<void>`
Allows dynamic updating of the internal `mappingRules` used by `updateData`.

*   `newRules: object`: An object that should contain `ubo` (Array) and/or `direct` (Object) properties, structured as follows:
    *   `ubo`: An array of rule objects. Each object maps a `snapshotField` to a UBO channel and can specify a `defaultValue` and a `transform` function/name.
        *   Example: `[{ snapshotField: "metricA", uboChannelIndex: 0, transform: "normalize" }]`
    *   `direct`: An object where keys are `snapshotField` names. Each value is an object specifying the `coreStateName` to update and an optional `transform`.
        *   Example: `{ "system_load": { coreStateName: "patternIntensity", transform: (val) => val * 0.1 } }`
*   This allows external systems (or `PMKDataAdapter` itself, if it needs to be highly dynamic) to change how `dataSnapshot` fields are mapped to the visualization without reinitializing the `VisualizerController`.

### `getSnapshot(config: SnapshotConfig): Promise<string | ArrayBuffer>`
Renders a single frame of the current visualization state and returns it.

**`SnapshotConfig` Object:**

*   `format: 'png' | 'jpeg' | 'webp' | 'buffer'`: (Default: 'png') Desired output format. 'buffer' might return an ArrayBuffer of pixel data (e.g., RGBA).
*   `width?: int`: (Optional) Width of the snapshot. Defaults to canvas width.
*   `height?: int`: (Optional) Height of the snapshot. Defaults to canvas width.
*   `quality?: float`: (Optional, for 'jpeg'/'webp') Quality from 0.0 to 1.0.

### `dispose(): Promise<void>`
Cleans up WebGL resources and stops the rendering loop. The instance should not be used after calling `dispose`.

This API is designed to be extensible. New methods and parameters can be added as the integration with PMK/ASI evolves and more specific control requirements are identified.
