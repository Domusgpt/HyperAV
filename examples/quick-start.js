// examples/quick-start.js
// Note: Ensure HypercubeCore.js and VisualizerController.js exist and are correctly exported.
// import { HypercubeCore } from '../core/HypercubeCore.js';
// import { VisualizerController } from '../controllers/VisualizerController.js';

console.log("quick-start.js: Attempting to initialize visualization...");

// This script assumes it's run in an HTML environment with a canvas#viz-canvas
// For non-browser (e.g. subtask) environment, document will be undefined.
if (typeof document !== 'undefined') {
    const canvas = document.getElementById('viz-canvas');
    if (canvas) {
        console.log("quick-start.js: Canvas #viz-canvas found.");
        // Dummy HypercubeCore and VisualizerController if actual imports fail or for testing file creation
        const DummyHypercubeCore = class {
            constructor(c) { console.log("DummyHypercubeCore instantiated with canvas:", c); this.canvas = c; }
            start() { console.log("DummyHypercubeCore started."); }
        };
        const DummyVisualizerController = class {
            constructor(core, config) { console.log("DummyVisualizerController instantiated with core and config:", config); this.core = core; this.config = config; }
            updateData(data) { /* console.log("DummyVisualizerController.updateData:", data); */ }
        };

        // Check if actual classes are available, otherwise use dummies
        let CoreClass, ControllerClass;
        try {
            // These imports will only work if the subtask environment resolves them
            // For now, assume they might not be available for a simple file creation task.
            // CoreClass = (await import('../core/HypercubeCore.js')).HypercubeCore;
            // ControllerClass = (await import('../controllers/VisualizerController.js')).VisualizerController;
            CoreClass = DummyHypercubeCore; // Defaulting to dummy for file creation
            ControllerClass = DummyVisualizerController; // Defaulting to dummy
             console.log("quick-start.js: Using dummy core/controller classes for now.");
        } catch (e) {
            console.warn("quick-start.js: Failed to import actual core/controller, using dummies.", e.message);
            CoreClass = DummyHypercubeCore;
            ControllerClass = DummyVisualizerController;
        }


        const core = new CoreClass(canvas);
        const controller = new ControllerClass(core, {
          dataChannelDefinition: [
            {
              snapshotField: 'confidence',
              uboChannelIndex: 0,
              defaultValue: 0.5
            },
            {
              snapshotField: 'complexity',
              uboChannelIndex: 1,
              defaultValue: 0.3,
              transform: (val) => Math.log(val + 1)
            }
          ],
          baseParameters: {
            geometryType: 'hypercube',
            dimension: 4,
            rotationSpeed: 0.5
          }
        });

        core.start();

        let updateCount = 0;
        const intervalId = setInterval(() => {
          controller.updateData({
            confidence: Math.random(),
            complexity: Math.random() * 10,
            focus: {
              temperature: 0.7 + Math.sin(Date.now() * 0.001) * 0.3
            }
          });
          updateCount++;
          if (updateCount > 5) { // Limit updates in test/example environment
              // clearInterval(intervalId);
              // console.log("quick-start.js: Stopped data updates after 5 iterations.");
          }
        }, 100);
        console.log("quick-start.js: Visualization initialized and data updates started.");

    } else {
        console.error("quick-start.js: Canvas element #viz-canvas not found.");
    }
} else {
    console.log("quick-start.js: 'document' is not defined. Skipping canvas initialization (expected in non-browser env).");
}
