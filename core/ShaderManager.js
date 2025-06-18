/* core/ShaderManager.js - WebGPU Adapted */
class ShaderManager {
    constructor(device) { // Changed constructor signature
        if (!device) throw new Error("GPUDevice needed.");
        this.device = device;
        this.shaderModules = {}; // Cache for GPUShaderModule objects
        this.pipelines = {};     // Cache for GPURenderPipeline objects
        this.currentPipelineName = null;
        // Removed: gl, geometryManager, projectionManager, options, shaderSources, compiledShaders, programs, uniformLocations, attributeLocations, _initShaderTemplates
        this.bindGroupLayoutsCache = {}; // To cache BGLs associated with pipeline names or configurations
    }

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
            // Log WGSL code with line numbers for debugging, similar to _logShaderSourceWithError
            const lines = wgslCode.split('\n');
            console.error("--- WGSL Source ---");
            lines.forEach((line, i) => {
                console.error(`${(i + 1).toString().padStart(3)}: ${line}`);
            });
            console.error("--- WGSL Source End ---");
            return null;
        }
    }

    /**
     * Creates or retrieves a cached GPURenderPipeline.
     * @param {string} pipelineName - A unique name for caching the pipeline.
     * @param {string} vertexWGSL - WGSL code for the vertex shader.
     * @param {string} fragmentWGSL - WGSL code for the fragment shader.
     * @param {string} vertexEntryPoint - The entry point function name in the vertex shader.
     * @param {string} fragmentEntryPoint - The entry point function name in the fragment shader.
     * @param {Array<object>} bindGroupLayoutEntriesList - An array of arrays, where each inner array contains GPUBindGroupLayoutEntry objects for a bind group.
     *                                                    e.g., [[globalUniformsBGLEntry, dataChannelsBGLEntry], [geometryUniformsBGLEntry], ...]
     * @returns {GPURenderPipeline | null} The created or cached pipeline, or null on error.
     */
    getRenderPipeline(pipelineName, vertexWGSL, fragmentWGSL, vertexEntryPoint, fragmentEntryPoint, bindGroupLayoutEntriesList) {
        if (this.pipelines[pipelineName]) {
            return this.pipelines[pipelineName];
        }
        if (!this.device) {
            console.error("Cannot create render pipeline, GPUDevice not initialized.");
            return null;
        }

        try {
            const vertexShaderModule = this.createShaderModule(`${pipelineName}_vs`, vertexWGSL);
            const fragmentShaderModule = this.createShaderModule(`${pipelineName}_fs`, fragmentWGSL);

            if (!vertexShaderModule || !fragmentShaderModule) {
                console.error(`Failed to create shader modules for pipeline '${pipelineName}'.`);
                return null;
            }

            const vertexBufferLayout = {
                arrayStride: 2 * 4, // 2 floats (vec2<f32>), 4 bytes each
                attributes: [{
                    shaderLocation: 0, // Corresponds to @location(0) in base_vertex.wgsl
                    offset: 0,
                    format: 'float32x2'
                }]
            };

            const bindGroupLayouts = bindGroupLayoutEntriesList.map((entries, i) => {
                const bglName = `${pipelineName}_bgl${i}`;
                if (this.bindGroupLayoutsCache[bglName]) {
                    return this.bindGroupLayoutsCache[bglName];
                }
                const bgl = this.device.createBindGroupLayout({
                    label: bglName,
                    entries: entries
                });
                this.bindGroupLayoutsCache[bglName] = bgl;
                return bgl;
            });

            const pipelineLayout = this.device.createPipelineLayout({
                label: `${pipelineName}_layout`,
                bindGroupLayouts: bindGroupLayouts
            });

            const pipeline = this.device.createRenderPipeline({
                label: pipelineName,
                layout: pipelineLayout,
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: vertexEntryPoint,
                    buffers: [vertexBufferLayout]
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: fragmentEntryPoint,
                    targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat() // TODO: Make this configurable or get from context
                    }]
                },
                primitive: {
                    topology: 'triangle-list', // Default, could be 'triangle-strip' for a quad
                },
                // TODO: Add depthStencil configuration if needed
            });

            this.pipelines[pipelineName] = pipeline;
            console.log(`Render pipeline '${pipelineName}' created and cached.`);
            return pipeline;

        } catch (error) {
            console.error(`Error creating render pipeline '${pipelineName}':`, error);
            return null;
        }
    }

    /**
     * Creates a GPUBindGroup.
     * @param {string} pipelineName - The name of the pipeline this bind group is for (to retrieve its layout).
     *                                 Alternatively, a direct GPUBindGroupLayout can be passed if managed externally.
     * @param {number} groupIndex - The index of the bind group (e.g., 0, 1, 2).
     * @param {Array<GPUBindGroupEntry>} bindings - An array of GPUBindGroupEntry objects.
     * @returns {GPUBindGroup | null} The created bind group or null on error.
     */
    createBindGroup(pipelineName, groupIndex, bindings) {
        if (!this.device) {
            console.error("Cannot create bind group, GPUDevice not initialized.");
            return null;
        }

        const pipeline = this.pipelines[pipelineName];
        if (!pipeline) {
            console.error(`Pipeline '${pipelineName}' not found. Cannot retrieve bind group layout for group index ${groupIndex}.`);
            // Fallback: try to get BGL from cache directly if pipeline creation failed but BGL was made
            const bglName = `${pipelineName}_bgl${groupIndex}`;
            const layout = this.bindGroupLayoutsCache[bglName];
            if (!layout) {
                 console.error(`BindGroupLayout '${bglName}' not found in cache either.`);
                 return null;
            }
             console.warn(`Using cached BindGroupLayout '${bglName}' due to missing pipeline.`);
             return this.device.createBindGroup({
                label: `${pipelineName}_group${groupIndex}`,
                layout: layout,
                entries: bindings,
            });
        }

        // WebGPU pipelines do not directly expose their GPUPipelineLayout object's bindGroupLayouts array easily after creation
        // in a way that's directly usable by createBindGroup without already having the BGL.
        // The BGLs are cached during getRenderPipeline. We should retrieve them from there.
        const bglName = `${pipelineName}_bgl${groupIndex}`;
        const layout = this.bindGroupLayoutsCache[bglName];

        if (!layout) {
            console.error(`BindGroupLayout for pipeline '${pipelineName}' at group index ${groupIndex} (expected cache name '${bglName}') not found.`);
            return null;
        }

        try {
            return this.device.createBindGroup({
                label: `${pipelineName}_group${groupIndex}`,
                layout: layout, // Use the specific BGL for this group index
                entries: bindings,
            });
        } catch (error) {
            console.error(`Error creating bind group for pipeline '${pipelineName}', group ${groupIndex}:`, error);
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
        this.bindGroupLayoutsCache = {}; // Clear BGL cache
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
