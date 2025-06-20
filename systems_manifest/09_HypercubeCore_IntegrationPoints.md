# Component Manifest: HypercubeCore.js - Integration Points

## 1. Purpose and Role within Visualization

`HypercubeCore.js` is the core rendering engine responsible for all WebGPU (previously WebGL) operations, shader management (via `ShaderManager.js`), and drawing the n-dimensional visualizations. This document focuses on its key integration points, specifically how it receives and processes data and commands from `VisualizerController.js`.

It is currently undergoing a transition from WebGL to WebGPU, so some mechanisms are evolving.

## 2. Central State Management: `this.state`

*   **`DEFAULT_STATE`:** `HypercubeCore` defines a comprehensive `DEFAULT_STATE` object. This object enumerates all configurable visual parameters, their default values, and their expected data types. It includes:
    *   Global parameters: `time`, `resolution`, `mouse`, `dimensions`, `geometryType`, `projectionMethod`, `morphFactor`, `rotationSpeed`, `glitchIntensity`, `colorScheme`, etc.
    *   Data channels: `dataChannels` (an array, conceptually for UBO data, currently 64 floats).
    *   Geometry-specific parameters: Prefixed with `geom_<geometryName>_...` (e.g., `geom_hypercube_gridDensity_channel0Factor`).
    *   Projection-specific parameters: Prefixed with `proj_<projectionName>_...` (e.g., `proj_perspective_baseDistance`).
    *   Lattice effect parameters: Prefixed with `lattice_...`.
*   **`this.state`:** Each `HypercubeCore` instance maintains its current visual state in a `this.state` object, which is initialized as a deep copy of `DEFAULT_STATE` and then updated with options passed to the constructor.

## 3. Primary Input Method: `updateParameters(newParams)`

*   **Mechanism:** This is the main public method used by `VisualizerController` to send new parameter values to `HypercubeCore`.
*   **Functionality:**
    1.  It iterates through the `newParams` object.
    2.  For each key in `newParams`, if it corresponds to a known key in `this.state` (or `DEFAULT_STATE`), it updates `this.state[key]` with the `newValue`.
    3.  It performs a `JSON.stringify` comparison to ensure changes are only processed if values actually differ.
    4.  **Dirty Buffer Tracking (WebGPU):** Based on the `key` being updated (e.g., if it starts with `geom_`, `proj_`, or is `dataChannels`), it marks corresponding GPU buffers (`geometryUniformsBuffer`, `projectionUniformsBuffer`, `dataChannelsBuffer`, `globalUniformsBuffer`) as "dirty" by adding their names to `this.dirtyGPUBuffers` (a Set).
    5.  If `geometryType` or `projectionMethod` changes, `this.state.needsShaderUpdate` is set to `true` (this would conceptually trigger pipeline changes in WebGPU, though that specific logic is still under development).

## 4. Data Flow to Shaders (Conceptual for WebGPU)

1.  **State to TypedArrays:** Internal methods like `_updateGlobalUniformsData()`, `_updateGeometryUniformsData()`, and `_updateProjectionUniformsData()` are responsible for mapping values from `this.state` into correctly structured `Float32Array`s (e.g., `this.globalUniformsData`, `this.geometryUniformsData`, `this.projectionUniformsData`). The `dataChannels` array from `this.state` directly populates `this.dataChannelsData`.
2.  **TypedArrays to GPU Buffers:** In the `_updateDirtyUniformBuffers()` method (called each frame in `_drawFrameLogic`), if a buffer is marked in `this.dirtyGPUBuffers`, its corresponding `Float32Array` is written to the GPU buffer using `this.device.queue.writeBuffer()`.
3.  **GPU Buffers to Shaders:** These GPU buffers are intended to be bound to the WebGPU render pipeline (via `GPUBindGroup`s, though this binding logic is still being developed) for access by the WGSL shaders.
    *   `globalUniformsBuffer` -> `GlobalUniforms` struct in WGSL.
    *   `dataChannelsBuffer` -> `array<f32, 64>` in WGSL.
    *   `geometryUniformsBuffer` -> Geometry-specific uniform struct in WGSL.
    *   `projectionUniformsBuffer` -> Projection-specific uniform struct in WGSL.

## 5. Key `HypercubeCore` Methods Called by `VisualizerController`

*   **`constructor(canvas, shaderManager, options)`:** `VisualizerController` instantiates `HypercubeCore`. `options` can include `baseParameters` which are applied to `this.state`.
*   **`updateParameters(newParams)`:** As described above, this is the most common interaction, used by `VisualizerController.updateData()`, `VisualizerController.setVisualStyle()`, and `VisualizerController.setSpecificUniform()`.
*   **`setPolytope(polytopeName, styleParams = {})` (via `VisualizerController.setPolytope`):** `VisualizerController` calls `this.core.setPolytope()`. `HypercubeCore`'s own `setPolytope` method is currently implemented by its `updateParameters` method, which handles changes to `geometryType` and other style parameters. If `geometryType` changes, `needsShaderUpdate` is flagged, and `_updateGeometryUniformsData` is called.
*   **`updateUBOChannels(uboDataArray)` (via `VisualizerController.updateData`):** `VisualizerController` prepares a `uboDataArray` and calls `this.core.updateUBOChannels(uboDataArray)`. Inside `HypercubeCore`, this method directly updates `this.state.dataChannels` by creating a new Float32Array from the input and marks the `dataChannelsBuffer` as dirty by calling `this.dataChannelsData.set()` and adding `'dataChannels'` to `this.dirtyGPUBuffers`.
*   **`getSnapshot(config)`:** `VisualizerController` delegates snapshot requests to this method.
*   **`dispose()`:** For cleanup.

## 6. Data Flow Verification (Conceptual Logging)

*   To confirm that data changes made via `VisualizerController` successfully propagate to `HypercubeCore.state` and are available at render time, timed conceptual logging was added to `HypercubeCore._drawFrameLogic()`.
*   This logging (approx. every 0.5 seconds) outputs:
    *   `geometryType`, `projectionMethod`
    *   `morphFactor`, `glitchIntensity`
    *   Primary color from `colorScheme`
    *   Slices of `dataChannels` (e.g., channels 0-3 and 16-19).
*   This allows developers to observe changes to these key parameters in the core engine's state during runtime in the integration test, even before full visual effects are implemented in WebGPU for all parameters.

This document focuses on `HypercubeCore` as a configurable state machine from `VisualizerController`'s perspective. The intricate details of WebGPU rendering pipelines, shader compilation (`ShaderManager`), and specific geometry/projection mathematics are outside the scope of these integration points.
