/* core/ShaderManager.js - WebGPU Adapted */
// Manages WGSL shader modules and GPURenderPipeline creation and caching.
// Shader composition is done by concatenating WGSL strings for projection, geometry, and a base fragment shader.
class ShaderManager {
    constructor(device) {
        if (!device) throw new Error("GPUDevice needed for ShaderManager.");
        this.device = device;
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
        if (this.shaderModules[name]) {
            return this.shaderModules[name];
        }
        if (!this.device) {
            console.error("Cannot create shader module, GPUDevice not initialized.");
            return null;
        }
        try {
            const shaderModule = this.device.createShaderModule({
                label: name, // Optional label for debugging
                code: wgslCode,
            });
            this.shaderModules[name] = shaderModule;
            console.log(`Shader module '${name}' created.`);
            return shaderModule;
        } catch (error) {
            console.error(`Error creating shader module '${name}':`, error);
            // Log WGSL code with line numbers for debugging
            const lines = wgslCode.split('\n');
            console.error("--- WGSL Source ---");
            lines.forEach((line, i) => {
                console.error(`${(i + 1).toString().padStart(3)}: ${line}`);
            });
            console.error("--- WGSL Source End ---");
            return null;
        }
    }

    // Gets or creates a GPURenderPipeline based on the specified geometry and projection types.
    // Shaders are composed by concatenating WGSL code from base shaders and specific modules.
    getRenderPipeline(pipelineNamePrefix, geometryType, projectionType) {
        const dynamicPipelineName = `${pipelineNamePrefix}_${geometryType}_${projectionType}`;
        if (this.pipelines[dynamicPipelineName]) {
            return this.pipelines[dynamicPipelineName];
        }

        // --- Shader Source Definitions ---
        // Vertex Shader (typically static for full-screen quad rendering)
        const vertexWGSL = `
            // Vertex shader for a full-screen quad.
            // Outputs clip space position and UV coordinates to the fragment shader.
            struct VertexOutput {
                @builtin(position) clip_position: vec4<f32>,
                @location(0) uv: vec2<f32> // UV coordinates (0-1 range)
            };
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
        // These strings would ideally be loaded from their respective .wgsl files.
        var geometryWGSL = "";
        var projectionWGSL = "";

        if (geometryType === 'hypercube') {
            geometryWGSL = `
                struct HypercubeUniforms { gridDensity_channel0Factor: f32, gridDensity_timeFactor: f32, lineThickness_channel1Factor: f32, wCoord_pCoeffs1: vec3<f32>, _pad_wCoord_pCoeffs1: f32, wCoord_timeFactor1: f32, wCoord_pLengthFactor: f32, wCoord_timeFactor2: f32, wCoord_channel1Factor: f32, wCoord_coeffs2: vec3<f32>, _pad_wCoord_coeffs2: f32, baseSpeedFactor: f32, rotXW_timeFactor: f32, rotXW_channel2Factor: f32, rotXW_morphFactor: f32, rotYZ_timeFactor: f32, rotYZ_channel1Factor: f32, rotYZ_morphFactor: f32, rotYZ_angleScale: f32, rotZW_timeFactor: f32, rotZW_channel0Factor: f32, rotZW_morphFactor: f32, rotZW_angleScale: f32, rotYW_timeFactor: f32, rotYW_morphFactor: f32, finalLattice_minUniverseMod: f32 };
                @group(1) @binding(0) var<uniform> geom: HypercubeUniforms;
                fn calculateLattice_hypercube(p_initial: vec3<f32>) -> f32 {
                    let dynamicGridDensity = max(0.1, global.gridDensity * (1.0 + channels.pmk_channels[0] * geom.gridDensity_channel0Factor));
                    let dynamicLineThickness = max(0.002, global.lineThickness * (1.0 - channels.pmk_channels[1] * geom.lineThickness_channel1Factor));
                    let p_grid3D = fract(p_initial * dynamicGridDensity * 0.5 + global.time * geom.gridDensity_timeFactor);
                    let dist3D = abs(p_grid3D - 0.5); let box3D = max(dist3D.x, max(dist3D.y, dist3D.z));
                    let lattice3D = smoothstep(0.5, 0.5 - dynamicLineThickness, box3D); var finalLattice = lattice3D;
                    let dim_factor = smoothstep(3.0, 4.5, global.dimension);
                    if (dim_factor > 0.01) {
                        let w_coord_sin_arg = dot(p_initial, geom.wCoord_pCoeffs1) + global.time * geom.wCoord_timeFactor1;
                        let w_coord_cos_arg = length(p_initial) * geom.wCoord_pLengthFactor - global.time * geom.wCoord_timeFactor2 + channels.pmk_channels[1] * geom.wCoord_channel1Factor;
                        let w_coord_factor_coeffs = geom.wCoord_coeffs2.x + global.morphFactor * geom.wCoord_coeffs2.y + channels.pmk_channels[2] * geom.wCoord_coeffs2.z;
                        let w_coord = sin(w_coord_sin_arg) * cos(w_coord_cos_arg) * dim_factor * w_coord_factor_coeffs;
                        var p4d = vec4<f32>(p_initial, w_coord);
                        let baseSpeed = global.rotationSpeed * geom.baseSpeedFactor;
                        let time_rot1 = global.time*geom.rotXW_timeFactor*baseSpeed + channels.pmk_channels[2]*geom.rotXW_channel2Factor + global.morphFactor*geom.rotXW_morphFactor;
                        let time_rot2 = global.time*geom.rotYZ_timeFactor*baseSpeed - channels.pmk_channels[1]*geom.rotYZ_channel1Factor + global.morphFactor*geom.rotYZ_morphFactor;
                        let time_rot3 = global.time*geom.rotZW_timeFactor*baseSpeed + channels.pmk_channels[0]*geom.rotZW_channel0Factor + global.morphFactor*geom.rotZW_morphFactor;
                        p4d = rotXW(time_rot1) * rotYZ(time_rot2 * geom.rotYZ_angleScale) * rotZW(time_rot3 * geom.rotZW_angleScale) * p4d;
                        let finalYW_rot_angle = global.time * geom.rotYW_timeFactor * baseSpeed + global.morphFactor * geom.rotYW_morphFactor;
                        p4d = rotYW(finalYW_rot_angle) * p4d;
                        let projectedP = project4Dto3D_active(p4d);
                        let p_grid4D_proj = fract(projectedP * dynamicGridDensity * 0.5 + global.time * (geom.gridDensity_timeFactor + 0.005));
                        let dist4D_proj = abs(p_grid4D_proj - 0.5); let box4D_proj = max(dist4D_proj.x, max(dist4D_proj.y, dist4D_proj.z));
                        let lattice4D_proj = smoothstep(0.5, 0.5 - dynamicLineThickness, box4D_proj);
                        finalLattice = mix(lattice3D, lattice4D_proj, smoothstep(0.0, 1.0, global.morphFactor));
                    }
                    return pow(finalLattice, 1.0 / max(geom.finalLattice_minUniverseMod, global.universeModifier));
                }
                fn calculateLattice_active(p: vec3<f32>) -> f32 { return calculateLattice_hypercube(p); }
                fn getLatticeEffectColor_active(uv: vec2<f32>) -> vec3<f32> { return vec3<f32>(0.0); } // Dummy for non-fullscreen
            `;
        } else if (geometryType === 'fullscreenlattice') {
            geometryWGSL = `
                struct FullScreenLatticeUniforms { edgeLineWidth: f32, vertexSize: f32, distortP_pZ_factor: f32, distortP_morphCoeffs: vec3<f32>, _pad_distortP_morphCoeffs: f32, distortP_timeFactorScale: f32, wCoord_pLengthFactor: f32, wCoord_timeFactor: f32, wCoord_dimOffset: f32, rotXW_timeFactor: f32, rotYW_timeFactor: f32, rotZW_timeFactor: f32, glitch_baseFactor: f32, glitch_sinFactor: f32, glitch_rOffsetCoeffs: vec2<f32>, glitch_gOffsetCoeffs: vec2<f32>, glitch_bOffsetCoeffs: vec2<f32>, _pad_glitch_bOffsetCoeffs: vec2<f32>, moire_densityFactor1: f32, moire_densityFactor2: f32, moire_blendFactor: f32, _pad_moire_blendFactor: f32, moire_mixCoeffs: vec3<f32>, _pad_moire_mixCoeffs: f32, baseColor: vec3<f32>, _pad_baseColor: f32, effectColor: vec3<f32>, _pad_effectColor: f32, glow_color: vec3<f32>, glow_timeFactor: f32, glow_amplitudeOffset: f32, glow_amplitudeFactor: f32, vignette_inner: f32, vignette_outer: f32 };
                @group(1) @binding(0) var<uniform> geom_fsl: FullScreenLatticeUniforms;
                // Actual fsl_... helper functions (rotations, project, edges, vertices, calculateHypercubeLatticeValue) should be here.
                // For brevity in this example, we use a simplified version of getLatticeEffectColor_fullscreenlattice.
                fn getLatticeEffectColor_fullscreenlattice(uv: vec2<f32>) -> vec3<f32> {
                     // A more complete version would use all 'geom_fsl' uniforms and fsl_ helpers.
                    return vec3<f32>(uv.x, uv.y, sin(global.time * geom_fsl.glow_timeFactor)) * geom_fsl.baseColor;
                }
                fn getLatticeEffectColor_active(uv: vec2<f32>) -> vec3<f32> { return getLatticeEffectColor_fullscreenlattice(uv); }
                fn calculateLattice_active(p: vec3<f32>) -> f32 { return 0.0; } // Dummy for fullscreen
                fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32> { return p.xyz; } // Dummy for fullscreen
            `;
            projectionWGSL = "fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32> { return p.xyz; }"; // Provide a dummy if no projection needed
        } else {
             console.error("Unsupported geometryType in ShaderManager:", geometryType);
            // Fallback shader code to prevent crashes, outputs a visible error color (e.g., magenta)
            geometryWGSL = `
                fn calculateLattice_active(p: vec3<f32>) -> f32 { return 1.0; }
                fn getLatticeEffectColor_active(uv: vec2<f32>) -> vec3<f32> { return vec3<f32>(1.0, 0.0, 1.0); }
            `;
             projectionWGSL = "fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32> { return p.xyz; }";
        }

        if (projectionType === 'perspective' && geometryType !== 'fullscreenlattice') {
            projectionWGSL = `
                struct PerspectiveUniforms { baseDistance: f32, morphFactorImpact: f32, channelImpact: f32, denomMin: f32 };
                @group(2) @binding(0) var<uniform> proj: PerspectiveUniforms;
                fn project4Dto3D_perspective(p4: vec4<f32>) -> vec3<f32> {
                    let dynamicDistance = max(0.2, proj.baseDistance * (1.0 + global.morphFactor * proj.morphFactorImpact - channels.pmk_channels[1] * proj.channelImpact));
                    let denominator = dynamicDistance + p4.w;
                    let w_factor = dynamicDistance / max(proj.denomMin, denominator);
                    return p4.xyz * w_factor;
                }
                fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32> { return project4Dto3D_perspective(p); }
            `;
        } else if (geometryType !== 'fullscreenlattice') { // Only add default projection if not fullscreen and no specific projection
            console.warn("Using fallback projection in ShaderManager for projectionType:", projectionType);
            projectionWGSL = "fn project4Dto3D_active(p: vec4<f32>) -> vec3<f32> { return p.xyz / (p.w + 1.0); }";
        }

        // Final fragment shader source by concatenating the parts.
        // Order: Projection functions, then Geometry functions, then Base shader that calls them.
        const finalFragmentWGSL = projectionWGSL + "\n" + geometryWGSL + "\n" + baseFragmentWGSL_modified;

        const vertexShaderModule = this.createShaderModule(`${dynamicPipelineName}_vs`, vertexWGSL);
        const fragmentShaderModule = this.createShaderModule(`${dynamicPipelineName}_fs`, finalFragmentWGSL);

        if (!vertexShaderModule || !fragmentShaderModule) {
            console.error(`Failed to create shader modules for pipeline: ${dynamicPipelineName}.`);
            return null;
        }

        // --- Define Bind Group Layouts ---
        // Group 0: Global Uniforms & Data Channels (defined once, reused)
        // These layouts describe to the pipeline how data is structured in the bind groups.
        if (!this.globalBindGroupLayout) {
            this.globalBindGroupLayout = this.device.createBindGroupLayout({
                label: "Global Bind Group Layout",
                entries: [
                    { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform'} },
                    { binding: 1, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform'} }
                ]
            });
        }

        // Group 1: Geometry-Specific Uniforms
        if (!this.geometryBindGroupLayout) {
            this.geometryBindGroupLayout = this.device.createBindGroupLayout({
                label: "Geometry Bind Group Layout",
                entries: [ { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform'} } ]
            });
        }

        // Group 2: Projection-Specific Uniforms
        if (!this.projectionBindGroupLayout) {
            this.projectionBindGroupLayout = this.device.createBindGroupLayout({
                label: "Projection Bind Group Layout",
                entries: [ { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform'} } ]
            });
        }

        const bindGroupLayouts = [this.globalBindGroupLayout, this.geometryBindGroupLayout, this.projectionBindGroupLayout];
        // If fullscreenlattice, projection BGL might not be strictly needed by its specific shader logic,
        // but the pipeline layout still expects all declared BGLs.
        // The shader for fullscreenlattice simply won't declare a @group(2) if it doesn't use projection uniforms.

        const pipelineLayout = this.device.createPipelineLayout({
            label: `${dynamicPipelineName}_Layout`,
            bindGroupLayouts: bindGroupLayouts
        });

        // Defines the structure of vertex data fed into the vertex shader.
        const vertexBufferLayout = {
            arrayStride: 2 * 4, // 2 floats (position) * 4 bytes each
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
            // stepMode: 'vertex', // Default is 'vertex'
        };

        try {
            const pipeline = this.device.createRenderPipeline({
                label: dynamicPipelineName,
                layout: pipelineLayout,
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: 'main',
                    buffers: [vertexBufferLayout],
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: 'main',
                    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
                },
                primitive: {
                    topology: 'triangle-list', // Assumes quad is rendered as two triangles.
                },
            });
            this.pipelines[dynamicPipelineName] = pipeline;
            console.log(`Render pipeline '${dynamicPipelineName}' created successfully.`);
            return pipeline;
        } catch (error) {
            console.error(`Error creating render pipeline '${dynamicPipelineName}':`, error);
            return null;
        }
    }

    usePipeline(pipelineName) {
        if (pipelineName === null) {
            this.currentPipelineName = null;
            return true;
        }
        if (this.pipelines[pipelineName]) {
            this.currentPipelineName = pipelineName;
            return true;
        } else {
            // In WebGPU, the pipeline is set on the render pass encoder,
            // so this method primarily just tracks the name.
            // Actual pipeline object fetching and validation might happen here or in HypercubeCore.
            console.warn(`Pipeline '${pipelineName}' not found. It might be created on-demand later.`);
            // For now, let's allow setting it, assuming it will be valid when used.
            this.currentPipelineName = pipelineName;
            return true; // Or false if we want to be strict about existing pipelines
        }
    }

    dispose() {
        console.log("Disposing ShaderManager (WebGPU)...");
        this.shaderModules = {}; // Clear cache, modules are GC'd
        this.pipelines = {};     // Clear cache, pipelines are GC'd
        this.currentPipelineName = null;
        this.device = null;      // Release reference to the device
        console.log("ShaderManager (WebGPU) disposed.");
    }

    // Removed WebGL-specific methods:
    // _mergeDefaults, _initShaderTemplates, _registerShaderSource,
    // _compileShader, _logShaderSourceWithError, _createProgram,
    // createDynamicProgram (GLSL version), useProgram,
    // getUniformLocation, getAttributeLocation,
    // _getBaseVertexShaderSource, _getBaseFragmentShaderSource
}
export default ShaderManager;
