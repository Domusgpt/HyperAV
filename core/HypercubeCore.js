/* core/HypercubeCore.js - v1.5 WebGPU Enabled */
import ShaderManager from './ShaderManager.js';

// Default state of the visualization. These can be overridden by options in the constructor.
const DEFAULT_STATE = {
    startTime: 0, lastUpdateTime: 0, deltaTime: 0, time: 0.0, resolution: [0, 0],
    mouse: [0.5, 0.5], // Normalized mouse coordinates (0-1 range)
    geometryType: 'hypercube',
    projectionMethod: 'perspective',
    dimensions: 4.0,
    morphFactor: 0.5,
    rotationSpeed: 0.2,
    universeModifier: 1.0,
    patternIntensity: 1.0,
    gridDensity: 8.0,         // General grid density for SDFs
    gridDensity_lattice: 10.0, // Specific grid density for FullScreenLattice effect
    lineThickness: 0.03,
    shellWidth: 0.025,
    tetraThickness: 0.035,
    glitchIntensity: 0.0,
    colorShift: 0.0,
    isFullScreenEffect: 0, // Boolean (0 or 1) indicating if current geometry is a full-screen effect
    dataChannels: new Array(64).fill(0.0), // Array for audio-reactive data or other inputs
    colorScheme: { primary: [1.0, 0.2, 0.8], secondary: [0.2, 1.0, 1.0], background: [0.05, 0.0, 0.2] },

    // --- Projection Specific Uniforms (prefix: proj_) ---
    proj_perspective_baseDistance: 2.5,
    proj_perspective_morphFactorImpact: 0.4,
    proj_perspective_channelImpact: 0.35,
    proj_perspective_denomMin: 0.1,

    proj_stereo_basePoleW: -1.5,
    proj_stereo_channelImpact: 0.4,
    proj_stereo_epsilon: 0.001,
    proj_stereo_singularityScale: 1000.0,
    proj_stereo_morphFactorImpact: 0.8,

    // --- Geometry Specific Uniforms (prefix: geom_ or lattice_) ---
    // Hypercube
    geom_hypercube_gridDensity_channel0Factor: 0.7, geom_hypercube_gridDensity_timeFactor: 0.01,
    geom_hypercube_lineThickness_channel1Factor: 0.6, geom_hypercube_wCoord_pCoeffs1: [1.4, -0.7, 1.5],
    geom_hypercube_wCoord_timeFactor1: 0.25, geom_hypercube_wCoord_pLengthFactor: 1.1,
    geom_hypercube_wCoord_timeFactor2: 0.35, geom_hypercube_wCoord_channel1Factor: 2.5,
    geom_hypercube_wCoord_coeffs2: [0.4, 0.6, 0.6], geom_hypercube_baseSpeedFactor: 1.0,
    geom_hypercube_rotXW_timeFactor: 0.33, geom_hypercube_rotXW_channel2Factor: 0.25, geom_hypercube_rotXW_morphFactor: 0.45,
    geom_hypercube_rotYZ_timeFactor: 0.28, geom_hypercube_rotYZ_channel1Factor: 0.28, geom_hypercube_rotYZ_morphFactor: 0.0, geom_hypercube_rotYZ_angleScale: 1.1,
    geom_hypercube_rotZW_timeFactor: 0.25, geom_hypercube_rotZW_channel0Factor: 0.35, geom_hypercube_rotZW_morphFactor: 0.0, geom_hypercube_rotZW_angleScale: 0.9,
    geom_hypercube_rotYW_timeFactor: -0.22, geom_hypercube_rotYW_morphFactor: 0.3,
    geom_hypercube_finalLattice_minUniverseMod: 0.1,

    // Hypersphere
    geom_hsphere_density_gridFactor: 0.7, geom_hsphere_density_channel0Factor: 0.5, geom_hsphere_shellWidth_channel1Factor: 1.5,
    geom_hsphere_phase_tauFactor: 6.28318, geom_hsphere_phase_rotSpeedFactor: 0.8, geom_hsphere_phase_channel2Factor: 3.0,
    geom_hsphere_wCoord_radiusFactor: 2.5, geom_hsphere_wCoord_timeFactorCos: 0.55, geom_hsphere_wCoord_pCoeffs: [1.0, 1.3, -0.7],
    geom_hsphere_wCoord_timeFactorSin: 0.2, geom_hsphere_wCoord_dimFactorOffset: 0.5, geom_hsphere_wCoord_morphFactor: 0.5, geom_hsphere_wCoord_channel1Factor: 0.5,
    geom_hsphere_baseSpeedFactor: 0.85, geom_hsphere_rotXW_timeFactor: 0.38, geom_hsphere_rotXW_channel2Factor: 0.2, geom_hsphere_rotXW_angleScale: 1.05,
    geom_hsphere_finalLattice_minUniverseMod: 0.1,

    // Hypertetrahedron
    geom_htetra_density_gridFactor: 0.65, geom_htetra_density_channel0Factor: 0.4, geom_htetra_thickness_channel1Factor: 0.7,
    geom_htetra_pMod3D_timeFactor: 0.005, geom_htetra_wCoord_pCoeffsCos: [1.8, -1.5, 1.2], geom_htetra_wCoord_timeFactorCos: 0.24,
    geom_htetra_wCoord_pLengthFactor: 1.4, geom_htetra_wCoord_timeFactorSin: 0.18, geom_htetra_wCoord_channel1Factor: 2.0,
    geom_htetra_wCoord_dimFactorOffset: 0.45, geom_htetra_wCoord_morphFactor: 0.55, geom_htetra_wCoord_channel2Factor: 0.4,
    geom_htetra_baseSpeedFactor: 1.15, geom_htetra_rotXW_timeFactor: 0.28, geom_htetra_rotXW_channel2Factor: 0.25, geom_htetra_rotXW_angleScale: 0.95,
    geom_htetra_pMod4D_timeFactor: 0.008, geom_htetra_finalLattice_minUniverseMod: 0.1,

    // Duocylinder
    geom_duocyl_r1_base: 0.6, geom_duocyl_r1_morphFactor: 0.4, geom_duocyl_r2_base: 0.3, geom_duocyl_r2_channel0Factor: 0.3,
    geom_duocyl_shellWidth_channel1Factor: 0.7, geom_duocyl_fallback_pLengthFactor: 8.0, geom_duocyl_fallback_channel2Factor: 5.0,
    geom_duocyl_wCoord_len_pXY_Factor: 1.8, geom_duocyl_wCoord_timeFactorCos: 0.4, geom_duocyl_wCoord_pzFactor: 1.2, geom_duocyl_wCoord_pxFactor: 0.5,
    geom_duocyl_wCoord_timeFactorSin: 0.25, geom_duocyl_wCoord_dimFactorOffset: 0.5, geom_duocyl_wCoord_morphFactor: 0.3, geom_duocyl_wCoord_channel2Factor: 0.2,
    geom_duocyl_baseSpeedFactor: 0.9, geom_duocyl_rotXW_timeFactor: 0.30, geom_duocyl_rotXW_channel0Factor: 0.3, geom_duocyl_rotXW_angleScale: 1.0,
    geom_duocyl_finalLattice_minUniverseMod: 0.1,

    // FullScreenLattice
    lattice_edgeLineWidth: 0.03, lattice_vertexSize: 0.05, lattice_distortP_pZ_factor: 2.0, lattice_distortP_morphCoeffs: [0.2, 0.2, 0.1],
    lattice_distortP_timeFactorScale: 0.2, lattice_wCoord_pLengthFactor: 3.0, lattice_wCoord_timeFactor: 0.3, lattice_wCoord_dimOffset: -3.0,
    lattice_rotXW_timeFactor: 0.31, lattice_rotYW_timeFactor: 0.27, lattice_rotZW_timeFactor: 0.23,
    lattice_glitch_baseFactor: 0.1, lattice_glitch_sinFactor: 5.0, lattice_glitch_rOffsetCoeffs: [1.0, 0.5], lattice_glitch_gOffsetCoeffs: [-0.3, 0.2], lattice_glitch_bOffsetCoeffs: [0.1, -0.4],
    lattice_moire_densityFactor1: 1.01, lattice_moire_densityFactor2: 0.99, lattice_moire_blendFactor: 0.5, lattice_moire_mixCoeffs: [0.3, 0.4, 0.5],
    lattice_baseColor: [0.1, 0.2, 0.4], lattice_effectColor: [0.9, 0.8, 1.0], lattice_glow_color: [0.1, 0.2, 0.4],
    lattice_glow_timeFactor: 0.5, lattice_glow_amplitudeOffset: 0.5, lattice_glow_amplitudeFactor: 0.5,
    lattice_vignette_inner: 0.4, lattice_vignette_outer: 1.4,

    // Internal state, not typically set by options
    needsShaderUpdate: false, // Flag to indicate if pipeline needs recreation
    isRendering: false,
    animationFrameId: null,
    shaderProgramName: 'hypercubeShader', // Base name for shader programs/pipelines
    callbacks: { onRender: null, onError: null } // User-defined callbacks
};

class HypercubeCore {
    constructor(canvas, options = {}) { // ShaderManager is now instantiated internally
        this._asyncInitialization = this._initializeWebGPU(canvas, options);
    }

    async _initializeWebGPU(canvas, options = {}) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) throw new Error("Valid HTMLCanvasElement needed.");
        this.canvas = canvas;

        // Initialize state with defaults, then override with options passed to constructor
        this.state = { ...DEFAULT_STATE };
         // Ensure dataChannels is initialized as a 64-float array early for buffer creation
        this.state.dataChannels = new Array(64).fill(0.0);
        if (options.dataChannels && Array.isArray(options.dataChannels)) {
            for (let i = 0; i < Math.min(this.state.dataChannels.length, options.dataChannels.length); i++) {
                if (typeof options.dataChannels[i] === 'number') {
                    this.state.dataChannels[i] = options.dataChannels[i];
                }
            }
        } else if (options.dataChannels) {
             console.warn("HypercubeCore constructor: options.dataChannels was provided but not as an array. Using default dataChannels.");
        }
        // Set initial isFullScreenEffect based on default or options-provided geometryType
        this.state.isFullScreenEffect = ( (options.geometryType || DEFAULT_STATE.geometryType) === 'fullscreenlattice') ? 1 : 0;


        // Carefully merge options, ensuring type consistency and handling special cases
        for (const key in options) {
            if (Object.hasOwnProperty.call(options, key)) {
                if (key === 'colorScheme' && typeof options[key] === 'object' && options[key] !== null) {
                    this.state.colorScheme = { ...this.state.colorScheme, ...options[key] };
                } else if (key === 'callbacks' && typeof options[key] === 'object' && options[key] !== null) {
                    this.state.callbacks = { ...this.state.callbacks, ...options[key] };
                } else if (key === 'dataChannels') { // Already handled
                } else if (key === 'projectionViewDistance' && typeof options[key] === 'number') { // Legacy option mapping
                    this.state.proj_perspective_baseDistance = options[key];
                } else if (key === 'projectionPoleW' && typeof options[key] === 'number') { // Legacy option mapping
                    this.state.proj_stereo_basePoleW = options[key];
                } else if (DEFAULT_STATE.hasOwnProperty(key)) { // Check against DEFAULT_STATE for known properties
                    if (typeof options[key] === typeof this.state[key] || this.state[key] === null) {
                        if (Array.isArray(this.state[key]) && key !== 'dataChannels') {
                             if (Array.isArray(options[key]) && options[key].length === this.state[key].length) {
                                this.state[key] = options[key];
                            } else { console.warn(`Option '${key}' type mismatch (array length or type). Using default.`); }
                        } else if (!Array.isArray(this.state[key])) { // Don't overwrite arrays other than by specific logic
                            this.state[key] = options[key];
                        }
                    } else { console.warn(`Option '${key}' type mismatch. Expected ${typeof this.state[key]}, got ${typeof options[key]}. Using default.`); }
                } else { /* console.warn(`Unknown option '${key}' provided to HypercubeCore.`); */ }
            }
        }


        if (!navigator.gpu) {
            const msg = "WebGPU not supported on this browser.";
            console.error(msg);
            this.state.callbacks.onError?.(new Error(msg));
            throw new Error(msg);
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            const msg = "Failed to get GPU adapter.";
            console.error(msg);
            this.state.callbacks.onError?.(new Error(msg));
            throw new Error(msg);
        }

        this.device = await adapter.requestDevice();
        if (!this.device) {
            const msg = "Failed to get GPU device.";
            console.error(msg);
            this.state.callbacks.onError?.(new Error(msg));
            throw new Error(msg);
        }

        this.queue = this.device.queue;
        this.context = this.canvas.getContext('webgpu');
        if (!this.context) {
            const msg = "Failed to get WebGPU context from canvas.";
            console.error(msg);
            this.state.callbacks.onError?.(new Error(msg));
            throw new Error(msg);
        }

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'opaque',
        });

        console.log('WebGPU Initialized');
        this.shaderManager = new ShaderManager(this.device);

        // --- Uniform Buffer Setup ---
        // GPUBuffer object for global uniforms (time, resolution, colors, etc.).
        this.globalUniformsBuffer = null;
        // Client-side TypedArray for staging global uniform data. Populated according to WGSL struct layout.
        this.globalUniformsData = null;
        // Size in bytes for the global uniforms buffer. Adjusted to 128 bytes for revised WGSL padding.
        this.globalUniformsBufferSize = 128; // 32 floats * 4 bytes/float

        // GPUBuffer for data channels (e.g., audio reactive data, pmk_channels).
        this.dataChannelsBuffer = null;
        // Client-side TypedArray for data channels.
        this.dataChannelsData = null;
        this.dataChannelsBufferSize = 256; // 64 floats * 4 bytes/float

        // GPUBuffer for uniforms specific to the current geometry.
        this.geometryUniformsBuffer = null;
        // Client-side TypedArray for current geometry uniforms.
        this.geometryUniformsData = null;
        this.geometryUniformsBufferSize = 256; // Default size, must be sufficient for the largest geometry struct.

        // GPUBuffer for uniforms specific to the current projection.
        this.projectionUniformsBuffer = null;
        // Client-side TypedArray for current projection uniforms.
        this.projectionUniformsData = null;
        this.projectionUniformsBufferSize = 256; // Default size for projection uniforms.

        // Set to track which GPU buffers need their data updated on the GPU before the next draw call.
        this.dirtyGPUBuffers = new Set();

        // Initialize client-side data arrays for uniform buffers.
        // These will be populated from this.state and written to GPU buffers.
        this.globalUniformsData = new Float32Array(this.globalUniformsBufferSize / 4); // 32 floats for 128 bytes
        this.dataChannelsData = new Float32Array(this.dataChannelsBufferSize / 4); // 64 floats for 256 bytes
        this.geometryUniformsData = new Float32Array(this.geometryUniformsBufferSize / 4);
        this.projectionUniformsData = new Float32Array(this.projectionUniformsBufferSize / 4);

        this._initUniformBuffers();
        this._initGPUQuadBuffer();
        this._populateInitialUniformData();

        // Create Bind Groups after buffers are ready and ShaderManager has its layouts.
        // ShaderManager's getRenderPipeline is called once to ensure layouts are created.
        this.shaderManager.getRenderPipeline('initialization_dummy', this.state.geometryType, this.state.projectionMethod);

        if (this.shaderManager.globalBindGroupLayout) {
            this.globalBindGroup = this.device.createBindGroup({
                label: "Global Bind Group",
                layout: this.shaderManager.globalBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.globalUniformsBuffer } },
                    { binding: 1, resource: { buffer: this.dataChannelsBuffer } }
                ]
            });
        } else { console.error("GlobalBindGroupLayout not available from ShaderManager for GlobalBindGroup."); }

        if (this.shaderManager.geometryBindGroupLayout && this.geometryUniformsBuffer) {
            this.geometryBindGroup = this.device.createBindGroup({
                label: "Geometry Bind Group",
                layout: this.shaderManager.geometryBindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.geometryUniformsBuffer } }]
            });
        } else { console.error("GeometryBindGroupLayout or buffer not available for GeometryBindGroup."); }

        if (this.shaderManager.projectionBindGroupLayout && this.projectionUniformsBuffer) {
            this.projectionBindGroup = this.device.createBindGroup({
                label: "Projection Bind Group",
                layout: this.shaderManager.projectionBindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: this.projectionUniformsBuffer } }]
            });
        } else { console.error("ProjectionBindGroupLayout or buffer not available for ProjectionBindGroup."); }
    }

    _initGPUQuadBuffer() {
        // Creates a GPUBuffer for a full-screen quad.
        // Uses 6 vertices to define 2 triangles that cover the -1 to 1 clip space.
        const quadVertexData = new Float32Array([
            -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
        ]);
        this.quadBuffer = this.device.createBuffer({
            label: "Quad Vertex Buffer",
            size: quadVertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.quadBuffer.getMappedRange()).set(quadVertexData);
        this.quadBuffer.unmap();
        console.log("WebGPU Quad Buffer Initialized");
    }

    _initUniformBuffers() {
        // Creates GPUBuffer objects for each uniform type.
        // The client-side Float32Array views (e.g., this.globalUniformsData) are already initialized.

        this.globalUniformsBuffer = this.device.createBuffer({
            label: "Global Uniforms Buffer",
            size: this.globalUniformsBufferSize, // 128 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.dataChannelsBuffer = this.device.createBuffer({
            label: "Data Channels Buffer",
            size: this.dataChannelsBufferSize, // 256 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // this.dataChannelsData is already initialized with data from this.state.dataChannels or defaults.

        this.geometryUniformsBuffer = this.device.createBuffer({
            label: "Geometry Uniforms Buffer",
            size: this.geometryUniformsBufferSize, // 256 bytes (default)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // this.geometryUniformsData is initialized as a zeroed Float32Array.

        this.projectionUniformsBuffer = this.device.createBuffer({
            label: "Projection Uniforms Buffer",
            size: this.projectionUniformsBufferSize, // 256 bytes (default)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // this.projectionUniformsData is initialized as a zeroed Float32Array.
        console.log("WebGPU Uniform Buffers Initialized (GPU-side buffers created).");
    }

    _populateInitialUniformData() {
        // Populates the client-side TypedArrays from the initial state,
        // then writes this data to the corresponding GPU buffers.
        // This ensures the GPU has the correct starting values.

        this._updateGlobalUniformsData(); // Populates this.globalUniformsData from this.state
        this.device.queue.writeBuffer(this.globalUniformsBuffer, 0, this.globalUniformsData);

        this.dataChannelsData.set(this.state.dataChannels); // Ensure correct initial data
        this.device.queue.writeBuffer(this.dataChannelsBuffer, 0, this.dataChannelsData);

        this._updateGeometryUniformsData(); // Populates based on initial this.state.geometryType
        this.device.queue.writeBuffer(this.geometryUniformsBuffer, 0, this.geometryUniformsData);

        this._updateProjectionUniformsData(); // Populates based on initial this.state.projectionMethod
        this.device.queue.writeBuffer(this.projectionUniformsBuffer, 0, this.projectionUniformsData);

        console.log("Initial uniform data written to GPU buffers.");
    }

    // _updateGlobalUniformsData populates the this.globalUniformsData Float32Array
    // based on the current this.state, respecting WGSL struct padding for GlobalUniforms.
    // Offsets are float indices in the Float32Array.
    _updateGlobalUniformsData() {
        const gu = this.globalUniformsData; // Target Float32Array (32 floats for 128 bytes)
        const state = this.state;

        // WGSL GlobalUniforms struct layout (128 bytes as defined in ShaderManager):
        // resolution: vec2<f32> (offset 0, 1)
        gu[0] = state.resolution[0]; gu[1] = state.resolution[1];
        // time: f32 (offset 2)
        gu[2] = state.time;
        // _pad0: f32 (offset 3) - For alignment
        gu[3] = 0.0;
        // dimension: f32 (offset 4)
        gu[4] = state.dimensions;
        // morphFactor: f32 (offset 5)
        gu[5] = state.morphFactor;
        // rotationSpeed: f32 (offset 6)
        gu[6] = state.rotationSpeed;
        // universeModifier: f32 (offset 7)
        gu[7] = state.universeModifier;
        // patternIntensity: f32 (offset 8)
        gu[8] = state.patternIntensity;
        // gridDensity: f32 (offset 9)
        gu[9] = state.gridDensity;
        // gridDensity_lattice: f32 (offset 10)
        gu[10] = state.gridDensity_lattice;
        // lineThickness: f32 (offset 11)
        gu[11] = state.lineThickness;
        // shellWidth: f32 (offset 12)
        gu[12] = state.shellWidth;
        // tetraThickness: f32 (offset 13)
        gu[13] = state.tetraThickness;
        // glitchIntensity: f32 (offset 14)
        gu[14] = state.glitchIntensity;
        // colorShift: f32 (offset 15)
        gu[15] = state.colorShift;
        // mouse: vec2<f32> (offset 16, 17)
        gu[16] = state.mouse[0]; gu[17] = state.mouse[1];
        // isFullScreenEffect: u32 (offset 18) - Written as float, shader interprets as u32.
        const tempU32View = new Uint32Array(gu.buffer, gu.byteOffset + 18 * 4, 1);
        tempU32View[0] = state.isFullScreenEffect;
        // _pad1: f32 (offset 19) - For alignment before vec3
        gu[19] = 0.0;
        // primaryColor: vec3<f32> (offset 20, 21, 22)
        gu[20] = state.colorScheme.primary[0]; gu[21] = state.colorScheme.primary[1]; gu[22] = state.colorScheme.primary[2];
        // _pad2: f32 (offset 23) - Padding for vec3
        gu[23] = 0.0;
        // secondaryColor: vec3<f32> (offset 24, 25, 26)
        gu[24] = state.colorScheme.secondary[0]; gu[25] = state.colorScheme.secondary[1]; gu[26] = state.colorScheme.secondary[2];
        // _pad3: f32 (offset 27) - Padding for vec3
        gu[27] = 0.0;
        // backgroundColor: vec3<f32> (offset 28, 29, 30)
        gu[28] = state.colorScheme.backgroundColor[0]; gu[29] = state.colorScheme.backgroundColor[1]; gu[30] = state.colorScheme.backgroundColor[2];
        // _pad4: f32 (offset 31) - Padding for vec3
        gu[31] = 0.0;

        this.dirtyGPUBuffers.add('globalUniforms');
    }

    // _updateGeometryUniformsData populates this.geometryUniformsData based on the current geometryType.
    // It manually pads vec3 uniforms to align with WGSL's 16-byte alignment for vec3 in arrays/structs.
    _updateGeometryUniformsData() {
        const gd = this.geometryUniformsData; // Target Float32Array
        gd.fill(0); // Zero out the buffer first
        let offset = 0; // Tracks the current float offset in geometryUniformsData
        const state = this.state;

        // This function populates the geometry-specific uniform buffer.
        // It needs to be carefully structured for each geometry type to match its WGSL uniform struct.
        // WGSL 'vec3' types are padded to 16 bytes (4 floats) in uniform buffers.
        // The 'offset++ = 0.0; // Pad...' lines are crucial for this.
        // Note: Simple sequential packing is used here. True WGSL std140/std430 layout can be more complex,
        // especially with mixed types. This approach primarily ensures vec3s + padding = 16 bytes.
        switch(this.state.geometryType) {
            case 'hypercube':
                // Packing for HypercubeUniforms (referencing DEFAULT_STATE for field names)
                gd[offset++] = state.geom_hypercube_gridDensity_channel0Factor; // f32
                gd[offset++] = state.geom_hypercube_gridDensity_timeFactor;   // f32
                gd[offset++] = state.geom_hypercube_lineThickness_channel1Factor; // f32
                // For vec3 wCoord_pCoeffs1, ensure it starts on a 16-byte boundary relative to struct start.
                // If offset is currently 3 (meaning 3*4=12 bytes written), add 1 float padding.
                if (offset % 4 !== 0) { gd[offset++] = 0.0; } // Ensure next item is 16-byte aligned from start of struct

                gd[offset++] = state.geom_hypercube_wCoord_pCoeffs1[0]; // vec3 element
                gd[offset++] = state.geom_hypercube_wCoord_pCoeffs1[1];
                gd[offset++] = state.geom_hypercube_wCoord_pCoeffs1[2];
                gd[offset++] = 0.0; // Explicit padding after vec3 to make it consume 16 bytes

                gd[offset++] = state.geom_hypercube_wCoord_timeFactor1; // f32
                gd[offset++] = state.geom_hypercube_wCoord_pLengthFactor; // f32
                gd[offset++] = state.geom_hypercube_wCoord_timeFactor2;   // f32
                gd[offset++] = state.geom_hypercube_wCoord_channel1Factor; // f32

                // vec3 wCoord_coeffs2
                gd[offset++] = state.geom_hypercube_wCoord_coeffs2[0];
                gd[offset++] = state.geom_hypercube_wCoord_coeffs2[1];
                gd[offset++] = state.geom_hypercube_wCoord_coeffs2[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.geom_hypercube_baseSpeedFactor; // f32
                gd[offset++] = state.geom_hypercube_rotXW_timeFactor; // f32
                gd[offset++] = state.geom_hypercube_rotXW_channel2Factor; // f32
                gd[offset++] = state.geom_hypercube_rotXW_morphFactor; // f32

                gd[offset++] = state.geom_hypercube_rotYZ_timeFactor; // f32
                gd[offset++] = state.geom_hypercube_rotYZ_channel1Factor; // f32
                gd[offset++] = state.geom_hypercube_rotYZ_morphFactor; // f32
                gd[offset++] = state.geom_hypercube_rotYZ_angleScale; // f32

                gd[offset++] = state.geom_hypercube_rotZW_timeFactor; // f32
                gd[offset++] = state.geom_hypercube_rotZW_channel0Factor; // f32
                gd[offset++] = state.geom_hypercube_rotZW_morphFactor; // f32
                gd[offset++] = state.geom_hypercube_rotZW_angleScale; // f32

                gd[offset++] = state.geom_hypercube_rotYW_timeFactor; // f32
                gd[offset++] = state.geom_hypercube_rotYW_morphFactor; // f32
                gd[offset++] = state.geom_hypercube_finalLattice_minUniverseMod; // f32
                break;

            case 'hypersphere':
                gd[offset++] = state.geom_hsphere_density_gridFactor;
                gd[offset++] = state.geom_hsphere_density_channel0Factor;
                gd[offset++] = state.geom_hsphere_shellWidth_channel1Factor;
                gd[offset++] = state.geom_hsphere_phase_tauFactor;

                gd[offset++] = state.geom_hsphere_phase_rotSpeedFactor;
                gd[offset++] = state.geom_hsphere_phase_channel2Factor;
                gd[offset++] = state.geom_hsphere_wCoord_radiusFactor;
                gd[offset++] = state.geom_hsphere_wCoord_timeFactorCos;

                // vec3 wCoord_pCoeffs
                gd[offset++] = state.geom_hsphere_wCoord_pCoeffs[0];
                gd[offset++] = state.geom_hsphere_wCoord_pCoeffs[1];
                gd[offset++] = state.geom_hsphere_wCoord_pCoeffs[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.geom_hsphere_wCoord_timeFactorSin;
                gd[offset++] = state.geom_hsphere_wCoord_dimFactorOffset;
                gd[offset++] = state.geom_hsphere_wCoord_morphFactor;
                gd[offset++] = state.geom_hsphere_wCoord_channel1Factor;

                gd[offset++] = state.geom_hsphere_baseSpeedFactor;
                gd[offset++] = state.geom_hsphere_rotXW_timeFactor;
                gd[offset++] = state.geom_hsphere_rotXW_channel2Factor;
                gd[offset++] = state.geom_hsphere_rotXW_angleScale;

                gd[offset++] = state.geom_hsphere_finalLattice_minUniverseMod;
                break;

            case 'fullscreenlattice':
                // Packing for FullScreenLatticeUniforms
                gd[offset++] = state.lattice_edgeLineWidth;
                gd[offset++] = state.lattice_vertexSize;
                gd[offset++] = state.lattice_distortP_pZ_factor;
                // Align next vec3 (distortP_morphCoeffs) to a 16-byte boundary.
                // Current offset is 3 (12 bytes). Needs 1 float padding.
                if (offset % 4 !== 0) { gd[offset++] = 0.0; }


                gd[offset++] = state.lattice_distortP_morphCoeffs[0];
                gd[offset++] = state.lattice_distortP_morphCoeffs[1];
                gd[offset++] = state.lattice_distortP_morphCoeffs[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.lattice_distortP_timeFactorScale;
                gd[offset++] = state.lattice_wCoord_pLengthFactor;
                gd[offset++] = state.lattice_wCoord_timeFactor;
                gd[offset++] = state.lattice_wCoord_dimOffset;

                gd[offset++] = state.lattice_rotXW_timeFactor;
                gd[offset++] = state.lattice_rotYW_timeFactor;
                gd[offset++] = state.lattice_rotZW_timeFactor;
                gd[offset++] = state.lattice_glitch_baseFactor;

                gd[offset++] = state.lattice_glitch_sinFactor;
                gd[offset++] = state.lattice_glitch_rOffsetCoeffs[0]; // vec2
                gd[offset++] = state.lattice_glitch_rOffsetCoeffs[1];
                gd[offset++] = state.lattice_glitch_gOffsetCoeffs[0]; // vec2

                gd[offset++] = state.lattice_glitch_gOffsetCoeffs[1];
                gd[offset++] = state.lattice_glitch_bOffsetCoeffs[0]; // vec2
                gd[offset++] = state.lattice_glitch_bOffsetCoeffs[1];
                gd[offset++] = state.lattice_moire_densityFactor1;

                gd[offset++] = state.lattice_moire_densityFactor2;
                gd[offset++] = state.lattice_moire_blendFactor;
                // Before vec3 moire_mixCoeffs, ensure alignment.
                // Current offset is (12 scalar + 3*2 for vec2s) = 18 floats. (18*4 = 72 bytes).
                // Next 16-byte boundary is 80. So, need 2 floats padding.
                if (offset % 4 !== 0) { // If current offset is not a multiple of 4, pad to it.
                    let padCount = 4 - (offset % 4);
                    for(let i=0; i<padCount; ++i) gd[offset++] = 0.0;
                }


                gd[offset++] = state.lattice_moire_mixCoeffs[0];
                gd[offset++] = state.lattice_moire_mixCoeffs[1];
                gd[offset++] = state.lattice_moire_mixCoeffs[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.lattice_baseColor[0];
                gd[offset++] = state.lattice_baseColor[1];
                gd[offset++] = state.lattice_baseColor[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.lattice_effectColor[0];
                gd[offset++] = state.lattice_effectColor[1];
                gd[offset++] = state.lattice_effectColor[2];
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.lattice_glow_color[0];
                gd[offset++] = state.lattice_glow_color[1];
                gd[offset++] = state.lattice_glow_color[2];
                // This float can share the vec4 slot with last element of color if shader struct allows.
                // Assuming it's a separate f32 after a padded vec3.
                gd[offset++] = 0.0; // Pad after vec3

                gd[offset++] = state.lattice_glow_timeFactor;
                gd[offset++] = state.lattice_glow_amplitudeOffset;
                gd[offset++] = state.lattice_glow_amplitudeFactor;
                gd[offset++] = state.lattice_vignette_inner;
                gd[offset++] = state.lattice_vignette_outer;
                break;
            default:
                // console.warn(`_updateGeometryUniformsData: Unknown geometryType ${this.state.geometryType}`);
                break;
        }
        this.dirtyGPUBuffers.add('geometryUniforms');
    }

    _updateProjectionUniformsData() {
        const pd = this.projectionUniformsData; // Target Float32Array
        const state = this.state;
        let offset = 0; // Tracks float offset
        pd.fill(0); // Zero out buffer

        // This function populates projection-specific uniforms.
        // Current projection types mostly use f32, so direct sequential packing is fine
        // unless a projection adds vec3s or other types requiring explicit padding.
        switch(this.state.projectionMethod) {
            case 'perspective':
                // PerspectiveUniforms: all f32
                pd[offset++] = state.proj_perspective_baseDistance;
                pd[offset++] = state.proj_perspective_morphFactorImpact;
                pd[offset++] = state.proj_perspective_channelImpact;
                pd[offset++] = state.proj_perspective_denomMin;
                break;
            case 'stereographic':
                // StereographicUniforms: all f32
                pd[offset++] = state.proj_stereo_basePoleW;
                pd[offset++] = state.proj_stereo_channelImpact;
                pd[offset++] = state.proj_stereo_epsilon;
                pd[offset++] = state.proj_stereo_singularityScale;
                pd[offset++] = state.proj_stereo_morphFactorImpact;
                break;
            // Add case for 'orthographic' if it has specific uniforms.
            // If OrthographicUniforms struct in WGSL is empty or uses only globals, this might do nothing.
            default:
                // console.warn(`_updateProjectionUniformsData: Unknown projectionMethod ${this.state.projectionMethod}`);
                break;
        }
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
                this.state[key] = newValue;

                if (key === 'geometryType') {
                    this.state.isFullScreenEffect = (newValue === 'fullscreenlattice') ? 1 : 0;
                    needsGeomUniformUpdate = true;
                    // isFullScreenEffect is part of global uniforms, so mark that dirty too.
                    needsGlobalUniformUpdate = true;
                    this.state.needsShaderUpdate = true;
                } else if (key === 'projectionMethod') {
                    needsProjUniformUpdate = true;
                    this.state.needsShaderUpdate = true;
                } else if (key.startsWith('geom_') || key.startsWith('lattice_')) {
                    needsGeomUniformUpdate = true;
                } else if (key.startsWith('proj_')) {
                    needsProjUniformUpdate = true;
                } else if (key === 'dataChannels') {
                    needsDataChannelsUpdate = true;
                } else if (key === 'isFullScreenEffect') {
                    // This case handles direct changes to isFullScreenEffect, if any.
                    // Usually it's derived from geometryType.
                    needsGlobalUniformUpdate = true;
                }
                 // Check if it's a key that maps to GlobalUniforms (excluding specific handlers like geometryType)
                 else if (DEFAULT_STATE.hasOwnProperty(key) &&
                           !['geometryType', 'projectionMethod', 'dataChannels'].includes(key) &&
                           !key.startsWith('geom_') && !key.startsWith('proj_') && !key.startsWith('lattice_')) {
                    needsGlobalUniformUpdate = true;
                }
            }
        }

        // Order of updates can matter if one depends on another (e.g. isFullScreenEffect needs to be set before global uniforms are packed)
        // If geometryType changed, isFullScreenEffect might have changed, which is part of global uniforms.
        if (newParams.hasOwnProperty('geometryType') || needsGlobalUniformUpdate || newParams.hasOwnProperty('isFullScreenEffect') ) {
            this._updateGlobalUniformsData();
        }
        if (needsDataChannelsUpdate) {
            this.dataChannelsData.set(this.state.dataChannels); // Ensure correct array reference
            this.dirtyGPUBuffers.add('dataChannels');
        }
        if (needsGeomUniformUpdate || newParams.hasOwnProperty('geometryType')) {
            // If geometryType changes, or any of its params, update geometry uniforms.
            this._updateGeometryUniformsData();
        }
        if (needsProjUniformUpdate || newParams.hasOwnProperty('projectionMethod')) {
            // If projectionMethod changes, or any of its params, update projection uniforms.
            this._updateProjectionUniformsData();
        }
    }

    // _updateDirtyUniformBuffers uploads data from the client-side TypedArrays
    // (e.g., this.globalUniformsData) to their corresponding GPU buffers if they have been marked dirty.
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

            const pipeline = this.shaderManager.getRenderPipeline('dynamicPipe', this.state.geometryType, this.state.projectionMethod);

            if (pipeline) {
               passEncoder.setPipeline(pipeline);
            } else {
               console.error(`Render pipeline for ${this.state.geometryType}/${this.state.projectionMethod} not available!`);
               passEncoder.end();
               this.device.queue.submit([commandEncoder.finish()]);
               return false;
            }

            if (this.globalBindGroup) passEncoder.setBindGroup(0, this.globalBindGroup);
            if (this.geometryBindGroup) passEncoder.setBindGroup(1, this.geometryBindGroup);
            if (this.projectionBindGroup) passEncoder.setBindGroup(2, this.projectionBindGroup);


            if (this.quadBuffer) {
                passEncoder.setVertexBuffer(0, this.quadBuffer);
                passEncoder.draw(6, 1, 0, 0);
            } else {
                console.warn("Quad buffer not available for drawing.");
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
core/ShaderManager.js
<<<<<<< SEARCH
/* core/ShaderManager.js - WebGPU Adapted */
class ShaderManager {
    constructor(device) { // Changed constructor signature
        if (!device) throw new Error("GPUDevice needed.");
=======
/* core/ShaderManager.js - WebGPU Adapted */
// Manages WGSL shader modules and GPURenderPipeline creation and caching.
// Shader composition is done by concatenating WGSL strings for projection, geometry, and a base fragment shader.
class ShaderManager {
    constructor(device) {
        if (!device) throw new Error("GPUDevice needed for ShaderManager.");
>>>>>>> REPLACE
core/ShaderManager.js
<<<<<<< SEARCH
        this.shaderModules = {}; // Cache for GPUShaderModule objects
        this.pipelines = {};     // Cache for GPURenderPipeline objects
        this.currentPipelineName = null;
        // Removed: gl, geometryManager, projectionManager, options, shaderSources, compiledShaders, programs, uniformLocations, attributeLocations, _initShaderTemplates
    }

    // Creates (or retrieves from cache) a GPUShaderModule.
    createShaderModule(name, wgslCode) {
=======
        this.shaderModules = {}; // Cache for compiled GPUShaderModule objects.
        this.pipelines = {};     // Cache for created GPURenderPipeline objects.
        this.currentPipelineName = null; // Name of the currently active pipeline (for reference).

        // Bind group layouts are defined here as they are part of pipeline creation.
        // They are created on-demand by getRenderPipeline and cached.
        this.globalBindGroupLayout = null;
        this.geometryBindGroupLayout = null;
        this.projectionBindGroupLayout = null;
    }

    // Creates (or retrieves from cache) a GPUShaderModule.
    // Handles shader compilation and logs errors.
    createShaderModule(name, wgslCode) {
>>>>>>> REPLACE
core/ShaderManager.js
<<<<<<< SEARCH
        // --- Shader Source Definitions (Simulated File Read) ---
        const vertexWGSL = `
            struct VertexOutput { @builtin(position) clip_position: vec4<f32>, @location(0) uv: vec2<f32>};
=======
        // --- Shader Source Definitions ---
        // Vertex Shader (typically static for full-screen quad rendering)
        const vertexWGSL = `
            // Vertex shader for a full-screen quad.
            // Outputs clip space position and UV coordinates to the fragment shader.
            struct VertexOutput {
                @builtin(position) clip_position: vec4<f32>,
                @location(0) uv: vec2<f32> // UV coordinates (0-1 range)
            };
>>>>>>> REPLACE
core/ShaderManager.js
<<<<<<< SEARCH
            @vertex fn main(@location(0) position: vec2<f32>) -> VertexOutput {
                var out: VertexOutput; out.uv = position * 0.5 + 0.5;
                out.clip_position = vec4<f32>(position, 0.0, 1.0); return out;
            }
        `;

        // Base fragment shader - expects specific functions to be defined by geo/proj modules
        const baseFragmentWGSL_modified = `
            // GlobalUniforms and DataChannels structs must match HypercubeCore's buffer layout exactly
            struct GlobalUniforms {
                resolution: vec2<f32>, time: f32, _pad0: f32,
                dimension: f32, morphFactor: f32, rotationSpeed: f32, universeModifier: f32,
                patternIntensity: f32, gridDensity: f32, gridDensity_lattice: f32, lineThickness: f32,
                shellWidth: f32, tetraThickness: f32, glitchIntensity: f32, colorShift: f32,
                mouse: vec2<f32>, isFullScreenEffect: u32, _pad1: f32,
                primaryColor: vec3<f32>, _pad2: f32,
                secondaryColor: vec3<f32>, _pad3: f32,
                backgroundColor: vec3<f32>, _pad4: f32,
            };
            @group(0) @binding(0) var<uniform> global: GlobalUniforms;

            struct DataChannels { pmk_channels: array<f32, 64> };
            @group(0) @binding(1) var<uniform> channels: DataChannels;

            // Geometry-specific uniforms are expected at @group(1) @binding(0)
            // Projection-specific uniforms are expected at @group(2) @binding(0)
            // The actual structs (e.g., HypercubeUniforms, PerspectiveUniforms)
            // will be defined in the concatenated geometry/projection WGSL code.

            // Common helper functions (rotations, hsv transformations)
            fn rotXW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,0,0,-s,0,1,0,0,0,0,1,0,s,0,0,c);}
            fn rotYW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,c,0,-s,0,0,1,0,0,s,0,c);}
            fn rotZW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,1,0,0,0,0,c,-s,0,0,s,c);}
            fn rotXY(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1);}
            fn rotYZ(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,c,-s,0,0,s,c,0,0,0,0,1);}
            fn rotXZ(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1);}
            fn rgb2hsv(c:vec3<f32>)->vec3<f32>{let K=vec4<f32>(0.,-1./3.,2./3.,-1.);var p=mix(vec4<f32>(c.bg,K.w,K.z),vec4<f32>(c.gb,K.x,K.y),step(c.b,c.g));var q=mix(vec4<f32>(p.x,p.y,p.w,c.r),vec4<f32>(c.r,p.y,p.z,p.x),step(p.x,c.r));let d=q.x-min(q.w,q.y);let e=1e-10;return vec3<f32>(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
            fn hsv2rgb(c:vec3<f32>)->vec3<f32>{let K=vec4<f32>(1.,2./3.,1./3.,3.);let p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,vec3<f32>(0.0),vec3<f32>(1.0)),c.y);}

            // Active functions to be defined by concatenated modules:
            // fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32>;
            // fn calculateLattice_active(p: vec3<f32>) -> f32;
            // fn getLatticeEffectColor_active(uv: vec2<f32>) -> vec3<f32>;

            @fragment
            fn main(@location(0) v_uv: vec2<f32>) -> @location(0) vec4<f32> {
                var finalColor: vec3<f32>;
                if (global.isFullScreenEffect == 1u) {
                    finalColor = getLatticeEffectColor_active(v_uv);
                } else {
                    let aspect = vec2<f32>(global.resolution.x / global.resolution.y, 1.0);
                    let uv = (v_uv * 2.0 - 1.0) * aspect;
                    var rayDirection = normalize(vec3<f32>(uv, 1.0));
                    let camRotY = global.time * 0.05 * global.rotationSpeed + channels.pmk_channels[1] * 0.1;
                    let camRotX = sin(global.time * 0.03 * global.rotationSpeed) * 0.15 + channels.pmk_channels[2] * 0.1;
                    let camMat = rotXY(camRotX) * rotYZ(camRotY);
                    rayDirection = (camMat * vec4<f32>(rayDirection, 0.0)).xyz;
                    let p = rayDirection * 1.5;

                    let latticeValue = calculateLattice_active(p);

                    finalColor = mix(global.backgroundColor, global.primaryColor, latticeValue);
                    finalColor = mix(finalColor, global.secondaryColor, smoothstep(0.2, 0.7, channels.pmk_channels[1]) * latticeValue * 0.6);
                    if (abs(global.colorShift) > 0.01) {
                        var hsv = rgb2hsv(finalColor);
                        hsv.x = fract(hsv.x + global.colorShift * 0.5 + channels.pmk_channels[2] * 0.1);
                        finalColor = hsv2rgb(hsv);
                    }
                    finalColor = finalColor * (0.8 + global.patternIntensity * 0.7);
                    if (global.glitchIntensity > 0.001) {
                        finalColor.r = finalColor.r + sin(global.time * 10.0) * global.glitchIntensity;
                    }
                    finalColor = pow(clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.5)), vec3<f32>(0.9));
                }
                return vec4<f32>(finalColor, 1.0);
            }
        `;

        // --- Select and load geometry and projection WGSL ---
=======
            @vertex
            fn main(@location(0) position: vec2<f32>) -> VertexOutput {
                var out: VertexOutput;
                out.uv = position * 0.5 + 0.5; // Remap from -1..1 to 0..1 for UV
                out.clip_position = vec4<f32>(position, 0.0, 1.0);
                return out;
            }
        `;

        // Base fragment shader. This forms the core logic and expects specific functions
        // (like calculateLattice_active) to be provided by the geometry/projection modules.
        const baseFragmentWGSL_modified = `
            // Struct for incoming vertex shader outputs (UV coordinates).
            struct VertexInput { @location(0) uv: vec2<f32> };

            // GlobalUniforms struct: Defines data constant across all shader programs for a frame.
            // Matches the layout defined in HypercubeCore.js for globalUniformsData (128 bytes / 32 floats).
            // WGSL memory layout rules (like vec3 padding) are critical here.
            struct GlobalUniforms {
                resolution: vec2<f32>, // offset 0 (8 bytes)
                time: f32,             // offset 8 (4 bytes)
                _pad0: f32,            // offset 12 (4 bytes, padding for time)
                dimension: f32,        // offset 16
                morphFactor: f32,      // offset 20
                rotationSpeed: f32,    // offset 24
                universeModifier: f32, // offset 28
                patternIntensity: f32, // offset 32
                gridDensity: f32,      // offset 36
                gridDensity_lattice: f32,// offset 40
                lineThickness: f32,    // offset 44
                shellWidth: f32,       // offset 48
                tetraThickness: f32,   // offset 52
                glitchIntensity: f32,  // offset 56
                colorShift: f32,       // offset 60
                mouse: vec2<f32>,      // offset 64 (8 bytes)
                isFullScreenEffect: u32,// offset 72 (4 bytes)
                _pad1: f32,            // offset 76 (4 bytes, padding for isFullScreenEffect)
                primaryColor: vec3<f32>, // offset 80 (12 bytes)
                _pad2: f32,            // offset 92 (4 bytes, padding for primaryColor)
                secondaryColor: vec3<f32>,// offset 96 (12 bytes)
                _pad3: f32,            // offset 108 (4 bytes, padding for secondaryColor)
                backgroundColor: vec3<f32>,// offset 112 (12 bytes)
                _pad4: f32,            // offset 124 (4 bytes, padding for backgroundColor)
            };
            // Bind group 0, binding 0 for global uniforms.
            @group(0) @binding(0) var<uniform> global: GlobalUniforms;

            // DataChannels struct: For audio-reactive or other channel data.
            struct DataChannels { pmk_channels: array<f32, 64> }; // 64 floats * 4 bytes/float = 256 bytes
            // Bind group 0, binding 1 for data channels.
            @group(0) @binding(1) var<uniform> channels: DataChannels;

            // Geometry-specific uniforms will be at @group(1) @binding(0).
            // Projection-specific uniforms will be at @group(2) @binding(0).
            // The actual WGSL struct definitions for these (e.g., HypercubeUniforms, PerspectiveUniforms)
            // are provided by the geometry/projection WGSL modules that are concatenated.

            // Common helper functions available to all composed shaders.
            fn rotXW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,0,0,-s,0,1,0,0,0,0,1,0,s,0,0,c);}
            fn rotYW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,c,0,-s,0,0,1,0,0,s,0,c);}
            fn rotZW(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,1,0,0,0,0,c,-s,0,0,s,c);}
            fn rotXY(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1);}
            fn rotYZ(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(1,0,0,0,0,c,-s,0,0,s,c,0,0,0,0,1);}
            fn rotXZ(a:f32)->mat4x4<f32>{let c=cos(a);let s=sin(a);return mat4x4<f32>(c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1);}
            fn rgb2hsv(c:vec3<f32>)->vec3<f32>{let K=vec4<f32>(0.,-1./3.,2./3.,-1.);var p=mix(vec4<f32>(c.bg,K.w,K.z),vec4<f32>(c.gb,K.x,K.y),step(c.b,c.g));var q=mix(vec4<f32>(p.x,p.y,p.w,c.r),vec4<f32>(c.r,p.y,p.z,p.x),step(p.x,c.r));let d=q.x-min(q.w,q.y);let e=1e-10;return vec3<f32>(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
            fn hsv2rgb(c:vec3<f32>)->vec3<f32>{let K=vec4<f32>(1.,2./3.,1./3.,3.);let p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,vec3<f32>(0.0),vec3<f32>(1.0)),c.y);}

            // These function declarations act as interfaces.
            // Their definitions are expected to be provided by the concatenated geometry and projection modules
            // by aliasing their specific functions (e.g., calculateLattice_hypercube) to these "_active" names.
            fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32>;
            fn calculateLattice_active(p: vec3<f32>) -> f32;
            fn getLatticeEffectColor_active(uv: vec2<f32>) -> vec3<f32>; // For fullscreen effects

            // Main fragment shader entry point.
            @fragment
            fn main(@location(0) v_uv: vec2<f32>) -> @location(0) vec4<f32> {
                var finalColor: vec3<f32>;

                // global.isFullScreenEffect is a u32, compare with 'u' suffix.
                if (global.isFullScreenEffect == 1u) {
                    finalColor = getLatticeEffectColor_active(v_uv);
                } else {
                    // Standard SDF rendering path
                    let aspect = vec2<f32>(global.resolution.x / global.resolution.y, 1.0);
                    let uv_ndc = (v_uv * 2.0 - 1.0) * aspect; // UV to Normalized Device Coordinates
                    var rayDirection = normalize(vec3<f32>(uv_ndc, 1.0)); // Z positive towards screen for typical projection

                    // Apply camera rotations based on global parameters and data channels
                    let camRotY = global.time * 0.05 * global.rotationSpeed + channels.pmk_channels[1] * 0.1;
                    let camRotX = sin(global.time * 0.03 * global.rotationSpeed) * 0.15 + channels.pmk_channels[2] * 0.1;
                    let camMat = rotXY(camRotX) * rotYZ(camRotY);
                    rayDirection = (camMat * vec4<f32>(rayDirection, 0.0)).xyz;

                    // Initial point for raymarching or SDF evaluation (world space or camera space depending on convention)
                    let p_eval = rayDirection * 1.5;

                    // calculateLattice_active is provided by the specific geometry module.
                    // It uses 'p_eval', global uniforms, data channels, and its own specific geometry uniforms.
                    // If the geometry shader needs a projected point (e.g. a 4D geometry calling project4Dto3D_active),
                    // it's responsible for doing so.
                    let latticeValue = calculateLattice_active(p_eval);

                    // Basic coloring based on lattice value and global color scheme
                    finalColor = mix(global.backgroundColor, global.primaryColor, latticeValue);
                    finalColor = mix(finalColor, global.secondaryColor, smoothstep(0.2, 0.7, channels.pmk_channels[1]) * latticeValue * 0.6);

                    // Apply color shift
                    if (abs(global.colorShift) > 0.01) {
                        var hsv = rgb2hsv(finalColor);
                        hsv.x = fract(hsv.x + global.colorShift * 0.5 + channels.pmk_channels[2] * 0.1);
                        finalColor = hsv2rgb(hsv);
                    }

                    finalColor = finalColor * (0.8 + global.patternIntensity * 0.7); // Apply pattern intensity

                    // Simplified glitch effect based on global intensity
                    if (global.glitchIntensity > 0.001) {
                        finalColor.r = finalColor.r + sin(global.time * 10.0) * global.glitchIntensity * 0.5; // Modulated glitch
                    }

                    // Final color adjustments (e.g., tone mapping / clamping)
                    finalColor = pow(clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.5)), vec3<f32>(0.9));
                }
                return vec4<f32>(finalColor, 1.0);
            }
        `;

        // --- Dynamically select and assemble WGSL code for geometry and projection ---
>>>>>>> REPLACE
