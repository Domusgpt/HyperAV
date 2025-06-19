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
});

describeBFO('BayesianFocusOptimizer', () => {
    let optimizer;

    itBFO('should instantiate with default config', () => {
        optimizer = new BayesianFocusOptimizer();
        expectBFO(optimizer.config).toBeDefined();
        expectBFO(optimizer.config.optimizationGoal).toBe('balance_accuracy_cost');
        expectBFO(optimizer.config.parameterBounds.temperature[0]).toBe(0.2);
    });

    itBFO('should instantiate with custom config and merge parameterBounds', () => {
        const customConfig = {
            optimizationGoal: "maximize_accuracy",
            parameterBounds: { temperature: [0.05, 0.5], customBound: [1,2] },
            defaultTemperature: 0.1
        };
        optimizer = new BayesianFocusOptimizer(customConfig);
        expectBFO(optimizer.config.optimizationGoal).toBe('maximize_accuracy');
        expectBFO(optimizer.config.parameterBounds.temperature[0]).toBe(0.05); // Custom
        expectBFO(optimizer.config.parameterBounds.abstractionWeight[0]).toBe(0.3); // Default merged
        expectBFO(optimizer.config.parameterBounds.customBound[0]).toBe(1); // Extra custom
        expectBFO(optimizer.config.defaultTemperature).toBe(0.1);
    });

    itBFO('optimize should use defaultTemperature from config if not provided in params', async () => {
        optimizer = new BayesianFocusOptimizer({ defaultTemperature: 0.25 });
        const result = await optimizer.optimize({ abstractionWeight: 0.5 });
        expectBFO(result.temperature).toBe(0.25);
    });

    itBFO('optimize should log warning if temperature is out of configured bounds (notional)', async () => {
        optimizer = new BayesianFocusOptimizer({ parameterBounds: { temperature: [0.1, 0.5] } });
        let consoleOutput = "";
        const originalWarn = console.warn;
        console.warn = (msg) => { consoleOutput += msg; };
        await optimizer.optimize({ temperature: 0.05 }); // Below lower bound
        assert(consoleOutput.includes("out of bounds"), "Should warn about out-of-bounds temperature");
        console.warn = originalWarn;
    });
});
