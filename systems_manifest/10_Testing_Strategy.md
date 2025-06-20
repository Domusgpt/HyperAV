# Systems Manifest: Testing Strategy

This document outlines the testing strategy employed for the Visualization Kernel and Adaptive Parsing Engine project. Given its experimental nature and evolving architecture, the strategy focuses on ensuring component correctness and verifying key interactions and data flows.

## 1. Overview of Testing Levels

The project currently utilizes two primary levels of automated testing:

*   **Unit Tests:** Focused on individual modules/classes to verify their specific logic in isolation.
*   **Integration Tests:** Focused on the interaction and data flow between several key components, simulating parts of the end-to-end processing pipeline.

Manual testing by running examples (like `examples/test-setup.html` with `quick-start.js` or `test-pmk-integration.js`) is also implicitly part of development and verification.

## 2. Unit Tests

*   **Location:** `tests/unit/`
*   **Purpose:** To test the functionality of individual JavaScript classes (e.g., `KerbelizedParserator`, `AdaptiveSchemaGraph`, `BayesianFocusOptimizer`, `VisualizerController`, `PMKDataAdapter`, `HOASBridge`, etc.) in isolation from their dependencies.
*   **Methodology:**
    *   Each component typically has its own `*.test.js` file (e.g., `AdaptiveSchemaGraph.test.js`).
    *   **Mocking:** Dependencies of the class under test are generally mocked to ensure isolated testing. For example, when testing `HOASBridge`, a `MockKerbelizedParserator` is used. When testing `VisualizerController`, a `MockHypercubeCore` is used. This allows testers to control the behavior of dependencies and verify that the unit under test interacts with them correctly (e.g., calls the right methods with the right arguments).
    *   **Custom Test Runner:** The unit tests currently use a very simple, custom "test runner" implemented directly within each test file. This runner provides `describe()`, `it()`, and `beforeEach()` functions, along with a basic `expect()` / `assert()` mechanism for assertions. This was chosen for simplicity and to avoid immediate dependency on external test frameworks like Jest, though the structure is compatible with such frameworks.
    *   **Coverage:** Tests typically cover:
        *   Correct instantiation with default and custom configurations.
        *   Behavior of public API methods with various inputs.
        *   Correct state changes within the component.
        *   Proper interaction with mocked dependencies.
        *   Edge cases and error handling where appropriate.

## 3. Integration Tests

*   **Primary Example:** `examples/test-pmk-integration.js`
*   **Purpose:** To verify that the major components of the PMK and control system can be instantiated, configured, and can process data in a simulated end-to-end flow. This test is crucial for:
    *   Observing the effects of configuration changes (via `HOASBridge`) on `KerbelizedParserator` and its sub-components.
    *   Tracking the adaptive behaviors (schema strength changes, optimizer parameter evolution) over multiple iterations.
    *   Verifying the data pipeline from `KerbelizedParserator` output through `PMKDataAdapter` to the (dummy) `VisualizerController`.
    *   Detecting issues that arise from the interaction of multiple components.
*   **Methodology:**
    *   This script instantiates real versions of `KerbelizedParserator` (and its internal sub-components), `HOASBridge`, and `PMKDataAdapter`.
    *   It uses a `DummyVisualizerController` to mock the visualization endpoint and log data/commands received by it.
    *   It runs iterative processing loops, simulating multiple parsing cycles.
    *   Extensive `console.log` statements are used to trace data flow, component states, configuration changes, and adaptive decisions.
    *   The test includes scenarios like changing `optimizationGoal` or `adaptationStrategy` mid-run to observe system responsiveness.
*   **Execution:** This test is typically run in a browser environment that supports ES Modules, often by loading it via an HTML page like `examples/test-setup.html`.

## 4. Future Testing Considerations

As the project matures, the testing strategy will need to evolve:

*   **Formal Test Framework:** Migrating unit tests to a standard framework like Jest or Mocha would provide more robust assertion libraries, mocking capabilities, test organization, and reporting.
*   **End-to-End (E2E) Tests:** Once the visualization aspects in `HypercubeCore` (especially WebGPU rendering) are more concrete, E2E tests could be developed to:
    *   Load a full application scenario (e.g., in a headless browser using Puppeteer or Playwright).
    *   Send data through the PMK.
    *   Capture visual output (e.g., snapshots via `VisualizerController.getSnapshot()`) and compare against expected results or look for visual anomalies.
*   **Performance Tests:**
    *   Measuring the performance of `KerbelizedParserator.parseWithContext()` for different types of input and configurations.
    *   Profiling rendering performance in `HypercubeCore`.
*   **WebGPU Specific Tests:** Validating shader compilation, buffer management, and rendering pipeline operations in `HypercubeCore`.
*   **Visual Regression Testing:** Automatically comparing snapshots to detect unintended visual changes.

The current testing strategy provides a good foundation for verifying the core logic and interactions of the adaptive parsing engine and its control interface.
