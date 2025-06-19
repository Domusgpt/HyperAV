import { VisualizerController } from '../../controllers/VisualizerController.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteVC = ""; let beforeEachCallbackVC;
function describeVC(d, s) { currentSuiteVC = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteVC = ""; }
function itVC(d, fn) { console.log(\`  Test: \${currentSuiteVC} - \${d}\`); try { beforeEachCallbackVC && beforeEachCallbackVC(); fn(); console.log(\`    Passed: \${currentSuiteVC} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuiteVC} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEachVC(cb) { beforeEachCallbackVC = cb; }
const expectVC = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected '\${actual}' to be defined\`),
    toBe: (expected) => assert(actual === expected, \`Expected '\${actual}' to be '\${expected}'\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toHaveBeenCalledWith: (expectedArgs) => {
        const funcName = actual.name || 'mockFunction';
        assert(actual.called, \`Expected \${funcName} to have been called.\`);
        const lastCallArgs = actual.lastArgs && actual.lastArgs.length > 0 ? actual.lastArgs[0] : undefined;
        // For functions that might take more than one arg, like setPolytope(name, params)
        if (Array.isArray(expectedArgs) && actual.lastArgs && actual.lastArgs.length > 1) {
             assert(JSON.stringify(actual.lastArgs) === JSON.stringify(expectedArgs), \`Expected \${funcName} with \${JSON.stringify(expectedArgs)}, got \${JSON.stringify(actual.lastArgs)}\`);
        } else {
             assert(JSON.stringify(lastCallArgs) === JSON.stringify(expectedArgs), \`Expected \${funcName} with \${JSON.stringify(expectedArgs)}, got \${JSON.stringify(lastCallArgs)}\`);
        }
    },
    toHaveBeenCalled: () => {
        const funcName = actual.name || 'mockFunction';
        assert(actual.called, \`Expected \${funcName} to have been called.\`);
    }
});

let mockCore;

describeVC('VisualizerController - API and Data Handling', () => {
    let controller;
    const defaultUboChannelCount = 64; // From VisualizerController's updateData

    beforeEachVC(() => {
        mockCore = {
            name: "mockCore",
            uboChannelCount: defaultUboChannelCount,
            state: { colorScheme: { primary:[0,0,1,1], secondary:[0,1,0,1], background:[0,0,0,1]} }, // Added alpha
            updateParameters: function(params) { this.called_updateParameters = true; this.lastArgs_updateParameters = [params]; this.called = true; this.lastArgs = [params]; },
            updateUBOChannels: function(data) { this.called_updateUBOChannels = true; this.lastArgs_updateUBOChannels = [data]; this.called = true; this.lastArgs = [data]; },
            setPolytope: function(name, params = {}) { this.called_setPolytope = true; this.lastArgs_setPolytope = [name, params]; this.called = true; this.lastArgs = [name, params]; },
            // setUniform: function(name, val) { this.called_setUniform = true; this.lastArgs_setUniform = [name, val]; this.called = true; this.lastArgs = [name, val]; },
            // VisualizerController uses core.updateParameters for specific uniforms now
            getSnapshot: async function(config) { this.called_getSnapshot = true; return "mock_snapshot_data"; },
            dispose: function() { this.called_dispose = true; },
            resetMocks: function() {
                this.called_updateParameters = false; this.lastArgs_updateParameters = null;
                this.called_updateUBOChannels = false; this.lastArgs_updateUBOChannels = null;
                this.called_setPolytope = false; this.lastArgs_setPolytope = null;
                // this.called_setUniform = false; this.lastArgs_setUniform = null;
                this.called_getSnapshot = false;
                this.called_dispose = false;
                this.called = false; this.lastArgs = null;
            }
        };
        mockCore.resetMocks();
        // Default controller will generate some basic mapping rules
        controller = new VisualizerController(mockCore);
    });

    itVC('should initialize with default mapping rules if none provided in config', () => {
        expectVC(controller.mappingRules).toBeDefined();
        // _generateInitialMappingRules with empty {} creates no UBO rules by default in current VC.
        // This test might need adjustment if VC's default rule generation changes.
        assert(controller.mappingRules.ubo.length === 0, "Default UBO rules should be empty or minimal");
        // assert(Object.keys(controller.mappingRules.direct).length > 0, "Should have default direct rules"); // No default direct rules either
    });

    itVC('should initialize with mappingRules from config.mappingRules if provided', () => {
        const customRules = {
            ubo: [{ snapshotField: "custom_metric", uboChannelIndex: 0, defaultValue: 1.0 }],
            direct: { "custom_direct": { coreStateName: "customState", defaultValue: "abc" } }
        };
        controller = new VisualizerController(mockCore, { mappingRules: customRules });
        expectVC(controller.mappingRules).toEqual(customRules);
    });

    itVC('should initialize with mappingRules from config.dataChannelDefinition if provided (legacy)', () => {
        const definition = [{ snapshotField: 'fieldA', uboChannelIndex: 0, defaultValue: 0.1 }];
        controller = new VisualizerController(mockCore, { dataChannelDefinition: definition });
        expectVC(controller.mappingRules.ubo[0].snapshotField).toBe('fieldA');
        expectVC(controller.mappingRules.ubo[0].uboChannelIndex).toBe(0);
    });


    itVC('setDataMappingRules should update internal mapping rules', () => {
        const newRules = {
            ubo: [{ snapshotField: "new_metric", uboChannelIndex: 1, defaultValue: 0.1 }],
            direct: { "new_direct": { coreStateName: "newState", defaultValue: 123 } }
        };
        controller.setDataMappingRules(newRules);
        expectVC(controller.mappingRules).toEqual(newRules);
    });

    itVC('updateData should process snapshot and call core.updateUBOChannels and core.updateParameters for direct', () => {
        controller.setDataMappingRules({
            ubo: [{ snapshotField: "metricA", uboChannelIndex: 0, defaultValue: 0.0 }],
            direct: { "paramX": { coreStateName: "coreParamX", defaultValue: "defaultX" } }
        });
        const snapshot = { metricA: 0.75, paramX: "valueX" };
        controller.updateData(snapshot);

        expectVC(mockCore.updateUBOChannels).toHaveBeenCalled();
        const uboArgs = mockCore.lastArgs_updateUBOChannels[0];
        assert(Array.isArray(uboArgs) && uboArgs.length === defaultUboChannelCount, "UBO data should be an array of correct size");
        expectVC(uboArgs[0]).toBe(0.75);

        expectVC(mockCore.updateParameters).toHaveBeenCalled(); // For direct params
        expectVC(mockCore.lastArgs_updateParameters[0]).toEqual({ coreParamX: "valueX" });
    });

    itVC('updateData should use defaultValue if snapshotField is missing', () => {
        controller.setDataMappingRules({
            ubo: [{ snapshotField: "metricB", uboChannelIndex: 1, defaultValue: 0.88 }],
        });
        controller.updateData({ someOtherMetric: 1.0 }); // metricB is missing
        expectVC(mockCore.updateUBOChannels).toHaveBeenCalled();
        const uboArgs = mockCore.lastArgs_updateUBOChannels[0];
        expectVC(uboArgs[1]).toBe(0.88); // Should use default value
    });

    itVC('updateData should apply transformations if specified in rules', () => {
        controller.transformations.double = (val) => val * 2; // Add a test transform
        controller.setDataMappingRules({
            ubo: [{ snapshotField: "metricC", uboChannelIndex: 2, defaultValue: 0, transform: "double" }],
        });
        controller.updateData({ metricC: 5 });
        expectVC(mockCore.updateUBOChannels).toHaveBeenCalled();
        const uboArgs = mockCore.lastArgs_updateUBOChannels[0];
        expectVC(uboArgs[2]).toBe(10); // 5 * 2
    });

    itVC('setPolytope should call core.setPolytope with name and params', () => {
        controller.setPolytope("new_geometry", { specificParam: 1 });
        expectVC(mockCore.setPolytope).toHaveBeenCalled();
        // Use array for expectedArgs when function takes multiple args and mock stores them as an array
        expectVC(mockCore.setPolytope).toHaveBeenCalledWith(["new_geometry", { specificParam: 1 }]);
    });

    itVC('setVisualStyle should call core.updateParameters', () => {
        const styles = { morphFactor: 0.9, glitchIntensity: 0.1 };
        controller.setVisualStyle(styles);
        expectVC(mockCore.updateParameters).toHaveBeenCalledWith(styles);
    });

    itVC('setSpecificUniform should call core.setUniform (or core.updateParameters if setUniform not distinct)', () => {
        // VisualizerController's setSpecificUniform currently calls core.setUniform.
        // If core.setUniform is not distinct from core.updateParameters, this test might need adjustment.
        // For this test, we assume core.setUniform is the intended direct path.
        // If VC changes to use updateParameters for this, the mock and test changes.
        // Based on VC code, it does call this.core.setUniform(uniformName, value);
        // So, the mockCore must have setUniform. (Added it to mockCore for this test)
        mockCore.setUniform = function(name, val) { this.called_setUniform = true; this.lastArgs_setUniform = [name, val]; this.called = true; this.lastArgs = [name, val]; };

        controller.setSpecificUniform("u_myCustom", 0.77);
        expectVC(mockCore.setUniform).toHaveBeenCalledWith(["u_myCustom", 0.77]);
    });
});
