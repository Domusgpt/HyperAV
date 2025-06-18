/* core/HypercubeCore.js - v1.4 */
import ShaderManager from './ShaderManager.js';

/*
 * CONCEPTUAL: Offline Rendering / Custom Frame Rate
 * To support rendering image sequences or operating without being tied to display refresh rate,
 * the following modifications could be considered:
 *
 * 1. Manual Frame Rendering Method:
 *    - Introduce a method like `renderSingleFrame(time, parameters)`:
 *      - This method would take a specific time and current parameters.
 *      - It would execute the core drawing logic (currently in `_drawFrameLogic` or similar).
 *      - It would *not* call `requestAnimationFrame`.
 *
 * 2. Offscreen Framebuffer (FBO):
 *    - Create and manage a WebGL Framebuffer Object (FBO).
 *    - Before drawing in `renderSingleFrame`, bind this FBO.
 *    - After drawing, unbind the FBO.
 *    - Implement a method like `getFrameData()` that uses `gl.readPixels()` to extract
 *      the rendered image from the FBO's texture attachment.
 *
 * 3. External Loop:
 *    - An external script would then call `renderSingleFrame` repeatedly with advancing
 *      time steps and collect data via `getFrameData` to save as an image sequence.
 *
 * 4. Headless GL (Advanced):
 *    - For running outside a browser, the WebGL context creation and canvas handling
 *      would need to be abstracted to use a headless GL library (e.g., in Node.js).
 *      This would be a more significant refactoring.
 *
 * The `_drawFrameLogic` method below is a first step towards isolating the core rendering commands.
 */

const DEFAULT_STATE = {
    startTime: 0, lastUpdateTime: 0, deltaTime: 0, time: 0.0, resolution: [0, 0],
    mouse: [0.5, 0.5],
    geometryType: 'hypercube', projectionMethod: 'perspective', dimensions: 4.0,
    morphFactor: 0.5, rotationSpeed: 0.2, universeModifier: 1.0, patternIntensity: 1.0,
    gridDensity: 8.0,
    gridDensity_lattice: 10.0,
    lineThickness: 0.03, shellWidth: 0.025, tetraThickness: 0.035,
    glitchIntensity: 0.0, colorShift: 0.0,
    isFullScreenEffect: 0,
    dataChannels: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    colorScheme: { primary: [1.0, 0.2, 0.8], secondary: [0.2, 1.0, 1.0], background: [0.05, 0.0, 0.2] },

    // New Projection Uniforms (Perspective)
    proj_perspective_baseDistance: 2.5,
    proj_perspective_morphFactorImpact: 0.4,
    proj_perspective_channelImpact: 0.35,
    proj_perspective_denomMin: 0.1,

    // New Projection Uniforms (Stereographic)
    proj_stereo_basePoleW: -1.5,
    proj_stereo_channelImpact: 0.4,
    proj_stereo_epsilon: 0.001,
    proj_stereo_singularityScale: 1000.0,
    proj_stereo_morphFactorImpact: 0.8,

    // New Geometry Uniforms (HypercubeGeometry)
    geom_hypercube_gridDensity_channel0Factor: 0.7,
    geom_hypercube_gridDensity_timeFactor: 0.01,
    geom_hypercube_lineThickness_channel1Factor: 0.6,
    geom_hypercube_wCoord_pCoeffs1: [1.4, -0.7, 1.5],
    geom_hypercube_wCoord_timeFactor1: 0.25,
    geom_hypercube_wCoord_pLengthFactor: 1.1,
    geom_hypercube_wCoord_timeFactor2: 0.35,
    geom_hypercube_wCoord_channel1Factor: 2.5,
    geom_hypercube_wCoord_coeffs2: [0.4, 0.6, 0.6],
    geom_hypercube_baseSpeedFactor: 1.0,
    geom_hypercube_rotXW_timeFactor: 0.33,
    geom_hypercube_rotXW_channel2Factor: 0.25,
    geom_hypercube_rotXW_morphFactor: 0.45,
    geom_hypercube_rotYZ_timeFactor: 0.28,
    geom_hypercube_rotYZ_channel1Factor: 0.28,
    geom_hypercube_rotYZ_morphFactor: 0.0,
    geom_hypercube_rotYZ_angleScale: 1.1,
    geom_hypercube_rotZW_timeFactor: 0.25,
    geom_hypercube_rotZW_channel0Factor: 0.35,
    geom_hypercube_rotZW_morphFactor: 0.0,
    geom_hypercube_rotZW_angleScale: 0.9,
    geom_hypercube_rotYW_timeFactor: -0.22,
    geom_hypercube_rotYW_morphFactor: 0.3,
    geom_hypercube_finalLattice_minUniverseMod: 0.1,

    // HypersphereGeometry Uniforms
    geom_hsphere_density_gridFactor: 0.7,
    geom_hsphere_density_channel0Factor: 0.5,
    geom_hsphere_shellWidth_channel1Factor: 1.5,
    geom_hsphere_phase_tauFactor: 6.28318,
    geom_hsphere_phase_rotSpeedFactor: 0.8,
    geom_hsphere_phase_channel2Factor: 3.0,
    geom_hsphere_wCoord_radiusFactor: 2.5,
    geom_hsphere_wCoord_timeFactorCos: 0.55,
    geom_hsphere_wCoord_pCoeffs: [1.0, 1.3, -0.7],
    geom_hsphere_wCoord_timeFactorSin: 0.2,
    geom_hsphere_wCoord_dimFactorOffset: 0.5,
    geom_hsphere_wCoord_morphFactor: 0.5,
    geom_hsphere_wCoord_channel1Factor: 0.5,
    geom_hsphere_baseSpeedFactor: 0.85,
    geom_hsphere_rotXW_timeFactor: 0.38,
    geom_hsphere_rotXW_channel2Factor: 0.2,
    geom_hsphere_rotXW_angleScale: 1.05, // Example, original was 1.05
    geom_hsphere_finalLattice_minUniverseMod: 0.1,

    // HypertetrahedronGeometry Uniforms
    geom_htetra_density_gridFactor: 0.65,
    geom_htetra_density_channel0Factor: 0.4,
    geom_htetra_thickness_channel1Factor: 0.7,
    geom_htetra_pMod3D_timeFactor: 0.005,
    geom_htetra_wCoord_pCoeffsCos: [1.8, -1.5, 1.2],
    geom_htetra_wCoord_timeFactorCos: 0.24,
    geom_htetra_wCoord_pLengthFactor: 1.4,
    geom_htetra_wCoord_timeFactorSin: 0.18,
    geom_htetra_wCoord_channel1Factor: 2.0,
    geom_htetra_wCoord_dimFactorOffset: 0.45,
    geom_htetra_wCoord_morphFactor: 0.55,
    geom_htetra_wCoord_channel2Factor: 0.4,
    geom_htetra_baseSpeedFactor: 1.15,
    geom_htetra_rotXW_timeFactor: 0.28,
    geom_htetra_rotXW_channel2Factor: 0.25,
    geom_htetra_rotXW_angleScale: 0.95, // Example, original was 0.95
    geom_htetra_pMod4D_timeFactor: 0.008,
    geom_htetra_finalLattice_minUniverseMod: 0.1,

    // DuocylinderGeometry Uniforms
    geom_duocyl_r1_base: 0.6,
    geom_duocyl_r1_morphFactor: 0.4,
    geom_duocyl_r2_base: 0.3,
    geom_duocyl_r2_channel0Factor: 0.3,
    geom_duocyl_shellWidth_channel1Factor: 0.7,
    geom_duocyl_fallback_pLengthFactor: 8.0,
    geom_duocyl_fallback_channel2Factor: 5.0,
    geom_duocyl_wCoord_len_pXY_Factor: 1.8,
    geom_duocyl_wCoord_timeFactorCos: 0.4,
    geom_duocyl_wCoord_pzFactor: 1.2,
    geom_duocyl_wCoord_pxFactor: 0.5,
    geom_duocyl_wCoord_timeFactorSin: 0.25,
    geom_duocyl_wCoord_dimFactorOffset: 0.5,
    geom_duocyl_wCoord_morphFactor: 0.3,
    geom_duocyl_wCoord_channel2Factor: 0.2,
    geom_duocyl_baseSpeedFactor: 0.9,
    geom_duocyl_rotXW_timeFactor: 0.30,
    geom_duocyl_rotXW_channel0Factor: 0.3,
    geom_duocyl_rotXW_angleScale: 1.0,
    geom_duocyl_finalLattice_minUniverseMod: 0.1,

    // FullScreenLatticeGeometry Uniforms (matches u_gridDensity_lattice for gridDensity)
    lattice_edgeLineWidth: 0.03,
    lattice_vertexSize: 0.05,
    lattice_distortP_pZ_factor: 2.0,
    lattice_distortP_morphCoeffs: [0.2, 0.2, 0.1],
    lattice_distortP_timeFactorScale: 0.2, // original: time * 0.2 * rotationSpeed
    lattice_wCoord_pLengthFactor: 3.0,
    lattice_wCoord_timeFactor: 0.3,
    lattice_wCoord_dimOffset: -3.0, // (dimension - 3.0)
    lattice_rotXW_timeFactor: 0.31, // These multiply (timeFactor * factor)
    lattice_rotYW_timeFactor: 0.27,
    lattice_rotZW_timeFactor: 0.23,
    lattice_glitch_baseFactor: 0.1,
    lattice_glitch_sinFactor: 5.0,
    lattice_glitch_rOffsetCoeffs: [1.0, 0.5], // Multiplied by glitchAmount
    lattice_glitch_gOffsetCoeffs: [-0.3, 0.2],
    lattice_glitch_bOffsetCoeffs: [0.1, -0.4],
    lattice_moire_densityFactor1: 1.01,
    lattice_moire_densityFactor2: 0.99,
    lattice_moire_blendFactor: 0.5,
    lattice_moire_mixCoeffs: [0.3, 0.4, 0.5],
    lattice_baseColor: [0.1, 0.2, 0.4],
    lattice_effectColor: [0.9, 0.8, 1.0],
    lattice_glow_color: [0.1, 0.2, 0.4],
    lattice_glow_timeFactor: 0.5,
    lattice_glow_amplitudeOffset: 0.5,
    lattice_glow_amplitudeFactor: 0.5,
    lattice_vignette_inner: 0.4,
    lattice_vignette_outer: 1.4,

    needsShaderUpdate: false, _dirtyUniforms: new Set(), isRendering: false, animationFrameId: null,
    shaderProgramName: 'maleficarumViz',
    callbacks: { onRender: null, onError: null }
};

class HypercubeCore {
    constructor(canvas, shaderManager, options = {}) {
        // This constructor will be made async in a moment.
        // For now, let's prepare for the async initialization.
        this._asyncInitialization = this._initializeWebGPU(canvas, shaderManager, options);
    }

    async _initializeWebGPU(canvas, shaderManager, options = {}) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) throw new Error("Valid HTMLCanvasElement needed.");
        // ShaderManager might be optional or refactored for WebGPU
        // if (shaderManager && !(shaderManager instanceof ShaderManager)) throw new Error("Valid ShaderManager needed.");
        this.canvas = canvas;

        if (!navigator.gpu) {
            console.error("WebGPU not supported on this browser.");
            this.state.callbacks.onError?.(new Error("WebGPU not supported"));
            throw new Error("WebGPU not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.error("Failed to get GPU adapter.");
            this.state.callbacks.onError?.(new Error("Failed to get GPU adapter"));
            throw new Error("Failed to get GPU adapter");
        }

        this.device = await adapter.requestDevice();
        if (!this.device) {
            console.error("Failed to get GPU device.");
            this.state.callbacks.onError?.(new Error("Failed to get GPU device"));
            throw new Error("Failed to get GPU device");
        }

        this.queue = this.device.queue;
        this.context = this.canvas.getContext('webgpu');

        if (!this.context) {
            console.error("Failed to get WebGPU context from canvas.");
            this.state.callbacks.onError?.(new Error("Failed to get WebGPU context"));
            throw new Error("Failed to get WebGPU context");
        }

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'opaque', // or 'premultiplied'
        });

        console.log('WebGPU Initialized');
        this.shaderManager = shaderManager; // Assign if needed, may change with WebGPU shaders

        // this.quadBuffer = null; // WebGPU uses different buffer concepts
        // this.aPositionLoc = -1; // WebGPU uses different attribute handling

        // UBOs will be handled differently in WebGPU (GPUBindGroup, GPUBindGroupLayout)
        // this.globalDataUBO = null;
        // this.globalDataBuffer = new Float32Array(64);
        // this.uboBindingPoint = 0; // WebGL UBO concept

        // Define uniform buffer properties
        this.globalUniformsBuffer = null;
        this.globalUniformsData = null; // Float32Array
        this.globalUniformsBufferSize = 144; // Calculated based on WGSL struct

        this.dataChannelsBuffer = null;
        this.dataChannelsData = null; // Float32Array for array<f32, 64>
        this.dataChannelsBufferSize = 256; // 64 * 4 bytes

        this.geometryUniformsBuffer = null;
        this.geometryUniformsData = null; // Float32Array, contents depend on active geometry
        this.geometryUniformsBufferSize = 256; // Fixed initial size, may need to be dynamic or max size

        this.projectionUniformsBuffer = null;
        this.projectionUniformsData = null; // Float32Array, contents depend on active projection
        this.projectionUniformsBufferSize = 256; // Fixed initial size

        this.dirtyGPUBuffers = new Set();

        // Initialize dataChannels state ensuring it's an array of 64 floats
        let initialDataChannels = new Array(64).fill(0.0);
        if (options.dataChannels && Array.isArray(options.dataChannels)) {
            for (let i = 0; i < Math.min(initialDataChannels.length, options.dataChannels.length); i++) {
                if (typeof options.dataChannels[i] === 'number') {
                    initialDataChannels[i] = options.dataChannels[i];
                }
            }
        } else if (options.dataChannels) {
            console.warn("HypercubeCore constructor: options.dataChannels was provided but not as an array. Using default dataChannels.");
        }
        // Ensure this.state.dataChannels is also updated before _initUniformBuffers if it relies on it.
        // The loop below for options will set this.state.dataChannels.

        // Initialize state with defaults, then override with options
        this.state = { ...DEFAULT_STATE }; // Initialize state early for callbacks
        this.state.dataChannels = initialDataChannels; // Explicitly set the 64-float array here

        // Carefully merge options to ensure type consistency for nested objects like colorScheme
        // and to handle specific option mappings like projectionViewDistance.
        for (const key in options) {
            if (Object.hasOwnProperty.call(options, key)) {
                if (key === 'colorScheme' && typeof options[key] === 'object' && options[key] !== null) {
                    this.state.colorScheme = { ...DEFAULT_STATE.colorScheme, ...options[key] };
                } else if (key === 'callbacks' && typeof options[key] === 'object' && options[key] !== null) {
                    this.state.callbacks = { ...DEFAULT_STATE.callbacks, ...options[key] };
                } else if (key === 'dataChannels') {
                    // Already handled: this.state.dataChannels updated above.
                    // Just need to ensure it's marked dirty for initial buffer write if that's handled by updateParameters logic
                } else if (key === 'projectionViewDistance' && typeof options[key] === 'number') {
                    this.state.proj_perspective_baseDistance = options[key];
                } else if (key === 'projectionPoleW' && typeof options[key] === 'number') {
                    this.state.proj_stereo_basePoleW = options[key];
                } else if (Object.hasOwnProperty.call(DEFAULT_STATE, key)) {
                    // Check if the type of option value matches the default state type (simple check)
                    if (typeof options[key] === typeof DEFAULT_STATE[key] || DEFAULT_STATE[key] === null ) {
                         // For arrays, ensure it's an array and elements have same type (more complex, simplified here)
                        if (Array.isArray(DEFAULT_STATE[key]) && key !== 'dataChannels') { // Exclude dataChannels as it's specially handled
                            if (Array.isArray(options[key]) && options[key].length === DEFAULT_STATE[key].length) {
                                // Basic check, could be deeper for element types
                                this.state[key] = options[key];
                            } else {
                                console.warn(`Option '${key}' type mismatch (array length or type). Using default.`);
                            }
                        } else if (key !== 'dataChannels') { // Exclude dataChannels
                            this.state[key] = options[key];
                        }
                    } else {
                        console.warn(`Option '${key}' type mismatch. Expected ${typeof DEFAULT_STATE[key]}, got ${typeof options[key]}. Using default.`);
                    }
                } else {
                    // console.warn(`Unknown option '${key}' provided to HypercubeCore.`);
                }
            }
        } else if (options.dataChannels) {
            console.warn("HypercubeCore constructor: options.dataChannels was provided but not as an array. Using default dataChannels.");
        }


        // Initialize state with defaults, then override with options
                }
            }
        }
        // this.state._dirtyUniforms = new Set(); // Replaced by dirtyGPUBuffers


        this.state.lineThickness = options.lineThickness ?? DEFAULT_STATE.lineThickness; // These will be handled by updateParameters
        this.state.shellWidth = options.shellWidth ?? DEFAULT_STATE.shellWidth;
        this.state.tetraThickness = options.tetraThickness ?? DEFAULT_STATE.tetraThickness;
        // this._markAllUniformsDirty(); // Old mechanism
        if (options.geometryType) this.state.geometryType = options.geometryType;
        if (options.projectionMethod) this.state.projectionMethod = options.projectionMethod;
        if (options.shaderProgramName) this.state.shaderProgramName = options.shaderProgramName;

        // WebGL specific setup is removed/commented out
        // try {
            // this._setupWebGLState(); // WebGL specific
            // this._initBuffers(); // WebGL specific
            // this.state.needsShaderUpdate = true; // Shader updates will be different
            // this._updateShaderIfNeeded(); // WebGL specific
            // this._initOrUpdateGlobalDataUBO(this.state.dataChannels); // UBOs are WebGL specific
        // } catch (error) {
        //     console.error("HypercubeCore Init Error:", error);
        // }
        // this._markAllUniformsDirty(); // Old mechanism, replace with direct buffer updates or marking buffers dirty

        this._initUniformBuffers(); // Create GPU buffers
        this._initGPUQuadBuffer(); // Create quad vertex buffer
        this._populateInitialUniformData(); // Populate and write initial data
    }

    /**
     * Renders a single frame to the provided GPUTextureView.
     * @param {number} timestamp - The current time for the frame, can be used to set this.state.time if needed.
     * @param {GPUTextureView} targetTextureView - The texture view to render to.
     * @param {GPUTextureFormat} targetTextureFormat - The format of the target texture.
     * @param {{width: number, height: number}} targetTextureSize - The dimensions of the target texture.
     * @returns {boolean} True if rendering was attempted, false otherwise.
     * @private
     */
    _renderToTexture(timestamp, targetTextureView, targetTextureFormat, targetTextureSize) {
        if (!this.device || !this.context) {
            console.error("WebGPU device or context not available for rendering to texture.");
            return false;
        }
         if (!targetTextureView || !targetTextureFormat || !targetTextureSize) {
            console.error("_renderToTexture: Missing targetTextureView, targetTextureFormat, or targetTextureSize.");
            return false;
        }

        // Ensure uniforms are up-to-date on the GPU
        // It's assumed that this.state.time and other parameters for the snapshot
        // have been set via updateParameters() before calling getSnapshot(),
        // which in turn calls this method.
        // So, we just need to ensure buffers are written.
        this._updateDirtyUniformBuffers();


        try {
            const commandEncoder = this.device.createCommandEncoder();

            const colorAttachment = {
                view: targetTextureView,
                clearValue: {
                    r: this.state.colorScheme.background[0],
                    g: this.state.colorScheme.background[1],
                    b: this.state.colorScheme.background[2],
                    a: 1.0
                },
                loadOp: 'clear',
                storeOp: 'store',
            };

            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [colorAttachment],
            });

            // Set viewport for the offscreen texture
            passEncoder.setViewport(0, 0, targetTextureSize.width, targetTextureSize.height, 0, 1);
            passEncoder.setScissorRect(0, 0, targetTextureSize.width, targetTextureSize.height);


            // TODO: Set actual pipeline from ShaderManager
            // const pipeline = this.shaderManager.getRenderPipeline(
            //     this.state.shaderProgramName,
            //     this.state.geometryType,
            //     this.state.projectionMethod
            // );
            // if (pipeline) {
            //    passEncoder.setPipeline(pipeline);
            // } else {
            //    console.error("Render pipeline not available for _renderToTexture!");
            //    passEncoder.end();
            //    commandEncoder.finish(); // Finish cleanly even if no pipeline
            //    return false;
            // }

            // TODO: Create and set bind groups for uniform buffers
            // passEncoder.setBindGroup(0, this.globalUniformsBindGroup); // Example
            // passEncoder.setBindGroup(1, this.dataChannelsBindGroup); // Example
            // passEncoder.setBindGroup(2, this.geometryUniformsBindGroup); // Example
            // passEncoder.setBindGroup(3, this.projectionUniformsBindGroup); // Example


            if (this.quadBuffer) {
                passEncoder.setVertexBuffer(0, this.quadBuffer);
                // passEncoder.draw(6, 1, 0, 0); // For 6 vertices (2 triangles)
                // If using triangle strip with 4 vertices: passEncoder.draw(4, 1, 0, 0);
                // For now, commented out as pipeline is not set.
            }

            passEncoder.end();
            this.device.queue.submit([commandEncoder.finish()]);
            return true;

        } catch (error) {
            console.error("Error during WebGPU rendering to texture:", error);
            return false;
        }
    }


    _initGPUQuadBuffer() {
        // Using a simple quad (2 triangles, 6 vertices) for a full-screen effect
        const quadVertexData = new Float32Array([
            // Triangle 1
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            // Triangle 2
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0,
        ]);
        // Alternative: Triangle Strip (4 vertices)
        // const quadVertexData = new Float32Array([
        //    -1.0, -1.0, // bottom left
        //     1.0, -1.0, // bottom right
        //    -1.0,  1.0, // top left
        //     1.0,  1.0, // top right
        // ]);

        this.quadBuffer = this.device.createBuffer({
            size: quadVertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.quadBuffer.getMappedRange()).set(quadVertexData);
        this.quadBuffer.unmap();
        console.log("WebGPU Quad Buffer Initialized");
    }

    _initUniformBuffers() {
        // GlobalUniforms (matches WGSL struct GlobalUniforms) - Size 144 bytes
        this.globalUniformsBuffer = this.device.createBuffer({
            size: this.globalUniformsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.globalUniformsData = new Float32Array(this.globalUniformsBufferSize / 4); // 36 floats

        // DataChannels (array<f32, 64>) - Size 256 bytes
        this.dataChannelsBuffer = this.device.createBuffer({
            size: this.dataChannelsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.dataChannelsData = new Float32Array(this.state.dataChannels); // Should be 64 floats

        // Geometry Uniforms (fixed size for now)
        this.geometryUniformsBuffer = this.device.createBuffer({
            size: this.geometryUniformsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // Actual Float32Array for geometryUniformsData will be set when geometryType changes,
        // or an initial one based on default geometry. For now, can be zeroed.
        this.geometryUniformsData = new Float32Array(this.geometryUniformsBufferSize / 4);

        // Projection Uniforms (fixed size for now)
        this.projectionUniformsBuffer = this.device.createBuffer({
            size: this.projectionUniformsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.projectionUniformsData = new Float32Array(this.projectionUniformsBufferSize / 4);
        console.log("WebGPU Uniform Buffers Initialized");
    }

    _populateInitialUniformData() {
        // This function should fill the TypedArrays (e.g., this.globalUniformsData)
        // with values from this.state, respecting the WGSL struct layouts.
        // Then, write these to the GPU buffers.

        this._updateGlobalUniformsData();
        this.device.queue.writeBuffer(this.globalUniformsBuffer, 0, this.globalUniformsData);

        this.dataChannelsData.set(this.state.dataChannels);
        this.device.queue.writeBuffer(this.dataChannelsBuffer, 0, this.dataChannelsData);

        this._updateGeometryUniformsData(); // Populate based on current this.state.geometryType
        this.device.queue.writeBuffer(this.geometryUniformsBuffer, 0, this.geometryUniformsData);

        this._updateProjectionUniformsData(); // Populate based on current this.state.projectionMethod
        this.device.queue.writeBuffer(this.projectionUniformsBuffer, 0, this.projectionUniformsData);

        console.log("Initial uniform data written to GPU buffers.");
    }

    // New method to map this.state to the this.globalUniformsData TypedArray
    _updateGlobalUniformsData() {
        const gu = this.globalUniformsData;
        const state = this.state;
        // Offsets based on WGSL GlobalUniforms struct (144 bytes)
        gu[0] = state.resolution[0];          // resolution: vec2<f32>
        gu[1] = state.resolution[1];
        gu[2] = state.time;                   // time: f32
        // gu[3] is padding
        gu[4] = state.dimensions;             // dimension: f32
        gu[5] = state.morphFactor;            // morphFactor: f32
        gu[6] = state.rotationSpeed;          // rotationSpeed: f32
        gu[7] = state.universeModifier;       // universeModifier: f32
        gu[8] = state.patternIntensity;       // patternIntensity: f32
        gu[9] = state.gridDensity;            // gridDensity: f32
        gu[10] = state.gridDensity_lattice;   // gridDensity_lattice: f32
        // gu[11] is padding (gridDensity_lattice was float, next is lineThickness, needs padding before if not multiple of 4 floats from start)
        // Let's re-verify padding. If time is at offset 2 (0-indexed), _pad0 is at 3. dimension at 4.
        // resolution (2) time (1) _pad0 (1) = 4 floats (16 bytes)
        // dimension (1) morphFactor (1) rotationSpeed (1) universeModifier (1) = 4 floats (16 bytes)
        // patternIntensity (1) gridDensity (1) gridDensity_lattice (1) lineThickness (1) = 4 floats (16 bytes)
        // shellWidth (1) tetraThickness (1) glitchIntensity (1) colorShift (1) = 4 floats (16 bytes)
        // mouse (2) isFullScreenEffect (u32 -> 1 float) _pad1 (1) = 4 floats (16 bytes)
        // primaryColor (3) _pad2 (1) = 4 floats (16 bytes)
        // secondaryColor (3) _pad3 (1) = 4 floats (16 bytes)
        // backgroundColor (3) _pad4 (1) = 4 floats (16 bytes)
        // Total: 9 * 4 = 36 floats = 144 bytes. This matches.

        gu[11] = state.lineThickness;         // lineThickness: f32
        gu[12] = state.shellWidth;            // shellWidth: f32
        gu[13] = state.tetraThickness;        // tetraThickness: f32
        gu[14] = state.glitchIntensity;       // glitchIntensity: f32
        gu[15] = state.colorShift;            // colorShift: f32
        gu[16] = state.mouse[0];              // mouse: vec2<f32>
        gu[17] = state.mouse[1];
        // isFullScreenEffect (u32) - handle with Uint32Array view or ensure it's correctly converted
        // For simplicity with Float32Array, we treat it as a float here. Shader will interpret u32.
        const tempU32 = new Uint32Array(this.globalUniformsData.buffer, 18 * 4, 1); // Offset 18 for isFullScreenEffect
        tempU32[0] = state.isFullScreenEffect; // isFullScreenEffect: u32
        // gu[19] is _pad1
        gu[20] = state.colorScheme.primary[0]; // primaryColor: vec3<f32>
        gu[21] = state.colorScheme.primary[1];
        gu[22] = state.colorScheme.primary[2];
        // gu[23] is _pad2
        gu[24] = state.colorScheme.secondary[0]; // secondaryColor: vec3<f32>
        gu[25] = state.colorScheme.secondary[1];
        gu[26] = state.colorScheme.secondary[2];
        // gu[27] is _pad3
        gu[28] = state.colorScheme.backgroundColor[0]; // backgroundColor: vec3<f32>
        gu[29] = state.colorScheme.backgroundColor[1];
        gu[30] = state.colorScheme.backgroundColor[2];
        // gu[31] is _pad4
        this.dirtyGPUBuffers.add('globalUniforms');
    }

    _updateGeometryUniformsData() {
        // This function will populate this.geometryUniformsData based on this.state.geometryType
        // and the corresponding this.state.geom_... values.
        // Example for 'hypercube':
        if (this.state.geometryType === 'hypercube') {
            const gd = this.geometryUniformsData; // Assuming it's correctly sized Float32Array
            const state = this.state;
            // Map state.geom_hypercube_... to gd array based on HypercubeUniforms WGSL struct
            // This requires knowing the exact layout of HypercubeUniforms.
            // For now, let's imagine a simplified mapping:
            gd[0] = state.geom_hypercube_gridDensity_channel0Factor;
            gd[1] = state.geom_hypercube_gridDensity_timeFactor;
            // ... and so on for all fields in HypercubeUniforms, respecting WGSL padding.
            // This part is highly dependent on the specific WGSL struct for each geometry.
        } else if (this.state.geometryType === 'hypersphere') {
            // Populate for hypersphere
        } // ... etc.
        this.dirtyGPUBuffers.add('geometryUniforms');
    }

    _updateProjectionUniformsData() {
        // Similar to _updateGeometryUniformsData, but for projection
        if (this.state.projectionMethod === 'perspective') {
            const pd = this.projectionUniformsData;
            const state = this.state;
            // Map state.proj_perspective_... to pd array
            pd[0] = state.proj_perspective_baseDistance;
            pd[1] = state.proj_perspective_morphFactorImpact;
            // ... and so on for PerspectiveUniforms.
        } // ... etc.
        this.dirtyGPUBuffers.add('projectionUniforms');
    }


    // _markAllUniformsDirty() { ... } // To be removed or behavior changed
    // _markUniformDirty(stateKey) { ... } // To be removed

    updateParameters(newParams) {
        let needsGeomUniformUpdate = false;
        let needsProjUniformUpdate = false;
        let needsDataChannelsUpdate = false;
        let needsGlobalUniformUpdate = false;

        for (const key in newParams) {
            if (!Object.hasOwnProperty.call(this.state, key) && !DEFAULT_STATE.hasOwnProperty(key)) continue;

            const oldValue = this.state[key];
            const newValue = newParams[key];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                this.state[key] = newValue; // Update the state

                // Determine which buffer(s) are affected
                if (key.startsWith('geom_')) {
                    needsGeomUniformUpdate = true;
                } else if (key.startsWith('proj_')) {
                    needsProjUniformUpdate = true;
                } else if (key.startsWith('lattice_')) { // FullScreenLattice uniforms also go into geometry buffer
                    needsGeomUniformUpdate = true;
                } else if (key === 'dataChannels') {
                    needsDataChannelsUpdate = true;
                } else if (key === 'geometryType' || key === 'projectionMethod') {
                    if (key === 'geometryType') needsGeomUniformUpdate = true;
                    if (key === 'projectionMethod') needsProjUniformUpdate = true;
                    this.state.needsShaderUpdate = true; // Pipeline might need to change
                } else if (Object.keys(DEFAULT_STATE).includes(key) && key !== 'callbacks' && key !== 'shaderProgramName' && key !== 'needsShaderUpdate' && key !== 'isRendering' && key !== 'animationFrameId' && key !== 'startTime' && key !== 'lastUpdateTime' && key !== 'deltaTime') {
                    // This is a general global uniform if not caught by specific prefixes
                    needsGlobalUniformUpdate = true;
                }
            }
        }

        if (needsGlobalUniformUpdate) {
            this._updateGlobalUniformsData();
        }
        if (needsDataChannelsUpdate) {
            this.dataChannelsData.set(this.state.dataChannels);
            this.dirtyGPUBuffers.add('dataChannels');
        }
        if (needsGeomUniformUpdate) {
            this._updateGeometryUniformsData(); // This will handle current geometryType
        }
        if (needsProjUniformUpdate) {
            this._updateProjectionUniformsData(); // This will handle current projectionMethod
        }
        // this.state.needsShaderUpdate might be true if geometryType/projectionMethod changed,
        // which will be handled by pipeline creation logic later.
    }

    _updateDirtyUniformBuffers() {
        if (this.dirtyGPUBuffers.has('globalUniforms')) {
            this.device.queue.writeBuffer(this.globalUniformsBuffer, 0, this.globalUniformsData);
        }
        if (this.dirtyGPUBuffers.has('dataChannels')) {
            this.device.queue.writeBuffer(this.dataChannelsBuffer, 0, this.dataChannelsData);
        }
        if (this.dirtyGPUBuffers.has('geometryUniforms')) {
            this.device.queue.writeBuffer(this.geometryUniformsBuffer, 0, this.geometryUniformsData);
        }
        if (this.dirtyGPUBuffers.has('projectionUniforms')) {
            this.device.queue.writeBuffer(this.projectionUniformsBuffer, 0, this.projectionUniformsData);
        }
        this.dirtyGPUBuffers.clear();
    }

    _checkResize() {
        // WebGPU resize handling will be different.
        // It involves checking canvas clientWidth/clientHeight and potentially reconfiguring the context
        // or recreating swap chain textures.
        const c = this.canvas;
        const dw = c.clientWidth;
        const dh = c.clientHeight;
        if (c.width !== dw || c.height !== dh) {
            c.width = dw;
            c.height = dh;
            // For WebGPU, you might need to reconfigure the context or handle texture resizing.
            // This is a placeholder for now.
            this.state.resolution = [dw, dh];
            // this._markUniformDirty('resolution'); // Old way
            this._updateGlobalUniformsData(); // Resolution is in globalUniformsData
            console.log(`Canvas resized to ${dw}x${dh}. WebGPU context might need reconfiguration.`);
            // Example: this.context.configure({ device: this.device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
            // Width/height are implicitly handled by currentTexture in swap chain.
            return true;
        }
        return false;
    }

    // _setUniforms() { ... } // To be removed or refactored for WebGPU. Uniforms are set via GPUBindGroup and written to GPUBuffer.

    _drawFrameLogic(timestamp) {
        if (!this.device || !this.context) {
            console.error("WebGPU device or context not available for drawing.");
            this.stop();
            return false;
        }

        try {
            const currentTexture = this.context.getCurrentTexture();
            const textureView = currentTexture.createView();

            const commandEncoder = this.device.createCommandEncoder();

            const colorAttachment = {
                view: textureView,
                clearValue: {
                    r: this.state.colorScheme.background[0],
                    g: this.state.colorScheme.background[1],
                    b: this.state.colorScheme.background[2],
                    a: 1.0
                },
                loadOp: 'clear',
                storeOp: 'store',
            };

            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [colorAttachment],
            });

            // TODO: Set actual pipeline from ShaderManager
            // const pipeline = this.shaderManager.getRenderPipeline(
            //     this.state.shaderProgramName,
            //     this.state.geometryType,
            //     this.state.projectionMethod
            // );
            // if (pipeline) {
            //    passEncoder.setPipeline(pipeline);
            // } else {
            //    console.error("Render pipeline not available!");
            //    // Potentially stop rendering or use a fallback
            // }

            // TODO: Create and set bind groups for uniform buffers
            // passEncoder.setBindGroup(0, this.globalUniformsBindGroup); // Example
            // passEncoder.setBindGroup(1, this.dataChannelsBindGroup); // Example
            // passEncoder.setBindGroup(2, this.geometryUniformsBindGroup); // Example
            // passEncoder.setBindGroup(3, this.projectionUniformsBindGroup); // Example


            if (this.quadBuffer) {
                passEncoder.setVertexBuffer(0, this.quadBuffer);
                // passEncoder.draw(6, 1, 0, 0); // For 6 vertices (2 triangles)
                // If using triangle strip with 4 vertices: passEncoder.draw(4, 1, 0, 0);
                // For now, commented out as pipeline is not set.
            }

            passEncoder.end();

            const commandBuffer = commandEncoder.finish();
            this.device.queue.submit([commandBuffer]);

        } catch (error) {
            console.error("Error during WebGPU rendering:", error);
            // Handle context loss or other errors, potentially stop rendering loop
            if (error.message.includes("lost")) { // Basic check for context loss
                console.warn("WebGPU context lost. Attempting to re-initialize or stop.");
                this.stop();
                // Optionally, try to re-initialize WebGPU resources here or notify user.
            }
            return false; // Indicate drawing failed
        }


        if (!this.state.startTime) this.state.startTime = timestamp;
        const currentTime = (timestamp - this.state.startTime) * 0.001;
        this.state.deltaTime = currentTime - this.state.time; // For external use or CPU-side logic
        this.state.time = currentTime; // Update state time

        // Update time in global uniforms buffer
        this.globalUniformsData[2] = this.state.time; // time is at offset 2
        this.dirtyGPUBuffers.add('globalUniforms');


        this._checkResize(); // Handle canvas resize, may update globalUniformsData.resolution

        this._updateDirtyUniformBuffers(); // Write all changed uniform data to GPU

        // Shader and pipeline updates will be handled differently (later subtask)
        // if (this.state.needsShaderUpdate) {
        //     // This would involve getting/creating a new pipeline from ShaderManager
        //     // and potentially new bind groups if layouts change.
        //     // For now, needsShaderUpdate is set but not acted upon by this function directly for pipeline.
        // }

        this.state.callbacks.onRender?.(this.state);
        return true;
    }

    async _render(timestamp) {
        if (!this.state.isRendering) return;

        if (this._drawFrameLogic(timestamp)) { // Call the new method
            // Only request next frame if drawing was successful and still rendering
            if (this.state.isRendering) {
                 this.state.animationFrameId = requestAnimationFrame(this._render.bind(this));
            }
        } else {
            // If _drawFrameLogic returned false, it might have called this.stop() or encountered an error.
            // Ensure rendering stops if not already explicitly stopped.
            if (this.state.isRendering) {
                this.stop(); // Or handle error appropriately
                console.warn("Rendering loop stopped due to issues in _drawFrameLogic.");
            }
        }
    }
    async start() {
        // Ensure initialization is complete
        if (this._asyncInitialization) {
            try {
                await this._asyncInitialization;
                this._asyncInitialization = null; // Clear it after successful completion
            } catch (error) {
                console.error("WebGPU initialization failed, cannot start rendering:", error);
                this.state.callbacks.onError?.(error);
                return;
            }
        }

        if (this.state.isRendering) return;
        if (!this.device || !this.context) { // Check WebGPU resources
            console.error(`Cannot start, WebGPU device or context invalid.`);
            return;
        }
        console.log(`Starting render loop (WebGPU).`);
        this.state.isRendering = true;
        this.state.startTime = performance.now();
        this.state.time = 0;
        this.state.lastUpdateTime = this.state.startTime;

        // Shader/Pipeline setup will be different for WebGPU
        // if (this.state.needsShaderUpdate) {
        //    if (!this._updatePipelineIfNeeded()) { // Example new method for pipeline changes
        //        console.error(`Initial pipeline setup failed.`);
        //        this.state.isRendering = false;
        //        return;
        //    }
        // }
        // this._markAllUniformsDirty(); // Old mechanism, initial population is now explicit
        this.state.animationFrameId = requestAnimationFrame(this._render.bind(this));
    }

    stop() {
        if (!this.state.isRendering) return;
        console.log(`Stopping render loop (WebGPU).`);
        if (this.state.animationFrameId) {
            cancelAnimationFrame(this.state.animationFrameId);
        }
        this.state.isRendering = false;
        this.state.animationFrameId = null;
    }

    dispose() {
        const name = this.state?.shaderProgramName || 'Unknown'; // May need adjustment
        console.log(`Disposing HypercubeCore (${name}) (WebGPU)...`);
        this.stop();

        // WebGPU resources are typically not explicitly 'lost' like WebGL contexts.
        // Device destruction can be done if necessary, but often not explicitly called by apps.
        // if (this.device) {
        //     this.device.destroy(); // This is a permanent destruction.
        //     console.log("WebGPU device destroyed.");
        // }

        // this.quadBuffer = null; // Not used

        // Release GPU buffers
        this.globalUniformsBuffer?.destroy();
        this.dataChannelsBuffer?.destroy();
        this.geometryUniformsBuffer?.destroy();
        this.projectionUniformsBuffer?.destroy();

        this.globalUniformsBuffer = null;
        this.dataChannelsBuffer = null;
        this.geometryUniformsBuffer = null;
        this.projectionUniformsBuffer = null;

        this.device = null;
        this.queue = null;
        this.context = null;
        this.canvas = null;
        this.shaderManager = null;
        this.state = {};
        console.log(`HypercubeCore (${name}) (WebGPU) disposed.`);
    }
}
export default HypercubeCore;
