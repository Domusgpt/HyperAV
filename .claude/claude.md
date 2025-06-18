# Visualization Kernel Assistant - Context

## 1. Overview

You are an expert AI assistant specialized in the "Headless Agentic Polytope Visualizer" (HyperAV) kernel. Your goal is to help develop, document, and integrate this visualization system. The HyperAV kernel is a JavaScript-based library responsible for generating complex, N-dimensional data visualizations using WebGPU. It's designed to be controlled by external systems, particularly the Parserator Micro-Kernel (PMK) and Higher Order Abstraction System (HOAS).

## 2. Core Architecture (HyperAV Kernel)

*   **Rendering Engine:** `HypercubeCore.js` (now using WebGPU). Handles the low-level rendering loop, WebGPU context, shader compilation, uniform updates, and drawing operations.
*   **Shader Management:** `ShaderManager.js`. Manages WGSL shader programs, including dynamic assembly of shader code from modules based on selected geometry and projection.
*   **Geometry Management:** `GeometryManager.js`. Manages different N-dimensional geometry definitions (e.g., Hypercube, Hypersphere, Duocylinder, FullScreenLattice). Each geometry provides WGSL code snippets.
*   **Projection Management:** `ProjectionManager.js`. Manages different projection techniques (e.g., Perspective, Orthographic, Stereographic) for rendering N-dimensional structures into 2D/3D. Each projection provides WGSL code snippets.
*   **Controller:** `VisualizerController.js`. Provides a high-level API for controlling the `HypercubeCore`. It handles data mapping, style application, and snapshot generation.
*   **Data Transformation:** `TransformFunctions.js`. A utility library providing functions for data scaling, clamping, mapping, etc., used in data mapping rules.

## 3. Key Components & Files

*   **`HypercubeCore.js` (`core/`)**: The heart of the visualizer. Manages WebGPU device, context, render loop, and state.
*   **`ShaderManager.js` (`core/`)**: Compiles and manages WGSL shaders. (Note: Current WGSL integration is foundational; full dynamic shader assembly from modules is a future goal).
*   **`GeometryManager.js` (`core/`)**: Provides access to different geometry definitions. Geometries are now expected to provide WGSL code snippets.
    *   Geometry Definitions (e.g., `HypercubeGeometry.js`, `FullScreenLatticeGeometry.js`) are moving to `geometries/`.
*   **`ProjectionManager.js` (`core/`)**: Provides access to different projection methods (WGSL snippets).
*   **`VisualizerController.js` (`controllers/`)**: High-level API, manages data mapping rules, applies styles, and interfaces with `HypercubeCore`.
*   **`TransformFunctions.js` (`controllers/`)**: Contains data transformation utilities (linearScale, logScale, clamp, etc.).
*   **Shader Files (`shaders/vertex/`, `shaders/fragment/`, `shaders/fragment/modules_geometry/`, `shaders/fragment/modules_projection/`)**: Contain WGSL shader code.
    *   `base_vertex.wgsl`, `base_fragment.wgsl`: Core shaders.
    *   Modules: Reusable WGSL snippets for geometries and projections.
*   **`visualizer-main.js` (`js/`)**: Main entry point for the testbed application, demonstrates `VisualizerController` usage.
*   **`index.html`**: Testbed HTML, includes UI controls.
*   **PMK Integration Components (`pmk-integration/`)**:
    *   `schemas/BaseSchema.js`, `schemas/AdaptiveSchemaGraph.js`
    *   `parsers/KerbelizedParserator.js`, `parsers/PPPProjector.js`
    *   `optimizers/BayesianFocusOptimizer.js`, `optimizers/TimestampedThoughtBuffer.js`
*   **Controller Adapters (`controllers/`)**:
    *   `PMKDataAdapter.js`: Adapts PMK output for `VisualizerController`.
    *   `HOASBridge.js`: Integrates HOAS concepts with the visualizer and PMK components.

## 4. Current Capabilities

*   **WebGPU Rendering:** Foundational WebGPU setup in `HypercubeCore.js`.
*   **Advanced Parameter Mapping:** `VisualizerController` supports complex data mapping rules with transformations via `TransformFunctions.js`. Data can be mapped to UBO channels or direct core parameters.
*   **Snapshot/Headless Operation:** `VisualizerController.getSnapshot()` allows capturing frames as PNG, JPEG, or raw ArrayBuffer using offscreen WebGPU rendering.
*   **Modular Structure:** Files have been reorganized into a more logical directory structure (`core`, `controllers`, `geometries`, `shaders`, `pmk-integration`, etc.).
*   **PMK/HOAS Placeholders:** Basic class structures for PMK/HOAS components have been created.
*   **WGSL Shaders:** Basic WGSL shaders are in place (`base_vertex.wgsl`, `base_fragment.wgsl`), with geometry and projection logic intended to be modularized (currently, geometry/projection WGSL snippets are largely embedded in `GeometryManager.js` and `ProjectionManager.js` for WebGL compatibility, needing refactoring for full WGSL modularity).

## 5. Current Development Focus (Simulated Task Context)

The immediate tasks involve:
*   Finalizing file restructuring and updating internal import paths.
*   Updating documentation (`API_REFERENCE.md`, JSDoc comments).
*   Refining WGSL shader code and ensuring the `ShaderManager` can correctly assemble and use them with `HypercubeCore`'s WebGPU pipeline.
*   Implementing the dynamic aspects of `GeometryManager` and `ProjectionManager` to provide WGSL code to `ShaderManager`.

## 6. Integration Points (Conceptual for PMK/HOAS)

*   **`PMKDataAdapter.js`**: Will translate PMK's `ParseResult` and `ContextualBeliefGraph` into `dataSnapshot` objects for `VisualizerController.updateData()`. It will also use `setDataMappingRules` to configure visualization based on active PMK schemas.
*   **`HOASBridge.js`**: Will orchestrate HOAS operations, potentially using `KerbelizedParserator` (which uses `AdaptiveSchemaGraph`, `BayesianFocusOptimizer`, etc.) and then feed resulting data structures into `PMKDataAdapter` or directly to `VisualizerController`.
*   **Data Flow:** PMK/HOAS -> `PMKDataAdapter`/`HOASBridge` -> `VisualizerController.updateData(snapshot)` & `setDataMappingRules(rules)` -> `HypercubeCore` (UBOs/State) -> Shader Uniforms.

## 7. Code Patterns & Style

*   **ES6 Modules:** The codebase uses ES6 modules (`import`/`export`).
*   **JSDoc:** Used for documentation. Strive for detailed JSDoc for classes, methods, and parameters.
*   **Relative Paths:** Ensure all internal imports use correct relative paths (e.g., `../core/`, `./`).
*   **Error Handling:** Basic error handling is in place; can be improved.
*   **Console Logging:** Used for debugging and status updates. Should be descriptive.
*   **Configuration Objects:** Components are generally configured via `config` objects passed to their constructors.

Remember to always consider the current state of the codebase (as reflected in the files provided to you or modified by you) and the specific subtask you are working on. Assume `TransformFunctions.js` is globally available or imported where needed if not explicitly stated.
The transition from WebGL to WebGPU is a key ongoing effort. Some comments or older structures might still hint at WebGL; prioritize WebGPU logic.
