import { PMKDataAdapter } from '../../controllers/PMKDataAdapter.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuite = ""; let beforeEachCallback;
function describe(d, s) { currentSuite = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuite = ""; }
function it(d, fn) { console.log(\`  Test: \${currentSuite} - \${d}\`); try { beforeEachCallback && beforeEachCallback(); fn(); console.log(\`    Passed: \${currentSuite} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuite} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEach(cb) { beforeEachCallback = cb; }
const expect = (actual) => ({
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

let mockVizController;

describe('PMKDataAdapter - API Interaction', () => {
    let adapter;
    const basePmkResult = {
        confidence: 0.85,
        iterations: 3,
        schemaVersion: "1.2.0",
        metadata: {
            schemaIdUsed: "contact_schema_v2",
            focusParams: {
                temperature: 0.6,
                abstractionWeight: 0.55,
                decisionSource: "goal_oriented_adjustment",
                goalUsed: "balance_accuracy_cost"
            },
            pppProjectionDetails: { relevanceScore: 0.77 }
        },
        data: { name: "John Doe", email: "john.doe@example.com" },
        errors: []
    };

    beforeEach(() => {
        mockVizController = {
            name: "mockVizController", // For better error messages
            updateData: function(data) { this.called_updateData = true; this.lastArgs_updateData = [data]; this.called = true; this.lastArgs = [data]; },
            setPolytope: function(name, params = {}) { this.called_setPolytope = true; this.lastArgs_setPolytope = [name, params]; this.called = true; this.lastArgs = [name, params]; },
            setVisualStyle: function(style) { this.called_setVisualStyle = true; this.lastArgs_setVisualStyle = [style]; this.called = true; this.lastArgs = [style]; },
            resetMocks: function() {
                this.called_updateData = false; this.lastArgs_updateData = null;
                this.called_setPolytope = false; this.lastArgs_setPolytope = null;
                this.called_setVisualStyle = false; this.lastArgs_setVisualStyle = null;
                this.called = false; this.lastArgs = null;
            }
        };
        mockVizController.resetMocks();
        adapter = new PMKDataAdapter(mockVizController);
    });

    it('should instantiate correctly (no internal mappingRules)', () => {
        expect(adapter).toBeDefined();
        assert(adapter.mappingRules === undefined, "Adapter should not have its own mappingRules now");
        assert(adapter.transformations === undefined, "Adapter should not have its own transformations now");
        expect(adapter.schemaToGeometryMap).toBeDefined();
    });

    it('processPMKUpdate should call vizController.updateData with transformed snapshot', () => {
        const pmkResult = JSON.parse(JSON.stringify(basePmkResult));
        adapter.processPMKUpdate(pmkResult);
        expect(mockVizController.updateData).toHaveBeenCalled();
        const expectedSnapshotForViz = {
            kp_confidence: 0.85,
            kp_iterations: 3,
            kp_schema_version: "1.2.0",
            kp_schema_id_used: "contact_schema_v2",
            kp_focus_temp: 0.6,
            kp_focus_weight: 0.55,
            kp_focus_decision_source: "goal_oriented_adjustment",
            kp_focus_goal_used: "balance_accuracy_cost",
            kp_ppp_relevance: 0.77,
            kp_error_count: 0,
            kp_payload_size: JSON.stringify(pmkResult.data).length
        };
        expect(mockVizController.updateData).toHaveBeenCalledWith(expectedSnapshotForViz);
    });

    it('processPMKUpdate should call vizController.setPolytope based on schemaIdUsed', () => {
        const pmkResult = JSON.parse(JSON.stringify(basePmkResult));
        adapter.schemaToGeometryMap['contact_schema_v2'] = 'test_polytope_contact'; // Ensure specific map entry
        adapter.processPMKUpdate(pmkResult);
        expect(mockVizController.setPolytope).toHaveBeenCalledWith(['test_polytope_contact']); // Adapting to array check
    });

    it('processPMKUpdate should call vizController.setPolytope with default if schemaId not in map', () => {
        const pmkResult = JSON.parse(JSON.stringify(basePmkResult));
        pmkResult.metadata.schemaIdUsed = "unknown_schema_id_for_polytope";
        adapter.processPMKUpdate(pmkResult);
        expect(mockVizController.setPolytope).toHaveBeenCalledWith(['hypercube']);
    });

    it('processPMKUpdate should call vizController.setVisualStyle for high confidence', () => {
        const highConfidenceResult = {...basePmkResult, confidence: 0.95, errors: [] };
        adapter.processPMKUpdate(highConfidenceResult);
        expect(mockVizController.setVisualStyle).toHaveBeenCalled();
        const styleArgs = mockVizController.lastArgs_setVisualStyle[0];
        expect(styleArgs.glitchIntensity).toBe(0.0);
        assert(styleArgs.colorScheme.primary[1] > styleArgs.colorScheme.primary[0], "Primary color should be greenish for high confidence");
    });

    it('processPMKUpdate should call vizController.setVisualStyle for errors', () => {
        const errorResult = {...basePmkResult, errors: [{ message: "test error" }], confidence: 0.4 };
        adapter.processPMKUpdate(errorResult);
        expect(mockVizController.setVisualStyle).toHaveBeenCalled();
        const styleArgs = mockVizController.lastArgs_setVisualStyle[0];
        expect(styleArgs.glitchIntensity).toBe(0.6);
        assert(styleArgs.colorScheme.primary[0] > styleArgs.colorScheme.primary[1], "Primary color should be reddish for errors");
    });

    it('processPMKUpdate should call vizController.setVisualStyle for normal/default state', () => {
        const normalResult = {...basePmkResult, confidence: 0.7, errors: [] };
        adapter.processPMKUpdate(normalResult);
        expect(mockVizController.setVisualStyle).toHaveBeenCalled();
        const styleArgs = mockVizController.lastArgs_setVisualStyle[0];
        expect(styleArgs.glitchIntensity).toBe(0.0);
    });
});
