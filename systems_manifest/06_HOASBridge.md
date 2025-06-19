# Component Manifest: HOASBridge

## 1. Purpose and Role

`HOASBridge.js` (Higher Order Abstraction System Bridge) acts as the primary interface layer between a high-level control system (conceptually, a Cloud AI Orchestrator) and the local `KerbelizedParserator` instance. Its main purpose is to translate strategic directives or configuration commands from the orchestrator into concrete actions and settings for the parserator.

It simplifies interaction with `KerbelizedParserator` by providing a more abstracted control API and managing the application of configurations.

## 2. Key Responsibilities

As defined in its API document (`docs/hoas_bridge_api.md`), its core responsibilities include:

1.  **Lifecycle Management (Conceptual):** While the current implementation takes a pre-existing `KerbelizedParserator` instance, a future `HOASBridge` might be responsible for instantiating and managing the lifecycle of parserator instances.
2.  **Configuration Translation & Application:**
    *   Receives full or partial configuration updates intended for `KerbelizedParserator`.
    *   Maintains a view of the `currentParserConfig`.
    *   Applies these configurations to the `KerbelizedParserator` instance, preferably using its `reconfigure()` method.
3.  **Task Delegation:** Receives data processing requests and delegates them to `KerbelizedParserator.parseWithContext()`.
4.  **State/Metrics Reporting (Basic):** Provides methods to retrieve the current configuration and basic (currently mock) status or schema information from the parserator.
5.  **Error Handling (Basic):** Includes basic error checks (e.g., for invalid parserator instance) and re-throws errors from `KerbelizedParserator` for higher-level handling.

## 3. Core Logic and Key Methods

### Initialization (`constructor(parseratorInstance)`)
*   Requires a valid instance of `KerbelizedParserator`. Throws an error if not provided.
*   Stores the `parseratorInstance` as `this.parserator`.
*   Creates and stores a deep copy of `parseratorInstance.config` as `this.currentParserConfig`. This represents the bridge's understanding of the parserator's current configuration state and is the target for modifications before being applied.
*   Logs its initialization and the initial configuration it has adopted from the parserator.

### Configuration Management

*   **`async _applyConfiguration(newConfig)` (Internal Method):**
    *   This is the central private method for applying any configuration change to the managed `KerbelizedParserator`.
    *   It first updates `this.currentParserConfig` with a deep copy of `newConfig`.
    *   It then attempts to call `this.parserator.reconfigure(this.currentParserConfig)`.
    *   If `reconfigure()` doesn't exist on the parserator (as a fallback for older versions or different implementations), it logs a warning and directly sets `this.parserator.config`. This direct update is less ideal as it bypasses any specific logic within a `reconfigure` method for handling sub-component updates.
    *   Returns `true` on success (currently always).

*   **`async setParserConfiguration(fullConfig)`:**
    *   Public API method to apply a complete new configuration object to `KerbelizedParserator`.
    *   Validates `fullConfig`.
    *   Delegates to `_applyConfiguration(fullConfig)`.

*   **`async updateParserSubConfiguration(componentName, subConfig)`:**
    *   Public API method for targeted updates to specific parts of the `KerbelizedParserator` configuration (e.g., `schemaGraphConfig`, `focusOptimizerConfig`, or top-level `kerbelizedParserator` settings).
    *   Validates parameters.
    *   Creates a new configuration by deep copying `this.currentParserConfig`.
    *   Merges the `subConfig` into the appropriate section of this new configuration.
        *   Handles `componentName === "kerbelizedParserator"` for top-level settings, being careful not to overwrite entire sub-component config objects if only top-level keys are intended for update.
        *   For other `componentName` values, it merges `subConfig` into `newConfig[componentName]`.
    *   Delegates to `_applyConfiguration(newConfig)`.

*   **`async setOperationalMode(mode)`:**
    *   Shorthand method that calls `this.updateParserSubConfiguration('kerbelizedParserator', { operationalMode: mode })`.

*   **`async tuneFocusParameters(focusParamsConfig)`:**
    *   Shorthand method that calls `this.updateParserSubConfiguration('focusOptimizerConfig', focusParamsConfig)`.

### Task Execution

*   **`async processData(input, context)`:**
    *   Public API method to submit data for parsing.
    *   Checks if `this.parserator` is available.
    *   Calls `this.parserator.parseWithContext(input, context)` and returns its result.
    *   Includes basic error logging and re-throws errors from the parserator.

### State and Metrics Retrieval (Current Implementation - Basic/Mock)

*   **`async getParserStatus()`:**
    *   Returns a promise resolving to an object containing:
        *   `status: "ok"` (or "error" if parserator is missing).
        *   `timestamp: Date.now()`.
        *   `parseratorConfiguration: this.currentParserConfig` (the bridge's view of the active config).
        *   Placeholder `metrics` (e.g., `tasksProcessed`, `averageParseTimeMs`, `thoughtBufferSize`).
    *   This method currently does not call a specific status method on `KerbelizedParserator` but relies on its own `currentParserConfig` and direct access to `parserator.thoughtBuffer` for buffer size.

*   **`async getCurrentSchemaRepresentation(schemaId = null)`:**
    *   Returns a promise resolving to an object containing:
        *   `schemaId` (provided or derived from the parserator's root/preferred schema).
        *   `representation` (currently the result of `this.parserator.schemaGraph.getPreferredSchema()`.
        *   `lastAdapted` (placeholder timestamp).
    *   This provides a basic way to inspect the schema being used.

## 4. Interaction with `KerbelizedParserator`

*   **Instantiation:** `HOASBridge` is given a fully instantiated `KerbelizedParserator` object.
*   **Configuration:**
    *   It reads the initial configuration from `parseratorInstance.config`.
    *   It applies new configurations by calling `parseratorInstance.reconfigure(newConfig)`. The `reconfigure` method in `KerbelizedParserator` is responsible for updating its own state and that of its sub-components.
*   **Task Execution:** It directly calls `parseratorInstance.parseWithContext(input, context)`.
*   **State Retrieval (Current):** Accesses `parseratorInstance.config` (indirectly via `this.currentParserConfig`), `parseratorInstance.thoughtBuffer`, and `parseratorInstance.schemaGraph` to provide status and schema information. Future versions might rely more on dedicated status methods on `KerbelizedParserator`.

`HOASBridge` is the designated point of control for `KerbelizedParserator`, abstracting some of the direct configuration details and providing a cleaner interface for higher-level systems.
