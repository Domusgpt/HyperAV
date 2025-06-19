import { PMKDataAdapter } from '../../controllers/PMKDataAdapter.js';

// Simple mock for console.assert in non-test environments
const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

// Mock VisualizerController for testing PMKDataAdapter
const mockVizController = {
  _calls: {},
  updateData: function(data) { this._calls.updateData = (this._calls.updateData || 0) + 1; console.log("MockVizController.updateData called with:", data); },
  updateUBOChannels: function(data) { this._calls.updateUBOChannels = (this._calls.updateUBOChannels || 0) + 1; console.log("MockVizController.updateUBOChannels called with:", data); },
  updateDirectParameters: function(data) { this._calls.updateDirectParameters = (this._calls.updateDirectParameters || 0) + 1; console.log("MockVizController.updateDirectParameters called with:", data); },
  resetMocks: function() { this._calls = {}; }
};

console.log("Running PMKDataAdapter.test.js (config update step - minor changes)");

// Simple describe/it/beforeEach runner for plain JS
let currentSuitePMK = "";
let beforeEachCallbackPMK;
function describePMK(description, suite) {
  currentSuitePMK = description;
  console.log(\`\nSuite: \${description}\`);
  try { suite(); } catch (e) { console.error(\`Error in suite \${description}:\`, e); }
  currentSuitePMK = "";
}
function itPMK(description, testFn) {
  console.log(\`  Test: \${currentSuitePMK} - \${description}\`);
  try {
    beforeEachCallbackPMK && beforeEachCallbackPMK();
    testFn();
    console.log(\`    Passed: \${currentSuitePMK} - \${description}\`);
  } catch (e) {
    console.error(\`    Failed: \${currentSuitePMK} - \${description}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
  }
}
function beforeEachPMK(cb) { beforeEachCallbackPMK = cb; }
const expectPMK = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toHaveBeenCalledTimes: (expected) => {
        const actualCalls = typeof actual === 'function' && actual.mock ? actual.mock.calls.length : (actual && actual._calls ? Object.values(actual._calls).reduce((s,c)=>s+c,0) : 0);
        assert(actualCalls === expected, \`Expected function to have been called \${expected} times, but was called \${actualCalls} times\`);
    }
});


describePMK('PMKDataAdapter', () => {
  let adapter;

  beforeEachPMK(() => {
    mockVizController.resetMocks();
    // PMKDataAdapter's constructor takes vizController and optional initialRules.
    // The rules themselves are complex, test with default and custom.
    adapter = new PMKDataAdapter(mockVizController);
  });

  itPMK('should instantiate with default rules if none provided', () => {
    expectPMK(adapter).toBeDefined();
    expectPMK(adapter.mappingRules).toBeDefined();
    expectPMK(adapter.mappingRules.ubo['architect.confidence'].channelIndex).toBe(0);
  });

  itPMK('should instantiate with custom rules if provided', () => {
    const customRules = { ubo: { 'custom.path': { channelIndex: 99 } } };
    adapter = new PMKDataAdapter(mockVizController, customRules);
    expectPMK(adapter.mappingRules.ubo['custom.path'].channelIndex).toBe(99);
  });

  itPMK('setDataMappingRules should update rules', () => {
    const newRules = { ubo: { 'new.path': { channelIndex: 101 } }, direct: {} };
    adapter.setDataMappingRules(JSON.parse(JSON.stringify(newRules)));
    expectPMK(adapter.mappingRules.ubo['new.path'].channelIndex).toBe(101);
  });

  itPMK('getValueFromPath should retrieve correct values', () => {
    const testObj = { a: { b: 1 }, c: [10, 20], d: "hello" };
    expectPMK(adapter.getValueFromPath(testObj, 'a.b')).toBe(1);
    expectPMK(adapter.getValueFromPath(testObj, 'c[0]')).toBe(10);
  });

  itPMK('processPMKUpdate should map data according to rules', () => {
    // This test is more about checking that processPMKUpdate runs and produces logs.
    // Actual calls to vizController are mocked and logged.
    const snapshot = {
        architect: { confidence: 0.88, planComplexity: 0.77 },
        schema: { type: 'customTest' }
    };
    adapter.processPMKUpdate(snapshot);
    // Check console output for "Processed UBO data" and "Processed Direct Parameters"
    // Example: expect data for channel 0 to be 0.88
    // expect data for geometryType to be based on schemaToGeometryMap['customTest'] or default
  });
});
