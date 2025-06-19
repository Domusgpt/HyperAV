// Ensure all paths are correct relative to 'examples/' directory
import { VisualizerController } from '../controllers/VisualizerController.js';
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';
import { PPPProjector } from '../pmk-integration/parsers/PPPProjector.js'; // May not be directly used by KP
import { TimestampedThoughtBuffer } from '../pmk-integration/optimizers/TimestampedThoughtBuffer.js';
// AdaptiveSchemaGraph and BayesianFocusOptimizer are internal to KerbelizedParserator

console.log("test-pmk-integration.js: Script loaded. Attempting to run full PMK component integration test.");

// Dummy VisualizerController if DOM is not available or full VC is too complex for this test
class DummyVisualizerController {
    constructor() { console.log("DummyVisualizerController instantiated for PMK test."); }
    updateData(data) { console.log("DummyVisualizerController.updateData called with:", data); }
    // Add any other methods PMKDataAdapter might call if not updateData
    updateUBOChannels(data) { console.log("DummyVisualizerController.updateUBOChannels called with:", data); }
    updateDirectParameters(data) { console.log("DummyVisualizerController.updateDirectParameters called with:", data); }
}


async function mainPMKTest() {
    console.log("test-pmk-integration.js: mainPMKTest() started.");

    let vizController;
    if (typeof document !== 'undefined' && document.getElementById('viz-canvas')) {
        // If you have HypercubeCore and a canvas, you can try instantiating the real VC
        // For now, let's assume a simpler setup or use a dummy for broader testability
        // const { HypercubeCore } = await import('../core/HypercubeCore.js');
        // const canvas = document.getElementById('viz-canvas');
        // const core = new HypercubeCore(canvas);
        // vizController = new VisualizerController(core);
        // core.start();
        vizController = new DummyVisualizerController(); // Using dummy for now
         console.log("test-pmk-integration.js: DOM detected, using DummyVisualizerController.");
    } else {
        vizController = new DummyVisualizerController();
        console.log("test-pmk-integration.js: No DOM or canvas, using DummyVisualizerController.");
    }

    const pmkAdapter = new PMKDataAdapter(vizController);

    const parseratorConfig = {
        schemaGraphConfig: { initialSchema: "contact_schema_v1" }, // Example
        focusOptimizerConfig: { strategy: "balanced" }, // Example
        thoughtBufferConfig: { maxSize: 200 } // Example
    };
    const parserator = new KerbelizedParserator(parseratorConfig);

    // PPPProjector and TimestampedThoughtBuffer can be tested separately or integrated if KP uses them externally
    // const thoughtBuffer = parserator.thoughtBuffer; // Accessing KP's internal thought buffer for inspection
    const thoughtBuffer = new TimestampedThoughtBuffer({maxSize: 100}); // Or a separate one for PPPProjector test
    const pppProjector = new PPPProjector({timestampSpreadFactor: 20});


    async function testParseAndAdaptationCycle(testData, context) {
        console.log("\nStarting Test Cycle with data:", testData, "and context:", context);
        console.log("Thought Buffer (parserator's internal) initial state:", parserator.thoughtBuffer.getCurrentState());

        console.log("--- Calling KerbelizedParserator.parseWithContext ---");
        const result = await parserator.parseWithContext(testData, context);
        console.log("KerbelizedParserator.parseWithContext full result:", JSON.stringify(result, null, 2));

        console.log("Thought Buffer (parserator's internal) state after parse:", parserator.thoughtBuffer.getCurrentState());

        // Example of using the separate PPPProjector with its own buffer
        const abstractionsToProject = result.data.extractedItems || [{id: "item1", content: "some abstract data"}]; // Assuming result.data might have this
        console.log("--- Calling PPPProjector.projectToTimestampedBuffer (separate instance) ---");
        const pppFileProjections = pppProjector.projectToTimestampedBuffer(abstractionsToProject, thoughtBuffer);
        console.log("PPPProjector produced projections:", JSON.stringify(pppFileProjections, null, 2));
        console.log("Separate Thought Buffer state after PPPProjector:", thoughtBuffer.getCurrentState());

        console.log("--- Calling PMKDataAdapter.processPMKUpdate ---");
        const snapshotForAdapter = {
            architect: {
                confidence: result.confidence,
                planComplexity: result.metadata.focusParams.temperature,
                activeNodes: result.iterations,
                schemaType: result.metadata.contextUsed.schema,
                schemaVersion: result.schemaVersion
            },
            focus: result.metadata.focusParams,
            pppSnapshot: { // Data specifically from the main parseWithContext's ppp projection
                 relevance: result.metadata.pppProjectionDetails.relevanceScore,
                 detail: result.metadata.pppProjectionDetails.detail,
            },
            // You could also add data from the separate pppProjector test if relevant for visualization
            // pppFileProjections: pppFileProjections,
            rawData: result.data // The main parsed data
        };
        pmkAdapter.processPMKUpdate(snapshotForAdapter);
        console.log("PMKDataAdapter processing complete for this cycle.");
    }

    // --- Test Case 1 ---
    const testData1 = { text: "Process this example sentence for contact info." };
    const context1 = {
        schema: "contact_extraction_v1",
        confidenceThreshold: 0.7,
        currentPerformanceMetrics: { accuracy: 0.9, speed: 100 }
    };
    await testParseAndAdaptationCycle(testData1, context1);

    // --- Test Case 2 ---
    const testData2 = { image_features: [0.1, 0.5, 0.9], source: "visual_sensor_A" };
    const context2 = {
        schema: "image_analysis_v2",
        confidenceThreshold: 0.6,
        currentPerformanceMetrics: { accuracy: 0.85, speed: 50 }
    };
    await testParseAndAdaptationCycle(testData2, context2);

    console.log("\nmainPMKTest() finished successfully.");
}

mainPMKTest().catch(err => {
    console.error("Error during mainPMKTest:", err);
});
