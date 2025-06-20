// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js';
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
// PPPProjector and TimestampedThoughtBuffer are used internally by KerbelizedParserator
// import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js';
// import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js';
import { HOASBridge } from '../controllers/HOASBridge.js';
import { HypercubeCore } from '../core/HypercubeCore.js';
import { ShaderManager } from '../core/ShaderManager.js';

console.log("test-pmk-integration.js: Loaded. Setting up full WebGPU stack if canvas present.");

async function mainPMKTest() {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) messagesDiv.textContent = 'Initializing WebGPU and Core Components...';

    const canvas = document.getElementById('viz-canvas');
    if (!canvas) {
        console.error("test-pmk-integration.js: Canvas element #viz-canvas not found. Cannot run full visual test.");
        if (messagesDiv) messagesDiv.textContent = 'Error: Canvas #viz-canvas not found.';
        return;
    }
    // Set canvas size based on window, or fixed for testing consistency
    canvas.width = window.innerWidth > 0 ? window.innerWidth : 800;
    canvas.height = window.innerHeight > 0 ? window.innerHeight : 600;


    let core;
    let shaderManager;
    let vizController;
    let pmkAdapter;
    let parserator;
    let hoasBridge;

    try {
        console.log("Instantiating HypercubeCore (async)...");
        // Pass null for shaderManager initially, will be set after device is available.
        // Provide initial state for HypercubeCore, including dataChannels.
        const coreConfig = {
            dataChannels: new Array(64).fill(0.1) // Initialize with some non-zero data
        };
        core = new HypercubeCore(canvas, null, coreConfig);
        await core._asyncInitialization; // Wait for device

        if (!core.device) {
            console.error("HypercubeCore initialization failed to create a WebGPU device.");
            if (messagesDiv) messagesDiv.textContent = 'Error: WebGPU device creation failed.';
            return;
        }

        console.log("Instantiating ShaderManager...");
        shaderManager = new ShaderManager(core.device);
        core.shaderManager = shaderManager;

        // HypercubeCore's _populateInitialUniformData calls _setupInitialRenderPipeline after
        // BGLs and BGs are created. This happens as part of the _asyncInitialization.

        console.log("Instantiating VisualizerController...");
        const vizControllerConfig = {
            mappingRules: {
                ubo: [
                    { snapshotField: "kp_confidence", uboChannelIndex: 0, defaultValue: 0.0 },
                    { snapshotField: "kp_focus_temp", uboChannelIndex: 1, defaultValue: 0.5 },
                    { snapshotField: "kp_payload_size", uboChannelIndex: 2, defaultValue: 0.0, transform: "logScale" },
                    { snapshotField: "kp_iterations", uboChannelIndex: 3, defaultValue: 0.0 },
                    { snapshotField: "kp_error_count", uboChannelIndex: 4, defaultValue: 0.0 } // Example mapping for error
                ],
                direct: {
                    // "kp_schema_id_used": { coreStateName: "currentSchemaInfoString", defaultValue: "N/A" }, // Conceptual
                    "kp_error_count": { coreStateName: "glitchIntensity", transform: (val) => val > 0 ? val * 0.2 + 0.1 : 0.0, defaultValue: 0.0 }
                }
            },
            customTransformations: {
                logScale: (value) => (value > 0 ? Math.log1p(value) / Math.log1p(1000) : 0), // Normalize log output somewhat
            }
        };
        vizController = new VisualizerController(core, vizControllerConfig);

        console.log("Instantiating PMKDataAdapter...");
        pmkAdapter = new PMKDataAdapter(vizController);

        console.log("Instantiating KerbelizedParserator & HOASBridge...");
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
        parserator = new KerbelizedParserator(initialKpConfig);
        hoasBridge = new HOASBridge(parserator);

        console.log("Starting HypercubeCore render loop...");
        core.start();

        if (messagesDiv) messagesDiv.textContent = 'PMK Integration Test Running... (Iterative with WebGPU Core)';

    } catch (error) {
        console.error("Error during test setup:", error);
        if (messagesDiv) messagesDiv.textContent = 'Error during setup: ' + error.message;
        return;
    }

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
            console.log("Setting dataTypeHint to 'email' for this iteration.");
        } else if (i === 4) {
            currentContext.dataTypeHint = "date";
            console.log("Setting dataTypeHint to 'date' for this iteration.");
        } else if (i === 8) {
            currentContext.dataTypeHint = "email";
            console.log("Trying dataTypeHint 'email' after (potentially) disabling dynamic creation.");
        }

        const inputData = {
            text: `Test sentence number ${i+1}. Random content: ${Math.random().toString(36).substring(2)}.`,
            iteration: i,
            // Simulate some varying data that could affect confidence if parsing were real
            complexity_metric: Math.random()
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

        // console.log("Calling hoasBridge.processData with input:", inputData, "context:", currentContext);
        const result = await hoasBridge.processData(inputData, currentContext);

        if (result && result.metadata && result.metadata.focusParams) {
            console.log(`Iter ${i+1} - Result Confidence: ${result.confidence.toFixed(4)}`);
            console.log(`Iter ${i+1} - Focus Params Used: temp=${result.metadata.focusParams.temperature}, weight=${result.metadata.focusParams.abstractionWeight}, source=${result.metadata.focusParams.decisionSource}`);
            console.log(`Iter ${i+1} - Schema Used: ${result.metadata.schemaIdUsed} (v${result.schemaVersion})`);
        } else {
            console.error(`Iter ${i+1} - Invalid result structure:`, result);
        }

        if (result) { // Ensure result is valid before processing
            console.log(`--- PMKDataAdapter processing result of Iter ${i+1} ---`);
            pmkAdapter.processPMKUpdate(result);
        }


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
         // Small delay to allow render loop to process and log, and to make visual changes more observable
        if (typeof document !== 'undefined') await new Promise(resolve => setTimeout(resolve, 100));
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

    console.log("\nmainPMKTest() finished successfully. Review logs for adaptive behaviors and WebGPU core state logs.");
    if (messagesDiv) messagesDiv.textContent = 'Test complete. Check console for detailed logs and HypercubeCore render state.';
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) messagesDiv.textContent = 'Test FAILED. Check console for errors.';
});
