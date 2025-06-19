// controllers/VisualizerController.js

// Default transformations - can be extended
const defaultTransformations = {
    normalize: (value, min = 0, max = 1) => (value - min) / (max - min),
    logScale: (value) => (value > 0 ? Math.log(value) : 0),
    // Add more transformations here as needed
};

export class VisualizerController {
    constructor(hypercubeCoreInstance, config = {}) {
        if (!hypercubeCoreInstance) {
            throw new Error("HypercubeCore instance is required for VisualizerController.");
        }
        this.core = hypercubeCoreInstance;
        this.config = config;
        this.transformations = { ...defaultTransformations, ...(config.customTransformations || {}) };

        // Initialize mappingRules
        this.mappingRules = { ubo: [], direct: {} }; // Default empty structure

        if (config.mappingRules && typeof config.mappingRules === 'object') {
            // Deep copy provided mapping rules
            if (config.mappingRules.ubo && Array.isArray(config.mappingRules.ubo)) {
                this.mappingRules.ubo = JSON.parse(JSON.stringify(config.mappingRules.ubo));
            }
            if (config.mappingRules.direct && typeof config.mappingRules.direct === 'object') {
                this.mappingRules.direct = JSON.parse(JSON.stringify(config.mappingRules.direct));
            }
            console.log("VisualizerController: Initialized with mappingRules provided directly in config.");
        } else if (config.dataChannelDefinition) { // Legacy or alternative way to define initial mappings
            this._generateInitialMappingRules(config.dataChannelDefinition);
            console.log("VisualizerController: Initialized mappingRules from dataChannelDefinition.");
        } else {
            // No specific rules or definition provided, generate default placeholder rules
            this._generateInitialMappingRules({});
            console.log("VisualizerController: Initialized with default (placeholder) mappingRules.");
        }
        console.log("VisualizerController: Initial mapping rules set:", JSON.stringify(this.mappingRules, null, 2));


        if (config.baseParameters) {
            this.core.updateParameters(config.baseParameters);
            console.log("VisualizerController: Base parameters applied.", config.baseParameters);
        }
        console.log("VisualizerController initialized.");
    }

    // Generates basic mapping rules if detailed ones aren't provided
    _generateInitialMappingRules(dataChannelDefinition) {
        // Example: If dataChannelDefinition is an array of objects like
        // [{ snapshotField: 'fieldA', uboChannelIndex: 0, defaultValue: 0.0, transform: 'normalize' }, ...]
        if (Array.isArray(dataChannelDefinition)) {
            this.mappingRules.ubo = dataChannelDefinition.map(def => ({
                snapshotField: def.snapshotField,
                uboChannelIndex: def.uboChannelIndex,
                defaultValue: def.defaultValue !== undefined ? def.defaultValue : 0.0,
                transform: def.transform // Name of the transform function or actual function
            }));
        } else if (typeof dataChannelDefinition === 'object' && dataChannelDefinition !== null) {
            // Handle other formats if necessary, e.g., a count for generic channels
            const count = dataChannelDefinition.count || 0;
            for (let i = 0; i < count; i++) {
                const name = (dataChannelDefinition.names && dataChannelDefinition.names[i]) ? dataChannelDefinition.names[i] : `channel_${i}`;
                this.mappingRules.ubo.push({
                    snapshotField: name, // Expect dataSnapshot to have fields like "channel_0", "channel_1"
                    uboChannelIndex: i,
                    defaultValue: 0.0
                });
            }
        }
        // Could also populate this.mappingRules.direct with some defaults if needed
        console.log("VisualizerController: Generated initial mapping rules:", JSON.stringify(this.mappingRules, null, 2));
    }

    // Helper to get nested values from object based on string path
    _getValueFromPath(obj, path) {
        if (obj === undefined || obj === null) return undefined;
        // Basic path traversal, e.g. "prop.subProp[0].value"
        // For simplicity, this version handles basic dot notation. Add array/complex path later if needed.
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined; // Path does not exist
            }
        }
        return current;
    }


    updateData(dataSnapshot) {
        console.log("VisualizerController.updateData received snapshot:", JSON.stringify(dataSnapshot, null, 2));
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized.");
            return;
        }

        const uboDataArray = new Array(this.core.uboChannelCount || 64).fill(0.0); // Assuming fixed size from core
        const directParamsToUpdate = {};

        // Process UBO mappings
        (this.mappingRules.ubo || []).forEach(rule => {
            let value = this._getValueFromPath(dataSnapshot, rule.snapshotField);
            if (value === undefined) {
                value = rule.defaultValue !== undefined ? rule.defaultValue : 0.0;
            }

            if (rule.transform) {
                const transformFn = typeof rule.transform === 'function' ? rule.transform : this.transformations[rule.transform];
                if (transformFn) {
                    try {
                        value = transformFn(value, rule.transformMin, rule.transformMax); // Pass min/max if defined for normalize
                    } catch (e) {
                        console.error(`Error applying transform ${rule.transform} to ${rule.snapshotField}:`, e);
                    }
                } else {
                    console.warn(`Transform function '${rule.transform}' not found for field '${rule.snapshotField}'.`);
                }
            }

            if (rule.uboChannelIndex !== undefined && rule.uboChannelIndex < uboDataArray.length) {
                uboDataArray[rule.uboChannelIndex] = value;
            } else {
                 console.warn(`Invalid uboChannelIndex ${rule.uboChannelIndex} for field '${rule.snapshotField}'. Max index: ${uboDataArray.length -1}`);
            }
        });

        // Process direct parameter mappings
        for (const snapshotField in (this.mappingRules.direct || {})) {
            const rule = this.mappingRules.direct[snapshotField];
            let value = this._getValueFromPath(dataSnapshot, snapshotField);

            if (value !== undefined) {
                if (rule.transform) {
                    const transformFn = typeof rule.transform === 'function' ? rule.transform : this.transformations[rule.transform];
                    if (transformFn) {
                        try {
                            value = transformFn(value, rule.transformMin, rule.transformMax);
                        } catch (e) {
                            console.error(`Error applying transform ${rule.transform} to direct param ${rule.coreStateName} (from ${snapshotField}):`, e);
                        }
                    } else {
                         console.warn(`Transform function '${rule.transform}' not found for direct param '${rule.coreStateName}'.`);
                    }
                }
                directParamsToUpdate[rule.coreStateName] = value;
            } else if (rule.defaultValue !== undefined) {
                directParamsToUpdate[rule.coreStateName] = rule.defaultValue;
            }
        }

        // Update core UBOs
        if (uboDataArray.length > 0) {
            console.log("VisualizerController: UBO Data Array prepared for core:", uboDataArray.map(v => typeof v === 'number' ? v.toFixed(3) : v));
            this.core.updateUBOChannels(uboDataArray);
        }

        // Update core direct parameters
        if (Object.keys(directParamsToUpdate).length > 0) {
            console.log("VisualizerController: Updating direct core parameters:", directParamsToUpdate);
            this.core.updateParameters(directParamsToUpdate);
        }
        // console.log("VisualizerController: Data update processed.");
    }

    setVisualStyle(styleParams) {
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized.");
            return;
        }
        console.log("VisualizerController.setVisualStyle received styleParams:", JSON.stringify(styleParams, null, 2));
        // Directly pass to core; core should know its own state structure.
        // No complex mapping here, assumes styleParams keys match core.state keys.
        this.core.updateParameters(styleParams);
        console.log("VisualizerController: Visual styles update request sent to core.");
    }

    setPolytope(polytopeName, styleParams = {}) {
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized.");
            return;
        }
        console.log(`VisualizerController: Attempting to change polytope to '${polytopeName}' with params:`, styleParams);
        this.core.setPolytope(polytopeName, styleParams);
        // Core's setPolytope should handle logging success/failure
    }

    setDataMappingRules(newRules) {
        console.log("VisualizerController.setDataMappingRules received newRules:", JSON.stringify(newRules, null, 2));
        if (newRules && newRules.ubo && Array.isArray(newRules.ubo)) {
            this.mappingRules.ubo = JSON.parse(JSON.stringify(newRules.ubo)); // Deep copy
            console.log("VisualizerController: UBO mapping rules updated.");
        }
        if (newRules && newRules.direct && typeof newRules.direct === 'object') {
            this.mappingRules.direct = JSON.parse(JSON.stringify(newRules.direct)); // Deep copy
            console.log("VisualizerController: Direct mapping rules updated.");
        }
        console.log("VisualizerController: Current mapping rules are now:", JSON.stringify(this.mappingRules, null, 2));
    }

    setSpecificUniform(uniformName, value) {
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized.");
            return;
        }
        console.log(`VisualizerController: Setting specific uniform '${uniformName}' to:`, value);
        this.core.setUniform(uniformName, value); // Assuming core has a generic setUniform method
    }

    async getSnapshot(config) {
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized.");
            return null;
        }
        console.log("VisualizerController: Requesting snapshot with config:", config);
        return this.core.getSnapshot(config);
    }

    dispose() {
        if (!this.core) {
            console.error("VisualizerController: HypercubeCore not initialized or already disposed.");
            return;
        }
        console.log("VisualizerController: Disposing core resources.");
        this.core.dispose();
    }
}
