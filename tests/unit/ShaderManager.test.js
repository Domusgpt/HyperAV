// tests/unit/ShaderManager.test.js
import ShaderManager from '../../core/ShaderManager.js'; // Adjust path as needed

// Simple mock for console.assert in non-test environments
const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

// Custom simple test runner
let currentSuiteSM = "";
let beforeEachCallbackSM;
function describeSM(description, suite) {
    currentSuiteSM = description;
    console.log(\`\nSuite: \${description}\`);
    try { suite(); } catch (e) { console.error(\`Error in suite \${description}:\`, e); }
    currentSuiteSM = "";
}
function itSM(description, testFn) {
    console.log(\`  Test: \${currentSuiteSM} - \${description}\`);
    try {
        beforeEachCallbackSM && beforeEachCallbackSM();
        testFn(); // Removed await as these tests are synchronous
        console.log(\`    Passed: \${currentSuiteSM} - \${description}\`);
    } catch (e) {
        console.error(\`    Failed: \${currentSuiteSM} - \${description}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
    }
}
function beforeEachSM(cb) { beforeEachCallbackSM = cb; }
const expectSM = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected '\${actual}' to be defined\`),
    toBeNull: () => assert(actual === null, \`Expected '\${actual}' to be null\`),
    toBe: (expected) => assert(actual === expected, \`Expected '\${actual}' to be '\${expected}'\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toHaveBeenCalledWith: (expectedArgs) => {
        const funcName = actual.name || 'mockFunction';
        assert(actual.called, \`Expected \${funcName} to have been called.\`);
        const lastCallArgs = actual.lastArgs && actual.lastArgs.length > 0 ? actual.lastArgs[0] : undefined;
        // For functions with multiple args, check actual.lastArgs directly
        if (expectedArgs.length && actual.lastArgs && actual.lastArgs.length === expectedArgs.length ) {
             assert(JSON.stringify(actual.lastArgs) === JSON.stringify(expectedArgs), \`Expected \${funcName} with \${JSON.stringify(expectedArgs)}, got \${JSON.stringify(actual.lastArgs)}\`);
        } else {
            assert(JSON.stringify(lastCallArgs) === JSON.stringify(expectedArgs), \`Expected \${funcName} with \${JSON.stringify(expectedArgs)}, got \${JSON.stringify(lastCallArgs)}\`);
        }
    },
    toHaveBeenCalled: () => {
        const funcName = actual.name || 'mockFunction';
        assert(actual.called, \`Expected \${funcName} to have been called.\`);
    },
    toBeInstanceOf: (expectedClass) => assert(actual instanceof expectedClass, \`Expected '\${actual}' to be instance of \${expectedClass.name}\`),
    toHaveProperty: (prop) => assert(actual && actual.hasOwnProperty(prop), \`Expected object to have property '\${prop}'\`)
});

// Mock GPUDevice and related objects
// Minimal mock for GPUShaderModule and GPURenderPipeline for type checking
// Ensure these are available in the global scope for `instanceof` checks in tests if not imported.
globalThis.GPUShaderModule = class GPUShaderModule { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } };
globalThis.GPURenderPipeline = class GPURenderPipeline { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } };
globalThis.GPUPipelineLayout = class GPUPipelineLayout { constructor(descriptor) { this.label = descriptor ? descriptor.label : 'unlabeled'; } };


let mockDevice;

describeSM('ShaderManager (WebGPU)', () => {
    let shaderManager;
    const testWgslCode = `// Minimal WGSL @vertex fn main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0,0.0,0.0,1.0); }`; // Ensure it's valid enough

    beforeEachSM(() => {
        mockDevice = {
            name: "mockDevice",
            _createShaderModuleCallCount: 0,
            _createRenderPipelineCallCount: 0,
            createShaderModule: function(descriptor) {
                this.called_createShaderModule = true;
                this._createShaderModuleCallCount++;
                this.lastArgs_createShaderModule = [descriptor];
                this.called = true; this.lastArgs = [descriptor];
                if (descriptor.code.includes("ERROR_WGSL")) throw new Error("Simulated WGSL compilation error");
                return new globalThis.GPUShaderModule(descriptor);
            },
            createRenderPipeline: function(descriptor) {
                this.called_createRenderPipeline = true;
                this._createRenderPipelineCallCount++;
                this.lastArgs_createRenderPipeline = [descriptor];
                this.called = true; this.lastArgs = [descriptor];
                if (!descriptor.vertex || !descriptor.vertex.module || !(descriptor.vertex.module instanceof globalThis.GPUShaderModule) ||
                    !descriptor.fragment || !descriptor.fragment.module || !(descriptor.fragment.module instanceof globalThis.GPUShaderModule) ||
                    !descriptor.layout
                   ) {
                    console.error("Mock createRenderPipeline: Incomplete or invalid descriptor", descriptor);
                    throw new Error("Mock pipeline creation error: descriptor incomplete or modules invalid");
                }
                if (descriptor.label && descriptor.label.includes("errorPipeline")) throw new Error("Simulated pipeline creation error");
                return new globalThis.GPURenderPipeline(descriptor);
            },
            resetMocks: function() {
                this.called_createShaderModule = false; this.lastArgs_createShaderModule = null; this._createShaderModuleCallCount = 0;
                this.called_createRenderPipeline = false; this.lastArgs_createRenderPipeline = null; this._createRenderPipelineCallCount = 0;
                this.called = false; this.lastArgs = null;
            }
        };
        mockDevice.resetMocks();
        shaderManager = new ShaderManager(mockDevice);
    });

    itSM('constructor should store the device and pre-create basic shader modules', () => {
        expectSM(shaderManager.device).toBe(mockDevice);
        expectSM(shaderManager.shaderModules).toBeDefined();
        expectSM(shaderManager.pipelines).toBeDefined();
        expectSM(mockDevice._createShaderModuleCallCount).toBe(2); // basicVS and basicFS
        expectSM(shaderManager.shaderModules['basicVS']).toBeInstanceOf(globalThis.GPUShaderModule);
        expectSM(shaderManager.shaderModules['basicFS']).toBeInstanceOf(globalThis.GPUShaderModule);
    });

    itSM('createShaderModule should call device.createShaderModule and cache the result', () => {
        mockDevice.resetMocks();
        const module1 = shaderManager.createShaderModule('testShader', testWgslCode);
        expectSM(mockDevice._createShaderModuleCallCount).toBe(1);
        expectSM(mockDevice.lastArgs_createShaderModule[0]).toEqual({ label: 'testShader', code: testWgslCode });
        expectSM(module1).toBeInstanceOf(globalThis.GPUShaderModule);
        expectSM(shaderManager.shaderModules['testShader']).toBe(module1);

        const module2 = shaderManager.createShaderModule('testShader', testWgslCode); // Call again
        expectSM(mockDevice._createShaderModuleCallCount).toBe(1); // Should still be 1
        expectSM(module2).toBe(module1);
    });

    itSM('createShaderModule should handle errors from device.createShaderModule', () => {
        const errorModule = shaderManager.createShaderModule('errorShader', 'ERROR_WGSL'); // Mock device throws for this code
        expectSM(errorModule).toBeNull();
    });

    itSM('getRenderPipeline should create and cache a new pipeline', () => {
        const vsModule = shaderManager.shaderModules['basicVS'];
        const fsModule = shaderManager.shaderModules['basicFS'];
        const mockPipelineLayout = new globalThis.GPUPipelineLayout({label: "mockLayout"}); // Use the mocked global

        const descriptor = {
            label: "testPipeline",
            layout: mockPipelineLayout,
            vertex: { module: vsModule, entryPoint: "main" },
            fragment: { module: fsModule, entryPoint: "main", targets: [{ format: "bgra8unorm" }] }
        };
        mockDevice.resetMocks();
        const pipeline1 = shaderManager.getRenderPipeline('testPipelineKey', descriptor);
        expectSM(mockDevice._createRenderPipelineCallCount).toBe(1);
        const actualDescriptorArg = mockDevice.lastArgs_createRenderPipeline[0];
        expectSM(actualDescriptorArg.label).toBe("testPipeline");
        expectSM(actualDescriptorArg.layout).toBe(mockPipelineLayout);
        expectSM(pipeline1).toBeInstanceOf(globalThis.GPURenderPipeline);
        expectSM(shaderManager.pipelines['testPipelineKey']).toBe(pipeline1);

        const pipeline2 = shaderManager.getRenderPipeline('testPipelineKey', descriptor); // Call again
        expectSM(mockDevice._createRenderPipelineCallCount).toBe(1); // Should still be 1
        expectSM(pipeline2).toBe(pipeline1);
    });

    itSM('getRenderPipeline should return null if shader modules in descriptor are invalid', () => {
        const invalidDescriptor = {
            label: "invalidTestPipeline",
            layout: new globalThis.GPUPipelineLayout(),
            vertex: { module: null, entryPoint: "main" }, // Invalid module
            fragment: { module: shaderManager.shaderModules['basicFS'], entryPoint: "main", targets: [{ format: "bgra8unorm" }] }
        };
        const pipeline = shaderManager.getRenderPipeline('invalidPipelineKey', invalidDescriptor);
        expectSM(pipeline).toBeNull();
    });

    itSM('getRenderPipeline should handle pipeline creation errors from device', () => {
        const errorPipelineDescriptor = {
            label: "errorPipeline", // Mock device is set to throw error for this label
            layout: new globalThis.GPUPipelineLayout(),
            vertex: { module: shaderManager.shaderModules['basicVS'], entryPoint: "main" },
            fragment: { module: shaderManager.shaderModules['basicFS'], entryPoint: "main", targets: [{ format: "bgra8unorm" }] }
        };
        const pipeline = shaderManager.getRenderPipeline('errorPipelineKey', errorPipelineDescriptor);
        expectSM(pipeline).toBeNull();
    });

    itSM('dispose should clear caches and device reference', () => {
        shaderManager.dispose();
        expectSM(shaderManager.device).toBeNull();
        expectSM(Object.keys(shaderManager.shaderModules).length).toBe(0);
        expectSM(Object.keys(shaderManager.pipelines).length).toBe(0);
    });
});
