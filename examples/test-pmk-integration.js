// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js';
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js';
import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js';

console.log("test-pmk-integration.js: Script loaded. Attempting to run full PMK component integration test with detailed configurations.");

class DummyVisualizerController {
    constructor() { console.log("DummyVisualizerController instantiated for PMK test."); }
    updateData(data) { console.log("DummyVisualizerController.updateData called with:", JSON.stringify(data, null, 2)); }
    updateUBOChannels(data) { console.log("DummyVisualizerController.updateUBOChannels called with:", JSON.stringify(data, null, 2)); }
    updateDirectParameters(data) { console.log("DummyVisualizerController.updateDirectParameters called with:", JSON.stringify(data, null, 2)); }
}

async function mainPMKTest() {
    console.log("test-pmk-integration.js: mainPMKTest() started.");

    let vizController = new DummyVisualizerController();
    const pmkAdapter = new PMKDataAdapter(vizController); // vizController is now always the dummy

    // Configuration Set 1 (Debug logging, PPP enabled, specific sub-configs)
    const configSet1 = {
        operationalMode: "exploratory_analysis",
        defaultParsingDepth: 3,
        enablePPPinjection: true,
        loggingVerbosity: "debug",
        schemaGraphConfig: {
            adaptationStrategy: "aggressive_learning",
            maxSchemaComplexity: 15,
            initialSchemaDefinition: { type: 'custom_from_config1', details: 'schema_1_details' }
        },
        focusOptimizerConfig: {
            optimizationGoal: "maximize_accuracy",
            parameterBounds: { temperature: [0.1, 0.6], abstractionWeight: [0.4, 0.9] },
            defaultTemperature: 0.35,
            explorationFactor: 0.2
        },
        thoughtBufferConfig: {
            maxSize: 50,
            retentionPolicy: "lifo",
            defaultInjectionWeight: 0.75
        },
        pppProjectorConfig: {
            defaultProjectionType: "event_type_from_config1",
            projectionSource: "kp_internal_ppp_config1"
        }
    };

    // Configuration Set 2 (Info logging, PPP disabled, different sub-configs)
    const configSet2 = {
        operationalMode: "high_throughput_extraction",
        defaultParsingDepth: 7,
        enablePPPinjection: false, // PPP Disabled
        loggingVerbosity: "info",
        schemaGraphConfig: {
            adaptationStrategy: "conservative",
            maxSchemaComplexity: 8,
        },
        focusOptimizerConfig: {
            optimizationGoal: "minimize_latency",
            defaultTemperature: 0.8, // Test if KP picks this up
        },
        thoughtBufferConfig: {
            maxSize: 10,
            retentionPolicy: "fifo",
            defaultInjectionWeight: 0.4
        },
        pppProjectorConfig: {
            defaultProjectionType: "event_type_from_config2",
            projectionSource: "kp_internal_ppp_config2"
        }
    };

    console.log("\n--- Initializing KerbelizedParserator with Config Set 1 ---");
    const parserator1 = new KerbelizedParserator(configSet1);

    // Test with separate PPPProjector and ThoughtBuffer instances as well
    const externalThoughtBuffer = new TimestampedThoughtBuffer({maxSize: 30, defaultInjectionWeight: 0.1, retentionPolicy: "lifo"});
    const externalPPPProjector = new PPPProjector({timestampSpreadFactor: 50, baseFocusWeight: 0.2, defaultProjectionType: "external_event"});

    async function testParseAndAdaptationCycle(id, parseratorInstance, testData, context) {
        console.log(`\nStarting Test Cycle ${id} with data:`, testData, "and context:", context);

        const internalThoughtBufferStateBefore = parseratorInstance.thoughtBuffer.getCurrentState ? parseratorInstance.thoughtBuffer.getCurrentState() : [];
        console.log(`Thought Buffer (parserator's internal for ${id}) initial state size:`, internalThoughtBufferStateBefore.length);

        console.log(`--- Calling KerbelizedParserator (${id}).parseWithContext ---`);
        const result = await parseratorInstance.parseWithContext(testData, context);
        console.log(`KerbelizedParserator (${id}).parseWithContext full result:`, JSON.stringify(result, null, 2));

        const internalThoughtBufferStateAfter = parseratorInstance.thoughtBuffer.getCurrentState ? parseratorInstance.thoughtBuffer.getCurrentState() : [];
        console.log(`Thought Buffer (parserator's internal for ${id}) state after parse size:`, internalThoughtBufferStateAfter.length);
        if (parseratorInstance.config.enablePPPinjection && internalThoughtBufferStateAfter.length > internalThoughtBufferStateBefore.length) {
            console.log(`  Verified: PPP injection occurred for ${id} as enablePPPinjection is true.`);
        } else if (!parseratorInstance.config.enablePPPinjection && internalThoughtBufferStateAfter.length === internalThoughtBufferStateBefore.length) {
             // If PPP is disabled, or if it was enabled but no injection points were found (e.g. pppProjection was empty)
            if (!parseratorInstance.config.enablePPPinjection) {
                 console.log(`  Verified: PPP injection was skipped for ${id} as enablePPPinjection is false.`);
            } else {
                 console.log(`  Note: PPP injection enabled for ${id}, but buffer size did not change. This might be expected if no projection data was suitable for injection.`);
            }
        } else if (parseratorInstance.config.enablePPPinjection && internalThoughtBufferStateAfter.length === internalThoughtBufferStateBefore.length) {
             console.log(`  Note: PPP injection enabled for ${id}, but buffer size did not change. This might be expected if no projection data was suitable for injection, or if buffer was full and used LIFO.`);
        }


        // Example of using the separate PPPProjector with its own buffer
        const abstractionsToProject = result.data.extractedItems || [{id: `item_for_ext_ppp_${id}`, content: `abstract data from ${id}`}];
        console.log(`--- Calling external PPPProjector.projectToTimestampedBuffer (for cycle ${id}) ---`);
        const pppFileProjections = externalPPPProjector.projectToTimestampedBuffer(abstractionsToProject, externalThoughtBuffer);
        console.log(`External PPPProjector produced projections (${id}):`, JSON.stringify(pppFileProjections, null, 2));
        console.log(`External Thought Buffer state after PPPProjector call in cycle ${id}: Size`, externalThoughtBuffer.getCurrentState().length);

        console.log(`--- Calling PMKDataAdapter.processPMKUpdate (for cycle ${id}) ---`);
        const snapshotForAdapter = {
            architect: {
                confidence: result.confidence,
                planComplexity: result.metadata.focusParams.temperature,
                activeNodes: result.iterations,
                schemaType: result.metadata.contextUsed ? result.metadata.contextUsed.schema : "unknown_schema",
                schemaVersion: result.schemaVersion
            },
            focus: result.metadata.focusParams,
            pppSnapshot: result.metadata.pppProjectionDetails,
            rawData: result.data
        };
        pmkAdapter.processPMKUpdate(snapshotForAdapter);
        console.log(`PMKDataAdapter processing complete for cycle ${id}.`);
    }

    // --- Test Case 1 (using parserator1 with configSet1) ---
    const testData1 = { text: "Process this example sentence for contact info with config1." };
    const context1 = {
        schema: "contact_extraction_config1",
        confidenceThreshold: 0.7,
        currentPerformanceMetrics: { accuracy: 0.9, speed: 100 }
    };
    await testParseAndAdaptationCycle("KP1_Run1", parserator1, testData1, context1);

    // --- Test Case 2 (still using parserator1, but different data) ---
    const testData2 = { image_features: [0.1, 0.5, 0.9], source: "visual_sensor_A_config1" };
    const context2 = {
        schema: "image_analysis_config1",
        confidenceThreshold: 0.6,
        currentPerformanceMetrics: { accuracy: 0.85, speed: 50 }
    };
    await testParseAndAdaptationCycle("KP1_Run2", parserator1, testData2, context2);

    console.log("\n--- Initializing KerbelizedParserator with Config Set 2 (PPP disabled, info logging) ---");
    const parserator2 = new KerbelizedParserator(configSet2);

    // --- Test Case 3 (using parserator2 with configSet2) ---
    const testData3 = { text: "Another sentence for high throughput test with config2." };
    const context3 = {
        schema: "text_extraction_config2",
        confidenceThreshold: 0.8,
        currentPerformanceMetrics: { accuracy: 0.95, speed: 200 }
    };
    await testParseAndAdaptationCycle("KP2_Run1", parserator2, testData3, context3);

    console.log("\nmainPMKTest() finished successfully. Review logs for config effects.");
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
});
