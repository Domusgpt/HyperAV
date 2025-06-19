// controllers/HOASBridge.js
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';

// For KerbelizedParserator's DEFAULT_KP_CONFIG to be accessible for sub-config updates
// This is a bit of a hack; ideally, KP would export its defaults or structure.
// Alternatively, HOASBridge could define its own comprehensive default structure for what it expects.
const DEFAULT_KP_CONFIG_VIEW = { // Renamed to avoid conflict if KP ever exports its own
  operationalMode: "standard_parsing",
  defaultParsingDepth: 5,
  enablePPPinjection: true,
  loggingVerbosity: "info",
  schemaGraphConfig: {},
  focusOptimizerConfig: {},
  thoughtBufferConfig: {},
  pppProjectorConfig: {}
};


export class HOASBridge {
    constructor(parseratorInstance) {
        if (!parseratorInstance || !(parseratorInstance instanceof KerbelizedParserator)) {
            console.error("HOASBridge: Valid KerbelizedParserator instance is required.");
            throw new Error("HOASBridge: Valid KerbelizedParserator instance is required.");
        }
        this.parserator = parseratorInstance;
        // Deep copy initial config to track/manage it via the bridge
        this.currentParserConfig = JSON.parse(JSON.stringify(this.parserator.config));
        console.log("HOASBridge initialized with KerbelizedParserator instance. Initial config:", JSON.stringify(this.currentParserConfig, null, 2));
    }

    async _applyConfiguration(newConfig) {
        // This is the central point for applying config to the parserator
        this.currentParserConfig = JSON.parse(JSON.stringify(newConfig)); // Deep copy
        console.log("HOASBridge: New configuration prepared:", JSON.stringify(this.currentParserConfig, null, 2));

        if (typeof this.parserator.reconfigure === 'function') {
            console.log("HOASBridge: Calling this.parserator.reconfigure()...");
            await this.parserator.reconfigure(this.currentParserConfig); // Assuming reconfigure is async
        } else {
            console.warn("HOASBridge: KerbelizedParserator does not have a reconfigure() method. Configuration changes might require re-instantiation of KerbelizedParserator by the controlling system, or direct update of parserator.config.");
            // For now, we'll update the parserator's config directly if no reconfigure method.
            // This assumes KerbelizedParserator's internal components can pick up changes from its `config` object.
            this.parserator.config = JSON.parse(JSON.stringify(this.currentParserConfig));
            // If sub-components also need reconfiguration, that logic would be more complex here or in KP.
             console.log("HOASBridge: Directly updated this.parserator.config. Sub-components may need individual reconfiguration if they don't dynamically use this shared config object.");
        }
        return true;
    }

    async setParserConfiguration(fullConfig) {
        console.log("HOASBridge.setParserConfiguration called with:", JSON.stringify(fullConfig, null, 2));
        if (!fullConfig || typeof fullConfig !== 'object') {
            console.error("HOASBridge.setParserConfiguration: Invalid fullConfig provided.");
            return false;
        }
        return this._applyConfiguration(fullConfig);
    }

    async updateParserSubConfiguration(componentName, subConfig) {
        console.log(`HOASBridge.updateParserSubConfiguration called for component: ${componentName} with subConfig:`, JSON.stringify(subConfig, null, 2));
        if (!componentName || !subConfig || typeof subConfig !== 'object') {
            console.error("HOASBridge.updateParserSubConfiguration: Invalid parameters.");
            return false;
        }

        const newConfig = JSON.parse(JSON.stringify(this.currentParserConfig));

        if (componentName === "kerbelizedParserator") { // Top-level KP settings
            for (const key in subConfig) {
                // Ensure we don't overwrite nested config objects with this shallow merge
                if (key !== 'schemaGraphConfig' && key !== 'focusOptimizerConfig' && key !== 'thoughtBufferConfig' && key !== 'pppProjectorConfig') {
                    newConfig[key] = subConfig[key];
                } else {
                     console.warn(`HOASBridge: Attempted to update sub-component config object '${key}' via top-level 'kerbelizedParserator' update. This only works for non-object properties. For object properties, target the component directly or use setParserConfiguration.`);
                }
            }
        } else if (newConfig.hasOwnProperty(componentName) && typeof newConfig[componentName] === 'object') {
            newConfig[componentName] = { ...newConfig[componentName], ...subConfig };
        } else if (DEFAULT_KP_CONFIG_VIEW.hasOwnProperty(componentName) && typeof DEFAULT_KP_CONFIG_VIEW[componentName] === 'object') {
            newConfig[componentName] = { ...(DEFAULT_KP_CONFIG_VIEW[componentName] || {} ), ...subConfig };
        }
        else {
            console.error(`HOASBridge.updateParserSubConfiguration: Unknown component name '${componentName}' or not an object in current/default config.`);
            return false;
        }

        return this._applyConfiguration(newConfig);
    }

    async setOperationalMode(mode) {
        console.log(`HOASBridge.setOperationalMode called with mode: ${mode}`);
        return this.updateParserSubConfiguration('kerbelizedParserator', { operationalMode: mode });
    }

    async tuneFocusParameters(focusParamsConfig) {
        console.log("HOASBridge.tuneFocusParameters called with:", focusParamsConfig);
        return this.updateParserSubConfiguration('focusOptimizerConfig', focusParamsConfig);
    }

    async processData(input, context) {
        console.log("HOASBridge.processData called with input:", input, "context:", context);
        if (!this.parserator) {
            console.error("HOASBridge: KerbelizedParserator instance not available.");
            throw new Error("KerbelizedParserator instance not available.");
        }
        try {
            const result = await this.parserator.parseWithContext(input, context);
            console.log("HOASBridge.processData: Received result from parserator.");
            return result;
        } catch (error) {
            console.error("HOASBridge.processData: Error during parsing:", error);
            throw error; // Re-throw for higher-level handling
        }
    }

    async getParserStatus() {
        console.log("HOASBridge.getParserStatus called.");
        if (!this.parserator) {
            return { status: "error", message: "Parserator not available." };
        }
        // In future, call a method on parserator: this.parserator.getStatus()
        return {
            status: "ok",
            timestamp: Date.now(),
            parseratorConfiguration: this.currentParserConfig, // Return the bridge's view of the config
            metrics: {
                tasksProcessed: 0, // Placeholder
                averageParseTimeMs: 0, // Placeholder
                thoughtBufferSize: this.parserator.thoughtBuffer ? this.parserator.thoughtBuffer.buffer.length : 'N/A'
            }
        };
    }

    async getCurrentSchemaRepresentation(schemaId = null) {
        console.log(`HOASBridge.getCurrentSchemaRepresentation called for schemaId: ${schemaId || 'default/root'}`);
        if (!this.parserator || !this.parserator.schemaGraph) {
             return { status: "error", message: "Parserator or SchemaGraph not available." };
        }
        // In future, call: this.parserator.schemaGraph.getSchemaRepresentation(schemaId)
        const schema = await this.parserator.schemaGraph.getRootSchema(); // Example
        return {
            schemaId: schemaId || (schema ? schema.type : 'unknown'),
            representation: schema || {detail: "Mock schema representation"}, // Placeholder
            lastAdapted: Date.now() // Placeholder
        };
    }
}
