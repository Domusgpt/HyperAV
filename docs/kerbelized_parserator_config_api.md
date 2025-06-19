# KerbelizedParserator Configuration API

This document defines the proposed configuration interface for `KerbelizedParserator` and its core sub-components. These configurations are intended to be set by a higher-level system (e.g., HOASBridge acting on behalf of a Cloud AI Orchestrator) to direct the behavior and focus of the local parsing engine.

## I. Top-Level `KerbelizedParserator` Configuration

The `KerbelizedParserator` constructor will accept a main configuration object: `KerbelizedParserator(config)`.

*   `config.operationalMode`: (String) Defines the overall behavior.
    *   Examples: `"standard_parsing"`, `"exploratory_analysis"`, `"high_throughput_extraction"`, `"low_latency_response"`.
    *   Default: `"standard_parsing"`
*   `config.defaultParsingDepth`: (Number) Default maximum depth or number of iterations for parsing tasks.
    *   Default: `5`
*   `config.enablePPPinjection`: (Boolean) Whether to actively use PPP projection and thought buffer injection.
    *   Default: `true`
*   `config.loggingVerbosity`: (String) Controls internal logging.
    *   Examples: `"debug"`, `"info"`, `"warn"`, `"error"`.
    *   Default: `"info"`
*   `config.schemaGraphConfig`: (Object) Configuration object for `AdaptiveSchemaGraph`. See section II.
*   `config.focusOptimizerConfig`: (Object) Configuration object for `BayesianFocusOptimizer`. See section III.
*   `config.thoughtBufferConfig`: (Object) Configuration object for `TimestampedThoughtBuffer`. See section IV.
*   `config.pppProjectorConfig`: (Object) Configuration object for `PPPProjector` (if it becomes a separately instantiated component managed by `KerbelizedParserator`). See section V.

## II. `AdaptiveSchemaGraph` Configuration (`schemaGraphConfig`)

*   `schemaGraphConfig.initialSchemaDefinition`: (Object|String) Pointer or direct definition of a starting schema.
    *   Default: `{ type: 'default', extractionSteps: [], complexity: 1 }` (current default)
*   `schemaGraphConfig.allowDynamicSchemaCreation`: (Boolean) Can new schemas be created on the fly if no existing one matches?
    *   Default: `true`
*   `schemaGraphConfig.adaptationStrategy`: (String) Name of the strategy for schema adaptation.
    *   Examples: `"conservative"`, `"aggressive_learning"`, `"feedback_driven"`.
    *   Default: `"conservative"`
*   `schemaGraphConfig.maxSchemaComplexity`: (Number) A cap on how complex schemas can become.
    *   Default: `10`
*   `schemaGraphConfig.minConfidenceForAdaptation`: (Number) Minimum parsing confidence required before attempting to adapt a schema based on a result.
    *   Default: `0.6`

## III. `BayesianFocusOptimizer` Configuration (`focusOptimizerConfig`)

*   `focusOptimizerConfig.optimizationGoal`: (String) What the optimizer should prioritize.
    *   Examples: `"maximize_accuracy"`, `"minimize_latency"`, `"balance_accuracy_cost"`, `"maximize_extraction_yield"`.
    *   Default: `"balance_accuracy_cost"`
*   `focusOptimizerConfig.parameterBounds`: (Object) Defines ranges for tunable parameters.
    *   Example: `{ "temperature": [0.1, 1.0], "abstractionWeight": [0.2, 0.8] }`
    *   Default: `{ "temperature": [0.2, 0.9], "abstractionWeight": [0.3, 0.7] }`
*   `focusOptimizerConfig.explorationFactor`: (Number) How much the optimizer should explore new parameter spaces vs. exploiting known good parameters (e.g., epsilon in epsilon-greedy for bandits, or similar concept).
    *   Default: `0.1`
*   `focusOptimizerConfig.maxIterations`: (Number) Max iterations for an optimization cycle.
    *   Default: `20` (as used in `examples/test-pmk-integration.js` for KerbelizedParserator which has `maxIterations: 10` in an old comment from the issue)
*   `focusOptimizerConfig.convergenceThreshold`: (Number) Threshold for stopping optimization if improvement is minimal.
    *   Default: `0.01` (as used in `examples/test-pmk-integration.js` for KerbelizedParserator which has `convergenceThreshold: 0.95` in an old comment from the issue)

## IV. `TimestampedThoughtBuffer` Configuration (`thoughtBufferConfig`)

*   `thoughtBufferConfig.maxSize`: (Number) Maximum number of entries in the buffer.
    *   Default: `1000` (already implemented)
*   `thoughtBufferConfig.retentionPolicy`: (String) How items are evicted when `maxSize` is reached.
    *   Examples: `"fifo"`, `"lifo"`, `"weighted_decay_by_focus"`.
    *   Default: `"fifo"` (current behavior is effectively LIFO due to `slice(-maxSize)`) - *Action: Current `cleanup` is actually FIFO-like (keeps newest).*
*   `thoughtBufferConfig.defaultInjectionWeight`: (Number) Default weight for items injected without an explicit weight.
    *   Default: `0.5`

## V. `PPPProjector` Configuration (`pppProjectorConfig`)

*   `pppProjectorConfig.defaultProjectionType`: (String) Default type assigned to projections.
    *   Default: `"generic_event"`
*   `pppProjectorConfig.timestampSpreadFactor`: (Number) Multiplier for spreading timestamps when projecting multiple items.
    *   Default: `10` (milliseconds)
*   `pppProjectorConfig.baseFocusWeight`: (Number) Default base focus weight for projections.
    *   Default: `0.5`
*   `pppProjectorConfig.focusWeightVariability`: (Number) Range of randomness for focus weight (e.g., 0.2 means +/- 0.1).
    *   Default: `0.2`
*   `pppProjectorConfig.projectionSource`: (String) Identifier for the source of projections made by this instance.
    *   Default: `"default_ppp_instance"`

This API provides a comprehensive way to tune the `KerbelizedParserator` from an external system, aligning with the vision of a cloud-orchestrated local AI.
