// tests/unit/KerbelizedParserator.test.js (Updated)
import { KerbelizedParserator } from '../../pmk-integration/parsers/KerbelizedParserator.js';
// For mocking, we might need to import the classes it uses if we want to spy on their methods
// import { AdaptiveSchemaGraph } from '../../pmk-integration/schemas/AdaptiveSchemaGraph.js';
// import { BayesianFocusOptimizer } from '../../pmk-integration/optimizers/BayesianFocusOptimizer.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });

let currentSuiteKP = "";
let beforeEachCallbackKP;
function describeKP(description, suite) {
  currentSuiteKP = description;
  console.log(\`\nSuite: \${description}\`);
  try { suite(); } catch (e) { console.error(\`Error in suite \${description}:\`, e); }
  currentSuiteKP = "";
}
async function itKP(description, testFn) {
  console.log(\`  Test: \${currentSuiteKP} - \${description}\`);
  try {
    beforeEachCallbackKP && beforeEachCallbackKP();
    await testFn();
    console.log(\`    Passed: \${currentSuiteKP} - \${description}\`);
  } catch (e) {
    console.error(\`    Failed: \${currentSuiteKP} - \${description}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : '');
  }
}
function beforeEachKP(cb) { beforeEachCallbackKP = cb; }
const expectKP = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toBeGreaterThan: (expected) => assert(actual > expected, \`Expected \${actual} to be greater than \${expected}\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
    toBeNull: () => assert(actual === null, "Expected to be null"),
    toHaveBeenCalledWithPartial: (partialExpectedArgs, actualArgs) => { // Updated matcher
        if (!actualArgs) {
            assert(false, "Actual arguments to mocked function were not captured or are undefined.");
            return;
        }
        let match = true;
        for (const key in partialExpectedArgs) {
            if (JSON.stringify(actualArgs[key]) !== JSON.stringify(partialExpectedArgs[key])) {
                match = false;
                console.error(\`Mismatch on key '\${key}': Expected \${JSON.stringify(partialExpectedArgs[key])}, Got \${JSON.stringify(actualArgs[key])}\`);
                break;
            }
        }
        assert(match, \`Expected optimize() args \${JSON.stringify(actualArgs)} to contain partial \${JSON.stringify(partialExpectedArgs)}\`);
    }
});

describeKP('KerbelizedParserator - Adaptive Logic Integration', () => {
  let parserator;
  let mockSchemaGraphAdaptSchema;
  let mockOptimizerOptimize;

  const baseConfig = {
      loggingVerbosity: "info", // Use info to reduce noise during tests unless debugging
      schemaGraphConfig: {
          initialSchemaDefinition: {type: "base_test_schema", version:"1"},
          minConfidenceForAdaptation: 0.5,
          adaptationStrategy: "conservative"
      },
      focusOptimizerConfig: {
          defaultTemperature: 0.5,
          defaultAbstractionWeight: 0.5,
          optimizationGoal: "balance_accuracy_cost",
          explorationFactor: 0.0 // Disable exploration for predictable tests initially
      },
      enablePPPinjection: false // Disable PPP for these specific unit tests for simplicity
  };

  beforeEachKP(() => {
    parserator = new KerbelizedParserator(JSON.parse(JSON.stringify(baseConfig)));

    // Spy on sub-component methods
    mockSchemaGraphAdaptSchema = { called: false, args: null, callCount: 0 };
    // Keep a reference to the original method if needed, or mock entirely
    // const originalAdaptSchema = parserator.schemaGraph.adaptSchema;
    parserator.schemaGraph.adaptSchema = async (schemaObj, parseRes) => {
        mockSchemaGraphAdaptSchema.called = true;
        mockSchemaGraphAdaptSchema.callCount++;
        mockSchemaGraphAdaptSchema.args = {schemaObj, parseRes};
        // Return a slightly modified schema object as the real one does
        // Ensure definition is part of the returned object for KP to use
        return {...schemaObj, definition: {...schemaObj.definition}, strength: schemaObj.strength + 0.01 };
    };

    mockOptimizerOptimize = {
        called: false,
        args: null,
        callCount: 0,
        returnValGenerator: (args) => ({
            ...args,
            temperature: args.temperature || baseConfig.focusOptimizerConfig.defaultTemperature,
            abstractionWeight: args.abstractionWeight || baseConfig.focusOptimizerConfig.defaultAbstractionWeight,
            decisionSource: "mocked_default_passthrough",
            optimized: true,
            goalUsed: parserator.config.focusOptimizerConfig.optimizationGoal
        })
    };
    parserator.focusOptimizer.optimize = async (args) => {
        mockOptimizerOptimize.called = true;
        mockOptimizerOptimize.callCount++;
        mockOptimizerOptimize.args = args;
        return mockOptimizerOptimize.returnValGenerator(args);
    };
  });

  itKP('should initialize with lastRunOutcome as null', () => {
    expectKP(parserator.lastRunOutcome).toBeNull();
  });

  itKP('parseWithContext should populate lastRunOutcome after a run', async () => {
    const inputData = { text: "test outcome" };
    const context = { schema: "outcome_schema" };

    const specificTemp = 0.66;
    const specificWeight = 0.44;
    mockOptimizerOptimize.returnValGenerator = (args) => ({
        ...args, temperature: specificTemp, abstractionWeight: specificWeight,
        decisionSource:"test_specific_decision", optimized:true, goalUsed: parserator.config.focusOptimizerConfig.optimizationGoal
    });

    const result = await parserator.parseWithContext(inputData, context);

    expectKP(parserator.lastRunOutcome).toBeDefined();
    assert(parserator.lastRunOutcome !== null, "lastRunOutcome should not be null");
    expectKP(parserator.lastRunOutcome.temp).toBe(specificTemp);
    expectKP(parserator.lastRunOutcome.weight).toBe(specificWeight);
    expectKP(parserator.lastRunOutcome.performance).toBe(result.confidence);
    expectKP(parserator.lastRunOutcome.cost).toBe(JSON.stringify(inputData).length);
  });

  itKP('parseWithContext should pass correct lastRun info to focusOptimizer on subsequent run', async () => {
    const firstRunInput = {text: "first run data"};
    const firstRunContext = {schema: "first_schema"};
    const firstRunTemp = 0.7;
    const firstRunWeight = 0.3;
    mockOptimizerOptimize.returnValGenerator = (args) => ({
        ...args, temperature: firstRunTemp, abstractionWeight: firstRunWeight,
        decisionSource:"first_run_decision", optimized:true, goalUsed: parserator.config.focusOptimizerConfig.optimizationGoal
    });
    const firstResult = await parserator.parseWithContext(firstRunInput, firstRunContext);

    const expectedLastRunForBFO = {
        temperature: firstRunTemp,
        abstractionWeight: firstRunWeight,
        currentPerformance: firstResult.confidence,
        computationalCost: JSON.stringify(firstRunInput).length,
        contextualRelevance: firstResult.metadata.pppProjectionDetails.relevanceScore
    };

    mockOptimizerOptimize.returnValGenerator = (args) => ({ // For second run
        ...args,
        temperature: args.temperature, // This will be the *new* baseline from getCurrentTemperature for the 2nd run
        abstractionWeight: args.abstractionWeight, // This will be the *new* baseline
        decisionSource:"second_run_decision", optimized:true, goalUsed: parserator.config.focusOptimizerConfig.optimizationGoal
    });

    const secondRunInput = {text: "second run data"};
    const secondRunContext = {schema: "second_schema"};
    await parserator.parseWithContext(secondRunInput, secondRunContext);

    assert(mockOptimizerOptimize.callCount === 2, "Optimizer optimize should be called twice");
    expectKP(mockOptimizerOptimize.args).toBeDefined();

    // Check that the *previous run's* data (that generated 'firstResult') was passed to the BFO.
    // The 'temperature' and 'abstractionWeight' in mockOptimizerOptimize.args will be the
    // new baseline for the *second* run, but currentPerformance/Cost will be from the first run.
    expectKP(mockOptimizerOptimize.args.currentPerformance).toBe(expectedLastRunForBFO.currentPerformance);
    expectKP(mockOptimizerOptimize.args.computationalCost).toBe(expectedLastRunForBFO.computationalCost);
    // The BFO's optimize method now expects that the temp/weight passed in are the ones whose perf is being reported.
    expectKP(mockOptimizerOptimize.args.temperature).toBe(expectedLastRunForBFO.temperature);
    expectKP(mockOptimizerOptimize.args.abstractionWeight).toBe(expectedLastRunForBFO.abstractionWeight);

  });

  itKP('parseWithContext should call schemaGraph.adaptSchema with correct confidence and schema object', async () => {
    const inputData = { text: "data for schema adapt test" };
    const context = { schema: "adapt_test" };

    const initialSchemaFromConfig = parserator.config.schemaGraphConfig.initialSchemaDefinition;
    const preferredSchemaObjFromASG = { // This is what ASG's getPreferredSchema would return
        id: initialSchemaFromConfig.type,
        definition: JSON.parse(JSON.stringify(initialSchemaFromConfig)),
        strength: 1.0,
        usageCount: 0,
        lastUsed: Date.now()
    };

    parserator.schemaGraph.getPreferredSchema = async (ctx) => {
        preferredSchemaObjFromASG.usageCount++;
        preferredSchemaObjFromASG.lastUsed = Date.now();
        return JSON.parse(JSON.stringify(preferredSchemaObjFromASG));
    };

    const result = await parserator.parseWithContext(inputData, context);

    assert(mockSchemaGraphAdaptSchema.called, "adaptSchema should have been called");
    expectKP(mockSchemaGraphAdaptSchema.args.schemaObj.id).toBe(preferredSchemaObjFromASG.id);
    expectKP(mockSchemaGraphAdaptSchema.args.parseRes.confidence).toBe(result.confidence);
    expectKP(mockSchemaGraphAdaptSchema.args.parseRes.focusParams.decisionSource).toBe("mocked_default_passthrough");
    expectKP(mockSchemaGraphAdaptSchema.args.parseRes.inputContext).toEqual(context); // Check originalContext is passed
  });

  itKP('reconfigure should reset lastRunOutcome', async () => {
    await parserator.parseWithContext({ text: "initial run" }, { schema: "s" });
    assert(parserator.lastRunOutcome !== null, "lastRunOutcome should be set after a run");

    await parserator.reconfigure({ loggingVerbosity: "debug" });
    expectKP(parserator.lastRunOutcome).toBeNull();
  });
});
