// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js'; // Though using Dummy for this test
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js'; // Not directly used here but good for context
import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js'; // Same as above
import { HOASBridge } from '../controllers/HOASBridge.js';

console.log("test-pmk-integration.js: Loaded. Testing with HOASBridge - Iterative Processing.");

class DummyVisualizerController {
    constructor() { console.log("DummyVisualizerController instantiated for PMK test."); }
    updateData(data) { /* console.log("DummyVisualizerController.updateData called with:", JSON.stringify(data, null, 2)); */ }
    updateUBOChannels(data) { /* console.log("DummyVisualizerController.updateUBOChannels called with:", JSON.stringify(data, null, 2)); */ }
    updateDirectParameters(data) { /* console.log("DummyVisualizerController.updateDirectParameters called with:", JSON.stringify(data, null, 2)); */ }
}

async function mainPMKTest() {
    console.log("test-pmk-integration.js: mainPMKTest() started - Iterative testing.");

    const vizController = new DummyVisualizerController();
    const pmkAdapter = new PMKDataAdapter(vizController); // Still useful for adapting final output

    const initialKpConfig = {
        loggingVerbosity: "info", // Start with info, can be changed by HOASBridge
        schemaGraphConfig: {
            initialSchemaDefinition: { type: 'base_schema', complexity: 2, version: '1.0' },
            minConfidenceForAdaptation: 0.55,
            adaptationStrategy: 'conservative'
        },
        focusOptimizerConfig: {
            defaultTemperature: 0.6,
            defaultAbstractionWeight: 0.6,
            optimizationGoal: "balance_accuracy_cost",
            explorationFactor: 0.2,
            parameterBounds: { temperature: [0.1, 0.9], abstractionWeight: [0.1, 0.9] },
            maxHistorySize: 15 // For BFO history
        },
        enablePPPinjection: false, // Keep this false for simpler observation of BFO/ASG
        // pppProjectorConfig: { defaultProjectionType: "test_event" }
    };

    const parserator = new KerbelizedParserator(initialKpConfig);
    const hoasBridge = new HOASBridge(parserator);

    console.log("\n--- Initial State ---");
    let status = await hoasBridge.getParserStatus();
    console.log("Initial Parser Config from Bridge:", JSON.stringify(status.parseratorConfiguration, null, 2));
    let schemaRep = await hoasBridge.getCurrentSchemaRepresentation();
    console.log("Initial Schema Rep from Bridge:", JSON.stringify(schemaRep, null, 2));

    const numIterations = 10; // More iterations to see evolution
    let currentContext = {
        schemaProviderHint: "generic_text",
        targetAccuracy: 0.8
        // No need to pass previousCyclePerformance; KP handles this with its this.lastRunOutcome
    };

    for (let i = 0; i < numIterations; i++) {
        console.log(`\n--- Iteration ${i + 1}/${numIterations} ---`);

        const inputData = {
            text: `Test sentence number ${i+1}. Iteration specific content: ${Math.random().toString(36).substring(7)}.`,
            iteration: i,
        };

        if (i === Math.floor(numIterations / 2)) {
            console.log("\n--- CHANGING OPTIMIZATION GOAL & SCHEMA STRATEGY MID-TEST ---");
            await hoasBridge.tuneFocusParameters({ optimizationGoal: "maximize_accuracy", defaultTemperature: 0.4, explorationFactor: 0.1 });
            await hoasBridge.updateParserSubConfiguration("schemaGraphConfig", { adaptationStrategy: "aggressive_learning" });
            // Optionally change logging to debug to see more KP internal logs for the second half
            // await hoasBridge.updateParserSubConfiguration("kerbelizedParserator", { loggingVerbosity: "debug" });
            status = await hoasBridge.getParserStatus();
            console.log("Updated Parser Config (Goal & Strategy):", JSON.stringify({
                optGoal: status.parseratorConfiguration.focusOptimizerConfig.optimizationGoal,
                schemaStrategy: status.parseratorConfiguration.schemaGraphConfig.adaptationStrategy,
                newLogging: status.parseratorConfiguration.loggingVerbosity
            }, null, 2));
        }

        console.log("Calling hoasBridge.processData with context:", currentContext);
        const result = await hoasBridge.processData(inputData, currentContext);

        if (result && result.metadata && result.metadata.focusParams) {
            console.log(`Iter ${i+1} - Result Confidence: ${result.confidence.toFixed(4)}`);
            console.log(`Iter ${i+1} - Focus Params Used: temp=${result.metadata.focusParams.temperature}, weight=${result.metadata.focusParams.abstractionWeight}, source=${result.metadata.focusParams.decisionSource}`);
            console.log(`Iter ${i+1} - Schema Used: ${result.metadata.schemaIdUsed} (v${result.schemaVersion})`);
        } else {
            console.error(`Iter ${i+1} - Invalid result structure:`, result);
        }

        if ((i + 1) % 3 === 0 || i === numIterations - 1) {
            console.log(`--- State after Iteration ${i + 1} ---`);
            if(result && result.metadata && result.metadata.schemaIdUsed){
                 schemaRep = await hoasBridge.getCurrentSchemaRepresentation(result.metadata.schemaIdUsed);
                 console.log(`Schema Rep for '${result.metadata.schemaIdUsed}': Strength ${schemaRep.representation.strength.toFixed(4)}, Usage ${schemaRep.representation.usageCount}, Def: ${JSON.stringify(schemaRep.representation.definition)}`);
            }
            // Log all schemas for broader view
            console.log("All Schemas Overview (from direct parserator access for test):");
            for (const schemaObj of parserator.schemaGraph.schemas.values()) {
                 console.log(`  Schema ID: ${schemaObj.id}, Strength: ${schemaObj.strength.toFixed(4)}, Usage Count: ${schemaObj.usageCount}, Version: ${schemaObj.definition.version}`);
            }
        }
    }

    console.log(`\n--- Final State after ${numIterations} iterations ---`);
    status = await hoasBridge.getParserStatus();
    console.log("Final Parser FocusOptimizer Config:", JSON.stringify(status.parseratorConfiguration.focusOptimizerConfig, null, 2));
    console.log("Final Schemas Overview:");
    for (const schemaObj of parserator.schemaGraph.schemas.values()) {
        console.log(`  Schema ID: ${schemaObj.id}, Strength: ${schemaObj.strength.toFixed(4)}, Usage Count: ${schemaObj.usageCount}, Def: ${JSON.stringify(schemaObj.definition)}`);
    }
    console.log("BFO History (last 5 entries):");
    parserator.focusOptimizer.history.slice(-5).forEach((h, idx) => console.log(`  Hist[${idx-5}]: temp=${h.temp}, weight=${h.weight}, perf=${h.performance ? h.performance.toFixed(3):'N/A'}, cost=${h.cost}`));


    console.log("\nmainPMKTest() finished successfully. Review logs for adaptive behaviors.");
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
});
