# Component Manifest: BayesianFocusOptimizer

## 1. Purpose and Role

`BayesianFocusOptimizer.js` is a sub-component of `KerbelizedParserator`. Its primary function is to dynamically adjust key focus parameters—specifically `temperature` and `abstractionWeight`—used during the parsing process. The goal is to optimize parsing performance based on a configured strategy (e.g., maximizing accuracy, minimizing latency) and the outcomes of previous parsing attempts.

While named "Bayesian," the current implementation uses a simplified, rule-based heuristic approach with elements of history tracking and exploration, rather than a full Bayesian optimization model. It serves as a foundational component for future, more sophisticated optimization techniques.

## 2. Key Data Structures

*   **`this.config` (Object):**
    *   Stores the configuration for the optimizer instance, merged from defaults and user-provided settings. (See Section 4).
*   **`this.history` (Array):**
    *   Stores a list of recent parsing outcomes. Each entry is an object like:
        ```json
        {
          "temp": 0.5, // Temperature used for that run
          "weight": 0.5, // Abstraction weight used
          "performance": 0.85, // e.g., confidence score from parsing
          "cost": 150 // e.g., computational cost, like input length
        }
        ```
    *   The size of this history is limited by `this.config.maxHistorySize`.
*   **`this.currentBest` (Object | null):**
    *   Stores the parameter set (`temp`, `weight`) and outcome (`performance`, `cost`) that has yielded the best results so far, according to the current `this.config.optimizationGoal`.

## 3. Core Logic (`async optimize(currentContextParams)`)

The `optimize` method is the main entry point and is called by `KerbelizedParserator` before each parsing execution.

1.  **Input (`currentContextParams`):**
    *   This object provides context for the optimization. Critically, it should contain information about the outcome of the *previous* parsing cycle if `KerbelizedParserator.lastRunOutcome` was available. This includes:
        *   `temperature`, `abstractionWeight`: The parameters used in that previous cycle.
        *   `currentPerformance`: The performance metric (e.g., confidence) achieved in that previous cycle.
        *   `computationalCost`: The cost associated with that previous cycle.
    *   It also receives the `temperature` and `abstractionWeight` that `KerbelizedParserator` *would have used* for the current cycle as a baseline, and other contextual info like `contextualRelevance`.

2.  **History Tracking:**
    *   If `currentContextParams` contains valid performance data from a previous run (identified by the presence of `currentPerformance`, `temperature`, and `abstractionWeight`), this outcome is added to `this.history`.
    *   The history is kept bounded by `this.config.maxHistorySize`.
    *   `this.currentBest` is updated if the new historical entry represents a better outcome according to `this.config.optimizationGoal`.
        *   For "maximize_accuracy": higher `performance` is better.
        *   For "minimize_latency": lower `cost` is better.
        *   For "balance_accuracy_cost": a simple scoring `(performance - cost * factor)` is used.

3.  **Parameter Suggestion:**
    *   **Initialization:** Starts with the `temperature` and `abstractionWeight` from `currentContextParams` (which might be from the previous cycle or a baseline from `KerbelizedParserator`'s config) or falls back to `this.config.defaultTemperature` / `this.config.defaultAbstractionWeight`.
    *   **Exploration:** With a probability defined by `this.config.explorationFactor` (e.g., 0.1 for 10% chance):
        *   The optimizer chooses new `suggestedTemp` and `suggestedWeight` randomly within the ranges defined by `this.config.parameterBounds`.
        *   The `decisionSource` is marked as `"exploration"`.
    *   **Goal-Oriented Adjustment (if not exploring):**
        *   The `decisionSource` is marked as `"goal_oriented_adjustment"`.
        *   Simple rules are applied based on `this.config.optimizationGoal` and the `lastPerf` / `lastCost` (from `currentContextParams.currentPerformance` and `currentContextParams.computationalCost` which represent the previous cycle's outcome):
            *   `"maximize_accuracy"`: If `lastPerf` is low, slightly decrease `suggestedTemp`. If very high, slightly increase.
            *   `"minimize_latency"`: If `lastCost` is high, slightly increase `suggestedTemp`.
            *   `"balance_accuracy_cost"`: Adjusts `suggestedTemp` based on both `lastPerf` and `lastCost`.
        *   If no specific rule applies or no change is made, `decisionSource` is updated accordingly (e.g., `"no_change_from_goal_rules"`).

4.  **Clamping:**
    *   The `suggestedTemp` and `suggestedWeight` are clamped to ensure they fall within the min/max values specified in `this.config.parameterBounds`.
    *   Values are formatted to a fixed number of decimal places.

5.  **Return Value:**
    *   An object containing the newly suggested `temperature` and `abstractionWeight`.
    *   It also includes passthrough values from `currentContextParams` and metadata like `optimized: true`, `goalUsed` (from config), and `decisionSource`.

## 4. Configuration (`this.config.focusOptimizerConfig`)

Referenced from `docs/kerbelized_parser_config_api.md`, key options include:

*   `optimizationGoal`: String ("maximize_accuracy", "minimize_latency", "balance_accuracy_cost"); dictates the heuristic for parameter adjustments.
*   `parameterBounds`: Object defining `temperature: [min, max]` and `abstractionWeight: [min, max]`. Used for clamping and random exploration range.
*   `explorationFactor`: Number (0-1); probability of choosing random parameters instead of goal-oriented adjustment.
*   `defaultTemperature`, `defaultAbstractionWeight`: Fallback values if no prior parameters are available.
*   `maxHistorySize`: Number; how many past run outcomes to store.
*   (Conceptual config from API doc: `maxIterations`, `convergenceThreshold` - not directly used by current simplified `optimize` logic but are part of its config structure).
*   (Internal config in implementation: `costThresholdForLatencyTuning`, `costThresholdForBalanceTuning`).

## 5. Interaction with `KerbelizedParserator`

*   `KerbelizedParserator` instantiates `BayesianFocusOptimizer` with the `focusOptimizerConfig`.
*   Before each main parsing task, `KerbelizedParserator.parseWithContext` calls `this.focusOptimizer.optimize()`.
*   It passes a `focusParamsInput` object that includes:
    *   The `temperature` and `abstractionWeight` that were used in the *immediately preceding* parse cycle (from `KerbelizedParserator.lastRunOutcome`).
    *   The `performance` (e.g., confidence) and `cost` (e.g., input size) that resulted from *that preceding cycle* (also from `KerbelizedParserator.lastRunOutcome`).
    *   Other contextual information like `contextualRelevance`.
*   `KerbelizedParserator` then uses the `temperature` and `abstractionWeight` returned by `optimize()` for the current parsing execution.
*   The outcome of this current execution (new confidence, cost, and the parameters just used) is then stored by `KerbelizedParserator` in its `this.lastRunOutcome`, ready for the *next* call to `optimize()`, thus completing the feedback loop.

This component is designed to allow `KerbelizedParserator` to adapt its processing style to improve performance against desired goals over time.
