const DEFAULT_BFO_CONFIG = {
  optimizationGoal: "balance_accuracy_cost", // "maximize_accuracy", "minimize_latency", "balance_accuracy_cost"
  parameterBounds: {
    temperature: [0.2, 0.9],
    abstractionWeight: [0.3, 0.7]
  },
  explorationFactor: 0.1, // Chance to explore randomly (0 to 1)
  maxIterations: 20, // Not directly used in this simplified version of optimize()
  convergenceThreshold: 0.01, // Not directly used here
  defaultTemperature: 0.5,
  defaultAbstractionWeight: 0.5,
  maxHistorySize: 20 // Max entries in history
};

export class BayesianFocusOptimizer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_BFO_CONFIG, ...config };
        // Deep merge for parameterBounds
        this.config.parameterBounds = {
            ...DEFAULT_BFO_CONFIG.parameterBounds,
            ...(config.parameterBounds || {})
        };
        this.history = [];
        this.currentBest = null; // Stores the best {temp, weight, performance, cost} found so far
        console.log("BayesianFocusOptimizer initialized with config:", JSON.stringify(this.config, null, 2));
    }

    async optimize(currentContextParams) {
        console.log("BayesianFocusOptimizer.optimize called with currentContextParams:", JSON.stringify(currentContextParams, null, 2));
        // console.log("Current BFO Config:", JSON.stringify(this.config, null, 2));

        // 1. Record history (outcome of PREVIOUSLY suggested parameters)
        // 'currentContextParams' contains the results of the last operation using a certain set of parameters.
        // We assume 'currentContextParams' might have fields like 'lastRunPerformance', 'lastRunCost',
        // and the 'temperature' & 'abstractionWeight' that were used to get that performance/cost.
        if (currentContextParams.currentPerformance !== undefined && currentContextParams.temperature !== undefined && currentContextParams.abstractionWeight !== undefined) {
            const lastRun = {
                temp: currentContextParams.temperature, // The temp that resulted in currentPerformance
                weight: currentContextParams.abstractionWeight, // The weight that resulted in currentPerformance
                performance: currentContextParams.currentPerformance, // e.g., accuracy
                cost: currentContextParams.computationalCost, // e.g., time or tokens
            };
            this.history.push(lastRun);
            if (this.history.length > (this.config.maxHistorySize || 20)) {
                this.history.shift(); // Keep history bounded
            }

            // Basic 'currentBest' tracking
            let isNewBest = false;
            if (!this.currentBest) {
                isNewBest = true;
            } else {
                if (this.config.optimizationGoal === "maximize_accuracy" && lastRun.performance > this.currentBest.performance) {
                    isNewBest = true;
                } else if (this.config.optimizationGoal === "minimize_latency" && lastRun.cost < this.currentBest.cost) {
                    isNewBest = true;
                } else if (this.config.optimizationGoal === "balance_accuracy_cost") {
                    // Simple balance: higher performance is better, lower cost is better.
                    // This scoring is arbitrary and needs refinement.
                    const scoreLast = (lastRun.performance || 0) - (lastRun.cost || 0) * 0.0001;
                    const scoreBest = (this.currentBest.performance || 0) - (this.currentBest.cost || 0) * 0.0001;
                    if (scoreLast > scoreBest) isNewBest = true;
                }
            }
            if (isNewBest) {
                this.currentBest = { ...lastRun };
                console.log("BayesianFocusOptimizer: New best parameters found:", JSON.stringify(this.currentBest, null, 2));
            }
        }

        // 2. Determine new parameters
        // Start with current context's params or defaults from config
        let suggestedTemp = currentContextParams.temperature !== undefined ? currentContextParams.temperature : this.config.defaultTemperature;
        let suggestedWeight = currentContextParams.abstractionWeight !== undefined ? currentContextParams.abstractionWeight : this.config.defaultAbstractionWeight;
        let decisionSource = "initial_or_passthrough";

        if (Math.random() < this.config.explorationFactor) {
            decisionSource = "exploration";
            console.log("BayesianFocusOptimizer: Exploring new parameters...");
            const tempBounds = this.config.parameterBounds.temperature;
            suggestedTemp = tempBounds[0] + Math.random() * (tempBounds[1] - tempBounds[0]);

            const weightBounds = this.config.parameterBounds.abstractionWeight;
            suggestedWeight = weightBounds[0] + Math.random() * (weightBounds[1] - weightBounds[0]);
        } else {
            decisionSource = "goal_oriented_adjustment";
            const lastPerf = currentContextParams.currentPerformance;
            const lastCost = currentContextParams.computationalCost;

            // Store original suggestions before goal-oriented changes to check if they actually changed
            const originalSuggestedTemp = suggestedTemp;
            const originalSuggestedWeight = suggestedWeight;

            switch (this.config.optimizationGoal) {
                case "maximize_accuracy":
                    if (lastPerf !== undefined && lastPerf < 0.7) suggestedTemp -= 0.05;
                    else if (lastPerf !== undefined && lastPerf > 0.95) suggestedTemp += 0.02;
                    break;
                case "minimize_latency":
                    if (lastCost !== undefined && lastCost > (this.config.costThresholdForLatencyTuning || 1000)) suggestedTemp += 0.05;
                    break;
                case "balance_accuracy_cost":
                    if (lastPerf !== undefined && lastPerf < 0.6) suggestedTemp -= 0.05;
                    else if (lastCost !== undefined && lastCost > (this.config.costThresholdForBalanceTuning || 1200)) suggestedTemp += 0.05;
                    break;
                default:
                    console.log("BayesianFocusOptimizer: Unknown optimization goal or no specific adjustment rule met.");
                    decisionSource = "default_values_due_to_unknown_goal";
                    break;
            }
            if (decisionSource === "goal_oriented_adjustment" && suggestedTemp === originalSuggestedTemp && suggestedWeight === originalSuggestedWeight){
                 decisionSource = "no_change_from_goal_rules";
            }
        }

        // 3. Clamp parameters
        const tempBounds = this.config.parameterBounds.temperature;
        suggestedTemp = Math.max(tempBounds[0], Math.min(suggestedTemp, tempBounds[1]));

        const weightBounds = this.config.parameterBounds.abstractionWeight;
        suggestedWeight = Math.max(weightBounds[0], Math.min(suggestedWeight, weightBounds[1]));

        suggestedTemp = parseFloat(suggestedTemp.toFixed(3));
        suggestedWeight = parseFloat(suggestedWeight.toFixed(3));

        console.log(`BayesianFocusOptimizer: Suggested params: temp=${suggestedTemp}, weight=${suggestedWeight}, source=${decisionSource}`);

        return {
            temperature: suggestedTemp,
            abstractionWeight: suggestedWeight,
            contextWeight: currentContextParams.contextWeight !== undefined ? currentContextParams.contextWeight : 0.8,
            currentPerformance: currentContextParams.currentPerformance,
            contextualRelevance: currentContextParams.contextualRelevance,
            computationalCost: currentContextParams.computationalCost,
            optimized: true,
            goalUsed: this.config.optimizationGoal,
            decisionSource: decisionSource
        };
    }
}
