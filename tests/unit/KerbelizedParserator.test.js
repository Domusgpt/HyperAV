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
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
});

describeKP('KerbelizedParserator', () => {
  let parserator;
  const baseConfig = {
      operationalMode: "test_mode",
      defaultParsingDepth: 3,
      enablePPPinjection: true,
      loggingVerbosity: "debug",
      schemaGraphConfig: { initialSchemaDefinition: {type: "test_schema_kp"} },
      focusOptimizerConfig: { defaultTemperature: 0.5, parameterBounds: {temperature: [0.1,0.9]} },
      thoughtBufferConfig: { maxSize: 10, defaultInjectionWeight: 0.25 },
      pppProjectorConfig: { defaultProjectionType: "kp_test_event", baseFocusWeight: 0.1 }
  };

  beforeEachKP(() => {
    // Each test can customize by spreading over baseConfig if needed
    parserator = new KerbelizedParserator(JSON.parse(JSON.stringify(baseConfig))); // Use deep copy
  });

  itKP('should instantiate with detailed custom config', () => {
    expectKP(parserator.config.operationalMode).toBe("test_mode");
    expectKP(parserator.config.loggingVerbosity).toBe("debug");
    expectKP(parserator.logLevel).toBe(1); // "debug" maps to 1
    expectKP(parserator.schemaGraph.config.initialSchemaDefinition.type).toBe("test_schema_kp");
    expectKP(parserator.focusOptimizer.config.defaultTemperature).toBe(0.5);
    expectKP(parserator.thoughtBuffer.config.maxSize).toBe(10);
    assert(parserator.pppProjector !== undefined, "Internal PPPProjector should be instantiated");
    expectKP(parserator.pppProjector.config.defaultProjectionType).toBe("kp_test_event");
  });

  itKP('parseWithContext should respect enablePPPinjection: false', async () => {
    const noPPPConfig = { ...baseConfig, enablePPPinjection: false, loggingVerbosity: "none" }; // mute logs for this test
    parserator = new KerbelizedParserator(noPPPConfig);

    const bufferInitialSize = parserator.thoughtBuffer.getCurrentState().length;
    await parserator.parseWithContext({ text: "data" }, { schema: "s" });
    const bufferAfterSize = parserator.thoughtBuffer.getCurrentState().length;
    expectKP(bufferAfterSize).toBe(bufferInitialSize); // Buffer should not change
  });

  itKP('parseWithContext should respect enablePPPinjection: true', async () => {
    // loggingVerbosity is debug from baseConfig, so logs will be verbose
    const pppConfig = { ...baseConfig, enablePPPinjection: true };
    parserator = new KerbelizedParserator(pppConfig);
    const bufferInitialSize = parserator.thoughtBuffer.getCurrentState().length;
    await parserator.parseWithContext({ text: "data for ppp" }, { schema: "s_ppp" });
    const bufferAfterSize = parserator.thoughtBuffer.getCurrentState().length;
    expectKP(bufferAfterSize).toBeGreaterThan(bufferInitialSize);
  });

  itKP('getCurrentTemperature should use config values', () => {
     // baseConfig has focusOptimizerConfig: { defaultTemperature: 0.5 }
     expectKP(parserator.getCurrentTemperature()).toBe(0.5);
     // Test with context override
     expectKP(parserator.getCurrentTemperature({targetTemperature: 0.88})).toBe(0.88);
  });

  itKP('should set logLevel based on loggingVerbosity', () => {
    parserator = new KerbelizedParserator({ loggingVerbosity: "warn" });
    expectKP(parserator.logLevel).toBe(3); // "warn" maps to 3
    parserator = new KerbelizedParserator({ loggingVerbosity: "error" });
    expectKP(parserator.logLevel).toBe(4);
     parserator = new KerbelizedParserator({ loggingVerbosity: "none" }); // Assuming LOG_LEVELS has "none"
    expectKP(parserator.logLevel).toBe(5);
  });
});
