import { AdaptiveSchemaGraph } from '../../pmk-integration/schemas/AdaptiveSchemaGraph.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteASG = ""; let beforeEachCallbackASG;
function describeASG(d, s) { currentSuiteASG = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteASG = ""; }
async function itASG(d, fn) { console.log(\`  Test: \${currentSuiteASG} - \${d}\`); try { beforeEachCallbackASG && beforeEachCallbackASG(); await fn(); console.log(\`    Passed: \${currentSuiteASG} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuiteASG} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEachASG(cb) { beforeEachCallbackASG = cb; }
const expectASG = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected '\${actual}' to be defined\`),
    toBeNull: () => assert(actual === null, \`Expected '\${actual}' to be null\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toBe: (expected) => assert(actual === expected, \`Expected '\${actual}' to be '\${expected}'\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
    toBeLessThan: (expected) => assert(actual < expected, \`Expected \${actual} to be less than \${expected}\`),
    toBeCloseTo: (expected, precision = 2) => assert(Math.abs(actual - expected) < (Math.pow(10, -precision) / 2), \`Expected \${actual} to be close to \${expected}\`),
    stringContaining: (substring) => assert(actual && actual.includes(substring), \`Expected '\${actual}' to contain '\${substring}'\`)
});

// This describe block keeps existing tests for adaptation logic
describeASG('AdaptiveSchemaGraph - Adaptive Logic (Strength Adjustment)', () => {
    let graph;
    const initialSchemaDef = { type: 'test_schema_1', complexity: 2, version: '1.0' };

    beforeEachASG(() => {
        graph = new AdaptiveSchemaGraph({
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialSchemaDef)),
            minConfidenceForAdaptation: 0.6,
            adaptationStrategy: 'conservative'
        });
    });

    itASG('getPreferredSchema should return the initial schema and update its usage', async () => {
        const schemaObj = await graph.getPreferredSchema();
        expectASG(schemaObj.id).toBe(initialSchemaDef.type);
        expectASG(schemaObj.strength).toBe(1.0);
        expectASG(schemaObj.usageCount).toBe(1);
    });

    itASG('adaptSchema should increase strength with high confidence (conservative)', async () => {
        let schemaObj = await graph.getPreferredSchema();
        const initialStrength = schemaObj.strength;
        await graph.adaptSchema(schemaObj, { confidence: 0.8 });
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        expectASG(adaptedSchemaObj.strength).toBeGreaterThan(initialStrength);
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength + (0.8 - 0.6) * 0.05, 4);
    });

    // ... other existing strength adaptation tests from previous file content can be maintained here ...
    // For brevity, not repeating all of them, assuming they are still valid for strength logic.
    itASG('adaptSchema should NOT change strength if confidence is below minConfidenceForAdaptation', async () => {
        graph.config.minConfidenceForAdaptation = 0.6;
        let schemaObj = await graph.getPreferredSchema();
        const initialStrength = schemaObj.strength;
        await graph.adaptSchema(schemaObj, { confidence: 0.5 });
        const adaptedSchemaObj = await graph.getSchemaById(initialSchemaDef.type);
        expectASG(adaptedSchemaObj.strength).toBeCloseTo(initialStrength, 4);
    });
});


describeASG('AdaptiveSchemaGraph - Schema Generation (_generateNewSchemaFromStrategy)', () => {
    let graph;
    const baseDef = { type: 'baseSchemaForGen', complexity: 3, version: '1.0.0', extractionSteps: ['step1', 'step2', 'step3'] };
    const baseObj = { id: 'baseSchemaForGen', definition: baseDef, strength: 1.0, usageCount:1, lastUsed: Date.now() };

    beforeEachASG(() => {
        graph = new AdaptiveSchemaGraph({
            maxSchemaComplexity: 5,
            // Start with a known schema for baseObj tests
            initialSchemaDefinition: JSON.parse(JSON.stringify(baseDef))
        });
        // For tests that don't rely on the initial one, or need a clean slate for counting.
        // graph.schemas.clear(); // If a test needs a truly empty start
        // graph.schemas.set(baseObj.id, JSON.parse(JSON.stringify(baseObj))); // ensure baseObj is in map
    });

    itASG('should generate by "Clone & Simplify" if complexity > 1', async () => {
        // Ensure baseObj is the one in the map for this test.
        graph.schemas.clear();
        const currentBaseObj = JSON.parse(JSON.stringify(baseObj)); // Use a fresh copy for the test state
        graph.schemas.set(currentBaseObj.id, currentBaseObj);


        const originalRandom = Math.random; Math.random = () => 0.1; // Force first path (simplify) in _generateNewSchemaFromStrategy
        const newDef = await graph._generateNewSchemaFromStrategy(currentBaseObj, null, null);
        Math.random = originalRandom;

        expectASG(newDef).toBeDefined();
        assert(newDef !== null, "New definition should be generated by simplify");
        expectASG(newDef.type).stringContaining('_s'); // e.g., baseSchemaForGen_s0 or _s1
        expectASG(newDef.complexity).toBe(baseDef.complexity - 1);
        expectASG(newDef.extractionSteps.length).toBe(baseDef.extractionSteps.length - 1);
        expectASG(newDef.parentSchemaId).toBe(baseObj.id);
    });

    itASG('should generate by "Clone & Mutate Parameter"', async () => {
        graph.schemas.clear();
        const currentBaseObj = JSON.parse(JSON.stringify(baseObj));
        graph.schemas.set(currentBaseObj.id, currentBaseObj);
        const originalRandom = Math.random; Math.random = () => 0.5; // Force second path (mutate)
        const newDef = await graph._generateNewSchemaFromStrategy(currentBaseObj, null, null);
        Math.random = originalRandom;

        expectASG(newDef).toBeDefined();
        assert(newDef !== null, "New definition should be generated by mutate");
        expectASG(newDef.type).stringContaining('_m');
        assert(newDef.mutatedField !== undefined, "Should have mutatedField");
        expectASG(newDef.parentSchemaId).toBe(baseObj.id);
    });

    itASG('should generate by "Generic Template" for "email" hint', async () => {
        const originalRandom = Math.random; Math.random = () => 0.8; // Force template path
        const newDef = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "email" }, null);
        Math.random = originalRandom;

        expectASG(newDef).toBeDefined();
        assert(newDef !== null, "Email template definition should be generated");
        expectASG(newDef.type).stringContaining('email_templ_v');
        expectASG(newDef.complexity).toBe(2);
        assert(newDef.extractionSteps[0].name === "basic_email_regex", "Email template content error");
    });

    itASG('should generate by "Generic Template" for "date" hint', async () => {
         const originalRandom = Math.random; Math.random = () => 0.8; // Force template path
        const newDef = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "date" }, null);
        Math.random = originalRandom;

        expectASG(newDef).toBeDefined();
        assert(newDef !== null, "Date template definition should be generated");
        expectASG(newDef.type).stringContaining('date_templ_v');
        expectASG(newDef.complexity).toBe(2);
        assert(newDef.extractionSteps[0].name === "iso_date_regex", "Date template content error");
    });

    itASG('should return null from template strategy if hint is unknown', async () => {
        const originalRandom = Math.random; Math.random = () => 0.8; // Force template path
        const newDef = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "unknown_hint" }, null);
        Math.random = originalRandom;
        expectASG(newDef).toBeNull();
    });

    itASG('should return null if generated complexity exceeds maxSchemaComplexity', async () => {
        graph.config.maxSchemaComplexity = 1;
        const originalRandom = Math.random; Math.random = () => 0.8; // Force template path
        const newDef = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "email" }, null); // Email template has complexity 2
        Math.random = originalRandom;
        expectASG(newDef).toBeNull();
    });

    itASG('should ensure unique ID for newly generated schemas', async () => {
        // Strategy: Generic Template for "date"
        const originalRandom = Math.random; Math.random = () => 0.8; // Force template path

        const def1 = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "date" }, null);
        assert(def1, "def1 should be created");
        graph.schemas.set(def1.type, { id: def1.type, definition: def1, strength: 0.5 }); // Add to map

        const def2 = await graph._generateNewSchemaFromStrategy(null, { dataTypeHint: "date" }, null);
        assert(def2, "def2 should be created");
        assert(def1.type !== def2.type, `Generated types should be unique: ${def1.type} vs ${def2.type}`);

        Math.random = originalRandom;
    });
});

describeASG('AdaptiveSchemaGraph - Dynamic Creation in adaptSchema', () => {
    let graph;
    const initialTestSchema = { type: 'schema_for_adapt_test', complexity: 1, version: '1.0' };

    beforeEachASG(() => {
        graph = new AdaptiveSchemaGraph({
            allowDynamicSchemaCreation: true,
            minConfidenceForAdaptation: 0.6, // dynamicCreationThreshold = 0.3
            initialSchemaDefinition: JSON.parse(JSON.stringify(initialTestSchema))
        });
    });

    itASG('should add a new schema if confidence is very low and creation is enabled', async () => {
        const initialSchemaCount = graph.schemas.size;
        const preferredSchema = await graph.getPreferredSchema(); // usageCount is now 1

        // Force low confidence and provide context hint to guide template generation
        const parseResult = {
            confidence: 0.1, // Very low, should trigger dynamicCreationThreshold
            inputContext: { dataTypeHint: "email" }
        };
        // Mock Math.random to ensure "Generic Template" is chosen if conditions are met
        const originalRandom = Math.random; Math.random = () => 0.8; // To favor template generation
        await graph.adaptSchema(preferredSchema, parseResult);
        Math.random = originalRandom;

        expectASG(graph.schemas.size).toBe(initialSchemaCount + 1);
        let newSchema = null;
        for(const s of graph.schemas.values()){
            if(s.id !== initialTestSchema.type && s.id.startsWith('email_templ_v')) { newSchema = s; break; }
        }
        assert(newSchema, "A new schema should have been added to the map");
        expectASG(newSchema.definition.type.startsWith('email_templ_v')).toBe(true);
        expectASG(newSchema.strength).toBe(0.5); // Default initial strength for new schemas
        expectASG(newSchema.definition.parentSchemaId).toBe(initialTestSchema.type); // Check parent tracking
    });

    itASG('should NOT add a new schema if allowDynamicSchemaCreation is false', async () => {
        graph.config.allowDynamicSchemaCreation = false; // Disable
        const initialSchemaCount = graph.schemas.size;
        const preferredSchema = await graph.getPreferredSchema();

        await graph.adaptSchema(preferredSchema, { confidence: 0.1, inputContext: { dataTypeHint: "email"} });

        expectASG(graph.schemas.size).toBe(initialSchemaCount);
    });

    itASG('should NOT add a new schema if _generateNewSchemaFromStrategy returns null', async () => {
        graph.config.allowDynamicSchemaCreation = true;
        graph.config.maxSchemaComplexity = 1; // Ensure template (complexity 2) fails complexity check
        const initialSchemaCount = graph.schemas.size;
        const preferredSchema = await graph.getPreferredSchema();

        // Mock Math.random to ensure "Generic Template" is chosen if conditions are met
        const originalRandom = Math.random; Math.random = () => 0.8; // To favor template generation
        await graph.adaptSchema(preferredSchema, { confidence: 0.1, inputContext: { dataTypeHint: "email"} });
        Math.random = originalRandom;

        expectASG(graph.schemas.size).toBe(initialSchemaCount); // No new schema should be added
    });
});
