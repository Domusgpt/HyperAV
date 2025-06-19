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
});

describeASG('AdaptiveSchemaGraph', () => {
    let graph;

    itASG('should instantiate with default config', () => {
        graph = new AdaptiveSchemaGraph();
        expectASG(graph.config).toBeDefined();
        expectASG(graph.config.adaptationStrategy).toBe('conservative');
        expectASG(graph.config.initialSchemaDefinition.type).toBe('default_config');
    });

    itASG('should instantiate with custom config', () => {
        const customConfig = {
            adaptationStrategy: "aggressive_learning",
            maxSchemaComplexity: 20,
            initialSchemaDefinition: { type: 'custom_test_schema', data: 'test' }
        };
        graph = new AdaptiveSchemaGraph(customConfig);
        expectASG(graph.config.adaptationStrategy).toBe('aggressive_learning');
        expectASG(graph.config.maxSchemaComplexity).toBe(20);
        expectASG(graph.rootSchema.type).toBe('custom_test_schema');
    });

    itASG('createDefaultSchema should use initialSchemaDefinition from config', () => {
        const customInitialSchema = { type: 'my_initial_schema', version: 1 };
        graph = new AdaptiveSchemaGraph({ initialSchemaDefinition: customInitialSchema });
        expectASG(graph.rootSchema).toEqual(customInitialSchema);
    });

    itASG('adaptSchema should respect minConfidenceForAdaptation from config', async () => {
        graph = new AdaptiveSchemaGraph({ minConfidenceForAdaptation: 0.8 });
        const initialSchema = graph.getRootSchema();
        // Mock console.log to check output
        let consoleOutput = "";
        const originalLog = console.log;
        console.log = (msg) => { consoleOutput += msg + "\n"; };

        await graph.adaptSchema(initialSchema, { confidence: 0.5 }); // Below threshold
        assert(consoleOutput.includes("Confidence below threshold"), "Should log skipping due to low confidence");

        consoleOutput = ""; // Reset
        await graph.adaptSchema(initialSchema, { confidence: 0.9 }); // Above threshold
        assert(consoleOutput.includes("(Placeholder) Adapting schema..."), "Should log adapting schema");
        console.log = originalLog; // Restore console.log
    });
});
