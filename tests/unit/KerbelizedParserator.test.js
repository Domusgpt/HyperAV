import { KerbelizedParserator } from '../../pmk-integration/parsers/KerbelizedParserator.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

let currentSuiteKP = "";
let beforeEachCallbackKP;
function describeKP(description, suite) {
  currentSuiteKP = description;
  console.log(\`\nSuite: \${description}\`);
  try { suite(); } catch (e) { console.error(\`Error in suite \${description}:\`, e); }
  currentSuiteKP = "";
}
async function itKP(description, testFn) {
  console.log(\`  Test: \${currentSuiteKP} - \${description}\`);
  try {
    beforeEachCallbackKP && beforeEachCallbackKP();
    await testFn();
    console.log(\`    Passed: \${currentSuiteKP} - \${description}\`);
  } catch (e) {
    console.error(\`    Failed: \${currentSuiteKP} - \${description}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
  }
}
function beforeEachKP(cb) { beforeEachCallbackKP = cb; }
const expectKP = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
});


describeKP('KerbelizedParserator', () => {
  let parserator;

  beforeEachKP(() => {
    const config = {
        schemaGraphConfig: {},
        focusOptimizerConfig: {},
        thoughtBufferConfig: { maxSize: 10 }
    };
    parserator = new KerbelizedParserator(config);
  });

  itKP('should instantiate with its dependencies', () => {
    expectKP(parserator.schemaGraph).toBeDefined();
    expectKP(parserator.focusOptimizer).toBeDefined();
    expectKP(parserator.thoughtBuffer).toBeDefined();
    assert(parserator.thoughtBuffer.maxSize === 10, "thoughtBuffer config maxSize mismatch");
  });

  itKP('parseWithContext should execute basic flow and return structured data', async () => {
    const inputData = { text: "test input" };
    const context = { schema: "test_schema", confidenceThreshold: 0.5 };

    const result = await parserator.parseWithContext(inputData, context);

    expectKP(result).toBeDefined();
    assert(result.data !== undefined, "Result should have data property");
    assert(result.metadata !== undefined, "Result should have metadata property");
    assert(result.metadata.focusParams !== undefined, "Result metadata should have focusParams");
    assert(result.metadata.pppProjectionDetails !== undefined, "Result metadata should have pppProjectionDetails");
    expectKP(parserator.thoughtBuffer.getCurrentState().length).toBeGreaterThan(0);
  });
});
