// tests/unit/HOASBridge.test.js
import { HOASBridge } from '../../controllers/HOASBridge.js';
import { KerbelizedParserator } from '../../pmk-integration/parsers/KerbelizedParserator.js'; // For instanceof and mocking structure

// Simple mock for console.assert in non-test environments
const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

// Custom simple test runner
let currentSuiteHB = "";
let beforeEachCallbackHB;
function describeHB(description, suite) {
    currentSuiteHB = description;
    console.log(`\nSuite: ${description}`);
    try { suite(); } catch (e) { console.error(`Error in suite ${description}:`, e); }
    currentSuiteHB = "";
}
async function itHB(description, testFn) {
    console.log(`  Test: ${currentSuiteHB} - ${description}`);
    try {
        beforeEachCallbackHB && beforeEachCallbackHB();
        await testFn(); // Await test function
        console.log(`    Passed: ${currentSuiteHB} - ${description}`);
    } catch (e) {
        console.error(`    Failed: ${currentSuiteHB} - ${description}`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
    }
}
function beforeEachHB(cb) { beforeEachCallbackHB = cb; }
const expectHB = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, `Expected ${actual} to be defined`),
    toBeInstanceOf: (expectedClass) => assert(actual instanceof expectedClass, `Expected ${actual} to be instance of ${expectedClass.name}`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`),
    objectContaining: (expectedSubset) => {
        for (const key in expectedSubset) {
            assert(JSON.stringify(actual[key]) === JSON.stringify(expectedSubset[key]), `Expected object to contain key '${key}' with value '${JSON.stringify(expectedSubset[key])}', got '${JSON.stringify(actual[key])}'`);
        }
    },
    toHaveBeenCalledWith: (expectedArgs) => { // Simple mock call check
        assert(actual.called, `Expected function ${actual.name || 'mock'} to have been called.`);
        assert(JSON.stringify(actual.lastArgs) === JSON.stringify(expectedArgs), `Expected function to be called with ${JSON.stringify(expectedArgs)}, but called with ${JSON.stringify(actual.lastArgs)}`);
    },
    toBe: (expected) => assert(actual === expected, `Expected ${actual} to be ${expected}`),
});

// Mock KerbelizedParserator
class MockKerbelizedParserator {
    constructor(config = {}) {
        this.config = JSON.parse(JSON.stringify(config)); // Store initial config
        this.reconfigureCalled = false;
        this.reconfigureLastArgs = null;
        this.parseWithContextCalled = false;
        this.parseWithContextLastArgs = null;
        this.mockParseResult = { data: "mocked parse result", confidence: 0.99 };
        this.mockStatus = { internalState: "mock_state" };
        this.schemaGraph = { // Mock schemaGraph if HOASBridge interacts with it directly
            getRootSchema: async () => ({type: "mock_root_schema", version: "1.0"}) // Added version for consistency
        };
        // Initialize sub-components that HOASBridge might indirectly check status of (e.g. thoughtBuffer)
        this.thoughtBuffer = {
            buffer: [],
            getCurrentState: () => this.thoughtBuffer.buffer, // Make it consistent
            config: config.thoughtBufferConfig || {}
        };
        this.focusOptimizer = { config: config.focusOptimizerConfig || {} };
        this.pppProjector = config.pppProjectorConfig && Object.keys(config.pppProjectorConfig).length ? { config: config.pppProjectorConfig } : undefined;


        console.log("MockKerbelizedParserator instantiated with config:", this.config);
    }

    async reconfigure(newConfig) {
        console.log("MockKerbelizedParserator.reconfigure called with:", newConfig);
        this.config = JSON.parse(JSON.stringify(newConfig)); // Update internal config
        // Simulate re-init of sub-components based on newConfig for tests
        this.thoughtBuffer.config = newConfig.thoughtBufferConfig || {};
        this.focusOptimizer.config = newConfig.focusOptimizerConfig || {};
        this.pppProjector = newConfig.pppProjectorConfig && Object.keys(newConfig.pppProjectorConfig).length ? { config: newConfig.pppProjectorConfig } : undefined;
        if (newConfig.schemaGraphConfig && newConfig.schemaGraphConfig.initialSchemaDefinition) {
            this.schemaGraph.getRootSchema = async () => newConfig.schemaGraphConfig.initialSchemaDefinition;
        }


        this.reconfigureCalled = true;
        this.reconfigureLastArgs = newConfig;
        return true;
    }

    async parseWithContext(input, context) {
        console.log("MockKerbelizedParserator.parseWithContext called with:", input, context);
        this.parseWithContextCalled = true;
        this.parseWithContextLastArgs = { input, context };
        return this.mockParseResult;
    }

    // Add other methods if HOASBridge directly calls them (e.g., getStatus)
    async getStatus() { // Hypothetical method HOASBridge might eventually call
        return {
            config: this.config,
            status: "mock_ok",
            ...this.mockStatus
        };
    }
}


describeHB('HOASBridge', () => {
    let mockParserator;
    let hoasBridge;
    const initialKpConfig = {
        operationalMode: "initial",
        loggingVerbosity: "error",
        schemaGraphConfig: { initialSchemaDefinition: { type: "initial_schema" } },
        focusOptimizerConfig: { defaultTemperature: 0.7 },
        thoughtBufferConfig: { maxSize: 100 },
        pppProjectorConfig: { defaultProjectionType: "initial_ppp" }
    };

    beforeEachHB(() => {
        mockParserator = new MockKerbelizedParserator(JSON.parse(JSON.stringify(initialKpConfig))); // Deep copy
        hoasBridge = new HOASBridge(mockParserator);
    });

    itHB('should instantiate correctly with a KerbelizedParserator instance', () => {
        expectHB(hoasBridge.parserator).toBeDefined();
        expectHB(hoasBridge.parserator).toBeInstanceOf(MockKerbelizedParserator);
        expectHB(hoasBridge.currentParserConfig).toEqual(initialKpConfig);
    });

    itHB('setParserConfiguration should call parserator.reconfigure with the full config', async () => {
        const newFullConfig = { operationalMode: "new_full_mode", loggingVerbosity: "debug", schemaGraphConfig: {}, focusOptimizerConfig: {}, thoughtBufferConfig: {}, pppProjectorConfig: {} };
        await hoasBridge.setParserConfiguration(newFullConfig);

        // HOASBridge's _applyConfiguration directly updates parserator.config if reconfigure is not present.
        // Our mock *has* reconfigure, so it should be called.
        assert(mockParserator.reconfigureCalled, "parserator.reconfigure should have been called");
        expectHB(mockParserator.reconfigureLastArgs).toEqual(newFullConfig);
        expectHB(hoasBridge.currentParserConfig).toEqual(newFullConfig);
    });

    itHB('updateParserSubConfiguration should correctly update a sub-config and apply', async () => {
        const schemaUpdate = { adaptationStrategy: "new_strategy" };
        await hoasBridge.updateParserSubConfiguration('schemaGraphConfig', schemaUpdate);

        assert(mockParserator.reconfigureCalled || JSON.stringify(mockParserator.config.schemaGraphConfig) === JSON.stringify({...initialKpConfig.schemaGraphConfig, ...schemaUpdate}),
               "parserator.reconfigure or direct config update for schemaGraphConfig");
        const expectedConfig = JSON.parse(JSON.stringify(initialKpConfig));
        expectedConfig.schemaGraphConfig = {...expectedConfig.schemaGraphConfig, ...schemaUpdate};

        // Check what was passed to reconfigure OR the state of the config if reconfigure wasn't called by HOASBridge logic
        expectHB(mockParserator.config).toEqual(expectedConfig); // Check internal mock state after reconfigure
        expectHB(hoasBridge.currentParserConfig.schemaGraphConfig.adaptationStrategy).toBe("new_strategy");
    });

    itHB('updateParserSubConfiguration should correctly update a top-level KP setting', async () => {
        await hoasBridge.updateParserSubConfiguration('kerbelizedParserator', { defaultParsingDepth: 10 });
        assert(mockParserator.reconfigureCalled || mockParserator.config.defaultParsingDepth === 10,
            "parserator.reconfigure or direct config update for defaultParsingDepth");
        expectHB(hoasBridge.currentParserConfig.defaultParsingDepth).toBe(10);
        expectHB(hoasBridge.currentParserConfig.operationalMode).toBe("initial");
    });


    itHB('setOperationalMode should update operationalMode and apply', async () => {
        await hoasBridge.setOperationalMode("exploratory");
        assert(mockParserator.reconfigureCalled || mockParserator.config.operationalMode === "exploratory",
            "parserator.reconfigure or direct config update for operationalMode");
        expectHB(mockParserator.config.operationalMode).toBe("exploratory");
        expectHB(hoasBridge.currentParserConfig.operationalMode).toBe("exploratory");
    });

    itHB('tuneFocusParameters should update focusOptimizerConfig and apply', async () => {
        const focusUpdate = { optimizationGoal: "test_goal" };
        await hoasBridge.tuneFocusParameters(focusUpdate);
        assert(mockParserator.reconfigureCalled || mockParserator.config.focusOptimizerConfig.optimizationGoal === "test_goal",
            "parserator.reconfigure or direct config update for focusOptimizerConfig");
        expectHB(mockParserator.config.focusOptimizerConfig.optimizationGoal).toBe("test_goal");
        expectHB(hoasBridge.currentParserConfig.focusOptimizerConfig.optimizationGoal).toBe("test_goal");
    });

    itHB('processData should call parserator.parseWithContext and return its result', async () => {
        const input = { data: "test_in" };
        const context = { type: "test_ctx" };
        const result = await hoasBridge.processData(input, context);

        assert(mockParserator.parseWithContextCalled, "parserator.parseWithContext should have been called");
        expectHB(mockParserator.parseWithContextLastArgs).toEqual({ input, context });
        expectHB(result).toEqual(mockParserator.mockParseResult);
    });

    itHB('getParserStatus should return status including current config from bridge', async () => {
        const status = await hoasBridge.getParserStatus();
        expectHB(status.status).toBe("ok");
        expectHB(status.parseratorConfiguration).toEqual(initialKpConfig);
    });

    itHB('getCurrentSchemaRepresentation should return mock schema data from parserator', async () => {
        const schemaRep = await hoasBridge.getCurrentSchemaRepresentation("test_id");
        expectHB(schemaRep.schemaId).toBe("test_id"); // ID passed through
        expectHB(schemaRep.representation.type).toBe("mock_root_schema"); // From mock KP's schemaGraph
    });
});
