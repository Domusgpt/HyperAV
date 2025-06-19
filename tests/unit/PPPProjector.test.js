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
        for(const key in expectedSubset) {
            if (JSON.stringify(actual[key]) !== JSON.stringify(expectedSubset[key])) {
                pass = false; break;
            }
        }
        assert(pass, \`Expected \${JSON.stringify(actual)} to contain subset \${JSON.stringify(expectedSubset)}\`);
    }
});

describePPP('PPPProjector', () => {
  let projector;
  let thoughtBuffer;

  beforeEachPPP(() => {
    projector = new PPPProjector({ baseFocusWeight: 0.6, timestampSpreadFactor: 5, defaultProjectionType: 'test_type' });
    thoughtBuffer = new TimestampedThoughtBuffer({ maxSize: 10 });
  });

  itPPP('should instantiate with config', () => {
    expectPPP(projector.config.baseFocusWeight).toBe(0.6);
    expectPPP(projector.config.defaultProjectionType).toBe('test_type');
  });

  itPPP('projectToTimestampedBuffer should inject items into buffer and return projections', () => {
    const data = [{ id: 'item1', value: 10 }, { id: 'item2', value: 20 }];
    const projections = projector.projectToTimestampedBuffer(data, thoughtBuffer);

    expectPPP(thoughtBuffer.getCurrentState()).toHaveLength(2);
    expectPPP(projections).toHaveLength(2);
    expectPPP(projections[0].projection.originalItem.id).toBe('item1');
    assert(projections[0].focusWeight >= 0 && projections[0].focusWeight <=1, "Focus weight out of bounds");
    if(projections.length > 1) {
        expectPPP(projections[1].timestamp).toBeGreaterThan(projections[0].timestamp);
    }
  });

  itPPP('helper methods should return values in expected format', () => {
    const item = { name: "testItem" };
    const timestamp = projector.calculateOptimalTimestamp(item, 0);
    assert(typeof timestamp === 'number' && timestamp > 0, "calculateOptimalTimestamp failed");

    const projection = projector.createProbabilisticProjection(item);
    expectPPP(projection).toMatchObject({ originalItem: item, projectedValue: "testItem_projected", projectionType: 'test_type' });
    assert(typeof projection.confidence === 'number', "projection.confidence type mismatch");

    const weight = projector.calculateFocusWeight(item);
    assert(typeof weight === 'number' && weight >=0 && weight <=1, "calculateFocusWeight failed");
  });
});
