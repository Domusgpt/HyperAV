# Visualizer API Reference

This document specifies the API for controlling the Headless Agentic Polytope Visualizer, designed for integration with systems like the Parserator Micro-Kernel (PMK) and Adaptive Schema Intelligence (ASI).

The visualizer is controlled via a JavaScript module, `VisualizerController`, which wraps the core rendering engine, `HypercubeCore`.

**Note on Technology:** The visualizer core (`HypercubeCore.js`) has been updated to use **WebGPU** for rendering, offering modern graphics capabilities. Previous references to WebGL are superseded by WebGPU.

## Initialization

### `new VisualizerController(config: VisualizerConfig): VisualizerControllerInstance`

Creates and initializes a new visualizer instance.

**`VisualizerConfig` Object:**

*   `canvasId?: string`: (Optional) The ID of an existing HTML canvas element to render to. If not provided, an offscreen canvas might be used, suitable for programmatic image extraction.
*   `initialDimensions?: int`: (Default: 4) Initial N-dimensions for polytope calculations.
*   `initialPolytope?: string`: (Default: 'hypercube') The name of the initial polytope to display.
*   `initialProjection?: string`: (Default: 'perspective') The initial projection method.
*   `baseParameters?: object`: (Optional) An object containing initial values for core visual parameters (see `setVisualStyle` for examples). These are applied once at initialization.
*   `dataChannelDefinition?: object`: (Optional) Defines the initial mapping rules for how incoming data snapshots are processed and applied to the visualizer's UBO channels or direct core parameters. See the "Advanced Data Mapping" section for details on rule structure and transform capabilities.

## Runtime Control API Methods

All methods are part of the `VisualizerControllerInstance`.

### `setPolytope(polytopeName: string, styleParams?: object): Promise<void>`

Changes the currently displayed polytope and optionally sets initial style parameters specific to this polytope instance.

*   `polytopeName: string`: The registered name of the geometry to switch to (e.g., 'hypercube', 'duocylinder').
*   `styleParams?: object`: (Optional) An object with parameters to apply specifically to this polytope, potentially overriding global styles for certain features if the geometry supports it (e.g., specific line thickness for this polytope, initial morph state).

### `updateData(dataSnapshot: object): Promise<void>`

Provides a new snapshot of data from the controlling agent (PMK/ASI) to drive the visualization. The structure of `dataSnapshot` should align with what `dataChannelDefinition` might have specified or be a general key-value store that shaders can be adapted to use.

*   `dataSnapshot: object`: An object containing the data to be mapped to visual properties.
    *   Example: `{ "focus_metric": 0.75, "confidence_score": 0.98, "anomaly_level": 0.05, "raw_vector": [0.1, 0.2, ...], "active_schema_id": "contact_extraction" }`
    *   The visualizer (and its shaders) will be responsible for mapping these named values to specific `u_dataChannelN` uniforms or other custom uniforms.

### `setVisualStyle(styleParams: VisualStyleParams): Promise<void>`

Sets global visual style parameters for the visualization.

**`VisualStyleParams` Object (examples, can be expanded):**

*   `dimensions?: int`: Set the N-dimensionality for calculations.
*   `projectionMethod?: string`: Change the projection (e.g., 'perspective', 'orthographic').
*   `colors?: { primary?: vec3, secondary?: vec3, background?: vec3 }`: Update color scheme. Values are typically arrays `[r, g, b]` with components from 0.0 to 1.0.
*   `lineThickness?: float`: Global line thickness.
*   `shellWidth?: float`: Global shell width.
*   `tetraThickness?: float`: Global tetrahedron thickness.
*   `morphFactor?: float`: Global morph factor.
*   `rotationSpeed?: float`: Global base rotation speed.
*   `patternIntensity?: float`: Global pattern intensity.
*   `universeModifier?: float`: Global universe modifier.
*   `glitchIntensity?: float`: Global glitch intensity.
    // Other parameters from HypercubeCore's DEFAULT_STATE can be included.

### `setSpecificUniform(uniformName: string, value: any): Promise<void>`

Allows direct setting of a specific GLSL shader uniform. This provides fine-grained, low-level control for advanced scenarios where PMK/ASI needs to manipulate shader behavior directly.

*   `uniformName: string`: The exact name of the uniform in the shader (e.g., `u_customEffectStrength`).
*   `value: any`: The value to set. Must match the uniform's type (float, vec2, vec3, vec4, mat4, int, bool, arrays of these). The controller should attempt type validation or pass through.

### `getSnapshot(config: SnapshotConfig): Promise<string | ArrayBuffer>`

Renders a single frame of the current visualization state and returns it.

**`SnapshotConfig` Object:**

*   `format: 'png' | 'jpeg' | 'buffer'`: (Default: 'png') Desired output format.
    *   `'png'`: Returns a PNG image as a data URL string.
    *   `'jpeg'`: Returns a JPEG image as a data URL string.
    *   `'buffer'`: Returns an `ArrayBuffer` containing raw RGBA pixel data (corrected for row padding).
*   `width?: int`: (Optional) Width of the snapshot. Defaults to the current canvas width.
*   `height?: int`: (Optional) Height of the snapshot. Defaults to the current canvas height.
*   `quality?: float`: (Optional, for 'jpeg') Quality from 0.0 to 1.0 (Default: 0.9).
*   **Note:** This method uses WebGPU for offscreen rendering. Ensure the environment supports WebGPU and the visualizer core has been initialized successfully.

### `dispose(): Promise<void>`

Cleans up WebGPU resources and stops the rendering loop. The instance should not be used after calling `dispose`.

## Advanced Data Mapping

The `VisualizerController` supports advanced data mapping rules that allow incoming data from the `dataSnapshot` (provided via `updateData`) to be transformed before being applied to the visualizer's UBO (Uniform Buffer Object) channels or direct core parameters. These transformations are defined using functions available in `TransformFunctions.js`.

Mapping rules are defined within the `dataChannelDefinition` object during `VisualizerController` initialization or can be updated at runtime using the `setDataMappingRules` method.

### Rule Structure

Rules are defined for `uboChannels` (an array of rule objects) and `directParams` (an object where keys are snapshot fields and values are rule objects). Each rule object can include a `transform` property.

*   **`snapshotField`**: `string` - The key in the `dataSnapshot` object whose value will be processed.
*   **`defaultValue`**: `any` - The value to use if the `snapshotField` is not found in the snapshot or if a transformation fails.
*   **For `uboChannels` rules:**
    *   `uboChannelIndex`: `number` - The target UBO channel index (e.g., 0-63).
*   **For `directParams` rules:**
    *   `coreStateName`: `string` - The name of the parameter in `HypercubeCore.state` to be updated (e.g., `rotationSpeed`, `colorScheme.primary`).
*   **`transform`**: `string | object` (Optional) - Defines the transformation to apply.

### `transform` Property Details

1.  **As a String:**
    *   Syntax: `transform: "functionName"`
    *   Example: `transform: "clamp"`
    *   The `functionName` must correspond to a function available in `TransformFunctions.js`.
    *   Parameters for these simple transforms (e.g., `min` and `max` for `"clamp"`) are typically expected to be defined directly on the rule object itself.
        ```javascript
        {
          snapshotField: "cpu_load",
          uboChannelIndex: 1,
          defaultValue: 0.5,
          transform: "clamp", // Name of function in TransformFunctions
          min: 0,             // Parameter for "clamp"
          max: 1              // Parameter for "clamp"
        }
        ```

2.  **As an Object:**
    *   Syntax: `transform: { name: "functionName", param1: value1, param2: value2, ... }`
    *   This is the more explicit and flexible way to define transformations and their parameters.
    *   `name`: `string` - The name of the function in `TransformFunctions.js`.
    *   Other properties (`param1`, `param2`, etc.) are the arguments passed to the transform function. The names of these properties must match what `VisualizerController` expects for that specific transform function (e.g., `domain`, `range` for `linearScale`).

### Available Transform Functions (from `TransformFunctions.js`)

The following are key transform functions and their expected object configuration parameters:

*   **`linearScale`**: Scales a value from a source domain to a target range linearly.
    *   `{ name: "linearScale", domain: [sourceMin, sourceMax], range: [targetMin, targetMax] }`
*   **`logScale`**: Scales a value logarithmically. Input values in `domain` and `value` itself should generally be > 0.
    *   `{ name: "logScale", domain: [sourceMin, sourceMax], range: [targetMin, targetMax] }`
*   **`clamp`**: Clamps a value between a minimum and maximum.
    *   `{ name: "clamp", min: minValue, max: maxValue }`
*   **`threshold`**: Returns one of two values based on whether the input is below or above a threshold.
    *   `{ name: "threshold", thresholdValue: val, belowValue: valToUseIfBelow, aboveValue: valToUseIfAbove }`
*   **`stringToEnum`**: Maps a string input to a numeric or other value based on a provided map.
    *   `{ name: "stringToEnum", map: { "str1": outputVal1, "str2": outputVal2 }, defaultOutput: defaultOutVal }`
    *   The `outputValN` can be numbers (common for UBOs) or arrays/objects (common for direct params like colors).
*   **`colorStringToVec`**: Converts a color string (hex, rgb(), rgba(), common CSS color names) to a vector (array) of numbers `[r,g,b,a]`, normalized to 0-1.
    *   `{ name: "colorStringToVec", defaultOutput: [r,g,b,a] }` (e.g., `[0,0,0,1]` for black)

### Example: `dataChannelDefinition` with Transforms

This example shows how to define mapping rules with transforms during `VisualizerController` initialization. The same structure applies when using `setDataMappingRules`.

```javascript
const definition = {
  uboChannels: [
    {
      snapshotField: "cpu_temp",
      uboChannelIndex: 0,
      defaultValue: 60,
      transform: { name: "linearScale", domain: [40, 100], range: [0, 1] }
    },
    {
      snapshotField: "raw_sensor",
      uboChannelIndex: 1,
      defaultValue: 0,
      // Example of simple string transform with params on rule object
      transform: "clamp",
      min: 0,
      max: 255
    }
  ],
  directParams: [ // Note: for directParams, the structure is an array of rule objects in dataChannelDefinition
    {
      snapshotField: "system_status",
      coreStateName: "statusHighlightColor", // Example target core state
      defaultValue: [0.5, 0.5, 0.5, 1.0],  // Default color (grey)
      transform: {
        name: "stringToEnum",
        map: { "OK": [0,1,0,1], "WARNING": [1,1,0,1], "ERROR": [1,0,0,1] }, // Outputting RGBA arrays
        defaultOutput: [0.5,0.5,0.5,1.0]
      }
    },
    {
      snapshotField: "led_color_setting", // e.g., "#FF8800" or "orange"
      coreStateName: "ledColor",          // Example target core state
      defaultValue: [1,1,1,1],            // Default color (white)
      transform: {
        name: "colorStringToVec",
        defaultOutput: [0,0,0,1]          // Default to black if conversion fails
      }
    }
  ]
};
// Initialize controller:
// const vizController = new VisualizerController(coreInstance, { dataChannelDefinition: definition });

// Alternatively, to set rules at runtime (structure for directParams is an object here):
const runtimeRules = {
  ubo: definition.uboChannels, // Can reuse or define new
  direct: {
    "system_status": { // snapshotField is the key
      coreStateName: "statusHighlightColor",
      defaultValue: [0.5, 0.5, 0.5, 1.0],
      transform: {
        name: "stringToEnum",
        map: { "OK": [0,1,0,1], "WARNING": [1,1,0,1], "ERROR": [1,0,0,1] },
        defaultOutput: [0.5,0.5,0.5,1.0]
      }
    },
    "led_color_setting": { // snapshotField is the key
      coreStateName: "ledColor",
      defaultValue: [1,1,1,1],
      transform: {
        name: "colorStringToVec",
        defaultOutput: [0,0,0,1]
      }
    }
    // ... other directParam rules
  }
};
// vizController.setDataMappingRules(runtimeRules);
```

This API is designed to be extensible. New methods and parameters can be added as the integration with PMK/ASI evolves and more specific control requirements are identified.
