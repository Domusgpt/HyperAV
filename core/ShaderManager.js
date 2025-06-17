/* core/ShaderManager.js - WebGPU Adapted */
class ShaderManager {
    constructor(device) { // Changed constructor signature
        if (!device) throw new Error("GPUDevice needed.");
        this.device = device;
        this.shaderModules = {}; // Cache for GPUShaderModule objects
        this.pipelines = {};     // Cache for GPURenderPipeline objects
        this.currentPipelineName = null;
        // Removed: gl, geometryManager, projectionManager, options, shaderSources, compiledShaders, programs, uniformLocations, attributeLocations, _initShaderTemplates
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

    getRenderPipeline(pipelineName, geometryName, projectionName) {
        // Placeholder for pipeline creation/fetching logic.
        // This will involve using shader modules (from createShaderModule),
        // and defining vertex buffer layouts, bind group layouts, etc.
        // GeometryManager and ProjectionManager (or similar concepts for WGSL)
        // will be needed here to provide WGSL code snippets or configurations.
        console.log(`getRenderPipeline called for: ${pipelineName} (Geom: ${geometryName}, Proj: ${projectionName}) - Not implemented yet.`);
        if (this.pipelines[pipelineName]) {
            return this.pipelines[pipelineName];
        }
        // Actual pipeline creation would happen here.
        // Example:
        // const vsModule = this.shaderModules['myVertexShader'];
        // const fsModule = this.shaderModules['myFragmentShader'];
        // if (!vsModule || !fsModule) return null;
        // const pipeline = this.device.createRenderPipeline({ ... });
        // this.pipelines[pipelineName] = pipeline;
        return null; // For now, as it's a stub
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
