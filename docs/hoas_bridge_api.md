# HOASBridge API and Responsibilities

`HOASBridge.js` (Higher Order Abstraction System Bridge) serves as the primary interface for a higher-level control system (e.g., a Cloud AI Orchestrator) to manage and interact with one or more `KerbelizedParserator` instances.

## I. Core Responsibilities:

1.  **Lifecycle Management:** Instantiate and manage `KerbelizedParserator` instances (though initial implementation might take a pre-existing instance).
2.  **Configuration Translation:** Translate high-level commands or strategic goals from the orchestrator into specific, detailed configurations for `KerbelizedParserator` and its sub-components using the `KerbelizedParserator Configuration API`.
3.  **Task Delegation:** Delegate parsing tasks to `KerbelizedParserator`.
4.  **State/Metrics Reporting:** Aggregate or relay status, performance metrics, and significant events from `KerbelizedParserator` back to the orchestrator.
5.  **Error Handling and Escalation:** Handle errors from `KerbelizedParserator` or escalate them as needed.

## II. Proposed API Methods for `HOASBridge`:

The `HOASBridge` instance would be initialized, potentially with a reference to a `KerbelizedParserator` instance or configuration to create one.
`new HOASBridge(parseratorInstanceOrConfig)`

### A. Configuration and Control Methods:

1.  **`setParserConfiguration(fullConfig)`**:
    *   **Description:** Applies a complete configuration object to the managed `KerbelizedParserator` instance. This uses the structure defined in `docs/kerbelized_parserator_config_api.md`.
    *   **Parameters:**
        *   `fullConfig` (Object): A complete configuration object for `KerbelizedParserator`.
    *   **Action:** Calls a `reconfigure(fullConfig)` method on `KerbelizedParserator` (if implemented) or re-instantiates it with the new config.
    *   **Returns:** (Promise<Boolean>) Success status.

2.  **`updateParserSubConfiguration(componentName, subConfig)`**:
    *   **Description:** Allows targeted updates to a specific sub-component's configuration (e.g., `schemaGraphConfig`, `focusOptimizerConfig`).
    *   **Parameters:**
        *   `componentName` (String): e.g., "schemaGraph", "focusOptimizer", "thoughtBuffer", "pppProjector", "kerbelizedParserator" (for top-level KP settings).
        *   `subConfig` (Object): The configuration object for that component.
    *   **Action:** Merges `subConfig` with the existing configuration for that component and applies it via `setParserConfiguration`.
    *   **Returns:** (Promise<Boolean>) Success status.

3.  **`setOperationalMode(mode)`**:
    *   **Description:** A shorthand to set the `operationalMode` of `KerbelizedParserator`.
    *   **Parameters:**
        *   `mode` (String): e.g., `"standard_parsing"`, `"exploratory_analysis"`.
    *   **Action:** Updates the `operationalMode` in the `KerbelizedParserator`'s configuration.
    *   **Returns:** (Promise<Boolean>) Success status.

4.  **`tuneFocusParameters(focusParams)`**:
    *   **Description:** Adjusts parameters related to the `BayesianFocusOptimizer`.
    *   **Parameters:**
        *   `focusParams` (Object): e.g., `{ optimizationGoal: "maximize_accuracy", parameterBounds: { temperature: [0.1, 0.5] } }`. This would be a subset of `focusOptimizerConfig`.
    *   **Action:** Updates the `focusOptimizerConfig` part of `KerbelizedParserator`'s configuration.
    *   **Returns:** (Promise<Boolean>) Success status.

### B. Task Execution Methods:

1.  **`processData(input, context)`**:
    *   **Description:** Submits data to `KerbelizedParserator` for parsing.
    *   **Parameters:**
        *   `input` (Object): The input data to be parsed.
        *   `context` (Object): Contextual information for the parsing task.
    *   **Action:** Calls `kerbelizedParserator.parseWithContext(input, context)`.
    *   **Returns:** (Promise<Object>) The result from `parseWithContext`.

### C. State and Metrics Retrieval Methods:

1.  **`getParserStatus()`**:
    *   **Description:** Retrieves the current status and key metrics from `KerbelizedParserator`.
    *   **Action:** Calls a (hypothetical) `getStatus()` method on `KerbelizedParserator` which might return its current config, buffer sizes, error rates, throughput, etc.
    *   **Returns:** (Promise<Object>) Parser status and metrics. (Initially, this can return a mock object).

2.  **`getCurrentSchemaRepresentation(schemaId = null)`**:
    *   **Description:** Retrieves a representation of the current adaptive schema(s).
    *   **Parameters:**
        *   `schemaId` (String, Optional): ID of a specific schema to retrieve. If null, might return overview or root schema.
    *   **Action:** Calls (hypothetical) methods on `KerbelizedParserator` or its `AdaptiveSchemaGraph` to get schema info.
    *   **Returns:** (Promise<Object>) Schema representation. (Initially, mock).

### D. Event Handling (Conceptual):

*   `HOASBridge` might emit events for significant occurrences (e.g., schema adaptation, critical errors, optimization milestones) that the Cloud AI could subscribe to. This is for future consideration and not part of the initial API method set.

This API provides a starting point for controlling `KerbelizedParserator` via `HOASBridge`. The implementation will initially focus on logging the intended actions and configurations.
