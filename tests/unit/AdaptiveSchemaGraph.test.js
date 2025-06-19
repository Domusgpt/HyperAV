import { AdaptiveSchemaGraph } from '../../pmk-integration/schemas/AdaptiveSchemaGraph.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteASG = ""; let beforeEachCallbackASG;
function describeASG(d, s) { currentSuiteASG = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteASG = ""; }
async function itASG(d, fn) { console.log(\`  Test: \${currentSuiteASG} - \${d}\`); try { beforeEachCallbackASG && beforeEachCallbackASG(); await fn(); console.log(\`    Passed: \${currentSuiteASG} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuiteASG} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEachASG(cb) { beforeEachCallbackASG = cb; }
const expectASG = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
    toBeLessThan: (expected) => assert(actual < expected, \`Expected \${actual} to be less than \${expected}\`),
    toBeCloseTo: (expected, precision = 2) => assert(Math.abs(actual - expected) < (Math.pow(10, -precision) / 2), \`Expected \${actual} to be close to \${expected}\`)
});

describeASG('AdaptiveSchemaGraph - Adaptive Logic', () => {
    let graph;
    const initialSchemaDef = { type: 'test_schema_1', complexity: 2, version: '1.0' };

    beforeEachASG(() => {
        graph = new AdaptiveSchemaGraph({
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialSchemaDef)),
            minConfidenceForAdaptation: 0.6,
            adaptationStrategy: 'conservative' // Default for some tests
        });
    });

    itASG('getPreferredSchema should return the initial schema and update its usage', async () => {
        const schemaObj = await graph.getPreferredSchema();
        expectASG(schemaObj.id).toBe(initialSchemaDef.type);
        expectASG(schemaObj.strength).toBe(1.0);
        expectASG(schemaObj.usageCount).toBe(1);
        const firstUsageTime = schemaObj.lastUsed;
        assert(firstUsageTime > 0, "lastUsed should be set");

        await graph.getPreferredSchema(); // Call again
        const updatedSchemaObj = await graph.getSchemaById(initialSchemaDef.type); // Fetch fresh from map
        expectASG(updatedSchemaObj.usageCount).toBe(2);
        assert(updatedSchemaObj.lastUsed >= firstUsageTime, "lastUsed should update");
    });

    itASG('adaptSchema should increase strength with high confidence (conservative)', async () => {
        let schemaObj = await graph.getPreferredSchema(); // usageCount becomes 1
        const initialStrength = schemaObj.strength; // Should be 1.0

        await graph.adaptSchema(schemaObj, { confidence: 0.8 }); // 0.8 > 0.6
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        expectASG(adaptedSchemaObj.strength).toBeGreaterThan(initialStrength);
        // (0.8 - 0.6) * 0.05 = 0.01 increase for conservative
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength + (0.8 - 0.6) * 0.05, 4);
    });

    itASG('adaptSchema should NOT change strength if confidence is below minConfidenceForAdaptation', async () => {
        graph.config.minConfidenceForAdaptation = 0.6;
        let schemaObj = await graph.getPreferredSchema();
        const initialStrength = schemaObj.strength;

        await graph.adaptSchema(schemaObj, { confidence: 0.5 }); // 0.5 < 0.6
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength, 4);
    });

    itASG('adaptSchema should increase strength more with high confidence (aggressive_learning)', async () => {
        graph = new AdaptiveSchemaGraph({
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialSchemaDef)),
            adaptationStrategy: 'aggressive_learning',
            minConfidenceForAdaptation: 0.5
        });
        let schemaObj = await graph.getPreferredSchema();
        const initialStrength = schemaObj.strength;

        await graph.adaptSchema(schemaObj, { confidence: 0.9 }); // 0.9 > 0.5
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        // (0.9 - 0.5) * (0.05 * 4) = 0.4 * 0.2 = 0.08 increase
        expectASG(adaptedSchemaObj.strength).toBeGreaterThan(initialStrength);
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength + 0.08, 4);
    });

    itASG('adaptSchema should decrease strength with low confidence (aggressive_learning, if confidence > min)', async () => {
        graph = new AdaptiveSchemaGraph({
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialSchemaDef)),
            adaptationStrategy: 'aggressive_learning',
            minConfidenceForAdaptation: 0.1 // Allow low confidence for adaptation
        });
        let schemaObj = await graph.getPreferredSchema(); // strength 1.0
        const initialStrength = schemaObj.strength;

        await graph.adaptSchema(schemaObj, { confidence: 0.2 }); // 0.2 > 0.1
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        // (0.2 - 0.5) * 0.2 = -0.3 * 0.2 = -0.06 decrease
        expectASG(adaptedSchemaObj.strength).toBeLessThan(initialStrength);
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength - 0.06, 4);
    });


    itASG('adaptSchema should log for dynamic schema creation if confidence is very low and enabled', async () => {
        graph = new AdaptiveSchemaGraph({
            allowDynamicSchemaCreation: true,
            minConfidenceForAdaptation: 0.6,
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialSchemaDef))
        });
        const schemaObj = await graph.getPreferredSchema();
        let consoleOutput = "";
        const originalLog = console.log;
        console.log = (msg) => { // Basic capture
            if (typeof msg === 'string') consoleOutput += msg + "\n";
        };

        await graph.adaptSchema(schemaObj, { confidence: 0.2 }); // 0.2 < (0.6 * 0.5 = 0.3)
        assert(consoleOutput.includes("Dynamic schema creation triggered"), "Should log dynamic schema creation");
        console.log = originalLog;
    });

    itASG('getPreferredSchema should select schema with highest strength', async () => {
        graph = new AdaptiveSchemaGraph({ initialSchemaDefinition: { type: 's1' } }); // s1 will have strength 1.0
        const schema2Def = { type: 's2', complexity: 1};
        graph.schemas.set('s2', { id: 's2', definition: schema2Def, strength: 2.0, usageCount: 0, lastUsed: Date.now() });
        const schema3Def = { type: 's3', complexity: 1};
        graph.schemas.set('s3', { id: 's3', definition: schema3Def, strength: 1.5, usageCount: 0, lastUsed: Date.now() });

        const preferred = await graph.getPreferredSchema();
        expectASG(preferred.id).toBe('s2');
    });
});
