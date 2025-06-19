const DEFAULT_ASG_CONFIG = {
  initialSchemaDefinition: { type: 'default_config_schema', extractionSteps: [], complexity: 1, version: '1.0.0' },
  allowDynamicSchemaCreation: true,
  adaptationStrategy: "conservative", // "conservative", "aggressive_learning", "feedback_driven"
  maxSchemaComplexity: 10,
  minConfidenceForAdaptation: 0.6
};

// --- Schema Generation Strategies ---
// The following strategies are considered when allowDynamicSchemaCreation is true
// and existing schemas perform poorly (e.g., consistently low confidence after adaptation attempts).
// The chosen strategy can be influenced by this.config.adaptationStrategy.
// A method like _generateNewSchemaFromStrategy(baseSchemaObject, inputContext, parseResult) would be called.

// 1. Clone & Simplify:
//    - Trigger: An existing, relatively complex schema consistently yields low confidence
//               despite strength adjustments, or its complexity score is high.
//    - Action: Creates a new schema by copying an existing one ('baseSchemaObject') and
//              removing an extraction step, reducing a conceptual 'complexity' parameter,
//              or simplifying a rule within its definition.
//    - New ID Convention: <original_id>_simplified_v<N> or <original_id>_s<timestamp>
//    - 'conservative' strategy: Might apply simplification only if original complexity > certain threshold,
//                               and make smaller, safer simplifications.
//    - 'aggressive_learning' strategy: May simplify more readily, try multiple types of simplifications,
//                                     or make more drastic changes.
//    - 'feedback_driven' strategy: Simplification choice could be guided by specific error patterns
//                                 or feedback from parseResult (e.g., which part of schema failed).

// 2. Clone & Mutate Parameter:
//    - Trigger: An existing schema's performance is mediocre, has plateaued, or specific feedback suggests
//               a parameter tweak.
//    - Action: Creates a copy of 'baseSchemaObject' and alters a 'tunable' aspect or parameter
//              within its definition. (Conceptual: e.g., if a schema definition had
//              { regex: "pattern_A", sensitivity: "medium" }, mutate to { regex: "pattern_A_v2" }
//              or { sensitivity: "high" }). This implies schema definitions need identifiable tunable parts.
//    - New ID Convention: <original_id>_mutated_param_<paramName>_v<N> or <original_id>_m<timestamp>
//    - 'conservative' strategy: Small, incremental parameter changes.
//    - 'aggressive_learning' strategy: May try larger parameter jumps or explore more diverse parameter sets.
//    - 'feedback_driven' strategy: Mutation directly targets parameters mentioned in parseResult.feedback.

// 3. Generic Template by Input Hint:
//    - Trigger: No existing schema performs well for a given 'inputContext', AND 'inputContext'
//               provides a strong hint (e.g., context.dataType = "email_address",
//               context.expectedPattern = "iso_timestamp", context.sourceSystem = "SystemX").
//    - Action: Generates a new schema from a predefined generic template associated with the hinted
//              data type, pattern, or source. These templates would be part of ASG's knowledge base.
//              The template might be further specialized by 'inputContext'.
//    - New ID Convention: template_<hintType>_<hintValue>_v<N> or templ_<hintValueShort>_<timestamp>
//    - 'conservative' strategy: Applies only if hint is very strong and all other schemas are performing very poorly.
//    - 'aggressive_learning' strategy: More readily attempts template generation based on weaker hints.
//    - 'feedback_driven' strategy: If parseResult.feedback suggests a "type mismatch", this strategy might be prioritized.

export class AdaptiveSchemaGraph {
    constructor(config = {}) {
        this.config = { ...DEFAULT_ASG_CONFIG, ...config };
        if (config.initialSchemaDefinition) {
            this.config.initialSchemaDefinition = {
                ...DEFAULT_ASG_CONFIG.initialSchemaDefinition,
                ...config.initialSchemaDefinition
            };
        }
        this.schemas = new Map();
        this.nodes = new Map();
        this.edges = new Map();
        this._initializeSchemas();
        console.log("AdaptiveSchemaGraph initialized. Number of schemas:", this.schemas.size, "Config:", JSON.stringify(this.config, null, 2));
    }

    _createSchemaDefinitionFromConfig() {
        const definition = {
            type: 'fallback_default_schema',
            complexity: 1,
            extractionSteps: [],
            version: '0.0.1',
            ...JSON.parse(JSON.stringify(this.config.initialSchemaDefinition))
        };
        if (!definition.type) {
            definition.type = 'generated_type_' + Date.now();
        }
        return definition;
    }

    _initializeSchemas() {
        this.schemas.clear();
        const initialDefinition = this._createSchemaDefinitionFromConfig();
        const schemaId = initialDefinition.type;
        const initialSchemaObject = {
            id: schemaId,
            definition: initialDefinition,
            strength: 1.0,
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
            console.log(`AdaptiveSchemaGraph.getPreferredSchema selected: '${preferredSchema.id}', Strength: ${preferredSchema.strength.toFixed(3)}`);
        } else {
            console.error("AdaptiveSchemaGraph.getPreferredSchema: Critical - No schema found. Creating emergency fallback.");
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

    async _generateNewSchemaFromStrategy(baseSchemaObject = null, inputContext = null, parseResult = null) {
        console.log("AdaptiveSchemaGraph: Attempting to generate new schema. Base schema:", baseSchemaObject ? baseSchemaObject.id : "N/A", "Input context hint:", inputContext ? inputContext.dataTypeHint : "N/A");
        let newDefinition = null;
        let strategyUsed = "none";
        const randomFactor = Math.random(); // For probabilistic strategy selection

        // Strategy Decision Logic (simplified for now)
        // Prioritize simplification if complexity is high, or template if hint is good, then mutate.
        if (baseSchemaObject && (baseSchemaObject.definition.complexity || 1) > 1 && randomFactor < 0.33) {
            strategyUsed = "Clone & Simplify";
            const baseDef = JSON.parse(JSON.stringify(baseSchemaObject.definition));
            newDefinition = {
                ...baseDef,
                // type will be set later to ensure uniqueness
                complexity: Math.max(1, (baseDef.complexity || 1) - 1),
                version: `${baseDef.version || '1.0.0'}_s`, // Indicate simplification
                extractionSteps: baseDef.extractionSteps ? baseDef.extractionSteps.slice(0, -1) : [], // Example: remove last step
                parentSchemaId: baseSchemaObject.id // Track lineage
            };
            console.log(`AdaptiveSchemaGraph Strategy: ${strategyUsed}. New complexity: ${newDefinition.complexity}. Original steps: ${baseDef.extractionSteps.length}, New: ${newDefinition.extractionSteps.length}`);

        } else if (inputContext && inputContext.dataTypeHint && randomFactor < 0.66) {
            strategyUsed = `Generic Template by Input Hint: ${inputContext.dataTypeHint}`;
            const hint = inputContext.dataTypeHint.toLowerCase();
            const newVersionSuffix = `_templ_v${this.schemas.size}`;
            if (hint === "email") {
                newDefinition = { type: `email${newVersionSuffix}`, extractionSteps: [{ name: "basic_email_regex", rule: "/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i" }], complexity: 2, version: "1.0.0_email_template" };
            } else if (hint === "date") {
                newDefinition = { type: `date${newVersionSuffix}`, extractionSteps: [{ name: "iso_date_regex", rule: "/\d{4}-\d{2}-\d{2}/" }], complexity: 2, version: "1.0.0_date_template" };
            } else {
                console.log(`AdaptiveSchemaGraph: No specific template for hint: ${hint}`);
                strategyUsed = "none";
            }
            if(newDefinition) console.log(`AdaptiveSchemaGraph Strategy: ${strategyUsed}. Created template for ${hint}.`);

        } else if (baseSchemaObject) {
            strategyUsed = "Clone & Mutate Parameter";
            const baseDef = JSON.parse(JSON.stringify(baseSchemaObject.definition));
            newDefinition = {
                ...baseDef,
                // type will be set later
                mutatedField: `val_${Math.floor(Math.random()*100)}`, // Conceptual mutation
                version: `${baseDef.version || '1.0.0'}_m`, // Indicate mutation
                parentSchemaId: baseSchemaObject.id // Track lineage
            };
            console.log(`AdaptiveSchemaGraph Strategy: ${strategyUsed}. Added/updated 'mutatedField' to ${newDefinition.mutatedField}`);
        }


        if (!newDefinition) {
            console.log("AdaptiveSchemaGraph: No suitable schema generation strategy applied this time.");
            return null;
        }

        // Complexity Check
        if (newDefinition.complexity > (this.config.maxSchemaComplexity || 10)) {
            console.warn(`AdaptiveSchemaGraph: Generated schema (type placeholder) complexity (${newDefinition.complexity}) exceeds max (${this.config.maxSchemaComplexity}). Generation aborted.`);
            return null;
        }

        // Ensure unique ID (type)
        let baseName = newDefinition.type || (baseSchemaObject ? baseSchemaObject.id : 'generated');
        if (strategyUsed === "Clone & Simplify") baseName = `${baseSchemaObject.id}_s`;
        else if (strategyUsed === "Clone & Mutate Parameter") baseName = `${baseSchemaObject.id}_m`;
        else if (strategyUsed.startsWith("Generic Template")) baseName = newDefinition.type; // Already has version suffix

        let finalId = baseName;
        let counter = 0;
        while(this.schemas.has(finalId) && counter < 20) {
            finalId = `${baseName}_${counter++}`;
        }
        if (this.schemas.has(finalId)) { // Still not unique, very unlikely
            console.error("AdaptiveSchemaGraph: Could not generate a unique schema ID after multiple attempts for base:", baseName);
            return null;
        }
        newDefinition.type = finalId;


        console.log(`AdaptiveSchemaGraph: Successfully generated new schema definition using strategy: ${strategyUsed}`, JSON.stringify(newDefinition, null, 2));
        return newDefinition; // Returns only the definition part
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
            const baseDelta = 0.05;
            switch (this.config.adaptationStrategy) {
                case "aggressive_learning":
                    strengthChange = (confidence - 0.5) * (baseDelta * 4);
                    console.log(`Adapting with aggressive_learning strategy. Base change factor: ${baseDelta * 4}`);
                    break;
                case "feedback_driven":
                    if (parseResult.feedback && parseResult.feedback.strengthAdjustment !== undefined) {
                        strengthChange = parseFloat(parseResult.feedback.strengthAdjustment);
                        console.log(`Adapting with feedback_driven strategy. Adjustment from feedback: ${strengthChange}`);
                    } else {
                        strengthChange = (confidence - 0.7) * (baseDelta * 2);
                        console.log(`Adapting with feedback_driven (confidence-based). Base change factor: ${baseDelta * 2}`);
                    }
                    break;
                case "conservative":
                default:
                    strengthChange = (confidence - this.config.minConfidenceForAdaptation) * baseDelta;
                    if (confidence < this.config.minConfidenceForAdaptation) {
                         strengthChange = baseDelta * -0.5;
                    }
                    console.log(`Adapting with conservative strategy. Base change factor: ${baseDelta}`);
                    break;
            }
            schemaToAdapt.strength += strengthChange;
            schemaToAdapt.strength = parseFloat(schemaToAdapt.strength.toFixed(4));
            const maxStrength = parseFloat(this.config.maxSchemaComplexity) || 10.0;
            schemaToAdapt.strength = Math.max(0.01, Math.min(schemaToAdapt.strength, maxStrength));
            console.log(`AdaptiveSchemaGraph: Schema '${schemaToAdapt.id}' strength changed by ${strengthChange.toFixed(4)}, new strength: ${schemaToAdapt.strength.toFixed(4)}`);
        }

        const dynamicCreationThreshold = this.config.minConfidenceForAdaptation * 0.5;
        if (this.config.allowDynamicSchemaCreation &&
            confidence !== undefined &&
            confidence < dynamicCreationThreshold) {
            console.log(`AdaptiveSchemaGraph: Dynamic schema creation triggered for schema '${schemaToAdapt.id}' due to very low confidence (${confidence.toFixed(3)} < ${dynamicCreationThreshold.toFixed(3)}). Strategy: ${this.config.adaptationStrategy}.`);

            // Call the new strategy method
            const newSchemaDefinition = await this._generateNewSchemaFromStrategy(schemaToAdapt, parseResult.inputContext, parseResult); // Assuming parseResult has inputContext
            if (newSchemaDefinition) {
                const newSchemaObject = {
                    id: newSchemaDefinition.type, // ID is now set within _generateNewSchemaFromStrategy
                    definition: newSchemaDefinition,
                    strength: 0.5, // Initial strength for new schemas
                    lastUsed: Date.now(),
                    usageCount: 0,
                    parentSchemaId: schemaToAdapt.id // Optional: track parent
                };
                this.schemas.set(newSchemaObject.id, newSchemaObject);
                console.log(`AdaptiveSchemaGraph: Successfully created and added new schema '${newSchemaObject.id}' with initial strength ${newSchemaObject.strength}. Total schemas: ${this.schemas.size}`);
            }
        }

        if (schemaToAdapt.definition.complexity && this.config.maxSchemaComplexity) {
            console.log(`AdaptiveSchemaGraph: Conceptual complexity check for schema '${schemaToAdapt.id}': Current (def.complexity ${schemaToAdapt.definition.complexity}) vs Max allowed (${this.config.maxSchemaComplexity}).`);
        }
        return schemaToAdapt;
    }
}
