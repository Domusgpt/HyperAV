# Multimodal N-Dimensional Polytope Visualizer

This project is a WebGL-based tool for visualizing dynamic geometric forms, including 4D polytopes, driven by various data sources. It started as an audio-reactive visualizer and has been expanded into a more general-purpose data visualization engine.

## Key Features

*   **Multiple Data Sources:**
    *   **Microphone Input:** Real-time audio reactivity (bass, mid, high frequencies influence visuals).
    *   **Procedural Sine Waves:** Generates continuous data streams for visualization without external input.
*   **Selectable Geometries:** Explore different shapes:
    *   Hypercube
    *   Hypersphere
    *   Hypertetrahedron
    *   Duocylinder (New!)
*   **Projection Methods:** View 4D structures through:
    *   Perspective Projection
    *   Orthographic Projection
    *   Stereographic Projection
*   **Dynamic Parameter Control:** Interactive sliders adjust:
    *   Morph Factor
    *   Rotation Speed
    *   Grid Density / Line Thickness / Shell Width
    *   Pattern Intensity
    *   Universe Modifier (distortion effects)
    *   Color Shift & Glitch Intensity
*   **N-Dimensional Control:**
    *   Set the number of dimensions (N) via a UI control (integer input, e.g., 2-8).
    *   This currently influences 4D-style effects which are then projected to 3D.
    *   Conceptual work is in progress for a fully generalized N-dimensional rendering pipeline.

## Controls Overview

The UI provides controls for:
*   **Data Source Selection:** Switch between Microphone and Procedural data.
*   **Geometry Selection:** Choose the polytope/shape to visualize.
*   **Projection Method Selection:** Change how 4D structures are projected.
*   **Parameter Sliders:** Fine-tune various visual aspects. The core data from the selected source is mapped to `u_dataChannel1`, `u_dataChannel2`, and `u_dataChannel3` uniforms in the shaders, driving many reactive elements.

## Technical Aspects

*   Built with **WebGL** and **GLSL** shaders for hardware-accelerated graphics.
*   A central `HypercubeCore.js` manages the rendering loop and shader parameters.
*   Geometries are defined in `GeometryManager.js`, allowing for new shapes to be added.
*   Projection logic is handled by `ProjectionManager.js`.
*   Audio processing and data source management occur in `visualizer-main.js`.

## Future Directions & Advanced Concepts

The following areas have undergone initial conceptual work and represent potential future enhancements:

*   **Fully Generalized N-Dimensional Engine:** Expanding the rendering pipeline to natively support arbitrary dimensions beyond the current 3D/4D focus.
*   **Offline / Custom Framerate Rendering:** Modifying the core engine to allow rendering image sequences independently of the browser's refresh rate, useful for video production or detailed analysis.

## How to Run

1.  Clone or download the repository.
2.  Open `index.html` in a modern web browser that supports WebGL (e.g., Chrome, Firefox, Edge).
3.  If using the "Microphone" data source, allow microphone access when prompted by the browser.
