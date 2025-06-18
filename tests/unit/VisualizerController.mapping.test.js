// tests/unit/VisualizerController.mapping.test.js

// This test script assumes:
// 1. `TransformFunctions` is available on `window.TransformFunctions`.
//    (e.g., <script src="../../controllers/TransformFunctions.js"></script>)
// 2. `VisualizerController` class is available.
//    (e.g., <script type="module"> import VisualizerController from '../../controllers/VisualizerController.js'; window.VisualizerController = VisualizerController; </script> or test runner handles modules)

const runVisualizerControllerMappingTests = () => {
    let testsPassed = 0;
    let testsFailed = 0;
    const testResults = [];

    const mockHypercubeCore = {
        state: {
            colorScheme: { primary: [1,0,0], secondary: [0,1,0], background: [0,0,1] }
            // Add any other state VisualizerController might access during these tests
        },
        globalDataBuffer: new Float32Array(64),
        updateParameters: function(params) {
            // console.log("mockHypercubeCore.updateParameters called with:", params);
            this.lastUpdateParams = params;
        },
        lastUpdateParams: null,
        resetLastUpdateParams: function() { this.lastUpdateParams = null; }
    };

    // --- Test Runner & Assertions (copied from TransformFunctions.test.js for self-containment) ---
    const test = (description, fn) => {
        try {
            // Reset mock before each test that might use it
            mockHypercubeCore.resetLastUpdateParams();
            fn();
            testResults.push({ description, status: 'PASS' });
            testsPassed++;
        } catch (e) {
            testResults.push({ description, status: 'FAIL', message: e.message, stack: e.stack });
            testsFailed++;
        }
    };

    const assertAlmostEqual = (actual, expected, epsilon = 1e-6, message = "") => {
        if (typeof actual !== 'number' || typeof expected !== 'number') {
             throw new Error(`${message} Type mismatch. Expected numbers, got ${typeof actual} and ${typeof expected}. Actual: ${actual}, Expected: ${expected}`);
        }
        if (Math.abs(actual - expected) > epsilon) {
            throw new Error(`${message} Expected ${expected} (approx.), but got ${actual}`);
        }
    };

    const assertStrictEqual = (actual, expected, message = "") => {
        if (actual !== expected) {
            throw new Error(`${message} Expected ${expected} (strict), but got ${actual}`);
        }
    };

    const assertArrayEqual = (actual, expected, epsilon = 1e-6, message = "") => {
        if (!Array.isArray(actual) || !Array.isArray(expected)) {
             throw new Error(`${message} Type mismatch. Expected arrays. Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);
        }
        if (actual.length !== expected.length) {
            throw new Error(`${message} Expected array length ${expected.length}, but got ${actual.length}. Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);
        }
        for (let i = 0; i < actual.length; i++) {
            if (typeof actual[i] === 'number' && typeof expected[i] === 'number' && !isNaN(actual[i]) && !isNaN(expected[i])) {
                if (Math.abs(actual[i] - expected[i]) > epsilon) {
                    throw new Error(`${message} Expected ${expected[i]} (approx.) at index ${i}, but got ${actual[i]}. Array: ${JSON.stringify(actual)}`);
                }
            } else if (actual[i] !== expected[i]) {
                 throw new Error(`${message} Expected ${expected[i]} at index ${i}, but got ${actual[i]}. Array: ${JSON.stringify(actual)}`);
            }
        }
    };

    const assertDeepEqual = (actual, expected, message = "") => {
        // Simple deep equal for plain objects and arrays
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
    };

    const assertNotNull = (value, message = "") => {
        if (value === null || value === undefined) {
            throw new Error(`${message} Expected value to be not null/undefined.`);
        }
    };

    const assertUndefined = (value, message = "") => {
        if (value !== undefined) {
            throw new Error(`${message} Expected value to be undefined, but got ${value}.`);
        }
    };

    console.log("--- Running VisualizerController Mapping Tests ---");

    // A. Constructor & _generateInitialMappingRules
    test("constructor: no dataChannelDefinition uses default rules", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {});
        assertStrictEqual(vizController.mappingRules.ubo.length > 0, true, "A1-1: Default UBO rules should exist");
        assertStrictEqual(Object.keys(vizController.mappingRules.direct).length > 0, true, "A1-2: Default direct rules should exist");
    });

    test("constructor: custom uboChannels with simple transform string (clamp)", () => {
        const config = {
            dataChannelDefinition: {
                uboChannels: [{ snapshotField: 'temp', uboChannelIndex: 0, defaultValue: 25, transform: 'clamp', min: 0, max: 50 }]
            }
        };
        const vizController = new VisualizerController(mockHypercubeCore, config);
        const rule = vizController.mappingRules.ubo[0];
        assertNotNull(rule.transform, "A2-1: Transform object should exist");
        assertStrictEqual(rule.transform.name, 'clamp', "A2-2: Transform name is clamp");
        assertNotNull(rule.transform.func, "A2-3: Transform function should be prepared");
        // Params for simple string transforms are expected to be on the rule itself, not in rule.transform.params
        // The _validateAndPrepareTransform for string type creates { name, func, params: [] }
        assertDeepEqual(rule.transform.params, [], "A2-4: Params array should be empty for simple string transform initially");
        assertStrictEqual(rule.min, 0, "A2-5: Rule min param exists");
        assertStrictEqual(rule.max, 50, "A2-6: Rule max param exists");
    });

    test("constructor: custom uboChannels with object transform (linearScale)", () => {
        const config = {
            dataChannelDefinition: {
                uboChannels: [{ snapshotField: 'val', uboChannelIndex: 1, defaultValue: 0, transform: { name: 'linearScale', domain: [0, 100], range: [0, 1] } }]
            }
        };
        const vizController = new VisualizerController(mockHypercubeCore, config);
        const rule = vizController.mappingRules.ubo[0];
        assertNotNull(rule.transform, "A3-1: Transform object should exist");
        assertStrictEqual(rule.transform.name, 'linearScale', "A3-2: Transform name");
        assertDeepEqual(rule.transform.params, [[0, 100], [0, 1]], "A3-3: Transform params prepared");
    });

    test("constructor: custom directParams with object transform (stringToEnum)", () => {
        const enumMap = { "A": 10, "B": 20 };
        const config = {
            dataChannelDefinition: {
                directParams: [{ snapshotField: 'status', coreStateName: 'statusLight', defaultValue: 0, transform: { name: 'stringToEnum', map: enumMap, defaultOutput: -1 } }]
            }
        };
        const vizController = new VisualizerController(mockHypercubeCore, config);
        const rule = vizController.mappingRules.direct['status'];
        assertNotNull(rule.transform, "A4-1: Transform object should exist");
        assertStrictEqual(rule.transform.name, 'stringToEnum', "A4-2: Transform name");
        assertDeepEqual(rule.transform.params, [enumMap, -1], "A4-3: Transform params prepared");
    });

    test("constructor: invalid transform in uboChannels is ignored", () => {
        const config = {
            dataChannelDefinition: {
                uboChannels: [{ snapshotField: 'val', uboChannelIndex: 0, defaultValue: 0, transform: { name: 'nonExistentTransform', params: [1,2,3] } }]
            }
        };
        const vizController = new VisualizerController(mockHypercubeCore, config);
        const rule = vizController.mappingRules.ubo[0];
        assertUndefined(rule.transform, "A5-1: Transform property should be removed for invalid transform");
    });

    // B. setDataMappingRules(newRules)
    test("setDataMappingRules: sets new UBO rules with transforms, replacing old", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {}); // Init with defaults
        const newRules = {
            ubo: [{ snapshotField: 'pressure', uboChannelIndex: 5, defaultValue: 100, transform: { name: 'linearScale', domain: [80, 120], range: [-1, 1] } }]
        };
        vizController.setDataMappingRules(newRules);
        assertStrictEqual(vizController.mappingRules.ubo.length, 1, "B1-1: UBO rules count updated");
        const rule = vizController.mappingRules.ubo[0];
        assertStrictEqual(rule.snapshotField, 'pressure', "B1-2: New rule field name");
        assertNotNull(rule.transform, "B1-3: New rule transform exists");
        assertStrictEqual(rule.transform.name, 'linearScale', "B1-4: New rule transform name");
    });

    test("setDataMappingRules: merges/overrides direct rules with transforms", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{snapshotField: 'old_status', coreStateName: 'oldLight', defaultValue: 0}]}
        });
        const newRules = {
            direct: { 'new_status': { coreStateName: 'newLight', defaultValue: 'off', transform: { name: 'stringToEnum', map: {"ON":1, "OFF":0}, defaultOutput:0}}}
        };
        vizController.setDataMappingRules(newRules);
        assertNotNull(vizController.mappingRules.direct['new_status'], "B2-1: New direct rule added");
        assertNotNull(vizController.mappingRules.direct['new_status'].transform, "B2-2: Transform on new rule");
        // By default, setDataMappingRules replaces direct rules if newRules.direct is an object, rather than merging.
        // The prompt said "merges/overrides", current code for object type direct rules does override/add.
        assertUndefined(vizController.mappingRules.direct['old_status'], "B2-3: Old direct rule should be gone if newRules.direct is object");
    });

    test("setDataMappingRules: clears old rules when new rules are empty", () => {
        const vizController = new VisualizerController(mockHypercubeCore, { /* uses default rules */});
        const newRules = { ubo: [], direct: {} };
        vizController.setDataMappingRules(newRules);
        assertStrictEqual(vizController.mappingRules.ubo.length, 0, "B3-1: UBO rules cleared");
        assertDeepEqual(vizController.mappingRules.direct, {}, "B3-2: Direct rules cleared");
    });

    // C. updateData(dataSnapshot)
    test("updateData: UBO simple value mapping", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { uboChannels: [{ snapshotField: 'temp', uboChannelIndex: 3, defaultValue: 0 }] }
        });
        vizController.updateData({ temp: 42.5 });
        assertNotNull(mockHypercubeCore.lastUpdateParams.dataChannels, "C1-1: dataChannels updated");
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[3], 42.5, 1e-6, "C1-2: Correct UBO channel value");
    });

    test("updateData: UBO uses defaultValue if snapshotField missing", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { uboChannels: [{ snapshotField: 'temp', uboChannelIndex: 3, defaultValue: -1 }] }
        });
        vizController.updateData({ otherField: 10 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[3], -1, 1e-6, "C2-1: Default value used");
    });

    test("updateData: UBO applies linearScale transform object", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { uboChannels: [{ snapshotField: 'level', uboChannelIndex: 0, defaultValue: 0, transform: { name: 'linearScale', domain: [0, 200], range: [0, 2] } }] }
        });
        vizController.updateData({ level: 100 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 1.0, 1e-6, "C3-1: linearScale applied");
    });

    test("updateData: UBO applies clamp transform (string ref with rule params)", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { uboChannels: [
                { snapshotField: 'x', uboChannelIndex:0, defaultValue:0, transform: 'clamp', min: 10, max: 20 }
            ]}
        });
        vizController.updateData({ x: 5 }); // Below min
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 10, 1e-6, "C4-1: Clamped to min");
        vizController.updateData({ x: 25 }); // Above max
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 20, 1e-6, "C4-2: Clamped to max");
    });

    test("updateData: Direct simple value mapping", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'speed', coreStateName: 'rotationSpeed', defaultValue: 0.1 }] }
        });
        vizController.updateData({ speed: 0.75 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.rotationSpeed, 0.75, 1e-6, "C5-1: Direct param updated");
    });

    test("updateData: Direct uses defaultValue if snapshotField missing", () => {
         const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'speed', coreStateName: 'rotationSpeed', defaultValue: 0.123 }] }
        });
        vizController.updateData({ other: 1 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.rotationSpeed, 0.123, 1e-6, "C6-1: Direct default used");
    });

    test("updateData: Direct applies stringToEnum transform object", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'mode', coreStateName: 'lightMode', defaultValue: 0, transform: { name: 'stringToEnum', map: {"ON":1, "OFF":0, "AUTO":2}, defaultOutput: -1 } }] }
        });
        vizController.updateData({ mode: "AUTO" });
        assertStrictEqual(mockHypercubeCore.lastUpdateParams.lightMode, 2, "C7-1: stringToEnum applied");
    });

    test("updateData: Direct applies colorStringToVec transform object", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'color', coreStateName: 'primaryColor', defaultValue: [0,0,0,1], transform: { name: 'colorStringToVec', defaultOutput: [0,0,0,1] } }] }
        });
        vizController.updateData({ color: "#00FF00" }); // Green
        assertArrayEqual(mockHypercubeCore.lastUpdateParams.primaryColor, [0,1,0,1], 1e-6, "C8-1: colorStringToVec applied");
    });

    test("updateData: handles snapshot with no matching fields (all defaults applied)", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: {
                uboChannels: [{ snapshotField: 'temp', uboChannelIndex: 0, defaultValue: 111 }],
                directParams: [{ snapshotField: 'speed', coreStateName: 'rotationSpeed', defaultValue: 222 }]
            }
        });
        vizController.updateData({ unrelated: 50 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 111, 1e-6, "C9-1: UBO default");
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.rotationSpeed, 222, 1e-6, "C9-2: Direct default");
    });

    test("updateData: processes both UBO and direct rules in one call", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: {
                uboChannels: [{ snapshotField: 'temp', uboChannelIndex: 0, defaultValue: 0 }],
                directParams: [{ snapshotField: 'speed', coreStateName: 'rotationSpeed', defaultValue: 0 }]
            }
        });
        vizController.updateData({ temp: 77, speed: 33 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 77, 1e-6, "C10-1: UBO updated");
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.rotationSpeed, 33, 1e-6, "C10-2: Direct updated");
    });

    test("updateData: transform error uses defaultValue for UBO (mock TF to throw)", () => {
        const originalTFLinearScale = window.TransformFunctions.linearScale;
        window.TransformFunctions.linearScale = () => { throw new Error("Mock TF error"); };

        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { uboChannels: [{ snapshotField: 'level', uboChannelIndex: 0, defaultValue: 99, transform: { name: 'linearScale', domain: [0,1], range: [0,10]} }] }
        });
        vizController.updateData({ level: 0.5 });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.dataChannels[0], 99, 1e-6, "C11-1: UBO default on error");

        window.TransformFunctions.linearScale = originalTFLinearScale; // Restore
    });

    test("updateData: transform error uses defaultValue for Direct (mock TF to throw)", () => {
        const originalTFEnum = window.TransformFunctions.stringToEnum;
        window.TransformFunctions.stringToEnum = () => { throw new Error("Mock TF error"); };

        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'status', coreStateName: 'opState', defaultValue: "ERROR_STATE", transform: { name: 'stringToEnum', map: {"OK":"RUN"}} }] }
        });
        vizController.updateData({ status: "OK" });
        assertStrictEqual(mockHypercubeCore.lastUpdateParams.opState, "ERROR_STATE", "C12-1: Direct default on error");

        window.TransformFunctions.stringToEnum = originalTFEnum; // Restore
    });

    test("updateData: type coercion for direct params (string to number if defaultValue is number)", () => {
        const vizController = new VisualizerController(mockHypercubeCore, {
            dataChannelDefinition: { directParams: [{ snapshotField: 'valStr', coreStateName: 'numericValue', defaultValue: 100 }] }
        });
        vizController.updateData({ valStr: "42.7" });
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.numericValue, 42.7, 1e-6, "C13-1: String coerced to number");

        mockHypercubeCore.resetLastUpdateParams();
        vizController.updateData({ valStr: "not-a-number" }); // Should use default
        assertAlmostEqual(mockHypercubeCore.lastUpdateParams.numericValue, 100, 1e-6, "C13-2: Invalid string uses default number");
    });


    console.log("--- Test Summary ---");
    testResults.forEach(result => {
        if (result.status === 'PASS') {
            console.log(`[PASS] ${result.description}`);
        } else {
            console.error(`[FAIL] ${result.description}: ${result.message}\n${result.stack ? result.stack.substring(0,300) + "..." : ""}`);
        }
    });
    console.log(`Total Passed: ${testsPassed}, Total Failed: ${testsFailed}`);

    if (testsFailed > 0) {
        // This will make it clear in automated environments that tests failed.
        // throw new Error(`${testsFailed} VisualizerController mapping test(s) failed.`);
        return false;
    }
    return true;
};

// Example of how to run if this file were executed in a context where VisualizerController is available:
// Assuming VisualizerController.js and TransformFunctions.js are loaded globally e.g. via script tags in an HTML test runner.
// if (typeof window !== 'undefined') {
//   window.runVisualizerControllerMappingTests = runVisualizerControllerMappingTests;
//   // To autorun: runVisualizerControllerMappingTests();
// } else if (typeof module !== 'undefined' && module.exports) { // For Node.js like test runner
//   // This part would require VisualizerController and TransformFunctions to be require-able.
//   // const VisualizerController = require('../../controllers/VisualizerController.js');
//   // global.VisualizerController = VisualizerController;
//   // const TransformFunctions = require('../../controllers/TransformFunctions.js');
//   // global.TransformFunctions = TransformFunctions;
//   // module.exports = { runVisualizerControllerMappingTests };
//   // if (require.main === module) { runVisualizerControllerMappingTests(); }
// }
