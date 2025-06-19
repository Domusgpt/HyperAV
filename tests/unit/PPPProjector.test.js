import { PPPProjector } from '../../pmk-integration/parsers/PPPProjector.js';
import { TimestampedThoughtBuffer } from '../../pmk-integration/optimizers/TimestampedThoughtBuffer.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

let currentSuitePPP = "";
let beforeEachCallbackPPP;
function describePPP(description, suite) {
  currentSuitePPP = description;
  console.log(\`\nSuite: \${description}\`);
  try { suite(); } catch (e) { console.error(\`Error in suite \${description}:\`, e); }
  currentSuitePPP = "";
}
function itPPP(description, testFn) {
  console.log(\`  Test: \${currentSuitePPP} - \${description}\`);
  try {
    beforeEachCallbackPPP && beforeEachCallbackPPP();
    testFn();
    console.log(\`    Passed: \${currentSuitePPP} - \${description}\`);
  } catch (e) {
    console.error(\`    Failed: \${currentSuitePPP} - \${description}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
  }
}
function beforeEachPPP(cb) { beforeEachCallbackPPP = cb; }
const expectPPP = (actual) => ({
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
    toHaveLength: (expected) => assert(actual && actual.length === expected, \`Expected length \${expected}, got \${actual && actual.length}\`),
    toMatchObject: (expectedSubset) => {
        let pass = true;
        if (typeof actual !== 'object' || actual === null) pass = false;
        else {
            for(const key in expectedSubset) {
                if (JSON.stringify(actual[key]) !== JSON.stringify(expectedSubset[key])) {
                    pass = false; break;
                }
            }
        }
        assert(pass, \`Expected \${JSON.stringify(actual)} to contain subset \${JSON.stringify(expectedSubset)}\`);
    }
});

describePPP('PPPProjector', () => {
  let projector;
  let thoughtBuffer;

  const defaultConfig = {
      baseFocusWeight: 0.6,
      timestampSpreadFactor: 5,
      defaultProjectionType: 'test_type',
      projectionSource: 'test_source',
      focusWeightVariability: 0.1
  };

  beforeEachPPP(() => {
    projector = new PPPProjector(JSON.parse(JSON.stringify(defaultConfig))); // Deep copy
    thoughtBuffer = new TimestampedThoughtBuffer({ maxSize: 10 });
  });

  itPPP('should instantiate with merged config from defaults and provided', () => {
    projector = new PPPProjector({ baseFocusWeight: 0.7, customParam: 123 });
    expectPPP(projector.config.baseFocusWeight).toBe(0.7); // Overridden
    // DEFAULT_PPP_CONFIG is defined inside PPPProjector.js, so this tests merging with it.
    expectPPP(projector.config.timestampSpreadFactor).toBe(10); // Default from PPPProjector's own DEFAULT_PPP_CONFIG
    expectPPP(projector.config.customParam).toBe(123); // Extra param
  });

  itPPP('projectToTimestampedBuffer should use config values in projections', () => {
    const data = [{ id: 'item1' }];
    const projections = projector.projectToTimestampedBuffer(data, thoughtBuffer);

    expectPPP(projections).toHaveLength(1);
    const p = projections[0];
    expectPPP(p.projection.projectionType).toBe(defaultConfig.defaultProjectionType);
    expectPPP(p.projection.metadata.source).toBe(defaultConfig.projectionSource);
    // Check focus weight is around baseFocusWeight +/- variability/2
    assert(p.focusWeight >= defaultConfig.baseFocusWeight - defaultConfig.focusWeightVariability/2 - 0.01 &&
           p.focusWeight <= defaultConfig.baseFocusWeight + defaultConfig.focusWeightVariability/2 + 0.01,
           `Focus weight \${p.focusWeight} out of expected range based on config`);
  });

  itPPP('calculateOptimalTimestamp should use timestampSpreadFactor from config', () => {
    const item1_ts = projector.calculateOptimalTimestamp({id:1}, 0);
    const item2_ts = projector.calculateOptimalTimestamp({id:2}, 1);
    // Check if spread is approximately per config, Date.now() makes it tricky for exactness
    assert(item2_ts - item1_ts >= defaultConfig.timestampSpreadFactor && item2_ts - item1_ts < defaultConfig.timestampSpreadFactor + 50, "Timestamp spread factor not applied as expected"); // Increased tolerance for Date.now() variance
  });
});
