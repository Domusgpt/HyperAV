# Component Manifest: KerbelizedParserator

## 1. Purpose and Role

`KerbelizedParserator` is the core parsing engine of the system. In the context of the envisioned distributed AI architecture, it functions as the **Localized AI/Edge Component**. Its primary role is to perform efficient, adaptive parsing of input data, manage its internal state and sub-components, and be controllable by a higher-level system (like a Cloud AI Orchestrator via `HOASBridge`).

It aims to evolve beyond a simple parser into an intelligent agent capable of:
*   Adapting its parsing strategies (schemas).
*   Optimizing its focus parameters (e.g., temperature, abstraction weights).
*   Utilizing advanced techniques like Probabilistic Projection Parsing (PPP) and a `TimestampedThoughtBuffer` for contextual understanding and ambiguity resolution.

## 2. Key Responsibilities

*   **Orchestrating the Parsing Process:** Manages the overall flow of parsing input data based on a given context.
*   **Managing Sub-components:** Initializes and interacts with:
    *   `AdaptiveSchemaGraph`: For selecting and adapting parsing schemas.
    *   `BayesianFocusOptimizer`: For tuning focus parameters.
    *   `TimestampedThoughtBuffer`: For storing and retrieving contextual information (via PPP injection).
    *   `PPPProjector` (internal instance): For creating context projections.
*   **Configuration Management:** Accepts a detailed configuration object at instantiation and can be dynamically reconfigured at runtime.
*   **Feedback Loop Implementation:** Provides outcome data (performance, cost) from parsing runs back to the `BayesianFocusOptimizer` to enable learning and improvement.
*   **Logging:** Provides configurable logging for insights into its operations.

## 3. Core Logic Flow (`parseWithContext`)

The main entry point for parsing is the `async parseWithContext(input, context)` method. Its typical flow involves:

1.  **Logging:** Initial logging of input and context.
2.  **PPP Injection (Conditional):**
    *   If `config.enablePPPinjection` is true:
        *   Calls `projectToPPP(context)` to generate a projection of the current context. (This may use an internal `PPPProjector` instance).
        *   Calls `findOptimalInjectionPoints(pppProjection)` to determine where/how to inject this into the `TimestampedThoughtBuffer`.
        *   Injects the projection into `this.thoughtBuffer`.
    *   If disabled, this stage is skipped.
3.  **Focus Optimization:**
    *   Determines baseline temperature and abstraction weights using `getCurrentTemperature(context)` and `getAbstractionWeights(context)`.
    *   Prepares `focusParamsInput` for the `BayesianFocusOptimizer`. This input includes:
        *   The baseline temperature and abstraction weight (or the temp/weight from the previous cycle if `lastRunOutcome` exists, as BFO expects to evaluate the outcome of those specific parameters).
        *   Contextual relevance score from the PPP projection.
        *   Crucially, outcome data from the *previous parsing cycle* stored in `this.lastRunOutcome` (which includes the temperature, weight, performance/confidence, and cost of that previous run). This enables the optimizer to learn.
    *   Calls `this.focusOptimizer.optimize(focusParamsInput)` to get `optimizedFocusParams`. These include the suggested `temperature` and `abstractionWeight` for the current parse.
4.  **Adaptive Parsing Execution:**
    *   Calls `executeAdaptiveParsing(input, optimizedFocusParams, pppProjection, context)`.
        *   Selects a schema using `this.schemaGraph.getPreferredSchema(context)`.
        *   (Currently) Simulates parsing output, generating a `quality` score (randomly for now).
        *   Calculates a `finalConfidence` based on this quality and the `optimizedFocusParams.temperature`.
        *   Calls `this.schemaGraph.adaptSchema(schemaObjectToUse, adaptSchemaParseResult)` to adapt the strength of the used schema and potentially trigger new schema generation. `adaptSchemaParseResult` includes the `finalConfidence` and the `originalContext` (as `inputContext`).
        *   Returns a result object containing the parsed data (simulated), confidence, iterations, schema version used, and metadata (including the `optimizedFocusParams` and `pppProjectionDetails`).
5.  **Updating Feedback Loop State:**
    *   Updates `this.lastRunOutcome` with the `optimizedFocusParams` that were actually used for the current run, the `result.confidence` (as performance), an estimated `cost` (e.g., input size), and `pppProjection.relevanceScore`. This prepares for the next call to the optimizer.

## 4. Interaction with Sub-components

*   **`AdaptiveSchemaGraph` (`this.schemaGraph`):**
    *   Initialized with `this.config.schemaGraphConfig`.
    *   `getPreferredSchema()` is called to select the best schema for the current context.
    *   `adaptSchema()` is called after parsing to update the chosen schema's strength and potentially generate new schemas if performance was poor. `KerbelizedParserator` passes the `originalContext` (as `inputContext`) to `adaptSchema` to aid template-based generation.
*   **`BayesianFocusOptimizer` (`this.focusOptimizer`):**
    *   Initialized with `this.config.focusOptimizerConfig`.
    *   `optimize()` is called before parsing execution to get suggested `temperature` and `abstractionWeight`.
    *   `KerbelizedParserator` feeds back the outcome of the previous run (`this.lastRunOutcome`) to this method.
*   **`TimestampedThoughtBuffer` (`this.thoughtBuffer`):**
    *   Initialized with `this.config.thoughtBufferConfig`.
    *   Used if `enablePPPinjection` is true. Projections from `projectToPPP` are injected into it.
*   **`PPPProjector` (`this.pppProjector`):**
    *   Conditionally initialized with `this.config.pppProjectorConfig` (if the config is provided and not empty).
    *   If instantiated, `projectToPPP` uses it to create context projections. Otherwise, `projectToPPP` uses basic internal logic.

## 5. Configuration

`KerbelizedParserator` is configured via an object passed to its constructor. See [`docs/kerbelized_parser_config_api.md`](../docs/kerbelized_parser_config_api.md) for full details. Key top-level configurations include:

*   `operationalMode`: Influences overall behavior (currently logged).
*   `defaultParsingDepth`: Max iterations for parsing (used in `executeAdaptiveParsing` result).
*   `enablePPPinjection`: Toggles the PPP context projection and thought buffer injection.
*   `loggingVerbosity`: Controls the level of console logging (`debug`, `info`, `warn`, `error`, `none`).
*   `schemaGraphConfig`, `focusOptimizerConfig`, `thoughtBufferConfig`, `pppProjectorConfig`: Objects passed to instantiate the respective sub-components.

## 6. Key Public Methods

*   **`constructor(config = {})`**: Initializes the instance and its sub-components.
*   **`async reconfigure(newConfig = {})`**: Allows dynamic reconfiguration of the parserator and its sub-components at runtime. It merges the `newConfig` with the existing configuration and re-initializes components. This is typically called by `HOASBridge`.
*   **`async parseWithContext(input, context)`**: The primary method to perform a parsing operation.

## 7. Internal Helper Methods

*   **`_initializeConfig(newConfig)`**: Merges provided configuration with defaults and existing config.
*   **`_initializeComponents()`**: Initializes/re-initializes all sub-components based on the current `this.config`.
*   **`_log(level, ...args)`**: Internal logging utility respecting `loggingVerbosity`.
*   **`async projectToPPP(context)`**: Creates context projection (delegates to `this.pppProjector` if available).
*   **`findOptimalInjectionPoints(pppProjection)`**: Determines where/how to inject PPP data (placeholder).
*   **`getCurrentTemperature(context)` / `getAbstractionWeights(context)`**: Provide baseline values for focus optimization, potentially using `context` or `this.config.focusOptimizerConfig`.
*   **`async executeAdaptiveParsing(input, focusParams, pppProjection, originalContext)`**: Performs the core (simulated) parsing, schema selection, and triggers schema adaptation.

This component is central to the adaptive parsing capabilities of the system.
