# Shader Architecture

The shader architecture of the Visualization Kernel is designed for flexibility and dynamic control, allowing for a wide range of visual representations driven by external data. It leverages modern WebGL2 features for enhanced capabilities.

## Core Components and GLSL Version

*   **GLSL Version:** All shaders utilize `#version 300 es`, enabling access to WebGL2 features.
*   **`ShaderManager.js`:** This module is central to the shader system. Its responsibilities include:
    *   Compiling and linking GLSL shader programs.
    *   Dynamically assembling the main fragment shader. It achieves this by injecting GLSL code snippets provided by the `GeometryManager.js` (for the currently active geometry) and the `ProjectionManager.js` (for the chosen projection method) into a base fragment shader template.
*   **`GeometryManager.js`:** This module, along with individual geometry classes (e.g., `HypercubeGeometry.js`, `FullScreenLatticeGeometry.js`), provides geometry-specific GLSL code. Each geometry class has a `getShaderCode()` method that returns the GLSL snippets defining its visual representation (typically Signed Distance Functions or other procedural generation logic) and its response to various parameters.
*   **`ProjectionManager.js`:** Similar to `GeometryManager.js`, this manages different projection methods (e.g., perspective, stereographic) and provides the corresponding GLSL code for transforming points from higher dimensions into the 3D view space.

## Uniform Buffer Objects (UBOs)

*   **`GlobalDataBlock`:** A key feature of the shader architecture is the use of a Uniform Buffer Object named `GlobalDataBlock`. This UBO exposes an array of 64 floating-point numbers (`pmk_channels[64]`) to all shaders (vertex, fragment, and geometry-specific snippets).
    *   This allows for a scalable and efficient way to pass a large set of global data parameters (e.g., from the PMK) into the shader pipeline, enabling complex data-driven visual behaviors.

## Conditional Logic in Shaders

Shaders incorporate conditional logic to adapt their behavior based on uniform values. A notable example is the `u_isFullScreenEffect` uniform:

*   The main fragment shader uses this boolean uniform to determine whether to execute the standard n-dimensional geometry rendering path (using SDFs from the selected geometry and projection) or to render a full-screen effect (like the `FullScreenLatticeGeometry`).
*   This allows for seamless switching between different fundamental rendering modes.

## Future Advanced Shader Concepts

The current architecture provides a solid foundation for more advanced shader capabilities. Future development may explore concepts detailed in `docs/ADVANCED_SHADER_CONCEPTS.md`, including:

*   **Dynamic Shader Snippet Injection:** Allowing for even more granular and flexible assembly of shader programs by combining smaller, reusable GLSL code snippets at runtime.
*   **Uber-Shaders:** Developing highly parameterized "uber-shaders" that contain a wide range of conditional logic controlled by uniforms, potentially reducing the need for shader recompilations when visual features change.
*   **Compute Shaders (with WebGL2 Compute or WebGPU):** For procedural geometry generation or modification directly on the GPU, enabling highly complex and data-driven shape manipulations.

This evolving shader architecture aims to provide an increasingly powerful and adaptable rendering backend for the Visualization Kernel.
