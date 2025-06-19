import { AdaptiveSchemaGraph } from '../schemas/AdaptiveSchemaGraph.js';
import { BayesianFocusOptimizer } from '../optimizers/BayesianFocusOptimizer.js';
import { TimestampedThoughtBuffer } from '../optimizers/TimestampedThoughtBuffer.js';
import { PPPProjector } from './PPPProjector.js'; // Import PPPProjector

const DEFAULT_KP_CONFIG = {
  operationalMode: "standard_parsing",
  defaultParsingDepth: 5,
  enablePPPinjection: true,
  loggingVerbosity: "info", // debug, info, warn, error
  schemaGraphConfig: {},
  focusOptimizerConfig: {},
  thoughtBufferConfig: {},
  pppProjectorConfig: {} // Default config for internal PPPProjector
};

const LOG_LEVELS = { "debug": 1, "info": 2, "warn": 3, "error": 4, "none": 5 };

export class KerbelizedParserator {
  constructor(config = {}) {
    this._initializeConfig(config);
    this._initializeComponents();
    this.lastRunOutcome = null; // For optimizer feedback
    this._log("info", `KerbelizedParserator initialized. Mode: ${this.config.operationalMode}, Logging: ${this.config.loggingVerbosity}`);
  }

  _initializeConfig(newConfig = {}) {
    const mergedConfig = {
        ...DEFAULT_KP_CONFIG,
        ...(this.config || {}),
        ...newConfig,
    };

    mergedConfig.schemaGraphConfig = {
        ...(DEFAULT_KP_CONFIG.schemaGraphConfig),
        ...((this.config || {}).schemaGraphConfig || {}),
        ...(newConfig.schemaGraphConfig || {})
    };
    mergedConfig.focusOptimizerConfig = {
        ...(DEFAULT_KP_CONFIG.focusOptimizerConfig),
        ...((this.config || {}).focusOptimizerConfig || {}),
        ...(newConfig.focusOptimizerConfig || {})
    };
    mergedConfig.thoughtBufferConfig = {
        ...(DEFAULT_KP_CONFIG.thoughtBufferConfig),
        ...((this.config || {}).thoughtBufferConfig || {}),
        ...(newConfig.thoughtBufferConfig || {})
    };
    mergedConfig.pppProjectorConfig = {
        ...(DEFAULT_KP_CONFIG.pppProjectorConfig),
        ...((this.config || {}).pppProjectorConfig || {}),
        ...(newConfig.pppProjectorConfig || {})
    };

    this.config = mergedConfig;
    this.logLevel = LOG_LEVELS[this.config.loggingVerbosity.toLowerCase()] || LOG_LEVELS["info"];
  }

  _initializeComponents() {
    this.schemaGraph = new AdaptiveSchemaGraph(this.config.schemaGraphConfig);
    this.focusOptimizer = new BayesianFocusOptimizer(this.config.focusOptimizerConfig);
    this.thoughtBuffer = new TimestampedThoughtBuffer(this.config.thoughtBufferConfig);
    this.lastRunOutcome = null; // Reset on re-init

    if (this.config.pppProjectorConfig && Object.keys(this.config.pppProjectorConfig).length > 0 &&
        (Object.keys(this.config.pppProjectorConfig).some(k => this.config.pppProjectorConfig[k] !== undefined && this.config.pppProjectorConfig[k] !== DEFAULT_KP_CONFIG.pppProjectorConfig[k]))
    ) {
        this.pppProjector = new PPPProjector(this.config.pppProjectorConfig);
        this._log("debug", "Internal PPPProjector (re)instantiated with config:", this.config.pppProjectorConfig);
    } else {
        this.pppProjector = undefined;
        this._log("debug", "Internal PPPProjector is undefined (no specific config or empty config).");
    }
  }

  async reconfigure(newConfig = {}) {
    this._log("info", "Reconfiguring KerbelizedParserator with new config:", JSON.stringify(newConfig,null,2));
    this._initializeConfig(newConfig);
    this._initializeComponents();
    this._log("info", `KerbelizedParserator reconfigured. New mode: ${this.config.operationalMode}, New logging: ${this.config.loggingVerbosity}`);
    this._log("debug", "Full new config post-reconfigure:", JSON.stringify(this.config,null,2));
    return true;
  }

  _log(level, ...args) {
    if (LOG_LEVELS[level] >= this.logLevel) {
      const processedArgs = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg, null, 2) : arg);
      console.log(`[KP][${level.toUpperCase()}]`, ...processedArgs);
    }
  }

  async parseWithContext(input, context) {
    this._log("info", "parseWithContext called. Input keys:", Object.keys(input || {}), "Context keys:", Object.keys(context || {}));
    this._log("debug", `Operational Mode: ${this.config.operationalMode}, Default Parsing Depth: ${this.config.defaultParsingDepth}`);

    let pppProjection = { relevanceScore: 0, projectedData: context, detail: "no_ppp_fallback" };

    if (this.config.enablePPPinjection) {
      this._log("debug", "PPP Injection enabled.");
      pppProjection = await this.projectToPPP(context);

      const injectionPoints = this.findOptimalInjectionPoints(pppProjection);
      if (injectionPoints && injectionPoints.length > 0) {
        injectionPoints.forEach(point => {
            this.thoughtBuffer.inject(point.timestamp, point.pointData, pppProjection.relevanceScore);
        });
        this._log("info", `Injected ${injectionPoints.length} data point(s) into thought buffer.`);
      } else {
        this._log("debug", "No injection points found or pppProjection was empty.");
      }
      this._log("debug", "Thought buffer state size:", this.thoughtBuffer.getCurrentState ? this.thoughtBuffer.getCurrentState().length : "N/A");
    } else {
      this._log("info", "PPP Injection disabled by configuration.");
    }

    const baseTemp = this.getCurrentTemperature(context);
    const baseWeight = this.getAbstractionWeights(context);

    const focusParamsInput = {
      contextualRelevance: pppProjection.relevanceScore,
      currentPerformance: this.lastRunOutcome ? this.lastRunOutcome.performance : undefined,
      computationalCost: this.lastRunOutcome ? this.lastRunOutcome.cost : undefined,
      temperature: this.lastRunOutcome ? this.lastRunOutcome.temp : baseTemp,
      abstractionWeight: this.lastRunOutcome ? this.lastRunOutcome.weight : baseWeight,
      ...(this.config.focusOptimizerConfig.defaultParams || {})
    };

    this._log("debug", "Calling focusOptimizer.optimize with input:", focusParamsInput);
    const optimizedFocusParams = await this.focusOptimizer.optimize(focusParamsInput);
    this._log("info", "Focus params optimized by BFO:", optimizedFocusParams);

    const result = await this.executeAdaptiveParsing(input, optimizedFocusParams, pppProjection, context);

    this.lastRunOutcome = {
        temp: optimizedFocusParams.temperature,
        weight: optimizedFocusParams.abstractionWeight,
        performance: result.confidence,
        cost: input ? JSON.stringify(input).length : 0,
        contextualRelevance: pppProjection.relevanceScore
    };
    this._log("debug", "Updated lastRunOutcome for next cycle:", this.lastRunOutcome);

    return result;
  }

  async executeAdaptiveParsing(input, currentFocusParams, pppProjection, originalContext) {
    this._log("info", "executeAdaptiveParsing. Input keys:", Object.keys(input || {}), "FocusParams:", currentFocusParams, "OriginalContext:", originalContext);
    const maxIter = (currentFocusParams && currentFocusParams.maxIterations) || this.config.defaultParsingDepth;

    const schemaObjectToUse = await this.schemaGraph.getPreferredSchema(originalContext);
    this._log("debug", `Preferred schema selected by ASG: ID='${schemaObjectToUse ? schemaObjectToUse.id : "N/A"}', Strength=${schemaObjectToUse ? schemaObjectToUse.strength.toFixed(3) : "N/A"}`);

    if (!schemaObjectToUse || !schemaObjectToUse.definition) {
        this._log("error", "No valid schema object could be retrieved for parsing by ASG.");
        return {
            data: input,
            confidence: 0.01,
            iterations: 0,
            schemaVersion: 'error_no_schema',
            metadata: {
                focusParams: currentFocusParams,
                pppProjectionDetails: pppProjection,
                originalInput: input,
                contextUsed: originalContext,
                schemaIdUsed: "N/A"
            }
        };
    }
    const currentSchemaDef = schemaObjectToUse.definition;

    const simulatedParsingOutput = {
        parsedContent: { ...input, schemaUsed: currentSchemaDef.type, tempUsed: currentFocusParams.temperature },
        quality: Math.random(),
        stepsTaken: currentSchemaDef.extractionSteps ? currentSchemaDef.extractionSteps.length : 0
    };
    const finalConfidence = parseFloat((simulatedParsingOutput.quality * (currentFocusParams.temperature || 0.7)).toFixed(4));
    this._log("debug", `Simulated parsing output quality: ${simulatedParsingOutput.quality.toFixed(4)}, temp-adjusted confidence: ${finalConfidence}`);

    const adaptSchemaParseResult = {
        input: input,
        inputContext: originalContext, // Pass the original context here
        parsingOutput: simulatedParsingOutput,
        focusParams: currentFocusParams,
        confidence: finalConfidence
    };
    const adaptedSchemaObject = await this.schemaGraph.adaptSchema(schemaObjectToUse, adaptSchemaParseResult);
    this._log("debug", `Schema after adaptation attempt by ASG: ID='${adaptedSchemaObject ? adaptedSchemaObject.id : "N/A"}', New Strength=${adaptedSchemaObject ? adaptedSchemaObject.strength.toFixed(4) : "N/A"}`);

    return {
      data: simulatedParsingOutput.parsedContent,
      confidence: finalConfidence,
      iterations: maxIter,
      schemaVersion: adaptedSchemaObject.definition.version || '1.0.0',
      metadata: {
        focusParams: currentFocusParams,
        pppProjectionDetails: pppProjection,
        originalInput: input,
        contextUsed: originalContext,
        schemaIdUsed: schemaObjectToUse.id
      }
    };
  }

  async projectToPPP(context) {
    if (this.pppProjector) {
      this._log("debug", "Using internal PPPProjector for projectToPPP.");
      const itemToProject = { type: "full_context", data: context };
      const projectionResult = this.pppProjector.createProbabilisticProjection(itemToProject);
      return {
          relevanceScore: projectionResult.confidence || 0.5,
          projectedData: projectionResult.projectedValue,
          detail: `Projection from internal PPPProjector (type: ${projectionResult.projectionType})`
      };
    } else {
      this._log("debug", "Internal PPPProjector not available/configured, using basic internal projection logic.");
      const projectedData = { originalContext: context, processed: `projected_${context.schema || 'generic'}` };
      return {
          relevanceScore: context.confidenceThreshold || 0.6,
          projectedData: projectedData,
          detail: "basic_internal_ppp_projection"
      };
    }
  }

  findOptimalInjectionPoints(pppProjection) {
    this._log("debug", "findOptimalInjectionPoints for projection:", pppProjection.detail);
    if (!pppProjection || !pppProjection.projectedData) {
        this._log("warn", "Cannot find injection points for empty or invalid pppProjection.");
        return [];
    }
    return [
        { timestamp: Date.now(), pointData: pppProjection.projectedData }
    ];
  }

  getCurrentTemperature(context = {}) {
    let temp = context.targetTemperature;
    if (temp === undefined && this.config.focusOptimizerConfig) {
      temp = this.config.focusOptimizerConfig.defaultTemperature;
      if (temp === undefined && this.config.focusOptimizerConfig.parameterBounds && this.config.focusOptimizerConfig.parameterBounds.temperature) {
        const bounds = this.config.focusOptimizerConfig.parameterBounds.temperature;
        temp = (bounds[0] + bounds[1]) / 2;
      }
    }
    temp = temp !== undefined ? temp : 0.75;
    this._log("debug", `getCurrentTemperature returning: ${temp}`);
    return temp;
  }

  getAbstractionWeights(context = {}) {
    let weight = context.targetAbstractionWeight;
    if (weight === undefined && this.config.focusOptimizerConfig) {
      weight = this.config.focusOptimizerConfig.defaultAbstractionWeight;
      if (weight === undefined && this.config.focusOptimizerConfig.parameterBounds && this.config.focusOptimizerConfig.parameterBounds.abstractionWeight) {
        const bounds = this.config.focusOptimizerConfig.parameterBounds.abstractionWeight;
        weight = (bounds[0] + bounds[1]) / 2;
      }
    }
    weight = weight !== undefined ? weight : 0.55;
    this._log("debug", `getAbstractionWeights returning: ${weight}`);
    return weight;
  }
}
