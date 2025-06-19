import { BayesianFocusOptimizer } from '../../pmk-integration/optimizers/BayesianFocusOptimizer.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteBFO = ""; let beforeEachCallbackBFO;
function describeBFO(d, s) { currentSuiteBFO = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteBFO = ""; }
async function itBFO(d, fn) { console.log(\`  Test: \${currentSuiteBFO} - \${d}\`); try { beforeEachCallbackBFO && beforeEachCallbackBFO(); await fn(); console.log(\`    Passed: \${currentSuiteBFO} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuiteBFO} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEachBFO(cb) { beforeEachCallbackBFO = cb; }
const expectBFO = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toBeGreaterThanOrEqual: (expected) => assert(actual >= expected, \`Expected \${actual} to be >= \${expected}\`),
    toBeLessThanOrEqual: (expected) => assert(actual <= expected, \`Expected \${actual} to be <= \${expected}\`),
    toHaveLength: (expected) => assert(actual && actual.length === expected, \`Expected length \${expected}, got \${actual && actual.length}\`)
});

describeBFO('BayesianFocusOptimizer - Adaptive Logic', () => {
    let optimizer;
    const defaultConfig = {
        optimizationGoal: "balance_accuracy_cost",
        parameterBounds: { temperature: [0.1, 0.9], abstractionWeight: [0.1, 0.9] },
        explorationFactor: 0.1,
        defaultTemperature: 0.5,
        defaultAbstractionWeight: 0.5,
        maxHistorySize: 3 // Small history for easier testing
    };

    beforeEachBFO(() => {
        optimizer = new BayesianFocusOptimizer(JSON.parse(JSON.stringify(defaultConfig)));
    });

    itBFO('should record history correctly and limit its size', async () => {
        // BFO expects currentContextParams to contain the temp/weight whose outcome is being reported
        await optimizer.optimize({ temperature: 0.5, abstractionWeight: 0.5, currentPerformance: 0.7, computationalCost: 100 });
        await optimizer.optimize({ temperature: 0.4, abstractionWeight: 0.6, currentPerformance: 0.8, computationalCost: 120 });
        await optimizer.optimize({ temperature: 0.6, abstractionWeight: 0.4, currentPerformance: 0.6, computationalCost: 80 });
        expectBFO(optimizer.history).toHaveLength(3);

        await optimizer.optimize({ temperature: 0.3, abstractionWeight: 0.7, currentPerformance: 0.9, computationalCost: 150 }); // Should push one out
        expectBFO(optimizer.history).toHaveLength(3);
        expectBFO(optimizer.history[0].temp).toBe(0.4); // Oldest (0.5) should be gone
    });

    itBFO('should update currentBest based on "maximize_accuracy"', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, optimizationGoal: "maximize_accuracy" });
        await optimizer.optimize({ temperature: 0.5, abstractionWeight: 0.5, currentPerformance: 0.7 });
        expectBFO(optimizer.currentBest.performance).toBe(0.7);
        await optimizer.optimize({ temperature: 0.4, abstractionWeight: 0.6, currentPerformance: 0.8 });
        expectBFO(optimizer.currentBest.performance).toBe(0.8);
        await optimizer.optimize({ temperature: 0.6, abstractionWeight: 0.4, currentPerformance: 0.75 }); // Not better
        expectBFO(optimizer.currentBest.performance).toBe(0.8);
    });

    itBFO('should update currentBest based on "minimize_latency"', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, optimizationGoal: "minimize_latency" });
        await optimizer.optimize({ temperature: 0.5, abstractionWeight: 0.5, computationalCost: 100, currentPerformance: 0.7 });
        expectBFO(optimizer.currentBest.cost).toBe(100);
        await optimizer.optimize({ temperature: 0.4, abstractionWeight: 0.6, computationalCost: 80, currentPerformance: 0.8 });
        expectBFO(optimizer.currentBest.cost).toBe(80);
        await optimizer.optimize({ temperature: 0.6, abstractionWeight: 0.4, computationalCost: 120, currentPerformance: 0.6 }); // Not better
        expectBFO(optimizer.currentBest.cost).toBe(80);
    });

    itBFO('should explore parameters when explorationFactor is 1.0', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, explorationFactor: 1.0 });
        const contextParams = { temperature: 0.5, abstractionWeight: 0.5, currentPerformance: 0.7, computationalCost: 100 };
        const result = await optimizer.optimize(contextParams);
        expectBFO(result.decisionSource).toBe('exploration');
        // Check if params are different and within bounds
        assert(result.temperature >= defaultConfig.parameterBounds.temperature[0] && result.temperature <= defaultConfig.parameterBounds.temperature[1], "Explored temp out of bounds");
        assert(result.abstractionWeight >= defaultConfig.parameterBounds.abstractionWeight[0] && result.abstractionWeight <= defaultConfig.parameterBounds.abstractionWeight[1], "Explored weight out of bounds");
        assert(result.temperature !== 0.5 || result.abstractionWeight !== 0.5, "Exploration didn't change params");
    });

    itBFO('should not explore when explorationFactor is 0.0 (and goal rule applies)', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, optimizationGoal: "maximize_accuracy", explorationFactor: 0.0 });
        // Low performance should trigger goal_oriented_adjustment
        const result = await optimizer.optimize({ temperature: 0.5, abstractionWeight: 0.5, currentPerformance: 0.3, computationalCost: 500 });
        expectBFO(result.decisionSource).toBe('goal_oriented_adjustment');
    });

    itBFO('should make goal-oriented adjustment for "maximize_accuracy" if low performance', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, optimizationGoal: "maximize_accuracy", explorationFactor: 0.0 });
        const prevTemp = 0.5;
        // Provide previous run's params and its low performance
        const result = await optimizer.optimize({ temperature: prevTemp, abstractionWeight: 0.5, currentPerformance: 0.3, computationalCost: 100 });
        expectBFO(result.decisionSource).toBe('goal_oriented_adjustment');
        expectBFO(result.temperature).toBeLessThanOrEqual(prevTemp - 0.05 + 0.001); // It should decrease temp
    });

    itBFO('should make goal-oriented adjustment for "minimize_latency" if high cost', async () => {
        optimizer = new BayesianFocusOptimizer({ ...defaultConfig, optimizationGoal: "minimize_latency", explorationFactor: 0.0, costThresholdForLatencyTuning: 50 });
        const prevTemp = 0.5;
        // Provide previous run's params and its high cost
        const result = await optimizer.optimize({ temperature: prevTemp, abstractionWeight: 0.5, currentPerformance: 0.8, computationalCost: 100 });
        expectBFO(result.decisionSource).toBe('goal_oriented_adjustment');
        expectBFO(result.temperature).toBeGreaterThanOrEqual(prevTemp + 0.05 - 0.001); // It should increase temp
    });

    itBFO('should clamp parameters to defined bounds', async () => {
        optimizer = new BayesianFocusOptimizer({
            ...defaultConfig,
            parameterBounds: { temperature: [0.2, 0.3], abstractionWeight: [0.4, 0.5] },
            explorationFactor: 0.0 // Ensure deterministic behavior for this test
        });
        // Goal: maximize_accuracy, current perf is very low, current temp is 0.25 (mid-bound)
        // Expected: suggest temp -= 0.05 -> 0.20. Then clamp to 0.2.
        const resultLow = await optimizer.optimize({ optimizationGoal: "maximize_accuracy", temperature: 0.25, abstractionWeight: 0.45, currentPerformance: 0.1 }); // Removed goal from params
        expectBFO(resultLow.temperature).toBe(0.2);

        // Goal: minimize_latency, current cost is very high, current temp is 0.25 (mid-bound)
        // Expected: suggest temp += 0.05 -> 0.30. Then clamp to 0.3.
         optimizer.config.optimizationGoal = "minimize_latency"; // Change goal for this part
        const resultHigh = await optimizer.optimize({ temperature: 0.25, abstractionWeight: 0.45, currentPerformance: 0.8, computationalCost: 2000 });
        expectBFO(resultHigh.temperature).toBe(0.3);
    });
});
