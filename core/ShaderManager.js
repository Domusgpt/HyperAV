// core/ShaderManager.js
// Basic WGSL shader strings (can be moved to separate files later)
const basicVertexWGSL = `
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)
    );
    return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}
`;

const basicFragmentWGSL = `
struct GlobalUniforms { // Must match layout provided by HypercubeCore's globalUniformsBuffer
    resolution: vec2<f32>, // offset 0, size 8
    time: f32,             // offset 8, size 4
    _pad0: f32,            // offset 12, size 4 (padding for vec4 alignment before next item)
    // Total up to here: 16 bytes
    // Next item (dimensions) should start at a multiple of its alignment (f32 -> 4 bytes)
    // So, if _pad0 ensures 'dimensions' starts at 16, that's fine.
    dimensions: f32,       // offset 16
    morphFactor: f32,      // offset 20
    rotationSpeed: f32,    // offset 24
    universeModifier: f32, // offset 28
    // ... add more fields if needed by basic shader, up to the full struct
    // For this test, time and dimensions are used.
};
struct DataChannels { // Must match layout provided by HypercubeCore's dataChannelsBuffer
    channels: array<f32, 64>,
};

@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;
@group(1) @binding(0) var<uniform> dataChannelsVal: DataChannels; // Renamed to avoid conflict if 'dataChannels' is a keyword

@fragment
fn main() -> @location(0) vec4<f32> {
    let timeVal = globalUniforms.time;
    // Use a data channel to influence color, ensure it's somewhat visible
    let channel0Effect = dataChannelsVal.channels[0] * 0.5 + 0.25; // Map 0..1 to 0.25..0.75

    var r = abs(sin(timeVal * 0.5 + channel0Effect * 2.0));
    var g = abs(cos(timeVal * 0.3 + globalUniforms.dimensions * 0.1)); // Use another global
    var b = abs(sin(timeVal * 0.7 + channel0Effect * 1.0));

    // Ensure color is somewhat bright if channel0 is low.
    r = r * (0.5 + channel0Effect);
    g = g * (0.5 + (1.0 - channel0Effect));
    b = b * (0.5 + abs(0.5 - channel0Effect));

    return vec4<f32>(r, g, b, 1.0);
}
`;


class ShaderManager {
    constructor(device) {
        if (!device) {
            console.error("ShaderManager: GPUDevice instance is required.");
            throw new Error("GPUDevice needed for ShaderManager.");
        }
        this.device = device;
        this.shaderModules = {};
        this.pipelines = {};
        this.currentPipelineName = null;
        console.log("ShaderManager (WebGPU) initialized.");

        // Pre-create basic shader modules for testing and default fallback
        this.createShaderModule('basicVS', basicVertexWGSL);
        this.createShaderModule('basicFS', basicFragmentWGSL);
    }

    createShaderModule(name, wgslCode) {
        if (this.shaderModules[name]) {
            console.log(`ShaderManager: Shader module '${name}' already exists in cache.`);
            return this.shaderModules[name];
        }
        if (!this.device) {
            console.error("ShaderManager.createShaderModule: Device not initialized.");
            return null;
        }
        try {
            const shaderModule = this.device.createShaderModule({
                label: name,
                code: wgslCode,
            });
            this.shaderModules[name] = shaderModule;
            console.log(`ShaderManager: Shader module '${name}' created successfully.`);
            return shaderModule;
        } catch (error) {
            console.error(`ShaderManager: Error creating shader module '${name}':`, error, "\nWGSL Code:\n", wgslCode);
            return null;
        }
    }

    // Now expects a pipelineName for caching and a full GPURenderPipelineDescriptor
    getRenderPipeline(pipelineName, descriptor) {
        if (this.pipelines[pipelineName]) {
            return this.pipelines[pipelineName];
        }
        if (!this.device || !descriptor) {
            console.error("ShaderManager.getRenderPipeline: Device or pipeline descriptor missing.");
            return null;
        }

        // Ensure shader modules in descriptor are valid
        if (!descriptor.vertex || !descriptor.vertex.module || !(descriptor.vertex.module instanceof GPUShaderModule)) {
            console.error(`ShaderManager.getRenderPipeline: Invalid or missing vertex shader module in descriptor for '${pipelineName}'.`);
            return null;
        }
        if (!descriptor.fragment || !descriptor.fragment.module || !(descriptor.fragment.module instanceof GPUShaderModule)) {
            console.error(`ShaderManager.getRenderPipeline: Invalid or missing fragment shader module in descriptor for '${pipelineName}'.`);
            return null;
        }

        console.log(`ShaderManager: Creating render pipeline '${pipelineName}'.`);
        // console.log("Pipeline Descriptor:", JSON.stringify(descriptor, (key, value) => {
        //     if (value instanceof GPUShaderModule) return `GPUShaderModule(label:${value.label || 'unknown'})`;
        //     if (value instanceof GPUPipelineLayout) return `GPUPipelineLayout(label:custom)`; // GPUPipelineLayout doesn't have a label property
        //     return value;
        // }, 2));

        try {
            const pipeline = this.device.createRenderPipeline(descriptor);
            this.pipelines[pipelineName] = pipeline;
            console.log(`ShaderManager: Render pipeline '${pipelineName}' created and cached successfully.`);
            return pipeline;
        } catch (error) {
            console.error(`ShaderManager: Error creating render pipeline '${pipelineName}':`, error);
            // Log a more detailed descriptor if possible, careful with circular refs or complex objects
            try {
                 console.error("ShaderManager: Failing Pipeline Descriptor Snippet:", {
                    layout: descriptor.layout ? 'GPUPipelineLayout (exists)' : 'undefined', // GPUPipelineLayout is opaque
                    vertexEntryPoint: descriptor.vertex.entryPoint,
                    vertexModuleLabel: descriptor.vertex.module.label,
                    fragmentEntryPoint: descriptor.fragment.entryPoint,
                    fragmentModuleLabel: descriptor.fragment.module.label,
                    primitiveTopology: descriptor.primitive ? descriptor.primitive.topology : 'undefined',
                    targetFormat: descriptor.fragment.targets[0] ? descriptor.fragment.targets[0].format : 'undefined'
                 });
            } catch (e) { console.error("ShaderManager: Error logging descriptor details", e); }
            return null;
        }
    }

    usePipeline(pipelineName) {
        // This method's utility changes with WebGPU as pipeline is set on render pass encoder.
        // It can still be used to track the "active" or "intended" pipeline conceptually.
        if (!this.pipelines[pipelineName]) {
            console.warn(`ShaderManager.usePipeline: Pipeline '${pipelineName}' not found in cache. Ensure it's created first.`);
            return false;
        }
        this.currentPipelineName = pipelineName;
        // console.log(`ShaderManager: Conceptually switched to pipeline '${pipelineName}'.`);
        return true;
    }

    dispose() {
        console.log("ShaderManager: Disposing resources.");
        this.shaderModules = {};
        this.pipelines = {}; // Pipelines are owned by device, no explicit destroy method on GPURenderPipeline
        this.device = null; // Release device reference
    }
}
export default ShaderManager;
