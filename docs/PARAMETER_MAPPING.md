# Parameter Mapping

The Visualization Kernel provides a robust and flexible system for mapping external data to a wide array of visual parameters. This allows for dynamic, data-driven control of the visual output, making it suitable for integration with systems like the Parserator Micro-Kernel (PMK) and other agentic architectures.

## Core Concepts

Parameter mapping is primarily managed by the **`VisualizerController.js`** module, which features a dedicated **Parameter Mapping Layer**. This layer is responsible for translating incoming data snapshots into specific visual changes.

There are two main ways data can influence the visualization:

1.  **Global Data Channels via UBO:**
    *   A Uniform Buffer Object (UBO) named `GlobalDataBlock` is utilized, providing a `pmk_channels` array of 64 floating-point values (`pmk_channels[64]`).
    *   This allows for a scalable input of a large array of numerical data, accessible by all shader components. It's ideal for conveying vectors, sensor arrays, or multiple related metrics simultaneously.
    *   The Parameter Mapping Layer can be configured to populate these channels from fields in the incoming `dataSnapshot`.

2.  **Direct Uniforms for Specific Visual Attributes:**
    *   Beyond the global UBO, many individual uniforms control specific visual aspects of geometries, projections, and global effects.
    *   These provide fine-grained, named control over attributes like line thickness, color, morphing factors, rotation speeds, projection-specific parameters, etc.
    *   The Parameter Mapping Layer can also map fields from the `dataSnapshot` directly to these state parameters within `HypercubeCore.js`.

## Dynamic Configuration

The mapping rules are not static. The `VisualizerController.js` provides the `setParameterMappingRules` method, allowing external systems to dynamically change how `dataSnapshot` fields are translated into visual outputs at runtime. For more details on this method, please refer to the [API Reference](./API_REFERENCE.md#setparametermappingrulesrules-parametermappingrules-promisevoid).

## Controllable Parameter Categories

The system offers control over a wide range of visual elements. Based on the analysis in `ANALYSIS_AND_RECOMMENDATIONS.md`, these categories include, but are not limited to:

*   **Projection Parameters:** Control over aspects like perspective distance, stereographic pole, and other projection-specific attributes.
*   **Geometry-Specific Parameters:**
    *   **Hypercube:** Grid density, line factors, w-coordinate coefficients, 4D rotation, data-driven morphing.
    *   **Hypersphere, Hypertetrahedron, Duocylinder:** Similar detailed parameterization for shape, animation, and data responsiveness.
*   **FullScreenLattice Effect Parameters:** Line width, vertex size, distortion levels, w-coordinate factors, rotation, glitch effects, moiré patterns, colors, glow, and vignette effects.
*   **Global Visual Effects:** Overall morphing factors, global rotation speed, current dimensionality, global glitch intensity.
*   **Color Schemes:** Primary, secondary, and background colors.

This extensive parameterization, combined with the dynamic mapping layer and the high-capacity UBO, enables the creation of rich, informative, and adaptive visualizations directly driven by external data sources.
