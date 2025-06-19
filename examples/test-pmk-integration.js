// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js'; // Though using Dummy for this test
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js'; // Not directly used here but good for context
import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js'; // Same as above
import { HOASBridge } from '../controllers/HOASBridge.js'; // New import

console.log("test-pmk-integration.js: Loaded. Testing with HOASBridge.");

class DummyVisualizerController {
    constructor() { console.log("DummyVisualizerController instantiated for PMK test."); }
    updateData(data) { console.log("DummyVisualizerController.updateData called with:", JSON.stringify(data, null, 2)); }
    updateUBOChannels(data) { console.log("DummyVisualizerController.updateUBOChannels called with:", JSON.stringify(data, null, 2)); }
    updateDirectParameters(data) { console.log("DummyVisualizerController.updateDirectParameters called with:", JSON.stringify(data, null, 2)); }
}

async function mainPMKTest() {
    console.log("test-pmk-integration.js: mainPMKTest() started.");

    const vizController = new DummyVisualizerController();
    const pmkAdapter = new PMKDataAdapter(vizController); // Still useful for adapting final output

    // Initial config for KerbelizedParserator
    const initialKpConfig = {
        operationalMode: "standard_parsing",
        loggingVerbosity: "info",
        enablePPPinjection: true,
        schemaGraphConfig: { initialSchemaDefinition: { type: 'initial_default', complexity: 1 } },
        focusOptimizerConfig: { defaultTemperature: 0.7, optimizationGoal: "balance_accuracy_cost" },
        thoughtBufferConfig: { maxSize: 100, retentionPolicy: "fifo" },
        pppProjectorConfig: { defaultProjectionType: "initial_event", projectionSource: "kp_internal_initial" }
    };

    console.log("\n--- Initializing KerbelizedParserator directly ---");
    const parserator = new KerbelizedParserator(initialKpConfig);

    console.log("\n--- Initializing HOASBridge with Parserator instance ---");
    const hoasBridge = new HOASBridge(parserator);

    console.log("\n--- 1. Getting Initial Parser Status via HOASBridge ---");
    let status = await hoasBridge.getParserStatus();
    console.log("Initial Parser Status from Bridge:", JSON.stringify(status, null, 2));
    if (status.parseratorConfiguration.operationalMode === "standard_parsing") {
        console.log("  VERIFIED: Bridge reports correct initial operationalMode.");
    }

    console.log("\n--- 2. Setting Operational Mode via HOASBridge ---");
    await hoasBridge.setOperationalMode("exploratory_analysis");
    status = await hoasBridge.getParserStatus();
    console.log("Parser Status after setOperationalMode. New Mode:", JSON.stringify(status.parseratorConfiguration.operationalMode, null, 2));
    if (parserator.config.operationalMode === "exploratory_analysis") {
        console.log("  VERIFIED: KerbelizedParserator operationalMode directly updated to 'exploratory_analysis'.");
    } else {
        console.error("  FAILED: KerbelizedParserator operationalMode not updated as expected.");
    }

    console.log("\n--- 3. Tuning Focus Parameters via HOASBridge ---");
    const newFocusParams = { optimizationGoal: "maximize_accuracy", defaultTemperature: 0.22 };
    await hoasBridge.tuneFocusParameters(newFocusParams);
    status = await hoasBridge.getParserStatus();
    console.log("Parser Status after tuneFocusParameters (focusOptimizerConfig):", JSON.stringify(status.parseratorConfiguration.focusOptimizerConfig, null, 2));
     if (parserator.config.focusOptimizerConfig.defaultTemperature === 0.22 &&
         parserator.config.focusOptimizerConfig.optimizationGoal === "maximize_accuracy") {
        console.log("  VERIFIED: KerbelizedParserator focusOptimizerConfig updated via bridge.");
    } else {
        console.error("  FAILED: KerbelizedParserator focusOptimizerConfig not updated as expected.");
    }

    console.log("\n--- 4. Processing Data via HOASBridge (first run) ---");
    const testData1 = { text: "Sample data for first run via HOASBridge." };
    const context1 = { schema: "text_analysis_v1", confidenceThreshold: 0.6, targetTemperature: 0.22 }; // Pass targetTemp
    let result1 = await hoasBridge.processData(testData1, context1);
    console.log("Result from processData (run 1):", JSON.stringify(result1, null, 2));
     if (result1 && result1.metadata.focusParams.temperature === 0.22) {
        console.log("  VERIFIED: parseWithContext used temperature set by tuneFocusParameters (via context).");
    }


    console.log("\n--- 5. Setting Full New Configuration via HOASBridge ---");
    const fullNewConfig = {
        operationalMode: "high_throughput_extraction",
        loggingVerbosity: "debug", // Change logging
        enablePPPinjection: false,  // Disable PPP
        defaultParsingDepth: 10,
        schemaGraphConfig: { adaptationStrategy: "conservative", maxSchemaComplexity: 5, initialSchemaDefinition: {type: 'new_schema_for_reconfig'} },
        focusOptimizerConfig: { optimizationGoal: "minimize_latency", defaultTemperature: 0.85, parameterBounds: { temperature: [0.5,0.9]} },
        thoughtBufferConfig: { maxSize: 10, retentionPolicy: "fifo" },
        pppProjectorConfig: {} // Effectively disable internal PPP by empty config (or make it more explicit if KP logic changes)
    };
    await hoasBridge.setParserConfiguration(fullNewConfig);
    status = await hoasBridge.getParserStatus();
    console.log("Parser Status after setParserConfiguration. Mode:", status.parseratorConfiguration.operationalMode, "PPP Enabled:", status.parseratorConfiguration.enablePPPinjection, "Logging:", status.parseratorConfiguration.loggingVerbosity);
    if (parserator.config.loggingVerbosity === "debug" &&
        !parserator.config.enablePPPinjection &&
        parserator.config.operationalMode === "high_throughput_extraction" &&
        parserator.schemaGraph.config.maxSchemaComplexity === 5 && // Check sub-component re-init
        parserator.pppProjector === undefined // Check if PPPProjector was undefined
        ) {
        console.log("  VERIFIED: KerbelizedParserator reconfigured with new full settings, including sub-components and PPPProjector removal.");
    } else {
        console.error("  FAILED: KerbelizedParserator full reconfiguration not verified. Current KP logging: ", parserator.config.loggingVerbosity, "PPP enabled:", parserator.config.enablePPPinjection, "KP SchemaGraph MaxComplexity:", parserator.schemaGraph.config.maxSchemaComplexity, "KP PPPProjector:", parserator.pppProjector);
    }


    console.log("\n--- 6. Processing Data via HOASBridge (second run, after full reconfig) ---");
    const testData2 = { text: "More data for second run, expecting different behavior (debug logs, no PPP)." };
    const context2 = { schema: "text_analysis_v2", confidenceThreshold: 0.9 };
    let result2 = await hoasBridge.processData(testData2, context2);
    console.log("Result from processData (run 2):", JSON.stringify(result2, null, 2));
    // Observe KP logs for "PPP Injection disabled" and "debug" level messages.
    if (result2 && result2.metadata.pppProjectionDetails.detail === "no_ppp_fallback") {
        console.log("  VERIFIED: PPP was indeed disabled for run 2 as per logs/result.");
    }

    console.log("\n--- 7. Testing Schema Representation (mock) ---");
    const schemaRep = await hoasBridge.getCurrentSchemaRepresentation();
    console.log("Schema Representation from Bridge:", JSON.stringify(schemaRep, null, 2));
    if (schemaRep.schemaId === 'new_schema_for_reconfig') { // Check if schema re-init happened
        console.log("  VERIFIED: Schema representation reflects schema from fullNewConfig.");
    }


    // Example of how PMKDataAdapter might be used with HOASBridge results
    function adaptResultToSnapshot(parserResult) {
        if (!parserResult || !parserResult.metadata) {
            console.warn("adaptResultToSnapshot: Invalid parser result provided:", parserResult);
            return { error: "Invalid parser result" };
        }
        return {
            architect: {
                confidence: parserResult.confidence,
                planComplexity: parserResult.metadata.focusParams ? parserResult.metadata.focusParams.temperature : null,
                activeNodes: parserResult.iterations,
                schemaType: parserResult.metadata.contextUsed ? parserResult.metadata.contextUsed.schema : "unknown_schema",
                schemaVersion: parserResult.schemaVersion
            },
            focus: parserResult.metadata.focusParams,
            pppSnapshot: parserResult.metadata.pppProjectionDetails,
            rawData: parserResult.data
        };
    }
    console.log("\n--- (Optional) Using PMKDataAdapter with final result ---");
    const finalSnapshot = adaptResultToSnapshot(result2);
    pmkAdapter.processPMKUpdate(finalSnapshot);


    console.log("\nmainPMKTest() finished successfully. Review logs for HOASBridge actions and KP reconfigurations.");
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
});
