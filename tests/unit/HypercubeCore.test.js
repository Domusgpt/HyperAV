// tests/unit/HypercubeCore.test.js
import HypercubeCore from '../../core/HypercubeCore.js';
import ShaderManager from '../../core/ShaderManager.js'; // Used to define mock structure

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteHC = ""; let beforeEachCallbackHC; let afterEachCallbackHC;
function describeHC(d, s) { currentSuiteHC = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteHC = ""; }
async function itHC(d, fn) {
    console.log(\`  Test: \${currentSuiteHC} - \${d}\`);
    try {
        beforeEachCallbackHC && beforeEachCallbackHC();
        await fn();
        console.log(\`    Passed: \${currentSuiteHC} - \${d}\`);
    } catch (e) {
        console.error(\`    Failed: \${currentSuiteHC} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[0] : '');
    } finally {
        afterEachCallbackHC && afterEachCallbackHC();
    }
}
function beforeEachHC(cb) { beforeEachCallbackHC = cb; }
function afterEachHC(cb) { afterEachCallbackHC = cb; }
const expectHC = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected object to be defined\`),
    toBeNull: () => assert(actual === null, \`Expected object to be null\`),
    toBe: (expected) => assert(actual === expected, \`Expected '\${actual}' to be '\${expected}'\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toHaveBeenCalled: (mockFunc) => {
        const funcName = (mockFunc && mockFunc.name) || 'mockFunction'; // Check if mockFunc is defined
        assert(mockFunc && mockFunc.called, \`Expected \${funcName} to have been called.\`);
    },
    toHaveBeenCalledWithArgMatching: (mockFunc, argIndex, partialMatcher) => {
        const funcName = (mockFunc && mockFunc.name) || 'mockFunction';
        assert(mockFunc && mockFunc.called, \`Expected \${funcName} to have been called.\`);
        const callArgs = mockFunc.lastArgs;
        assert(callArgs && callArgs.length > argIndex, \`Expected at least \${argIndex + 1} args for \${funcName}\`);
        const arg = callArgs[argIndex];
        for(const key in partialMatcher) {
            assert(JSON.stringify(arg[key]) === JSON.stringify(partialMatcher[key]), \`Matcher failed for key '\${key}' in arg \${argIndex} of \${funcName}. Expected \${JSON.stringify(partialMatcher[key])}, got \${JSON.stringify(arg[key])} \`);
        }
    },
    toBeInstanceOf: (expectedClass) => assert(actual instanceof expectedClass, \`Expected object to be instance of \${expectedClass.name}\`),
    toHaveProperty: (prop) => assert(actual && actual.hasOwnProperty(prop), \`Expected object to have property '\${prop}'\`),
    toHaveKeyWithValue: (key, value) => assert(actual && actual[key] === value, \`Expected object to have key '\${key}' with value '\${value}'\`)
});

// --- Comprehensive WebGPU Mocks ---
let mockGPUAdapter;
let mockGPUDevice;
let mockGPUCanvasContext;
let mockGPUTexture;
let mockGPUTextureView;
let mockGPUCommandEncoder;
let mockGPURenderPassEncoder;
let mockGPUQueue;
let mockShaderManagerInstance;
let mockCanvas;

class MockGPUShaderModule { constructor(options) {this.label = options ? options.label : 'unlabeled';} } // Handle undefined options
class MockGPURenderPipeline { constructor(options) {this.label = options ? options.label : 'unlabeled';} }
class MockGPUBuffer {
    constructor(descriptor) { this.size = descriptor.size; this.usage = descriptor.usage; this.destroyed = false; }
    getMappedRange() { return new ArrayBuffer(this.size); }
    unmap() {}
    destroy() { this.destroyed = true; }
}
class MockGPUBindGroupLayout { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } }
class MockGPUBindGroup { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } }
class MockGPUPipelineLayout { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } }

function setupGlobalMocks() {
    mockGPURenderPassEncoder = {
        name: "mockGPURenderPassEncoder", called: false, lastArgs: null,
        setPipeline: function(pipeline) { this.called_setPipeline = true; this.lastArgs_setPipeline = [pipeline]; this.called = true; this.lastArgs = [pipeline]; },
        setBindGroup: function(index, group) { this.called_setBindGroup = true; this.lastArgs_setBindGroup = [index, group]; this.called = true; this.lastArgs = [index, group]; },
        setVertexBuffer: function(slot, buffer) { this.called_setVertexBuffer = true; this.lastArgs_setVertexBuffer = [slot, buffer]; this.called = true; this.lastArgs = [slot, buffer]; },
        draw: function(count) { this.called_draw = true; this.lastArgs_draw = [count]; this.called = true; this.lastArgs = [count]; },
        end: function() { this.called_end = true; this.called = true; this.lastArgs = []; },
        resetMocks: function() { for(const k in this) if(k.startsWith('called_') || k.startsWith('lastArgs_')) this[k] = k.startsWith('called_')?false:null; this.called=false;this.lastArgs=null;}
    };
    mockGPURenderPassEncoder.resetMocks();

    mockGPUCommandEncoder = {
        name: "mockGPUCommandEncoder", called: false, lastArgs: null,
        beginRenderPass: function(descriptor) { this.called_beginRenderPass = true; this.called = true; this.lastArgs = [descriptor]; return mockGPURenderPassEncoder; },
        finish: function() { this.called_finish = true; this.called = true; this.lastArgs = []; return {label: "mockCommandBuffer"}; },
        resetMocks: function() { for(const k in this) if(k.startsWith('called_') || k.startsWith('lastArgs_')) this[k] = k.startsWith('called_')?false:null; this.called=false;this.lastArgs=null;}
    };
    mockGPUCommandEncoder.resetMocks();

    mockGPUTextureView = { label: "mockTextureView" };
    mockGPUTexture = { name:"mockGPUTexture", called: false, lastArgs:null, createView: function() { this.called_createView = true; this.called = true; this.lastArgs = []; return mockGPUTextureView; }, resetMocks: function() {this.called_createView = false; this.called=false; this.lastArgs=null;} };
    mockGPUTexture.resetMocks();

    mockGPUCanvasContext = {
        name: "mockGPUCanvasContext", called: false, lastArgs: null,
        configure: function(config) { this.called_configure = true; this.lastArgs_configure = [config]; this.called = true; this.lastArgs = [config]; },
        getCurrentTexture: function() { this.called_getCurrentTexture = true; this.called = true; this.lastArgs = []; return mockGPUTexture; },
        resetMocks: function() { for(const k in this) if(k.startsWith('called_') || k.startsWith('lastArgs_')) this[k] = k.startsWith('called_')?false:null; this.called=false;this.lastArgs=null;}
    };
    mockGPUCanvasContext.resetMocks();

    mockGPUQueue = {
        name: "mockGPUQueue", called: false, lastArgs: null,
        writeBuffer: function(buffer, offset, data) { this.called_writeBuffer = true; this.lastArgs_writeBuffer = [buffer, offset, data]; this.called = true; this.lastArgs = [buffer, offset, data]; },
        submit: function(commandBuffers) { this.called_submit = true; this.lastArgs_submit = [commandBuffers]; this.called = true; this.lastArgs = [commandBuffers]; },
        resetMocks: function() { for(const k in this) if(k.startsWith('called_') || k.startsWith('lastArgs_')) this[k] = k.startsWith('called_')?false:null; this.called=false;this.lastArgs=null;}
    };
    mockGPUQueue.resetMocks();

    mockGPUDevice = {
        name: "mockGPUDevice", called: false, lastArgs: null,
        createShaderModule: function(descriptor) { this.called_createShaderModule = true; this.lastArgs_createShaderModule = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPUShaderModule(descriptor); },
        createBuffer: function(descriptor) { this.called_createBuffer = true; this.lastArgs_createBuffer = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPUBuffer(descriptor); },
        createBindGroupLayout: function(descriptor) { this.called_createBindGroupLayout = true; this.lastArgs_createBindGroupLayout = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPUBindGroupLayout(descriptor); },
        createBindGroup: function(descriptor) { this.called_createBindGroup = true; this.lastArgs_createBindGroup = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPUBindGroup(descriptor); },
        createPipelineLayout: function(descriptor) { this.called_createPipelineLayout = true; this.lastArgs_createPipelineLayout = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPUPipelineLayout(descriptor); },
        createRenderPipeline: function(descriptor) { this.called_createRenderPipeline = true; this.lastArgs_createRenderPipeline = [descriptor]; this.called = true; this.lastArgs = [descriptor]; return new MockGPURenderPipeline(descriptor); },
        createCommandEncoder: function() { this.called_createCommandEncoder = true; this.called = true; this.lastArgs = []; return mockGPUCommandEncoder; },
        queue: mockGPUQueue,
        resetMocks: function() { for(const k in this) if(k.startsWith('called_') || k.startsWith('lastArgs_')) this[k] = k.startsWith('called_')?false:null; this.called=false;this.lastArgs=null; mockGPUQueue.resetMocks(); mockGPUCommandEncoder.resetMocks(); }
    };
    mockGPUDevice.resetMocks();

    mockGPUAdapter = { requestDevice: async () => { return mockGPUDevice; } };

    global.navigator = { gpu: { requestAdapter: async () => { return mockGPUAdapter; }, getPreferredCanvasFormat: () => "bgra8unorm" } };
    global.HTMLCanvasElement = class MockHTMLCanvasElement { getContext(type) { if(type === 'webgpu') return mockGPUCanvasContext; return null; } };

    // Ensure mock classes for WebGPU objects are globally available for instanceof checks if HypercubeCore uses them.
    global.GPUShaderModule = MockGPUShaderModule;
    global.GPURenderPipeline = MockGPURenderPipeline;
    global.GPUPipelineLayout = MockGPUPipelineLayout;
    global.GPUBuffer = MockGPUBuffer;
    global.GPUBindGroupLayout = MockGPUBindGroupLayout;
    global.GPUBindGroup = MockGPUBindGroup;


    mockCanvas = new global.HTMLCanvasElement();
    mockCanvas.width = 800; mockCanvas.height = 600;
    mockCanvas.clientWidth = 800; mockCanvas.clientHeight = 600;

    mockShaderManagerInstance = {
        name: "mockShaderManagerInstance",
        shaderModules: {
            'basicVS': new MockGPUShaderModule({label: 'basicVS'}),
            'basicFS': new MockGPUShaderModule({label: 'basicFS'})
        },
        getRenderPipeline: function(name, desc) {
            this.called_getRenderPipeline = true; this.lastArgs_getRenderPipeline = [name, desc]; this.called = true; this.lastArgs = [name, desc];
            return mockGPUDevice.createRenderPipeline(desc);
        },
        resetMocks: function() {this.called_getRenderPipeline = false; this.lastArgs_getRenderPipeline = null; this.called=false; this.lastArgs=null;}
    };
    mockShaderManagerInstance.resetMocks();
}

function resetAllGlobalMocks(){
    mockGPURenderPassEncoder.resetMocks();
    mockGPUCommandEncoder.resetMocks();
    mockGPUTexture.resetMocks();
    mockGPUCanvasContext.resetMocks();
    mockGPUQueue.resetMocks();
    mockGPUDevice.resetMocks();
    mockShaderManagerInstance.resetMocks();
}

describeHC('HypercubeCore (WebGPU Aspects)', () => {
    let core;

    beforeEachHC(() => {
        setupGlobalMocks();
    });

    afterEachHC(async () => {
        if(core && core.dispose) {
           core.dispose();
        }
        core = null;
        resetAllGlobalMocks();
        if(global.navigator && global.navigator._originalGPU) global.navigator.gpu = global.navigator._originalGPU;
    });

    itHC('should complete asynchronous initialization (_initializeWebGPU)', async () => {
        core = new HypercubeCore(mockCanvas, mockShaderManagerInstance, {});
        await core._asyncInitialization;

        expectHC(core.device).toBeDefined();
        expectHC(core.context).toBeDefined();
        expectHC(mockGPUCanvasContext.configure).toHaveBeenCalled();

        expectHC(core.globalUniformsBuffer).toBeInstanceOf(globalThis.GPUBuffer);
        expectHC(core.dataChannelsBuffer).toBeInstanceOf(globalThis.GPUBuffer);
        expectHC(core.quadBuffer).toBeInstanceOf(globalThis.GPUBuffer);

        expectHC(core.globalUniformsBindGroupLayout).toBeInstanceOf(globalThis.GPUBindGroupLayout);
        expectHC(core.dataChannelsBindGroupLayout).toBeInstanceOf(globalThis.GPUBindGroupLayout);
        expectHC(core.globalUniformsBindGroup).toBeInstanceOf(globalThis.GPUBindGroup);
        expectHC(core.dataChannelsBindGroup).toBeInstanceOf(globalThis.GPUBindGroup);

        expectHC(core.pipelineLayout).toBeInstanceOf(globalThis.GPUPipelineLayout);
        expectHC(core.renderPipeline).toBeInstanceOf(globalThis.GPURenderPipeline);
        expectHC(mockShaderManagerInstance.getRenderPipeline).toHaveBeenCalled();
    });

    itHC('updateParameters should update state and mark relevant buffers dirty', async () => {
        core = new HypercubeCore(mockCanvas, mockShaderManagerInstance, {});
        await core._asyncInitialization;

        core.updateParameters({ time: 1.0, dimensions: 5, dataChannels: [1,0,0,0,0,0,0,0], geom_hypercube_baseSpeedFactor: 2.0 });

        expectHC(core.state.time).toBe(1.0); // This is not set by updateParameters, but by render loop. Test other params.
        expectHC(core.state.dimensions).toBe(5);
        expectHC(core.state.dataChannels[0]).toBe(1);
        expectHC(core.state.geom_hypercube_baseSpeedFactor).toBe(2.0);

        assert(core.dirtyGPUBuffers.has('globalUniforms'), "globalUniforms buffer should be dirty from dimensions");
        assert(core.dirtyGPUBuffers.has('dataChannels'), "dataChannels buffer should be dirty");
        assert(core.dirtyGPUBuffers.has('geometryUniforms'), "geometryUniforms buffer should be dirty from geom_ param");
    });

    itHC('_updateDirtyUniformBuffers should call queue.writeBuffer for dirty buffers', async () => {
        core = new HypercubeCore(mockCanvas, mockShaderManagerInstance, {});
        await core._asyncInitialization;

        core.dirtyGPUBuffers.add('globalUniforms');
        core.dirtyGPUBuffers.add('dataChannels');

        mockGPUQueue.resetMocks();
        core._updateDirtyUniformBuffers();

        expectHC(mockGPUQueue.writeBuffer).toHaveBeenCalled();
        expectHC(core.dirtyGPUBuffers.size).toBe(0);
    });

    itHC('_drawFrameLogic should call necessary WebGPU commands', async () => {
        core = new HypercubeCore(mockCanvas, mockShaderManagerInstance, {});
        await core._asyncInitialization;

        if (!core.renderPipeline) await core._setupInitialRenderPipeline(); // Ensure it's setup
        if (!core.globalUniformsBindGroup) core._createBindGroups(); // Ensure BGs are setup

        assert(core.renderPipeline, "Render pipeline must exist for draw test");
        assert(core.globalUniformsBindGroup, "Global BGL must exist for draw test");
        assert(core.dataChannelsBindGroup, "DataChannels BGL must exist for draw test");

        resetAllGlobalMocks(); // Reset mocks before the draw call

        core._drawFrameLogic(1000);

        expectHC(mockGPUCanvasContext.getCurrentTexture).toHaveBeenCalled();
        expectHC(mockGPUTexture.createView).toHaveBeenCalled();
        expectHC(mockGPUDevice.createCommandEncoder).toHaveBeenCalled();
        expectHC(mockGPUCommandEncoder.beginRenderPass).toHaveBeenCalled();
        expectHC(mockGPURenderPassEncoder.setPipeline).toHaveBeenCalled();
        expectHC(mockGPURenderPassEncoder.setBindGroup).toHaveBeenCalled(); // Called at least once
        expectHC(mockGPURenderPassEncoder.setVertexBuffer).toHaveBeenCalled();
        expectHC(mockGPURenderPassEncoder.draw).toHaveBeenCalled();
        expectHC(mockGPURenderPassEncoder.end).toHaveBeenCalled();
        expectHC(mockGPUCommandEncoder.finish).toHaveBeenCalled();
        expectHC(mockGPUQueue.submit).toHaveBeenCalled();
    });

    itHC('dispose should destroy buffers and nullify resources', async () => {
        core = new HypercubeCore(mockCanvas, mockShaderManagerInstance, {});
        await core._asyncInitialization;

        const bufferToDestroy = core.globalUniformsBuffer;
        assert(bufferToDestroy && bufferToDestroy instanceof MockGPUBuffer, "Buffer should exist and be a mock");

        core.dispose();

        assert(bufferToDestroy.destroyed, "GPUBuffer should have destroy() called");
        expectHC(core.device).toBeNull();
        expectHC(core.renderPipeline).toBeNull();
        expectHC(core.globalUniformsBindGroup).toBeNull(); // Check a BGS
        expectHC(core.globalUniformsBindGroupLayout).toBeNull(); // Check a BGL
    });
});
