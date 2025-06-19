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
    // Deep merge for nested configs might be more robust with a utility
    this.config = {
        ...DEFAULT_KP_CONFIG,
        ...config,
        schemaGraphConfig: { ...DEFAULT_KP_CONFIG.schemaGraphConfig, ...(config.schemaGraphConfig || {}) },
        focusOptimizerConfig: { ...DEFAULT_KP_CONFIG.focusOptimizerConfig, ...(config.focusOptimizerConfig || {}) },
        thoughtBufferConfig: { ...DEFAULT_KP_CONFIG.thoughtBufferConfig, ...(config.thoughtBufferConfig || {}) },
        pppProjectorConfig: { ...DEFAULT_KP_CONFIG.pppProjectorConfig, ...(config.pppProjectorConfig || {}) }
    };

    this.logLevel = LOG_LEVELS[this.config.loggingVerbosity.toLowerCase()] || LOG_LEVELS["info"];

    this.schemaGraph = new AdaptiveSchemaGraph(this.config.schemaGraphConfig);
    this.focusOptimizer = new BayesianFocusOptimizer(this.config.focusOptimizerConfig);
    this.thoughtBuffer = new TimestampedThoughtBuffer(this.config.thoughtBufferConfig);

    if (this.config.pppProjectorConfig && Object.keys(this.config.pppProjectorConfig).length > 0) { // Instantiate if config is not empty
        this.pppProjector = new PPPProjector(this.config.pppProjectorConfig);
        this._log("info", "KerbelizedParserator: Internal PPPProjector instantiated.");
    } else {
        this._log("info", "KerbelizedParserator: Internal PPPProjector not configured or config is empty.");
    }

    this._log("info", `KerbelizedParserator initialized. Mode: ${this.config.operationalMode}, Logging: ${this.config.loggingVerbosity}`);
  }

  _log(level, ...args) {
    if (LOG_LEVELS[level] >= this.logLevel) {
      console.log(`[KP][${level.toUpperCase()}]`, ...args);
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

    const focusParamsInput = {
      temperature: this.getCurrentTemperature(context),
      abstractionWeight: this.getAbstractionWeights(context),
      contextualRelevance: pppProjection.relevanceScore,
      currentPerformance: context.currentPerformanceMetrics, // Might be undefined, optimizer should handle
      computationalCost: input ? JSON.stringify(input).length : 0,
      // Pass optimizer specific config if available from main config
      ...(this.config.focusOptimizerConfig.defaultParams || {})
    };
    this._log("debug", "Optimizing focus with params:", focusParamsInput);
    const focusParams = await this.focusOptimizer.optimize(focusParamsInput);
    this._log("info", "Focus params optimized:", focusParams);

    return this.executeAdaptiveParsing(input, focusParams, pppProjection);
  }

  async projectToPPP(context) {
    if (this.pppProjector) {
      this._log("debug", "Using internal PPPProjector for projectToPPP.");
      // This assumes PPPProjector can project a 'context' object.
      // Let's adapt to its existing `createProbabilisticProjection` for a single item.
      const itemToProject = { type: "full_context", data: context };
      const projectionResult = this.pppProjector.createProbabilisticProjection(itemToProject);
      return {
          relevanceScore: projectionResult.confidence || 0.5, // PPPProjector uses 'confidence'
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
      temp = this.config.focusOptimizerConfig.defaultTemperature; // Check for a direct default
      if (temp === undefined && this.config.focusOptimizerConfig.parameterBounds && this.config.focusOptimizerConfig.parameterBounds.temperature) {
        const bounds = this.config.focusOptimizerConfig.parameterBounds.temperature;
        temp = (bounds[0] + bounds[1]) / 2; // Midpoint of bounds
      }
    }
    temp = temp !== undefined ? temp : 0.75; // Fallback if no config found
    this._log("debug", `getCurrentTemperature returning: ${temp}`);
    return temp;
  }

  getAbstractionWeights(context = {}) {
    let weight = context.targetAbstractionWeight;
    if (weight === undefined && this.config.focusOptimizerConfig) {
      weight = this.config.focusOptimizerConfig.defaultAbstractionWeight; // Check for a direct default
      if (weight === undefined && this.config.focusOptimizerConfig.parameterBounds && this.config.focusOptimizerConfig.parameterBounds.abstractionWeight) {
        const bounds = this.config.focusOptimizerConfig.parameterBounds.abstractionWeight;
        weight = (bounds[0] + bounds[1]) / 2; // Midpoint of bounds
      }
    }
    weight = weight !== undefined ? weight : 0.55; // Fallback if no config found
    this._log("debug", `getAbstractionWeights returning: ${weight}`);
    return weight;
  }

  async executeAdaptiveParsing(input, focusParams, pppProjection) {
    this._log("info", "executeAdaptiveParsing. Input keys:", Object.keys(input || {}), "FocusParam keys:", Object.keys(focusParams || {}));
    const maxIter = (focusParams && focusParams.maxIterations) || this.config.defaultParsingDepth;
    this._log("debug", `Max parsing iterations: ${maxIter}`);

    const currentSchema = await this.schemaGraph.getRootSchema();
    this._log("debug", "Current schema for parsing:", currentSchema ? currentSchema.type : "N/A");

    const simulatedParsingOutput = {
        parsedContent: { ...input },
        quality: Math.random(),
        stepsTaken: currentSchema && currentSchema.extractionSteps ? currentSchema.extractionSteps.length : 0
    };
    this._log("debug", "Simulated parsing output quality:", simulatedParsingOutput.quality);

    const adaptedSchema = await this.schemaGraph.adaptSchema(currentSchema, {
        input: input,
        parsingOutput: simulatedParsingOutput,
        focusParams: focusParams
    });
    this._log("debug", "Schema after adaptation attempt. New type (if changed):", adaptedSchema ? adaptedSchema.type : "N/A");

    return {
      data: simulatedParsingOutput.parsedContent,
      confidence: simulatedParsingOutput.quality * (focusParams.temperature || 0.7),
      iterations: maxIter, // Reporting the "max" iterations for now
      schemaVersion: adaptedSchema.version || (currentSchema ? currentSchema.version : '1.0') || '1.0',
      metadata: {
        focusParams,
        pppProjectionDetails: pppProjection,
        originalInput: input,
        contextUsed: pppProjection.projectedData && pppProjection.projectedData.originalContext ? pppProjection.projectedData.originalContext : pppProjection.projectedData
      }
    };
  }
}
