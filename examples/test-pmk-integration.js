// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js'; // Actual VC, though Dummy is used
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js';
import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js';
import { HOASBridge } from '../controllers/HOASBridge.js';

console.log("test-pmk-integration.js: Loaded. Testing with HOASBridge - Iterative Processing & Schema Evolution. DummyVC enhanced.");

class DummyVisualizerController {
    constructor() {
        console.log("DummyVisualizerController instantiated for PMK test.");
        this.currentPolytope = "hypercube"; // Default
        this.currentStyles = { glitchIntensity: 0.0 }; // Start with a known default
        this.lastDataSnapshot = null;
        this.mappingRules = { ubo: [], direct: {} }; // Mock internal state
    }

    updateData(dataSnapshot) {
        console.log("DummyVisualizerController.updateData CALLED with snapshot:", JSON.stringify(dataSnapshot, null, 2));
        this.lastDataSnapshot = dataSnapshot;
        // Simulate logging what would be processed based on some dummy mapping rules
        // This helps verify the structure of dataSnapshot PMKDataAdapter sends.
        if (this.mappingRules.ubo.length > 0 || Object.keys(this.mappingRules.direct).length > 0) {
            console.log("  DummyVC: (Simulating mapping of received snapshot based on internal rules - not actual VC logic)");
        } else {
            console.log("  DummyVC: (No mapping rules set, just received data)");
        }
    }

    setPolytope(polytopeName) {
        console.log(`DummyVisualizerController.setPolytope CALLED with polytopeName: '${polytopeName}'`);
        if(this.currentPolytope !== polytopeName){
            console.log(`  DummyVC: Polytope changed from '${this.currentPolytope}' to '${polytopeName}'.`);
            this.currentPolytope = polytopeName;
        } else {
            console.log(`  DummyVC: Polytope already '${polytopeName}'. No change.`);
        }
    }

    setVisualStyle(styleParams) {
        console.log("DummyVisualizerController.setVisualStyle CALLED with styleParams:", JSON.stringify(styleParams, null, 2));
        // Check for actual changes to log more informatively
        let changed = false;
        for(const key in styleParams){
            if(JSON.stringify(this.currentStyles[key]) !== JSON.stringify(styleParams[key])){
                changed = true;
                break;
            }
        }
        if(changed || Object.keys(this.currentStyles).length !== Object.keys(styleParams).length && Object.keys(styleParams).length > 0){
             console.log("  DummyVC: Visual styles updated from:", this.currentStyles, "to merge with:", styleParams);
             this.currentStyles = { ...this.currentStyles, ...styleParams };
        } else if (Object.keys(styleParams).length === 0) {
            console.log("  DummyVC: setVisualStyle called with empty params (no changes).");
        }
         else {
            console.log("  DummyVC: setVisualStyle called, but new styles match current. No effective change.", this.currentStyles);
        }
    }

    setDataMappingRules(newRules) {
        console.log("DummyVisualizerController.setDataMappingRules CALLED with newRules:", JSON.stringify(newRules, null, 2));
        this.mappingRules = JSON.parse(JSON.stringify(newRules)); // Deep copy
    }

    setSpecificUniform(uniformName, value) {
        console.log(`DummyVisualizerController.setSpecificUniform CALLED for '${uniformName}' with value:`, value);
    }

    // These methods are part of the actual VisualizerController's interface with HypercubeCore,
    // but PMKDataAdapter now uses updateData, setPolytope, setVisualStyle.
    // Logging them here is not essential for testing PMKDataAdapter's new behavior.
    updateUBOChannels(data) { /* console.log("DummyVisualizerController.updateUBOChannels called with:", JSON.stringify(data, null, 2)); */ }
    updateDirectParameters(data) { /* console.log("DummyVisualizerController.updateDirectParameters called with:", JSON.stringify(data, null, 2)); */ }
}


async function mainPMKTest() {
    console.log("test-pmk-integration.js: mainPMKTest() started - Iterative Processing & Schema Evolution.");

    const vizController = new DummyVisualizerController(); // Using the enhanced Dummy
    const pmkAdapter = new PMKDataAdapter(vizController);

    const initialKpConfig = {
        loggingVerbosity: "info",
        schemaGraphConfig: {
            initialSchemaDefinition: { type: 'base_schema', complexity: 3, version: '1.0.0' },
            minConfidenceForAdaptation: 0.6,
            adaptationStrategy: 'conservative',
            allowDynamicSchemaCreation: true
        },
        focusOptimizerConfig: {
            defaultTemperature: 0.6,
            defaultAbstractionWeight: 0.6,
            optimizationGoal: "balance_accuracy_cost",
            explorationFactor: 0.2,
            parameterBounds: { temperature: [0.1, 0.9], abstractionWeight: [0.1, 0.9] },
            maxHistorySize: 15
        },
        enablePPPinjection: false,
    };

    const parserator = new KerbelizedParserator(initialKpConfig);
    const hoasBridge = new HOASBridge(parserator);

    console.log("\n--- Initial State ---");
    let status = await hoasBridge.getParserStatus();
    console.log("Initial Parser Config from Bridge:", JSON.stringify(status.parseratorConfiguration, null, 2));
    let schemaRep = await hoasBridge.getCurrentSchemaRepresentation();
    console.log("Initial Schema Rep from Bridge:", JSON.stringify(schemaRep, null, 2));

    const numIterations = 15;
    let currentContext = {
        schemaProviderHint: "generic_text",
        targetAccuracy: 0.8
    };
    let schemaCountBaseline = parserator.schemaGraph.schemas.size;
    console.log(`Initial schema count: ${schemaCountBaseline}`);

    for (let i = 0; i < numIterations; i++) {
        console.log(`\n--- Iteration ${i + 1}/${numIterations} ---`);

        currentContext.dataTypeHint = "generic_unknown";
        if (i === 2) {
            currentContext.dataTypeHint = "email";
            console.log("Setting dataTypeHint to 'email' for this iteration to trigger template creation.");
        } else if (i === 4) {
            currentContext.dataTypeHint = "date";
            console.log("Setting dataTypeHint to 'date' for this iteration to trigger template creation.");
        } else if (i === 8) {
            currentContext.dataTypeHint = "email";
            console.log("Trying dataTypeHint 'email' after (potentially) disabling dynamic creation.");
        }

        const inputData = {
            text: `Test sentence number ${i+1}. Random content: ${Math.random().toString(36).substring(2)}.`,
            iteration: i,
        };

        if (i === 6) {
            console.log("\n--- DISABLING DYNAMIC SCHEMA CREATION MID-TEST ---");
            await hoasBridge.updateParserSubConfiguration("schemaGraphConfig", { allowDynamicSchemaCreation: false });
            status = await hoasBridge.getParserStatus();
            console.log("SchemaGraph Config Updated - allowDynamicSchemaCreation:", status.parseratorConfiguration.schemaGraphConfig.allowDynamicSchemaCreation);
        }
        if (i === Math.floor(numIterations / 3)) {
            console.log("\n--- CHANGING OPTIMIZATION GOAL & SCHEMA STRATEGY MID-TEST ---");
            await hoasBridge.tuneFocusParameters({ optimizationGoal: "maximize_accuracy", defaultTemperature: 0.4, explorationFactor: 0.05 });
            await hoasBridge.updateParserSubConfiguration("schemaGraphConfig", { adaptationStrategy: "aggressive_learning" });
        }

        console.log("Calling hoasBridge.processData with input:", inputData, "context:", currentContext);
        const result = await hoasBridge.processData(inputData, currentContext);

        if (result && result.metadata && result.metadata.focusParams) {
            console.log(`Iter ${i+1} - Result Confidence: ${result.confidence.toFixed(4)}`);
            console.log(`Iter ${i+1} - Focus Params Used: temp=${result.metadata.focusParams.temperature}, weight=${result.metadata.focusParams.abstractionWeight}, source=${result.metadata.focusParams.decisionSource}`);
            console.log(`Iter ${i+1} - Schema Used: ${result.metadata.schemaIdUsed} (v${result.schemaVersion})`);
        } else {
            console.error(`Iter ${i+1} - Invalid result structure:`, result);
        }

        // Call PMKDataAdapter to see its calls to DummyVisualizerController
        console.log(`--- PMKDataAdapter processing result of Iter ${i+1} ---`);
        pmkAdapter.processPMKUpdate(result); // This will now log through the DummyVC

        const currentSchemaCount = parserator.schemaGraph.schemas.size;
        console.log(`Current schema count: ${currentSchemaCount}`);
        if (currentSchemaCount > schemaCountBaseline) {
            console.log("  VERIFIED: New schema(s) detected in AdaptiveSchemaGraph! Count increased from", schemaCountBaseline, "to", currentSchemaCount);
            schemaCountBaseline = currentSchemaCount;
        }

        if ((i + 1) % 5 === 0 || i === numIterations - 1 || i === 2 || i === 4 || i === 8) {
            console.log(`--- State after Iteration ${i + 1} ---`);
            if(result && result.metadata && result.metadata.schemaIdUsed){
                 const currentSchemaId = result.metadata.schemaIdUsed;
                 schemaRep = await hoasBridge.getCurrentSchemaRepresentation(currentSchemaId);
                 if(schemaRep && schemaRep.representation && schemaRep.representation.id === currentSchemaId) {
                    console.log(`Schema Rep for '${currentSchemaId}': Strength ${schemaRep.representation.strength ? schemaRep.representation.strength.toFixed(4) : 'N/A'}, Usage ${schemaRep.representation.usageCount}, Def: ${JSON.stringify(schemaRep.representation.definition)}`);
                 } else {
                    console.log(`Schema Rep for '${currentSchemaId}' not fully available or schema might have been replaced/deleted if ID changed.`);
                 }
            }
            console.log("All Schemas Overview (from direct parserator access for test):");
            for (const schemaObj of parserator.schemaGraph.schemas.values()) {
                 console.log(`  Schema ID: ${schemaObj.id}, Strength: ${schemaObj.strength.toFixed(4)}, Usage Count: ${schemaObj.usageCount}, Version: ${schemaObj.definition.version}, Complexity: ${schemaObj.definition.complexity}, Parent: ${schemaObj.definition.parentSchemaId || 'N/A'}`);
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
    parserator.focusOptimizer.history.slice(-5).forEach((h, idx) => console.log(`  Hist[${idx-5}]: temp=${h.temp.toFixed(3)}, weight=${h.weight.toFixed(3)}, perf=${h.performance ? h.performance.toFixed(3):'N/A'}, cost=${h.cost}`));

    console.log("\nmainPMKTest() finished successfully. Review logs for adaptive behaviors and schema creation.");
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
});
