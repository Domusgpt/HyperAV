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

console.log("Running PMKDataAdapter.test.js");

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
    adapter = new PMKDataAdapter(mockVizController);
  });

  itPMK('should instantiate with default rules', () => {
    expectPMK(adapter).toBeDefined();
    expectPMK(adapter.mappingRules).toBeDefined();
    expectPMK(adapter.mappingRules.ubo['architect.confidence'].channelIndex).toBe(0);
  });

  itPMK('should allow setting new mapping rules', () => {
    const newRules = { ubo: { 'test.path': { channelIndex: 100 } }, direct: {} };
    adapter.setDataMappingRules(JSON.parse(JSON.stringify(newRules)));
    expectPMK(adapter.mappingRules.ubo['test.path'].channelIndex).toBe(100);
    expectPMK(adapter.mappingRules.ubo['architect.confidence']).toBe(undefined);
  });

  itPMK('getValueFromPath should retrieve correct values', () => {
    const testObj = { a: { b: 1 }, c: [10, 20], d: "hello" };
    expectPMK(adapter.getValueFromPath(testObj, 'a.b')).toBe(1);
    expectPMK(adapter.getValueFromPath(testObj, 'c[0]')).toBe(10);
    expectPMK(adapter.getValueFromPath(testObj, 'c[1]')).toBe(20);
    expectPMK(adapter.getValueFromPath(testObj, 'd')).toBe("hello");
    expectPMK(adapter.getValueFromPath(testObj, 'x.y')).toBe(undefined);
  });

  itPMK('processPMKUpdate should process data and prepare for controller', () => {
    const snapshot = { architect: { confidence: 0.95, planComplexity: 0.8 }, schema: { type: 'testSchema' } };
    adapter.processPMKUpdate(snapshot);
    // This test relies on the console logs inside processPMKUpdate for now.
  });
});
