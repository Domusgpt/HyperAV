# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## Run Commands
- Run directly from browser by opening `index.html`
- No build process required - pure frontend application
- Browser permissions required for microphone access (if audio features are active)

## Code Style Guidelines
- **JavaScript**: ES6+ with modules (import/export)
- **Version Control**: Each file includes version number in header comments (e.g., `/* file.js - v1.4 */`) - *Note: This practice may need review for consistency.*
- **Formatting**: Compact code with minimal whitespace; function chaining and ternary operators preferred
- **Naming**: camelCase variables/methods, PascalCase classes, underscore prefix for private methods
- **DOM Access**: Cache DOM elements, minimize reflows/repaints
- **Error Handling**: Try/catch around WebGL operations, console.error for failures, status reporting via UI
- **State Management**: Immutable state pattern with dirty flags for efficient updates (primarily in `HypercubeCore.js`)
- **Logging Strategy**: Console logging for critical events with clear prefixes

## Structure
- `core/`: Core visualization engine components (e.g., HypercubeCore.js, ShaderManager.js, GeometryManager.js, ProjectionManager.js).
- `controllers/`: Application interface and data adaptation layer (e.g., VisualizerController.js, PMKDataAdapter.js, HOASBridge.js).
- `geometries/`: Modules defining specific geometric forms and their GLSL code (e.g., HypercubeGeometry.js, FullScreenLatticeGeometry.js).
- `projections/`: Modules defining projection methods and their GLSL code (e.g., PerspectiveProjection.js, StereographicProjection.js).
- `shaders/`: Contains base GLSL shader templates or standalone shader files. May include subdirectories like `glsl/` or `wgsl/` if WebGPU shaders are introduced.
- `css/`: Stylesheets for the HTML interface.
- `js/`: Contains main script for the testbed (`visualizer-main.js`) and potentially other UI-related JavaScript.
- `pmk-integration/`: Components and documentation specifically related to Parserator Micro-Kernel (PMK) integration. *(This might be largely documentation or specific adapter examples)*
- `tests/`: Unit, integration, and performance tests.
- `examples/`: Example usage scripts, data snapshots, or integration demos.
- `docs/`: Project documentation, including API references, architectural overviews, and conceptual guides.
- `.claude/`: Context files specifically for AI assistants like Claude.

## Technical Features
- **WebGL2** for rendering N-dimensional geometry with custom, dynamically assembled shaders.
- **Uniform Buffer Objects (UBOs)** for efficient data transfer to shaders (e.g., `GlobalDataBlock` for `pmk_channels`).
- **Extensive Parameterization**: Most visual aspects are controllable via a unified API.
- **Parameter Mapping Layer**: Translates incoming data (e.g., from PMK) to visual parameters.
- **Audio Analysis**: (If active) Frequency band analysis for visualization.
- **Responsive Design**: Automatic canvas resizing and UI adaptations for the testbed.
- **Custom Geometry Pipeline**: Support for various N-dimensional objects with multiple projection methods.
- **Dynamic Shader Assembly**: `ShaderManager.js` combines shader snippets from geometry and projection modules.