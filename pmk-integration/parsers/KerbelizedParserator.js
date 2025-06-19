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
    this._log("info", `KerbelizedParserator initialized. Mode: ${this.config.operationalMode}, Logging: ${this.config.loggingVerbosity}`);
  }

  _initializeConfig(newConfig = {}) {
    // Helper to set or update config, used by constructor and reconfigure
    const baseConfig = this.config || DEFAULT_KP_CONFIG; // Use current config if exists, else default

    // Start with a fresh default base to ensure all default fields are present
    // then layer existing config (if any, from this.config), then layer newConfig.
    const mergedConfig = {
        ...DEFAULT_KP_CONFIG,
        ...(this.config || {}), // Apply current config over defaults
        ...newConfig,          // Apply new config over current/defaults
    };

    // Deep merge for nested config objects
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
    // Helper to (re)initialize components based on current this.config
    this.schemaGraph = new AdaptiveSchemaGraph(this.config.schemaGraphConfig);
    this.focusOptimizer = new BayesianFocusOptimizer(this.config.focusOptimizerConfig);
    this.thoughtBuffer = new TimestampedThoughtBuffer(this.config.thoughtBufferConfig);

    // Only instantiate PPPProjector if pppProjectorConfig is not empty or has meaningful keys
    // Check if pppProjectorConfig is explicitly provided and has content.
    // An empty object {} might be passed by default merge, so check its keys.
    if (this.config.pppProjectorConfig && Object.keys(this.config.pppProjectorConfig).length > 0 &&
        (Object.keys(this.config.pppProjectorConfig).some(k => this.config.pppProjectorConfig[k] !== undefined && this.config.pppProjectorConfig[k] !== DEFAULT_KP_CONFIG.pppProjectorConfig[k])) // Check if it's more than just empty defaults
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
    this._initializeConfig(newConfig); // Apply new config merged with existing
    this._initializeComponents();      // Re-initialize components with the new config
    this._log("info", `KerbelizedParserator reconfigured. New mode: ${this.config.operationalMode}, New logging: ${this.config.loggingVerbosity}`);
    this._log("debug", "Full new config post-reconfigure:", JSON.stringify(this.config,null,2));
    return true;
  }

  _log(level, ...args) {
    if (LOG_LEVELS[level] >= this.logLevel) {
      // Adding a check for JSON.stringify for objects to avoid "[object Object]"
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

    const focusParamsInput = {
      temperature: this.getCurrentTemperature(context),
      abstractionWeight: this.getAbstractionWeights(context),
      contextualRelevance: pppProjection.relevanceScore,
      currentPerformance: context.currentPerformanceMetrics,
      computationalCost: input ? JSON.stringify(input).length : 0,
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
        focusParams: focusParams,
        // Pass confidence directly for adaptSchema to use
        confidence: simulatedParsingOutput.quality * (focusParams.temperature || 0.7)
    });
    this._log("debug", "Schema after adaptation attempt. New type (if changed):", adaptedSchema ? adaptedSchema.type : "N/A");

    return {
      data: simulatedParsingOutput.parsedContent,
      confidence: simulatedParsingOutput.quality * (focusParams.temperature || 0.7),
      iterations: maxIter,
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
