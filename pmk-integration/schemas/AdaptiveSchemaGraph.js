const DEFAULT_ASG_CONFIG = {
  initialSchemaDefinition: { type: 'default_config_schema', extractionSteps: [], complexity: 1, version: '1.0.0' },
  allowDynamicSchemaCreation: true,
  adaptationStrategy: "conservative", // "conservative", "aggressive_learning", "feedback_driven"
  maxSchemaComplexity: 10,
  minConfidenceForAdaptation: 0.6
};

export class AdaptiveSchemaGraph {
    constructor(config = {}) {
        this.config = { ...DEFAULT_ASG_CONFIG, ...config };
        // Ensure nested initialSchemaDefinition is also merged if provided partially
        if (config.initialSchemaDefinition) {
            this.config.initialSchemaDefinition = {
                ...DEFAULT_ASG_CONFIG.initialSchemaDefinition,
                ...config.initialSchemaDefinition
            };
        }

        this.schemas = new Map(); // To store schema objects: { id, definition, strength, ... }
        this.nodes = new Map();
        this.edges = new Map();

        this._initializeSchemas();
        console.log("AdaptiveSchemaGraph initialized. Number of schemas:", this.schemas.size, "Config:", JSON.stringify(this.config, null, 2));
    }

    _createSchemaDefinitionFromConfig() {
        // Helper to get a valid schema definition based on config or fallback
        // Ensure essential fields like 'type' are present
        const definition = {
            type: 'fallback_default_schema',
            complexity: 1,
            extractionSteps: [],
            version: '0.0.1',
            ...JSON.parse(JSON.stringify(this.config.initialSchemaDefinition)) // Deep copy from config
        };
        if (!definition.type) { // Ensure type exists, even if initialSchemaDefinition was flawed
            definition.type = 'generated_type_' + Date.now();
        }
        return definition;
    }

    _initializeSchemas() {
        this.schemas.clear(); // Clear any existing schemas if re-initializing
        const initialDefinition = this._createSchemaDefinitionFromConfig();
        const schemaId = initialDefinition.type; // Use type as ID, ensure it's unique/managed

        const initialSchemaObject = {
            id: schemaId,
            definition: initialDefinition,
            strength: 1.0, // Default initial strength
            lastUsed: Date.now(),
            usageCount: 0
        };
        this.schemas.set(schemaId, initialSchemaObject);
        console.log("AdaptiveSchemaGraph: Initial schema added/reset:", JSON.stringify(initialSchemaObject, null, 2));
    }

    async getPreferredSchema(context = null) {
        if (this.schemas.size === 0) {
            console.warn("AdaptiveSchemaGraph.getPreferredSchema: No schemas available. Re-initializing with default.");
            this._initializeSchemas();
        }

        let preferredSchema = null;
        let maxStrength = -Infinity;

        for (const schemaObject of this.schemas.values()) {
            if (schemaObject.strength > maxStrength) {
                maxStrength = schemaObject.strength;
                preferredSchema = schemaObject;
            }
        }

        if (preferredSchema) {
            preferredSchema.lastUsed = Date.now();
            preferredSchema.usageCount = (preferredSchema.usageCount || 0) + 1;
            // No need to set back into map if preferredSchema is a direct reference from the map
            console.log(`AdaptiveSchemaGraph.getPreferredSchema selected: '${preferredSchema.id}', Strength: ${preferredSchema.strength.toFixed(3)}`);
        } else {
            console.error("AdaptiveSchemaGraph.getPreferredSchema: Critical - No schema found even after attempting re-init. This should not happen.");
            const fallbackDef = this._createSchemaDefinitionFromConfig();
            const fallbackId = fallbackDef.type || 'emergency_fallback_' + Date.now();
            preferredSchema = {id: fallbackId, definition: fallbackDef, strength: 0.01, usageCount:1, lastUsed: Date.now()};
            this.schemas.set(fallbackId, preferredSchema);
        }
        return preferredSchema;
    }

    async getSchemaById(schemaId) {
        return this.schemas.get(schemaId);
    }

    async adaptSchema(usedSchemaObject, parseResult) {
        if (!usedSchemaObject || !usedSchemaObject.id || !this.schemas.has(usedSchemaObject.id)) {
            console.error("AdaptiveSchemaGraph.adaptSchema: Provided schema object is invalid or not found in store.", JSON.stringify(usedSchemaObject, null, 2));
            return usedSchemaObject;
        }

        const schemaToAdapt = this.schemas.get(usedSchemaObject.id);

        console.log(`AdaptiveSchemaGraph.adaptSchema called for schema: '${schemaToAdapt.id}'. Strategy: ${this.config.adaptationStrategy}`);

        const confidence = parseResult.confidence;
        if (confidence === undefined || confidence < this.config.minConfidenceForAdaptation) {
            console.log(`AdaptiveSchemaGraph: Confidence ${confidence !== undefined ? confidence.toFixed(3) : 'undefined'} for schema '${schemaToAdapt.id}' is below threshold ${this.config.minConfidenceForAdaptation}. No strength adaptation.`);
        } else {
            let strengthChange = 0;
            const baseDelta = 0.05; // Smallest unit of significant change

            switch (this.config.adaptationStrategy) {
                case "aggressive_learning":
                    strengthChange = (confidence - 0.5) * (baseDelta * 4); // e.g., factor of 0.2
                    console.log(`Adapting with aggressive_learning strategy. Base change factor: ${baseDelta * 4}`);
                    break;
                case "feedback_driven":
                    if (parseResult.feedback && parseResult.feedback.strengthAdjustment !== undefined) {
                        strengthChange = parseFloat(parseResult.feedback.strengthAdjustment);
                        console.log(`Adapting with feedback_driven strategy. Adjustment from feedback: ${strengthChange}`);
                    } else {
                        strengthChange = (confidence - 0.7) * (baseDelta * 2); // If no direct feedback, moderate adjustment (rewards confidence > 0.7)
                        console.log(`Adapting with feedback_driven (confidence-based). Base change factor: ${baseDelta * 2}`);
                    }
                    break;
                case "conservative":
                default:
                    // Only positive change if above minConfidence, smaller magnitude
                    strengthChange = (confidence - this.config.minConfidenceForAdaptation) * baseDelta;
                    if (confidence < this.config.minConfidenceForAdaptation) { // Should not happen due to outer check, but defensive
                         strengthChange = baseDelta * -0.5; // Small penalty if somehow it's processed here
                    }
                    console.log(`Adapting with conservative strategy. Base change factor: ${baseDelta}`);
                    break;
            }

            schemaToAdapt.strength += strengthChange;
            schemaToAdapt.strength = parseFloat(schemaToAdapt.strength.toFixed(4)); // Keep precision reasonable
            const maxStrength = parseFloat(this.config.maxSchemaComplexity) || 10.0;
            schemaToAdapt.strength = Math.max(0.01, Math.min(schemaToAdapt.strength, maxStrength));

            console.log(`AdaptiveSchemaGraph: Schema '${schemaToAdapt.id}' strength changed by ${strengthChange.toFixed(4)}, new strength: ${schemaToAdapt.strength.toFixed(4)}`);
        }

        const dynamicCreationThreshold = this.config.minConfidenceForAdaptation * 0.5;
        if (this.config.allowDynamicSchemaCreation &&
            confidence !== undefined &&
            confidence < dynamicCreationThreshold) {
            console.log(`AdaptiveSchemaGraph: Dynamic schema creation triggered for schema '${schemaToAdapt.id}' due to very low confidence (${confidence.toFixed(3)} < ${dynamicCreationThreshold.toFixed(3)}). Strategy: ${this.config.adaptationStrategy}.`);
            console.log(`  (Placeholder) Would attempt to:
    1. Analyze input characteristics (if available in parseResult.inputAnalysis).
    2. Potentially clone and mutate schema '${schemaToAdapt.id}' or generate a new one.
    3. New schema complexity would be checked against maxSchemaComplexity: ${this.config.maxSchemaComplexity}.`);
        }

        if (schemaToAdapt.definition.complexity && this.config.maxSchemaComplexity) {
            console.log(`AdaptiveSchemaGraph: Conceptual complexity check for schema '${schemaToAdapt.id}': Current (def.complexity ${schemaToAdapt.definition.complexity}) vs Max allowed (${this.config.maxSchemaComplexity}).`);
        }

        return schemaToAdapt;
    }
}
