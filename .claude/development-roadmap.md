# Visualization Kernel Development Roadmap

This document outlines the phased development plan for the HyperAV (Headless Agentic Polytope Visualizer) kernel and its integration components.

## Phase 1: Core Refinements & WebGPU Foundation (Completed)

*   **[DONE] Advanced Parameter Mapping:**
    *   Implement `TransformFunctions.js` for various data transformations.
    *   Enhance `VisualizerController.js` to use these transforms in data mapping rules (UBOs and direct params).
*   **[DONE] UI Testbed for Mapping:**
    *   Update `index.html` and `visualizer-main.js` with UI controls to test advanced mapping rules and transforms.
*   **[DONE] Headless Operation & Programmatic Output:**
    *   Modify `HypercubeCore.js` for offscreen WebGPU rendering to a target texture.
    *   Implement `VisualizerController.getSnapshot()` to capture frames as PNG, JPEG, or ArrayBuffer.
*   **[DONE] Documentation - Initial Pass:**
    *   Update JSDoc comments in `VisualizerController.js` for new features.
    *   Update `API_REFERENCE.md` for mapping and snapshot capabilities.
*   **[DONE] Directory Structure & File Relocation:**
    *   Create a refined directory structure (`core`, `controllers`, `geometries`, `shaders`, `pmk-integration`, etc.).
    *   Move existing files to their new locations.
    *   Update internal `import` statements to reflect new paths.
*   **[DONE] PMK/HOAS Component Placeholders:**
    *   Create placeholder files for new PMK/HOAS components (`BaseSchema`, `AdaptiveSchemaGraph`, `KerbelizedParserator`, `PPPProjector`, `BayesianFocusOptimizer`, `TimestampedThoughtBuffer`, `PMKDataAdapter`, `HOASBridge`) with basic class structures and JSDoc.
*   **[DONE] Claude Context Files:**
    *   Create and populate `.claude/claude.md`, `.claude/pmk-integration.md`, `.claude/development-roadmap.md`.

## Phase 2: WGSL Shader System & Advanced Geometries

*   **WGSL Shader Modularity:**
    *   Refactor `ShaderManager.js` for full WGSL support.
    *   Develop a system for `ShaderManager` to dynamically assemble complete WGSL shaders by combining "base" shaders (`shaders/vertex/base_vertex.wgsl`, `shaders/fragment/base_fragment.wgsl`) with WGSL snippets/modules provided by `GeometryManager` and `ProjectionManager`.
    *   Ensure WGSL geometry modules (e.g., `shaders/fragment/modules_geometry/hypercube.wgsl`) and projection modules (`shaders/fragment/modules_projection/*.wgsl`) are correctly imported and integrated by `ShaderManager`.
*   **Geometry and Projection WGSL Snippets:**
    *   Refactor `GeometryManager.js` and `ProjectionManager.js` so that each registered geometry and projection method provides its specific WGSL code (vertex transformations, SDFs, projection logic, etc.) as strings or importable modules.
    *   Update existing geometry classes (Hypercube, Hypersphere, etc., currently in `GeometryManager.js` or as separate files like `FullScreenLatticeGeometry.js`) to conform to this WGSL snippet provider pattern.
*   **New Geometries & Effects:**
    *   Implement 2-3 new N-dimensional geometries (e.g., N-Simplex, N-Orthoplex, Toroidal Hyperplane) with corresponding WGSL modules.
    *   Introduce 1-2 new visual effects controllable via shader uniforms (e.g., particle systems on surfaces, energy flow visualization).
*   **Refine `HypercubeCore.js` WebGPU Pipeline:**
    *   Complete `TODOs` in `HypercubeCore.js` related to pipeline creation and bind group setup, ensuring it uses the dynamically assembled WGSL shaders from `ShaderManager`.
    *   Implement robust handling of pipeline recreation if shader configurations change.
*   **Documentation:** Update JSDoc and `API_REFERENCE.md` for new geometries, effects, and shader system architecture.

## Phase 3: PMK/HOAS Core Logic Implementation

*   **`AdaptiveSchemaGraph.js` Implementation:**
    *   Flesh out `adaptSchema` logic.
    *   Implement graph traversal and modification methods.
*   **`KerbelizedParserator.js` Core Parsing Loop:**
    *   Implement the main `executeAdaptiveParsing` loop.
    *   Integrate schema adaptation from `AdaptiveSchemaGraph`.
    *   Integrate focus parameter updates from `BayesianFocusOptimizer`.
*   **`BayesianFocusOptimizer.js` Logic:**
    *   Implement core Bayesian optimization algorithm in `optimize()`.
    *   Define how `history` and `currentBestParams` are used.
*   **`PPPProjector.js` & `TimestampedThoughtBuffer.js`:**
    *   Refine `calculateOptimalTimestamp`, `createProbabilisticProjection`, `calculateFocusWeight` in `PPPProjector.js`.
    *   Ensure `TimestampedThoughtBuffer.js` methods are robust for PMK use cases.
*   **Testing:** Basic unit tests for these PMK components.
*   **Documentation:** Document the implemented logic and internal APIs of these components.

## Phase 4: Full PMK <> HyperAV Integration & Advanced Visualization

*   **`PMKDataAdapter.js` Full Implementation:**
    *   Develop comprehensive logic for `processPMKUpdate` to translate diverse PMK snapshot data into `VisualizerController` commands (`updateData`, `setDataMappingRules`, `setVisualStyle`, `setPolytope`).
    *   Define and implement default mapping rules.
*   **`HOASBridge.js` Full Implementation:**
    *   Flesh out `processMultimodalInput`, `analyzeModalities`, `selectOptimalPolytope`.
    *   Ensure seamless orchestration between HOAS concepts, PMK components, and visualization updates.
*   **Advanced Visualization Scenarios:**
    *   Develop 2-3 complex visualization scenarios demonstrating the integrated system (e.g., visualizing a schema adaptation process, showing PPP projections influencing focus).
    *   This may involve creating new specific mapping rules or even custom shaders/geometries if needed.
*   **Performance Profiling & Optimization:**
    *   Profile the end-to-end data flow from PMK/HOAS to HyperAV.
    *   Optimize critical paths in both JavaScript and WGSL shaders.
*   **Integration Testing:** Test the full loop: PMK processing -> Adapter -> VisualizerController -> HypercubeCore -> Visual Output.

## Phase 5: Extensibility, Final Documentation & Polish

*   **Plugin Architecture (Conceptual):**
    *   Explore a plugin architecture for adding new Geometries, Projections, or TransformFunctions more easily.
*   **API Solidification:** Final review and refinement of all public APIs based on integration experience.
*   **Comprehensive Documentation:**
    *   Detailed developer guides for PMK integration.
    *   User manual for the testbed application.
    *   Complete `API_REFERENCE.md` and JSDoc comments.
    *   Tutorials for creating custom visualizations or mapping rules.
*   **Example Suite:** Create a diverse suite of examples in the `examples/` directory demonstrating different features and integration patterns.
*   **Final Performance Tuning:** Address any remaining performance bottlenecks.
*   **Code Cleanup & Refactoring:** General code quality improvements.

## Ongoing Technical Debt & Considerations

*   **WGSL Error Handling:** Robust error handling and reporting for WGSL compilation and runtime errors in `ShaderManager` and `HypercubeCore`.
*   **Dynamic Uniform Structures:** The current `HypercubeCore` uses fixed-size uniform buffers for geometry and projection. A more dynamic system might be needed if different geometries/projections have vastly different uniform data sizes.
*   **Text Rendering in WebGPU:** If textual information needs to be displayed directly within the WebGPU canvas (e.g., annotations, debug info), a text rendering solution for WebGPU will be required. This is often complex.
*   **Test Coverage:** Systematically increase unit and integration test coverage for all components.

## Documentation Priorities

*   **API Reference (`API_REFERENCE.md`):** Keep this up-to-date with each phase.
*   **JSDoc:** Ensure all classes, methods, and parameters are thoroughly documented.
*   **Integration Guides:** `.claude/pmk-integration.md` and potentially a new HOAS integration guide.
*   **Developer Guide:** How to add new geometries, shaders, transforms.
*   **Conceptual Overview:** High-level architecture and data flow (partially in `.claude/claude.md`).
