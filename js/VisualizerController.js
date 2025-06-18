// js/VisualizerController.js

// Assume TransformFunctions is available globally or imported
// e.g., import TransformFunctions from './TransformFunctions.js';
// For browser environment, it might be window.TransformFunctions if loaded via a <script> tag.

export class VisualizerController {
    /**
     * Creates an instance of VisualizerController.
     * @param {HypercubeCore} hypercubeCoreInstance - An instance of the HypercubeCore.
     * @param {object} [config={}] - Configuration object for the controller.
     * @param {object} [config.baseParameters] - An object containing initial parameters to set on the HypercubeCore.
     *                                           These are applied directly to `core.updateParameters()`.
     * @param {object} [config.dataChannelDefinition] - Defines how incoming data snapshots map to UBO channels or direct core parameters.
     *                                                  The actual transformation functions are provided by `TransformFunctions.js`.
     * @param {Array<object>} [config.dataChannelDefinition.uboChannels] - Array of rules for UBO channel mapping. Each rule object has:
     *   @param {string} snapshotField - The key in the data snapshot object.
     *   @param {number} uboChannelIndex - The target UBO channel index (0-63).
     *   @param {*} defaultValue - The default value if `snapshotField` is missing or transform fails.
     *   @param {string|object} [transform] - Optional transformation to apply to the snapshot value.
     *     - If string: Name of a function in `TransformFunctions` (e.g., `'clamp'`).
     *                  Parameters for these simple transforms (like `min`, `max` for `clamp`) should be part of the rule object itself.
     *     - If object: Defines the transform function and its parameters, e.g.:
     *       `{ name: 'linearScale', domain: [0, 100], range: [0, 1] }`
     *       `{ name: 'logScale', domain: [1, 1000], range: [0, 1] }` (domain/range values must be > 0)
     *       `{ name: 'clamp', min: 0, max: 1 }`
     *       `{ name: 'threshold', thresholdValue: 0.5, belowValue: 0, aboveValue: 1 }`
     *       `{ name: 'stringToEnum', map: {"OK":0, "WARN":1, "ERROR":2}, defaultOutput: -1 }`
     *       `{ name: 'colorStringToVec', defaultOutput: [0,0,0,1] }` (outputs [r,g,b,a] array)
     * @param {Array<object>} [config.dataChannelDefinition.directParams] - Array of rules for direct core parameter mapping. Each rule object has:
     *   @param {string} snapshotField - The key in the data snapshot object.
     *   @param {string} coreStateName - The name of the parameter in `HypercubeCore.state`.
     *   @param {*} defaultValue - The default value.
     *   @param {string|object} [transform] - Optional transformation (see UBO transform explanation).
     */
    constructor(hypercubeCoreInstance, config = {}) {
        if (!hypercubeCoreInstance) {
            throw new Error("VisualizerController requires a HypercubeCore instance.");
        }
        this.core = hypercubeCoreInstance;
        // Process baseParameters first if they exist
        if (config.baseParameters && typeof config.baseParameters === 'object') {
            this.core.updateParameters(config.baseParameters);
            console.log("VisualizerController: Applied baseParameters.", config.baseParameters);
        }
        this.dataChannelDefinition = config.dataChannelDefinition || {};
        this.mappingRules = {
            ubo: [], // Array of objects: { snapshotField: string, uboChannelIndex: int, defaultValue: float, transform?: object | string }
            direct: {} // Object: snapshotField: { coreStateName: string, defaultValue: any, transform?: object | string }
        };
        this._generateInitialMappingRules(this.dataChannelDefinition); // This will populate the new structure
        console.log("VisualizerController initialized with config:", config);
        console.log("Initial mapping rules:", JSON.parse(JSON.stringify(this.mappingRules))); // Deep copy for logging
    }

    _generateInitialMappingRules(definition) { // eslint-disable-line no-unused-vars
        // Clear existing rules before applying new definition or defaults
        this.mappingRules.ubo = [];
        this.mappingRules.direct = {};

        if (definition && definition.uboChannels && Array.isArray(definition.uboChannels)) {
            definition.uboChannels.forEach(ruleDef => {
                const rule = { ...ruleDef };
                if (rule.snapshotField && typeof rule.uboChannelIndex === 'number' && rule.hasOwnProperty('defaultValue')) {
                    const validatedTransform = this._validateAndPrepareTransform(rule.transform, `UBO rule for ${rule.snapshotField}`);
                    if (validatedTransform) {
                        rule.transform = validatedTransform;
                    } else if (rule.transform) {
                        console.warn(`VisualizerController: Invalid transform for UBO rule '${rule.snapshotField}'. It will be ignored.`);
                        delete rule.transform; // Remove invalid transform
                    }
                    this.mappingRules.ubo.push(rule);
                } else {
                    console.warn("VisualizerController: Invalid UBO channel rule in definition:", ruleDef);
                }
            });
        } else {
            // Setup default UBO mappings if no definition provided for uboChannels
            for (let i = 0; i < 8; i++) { // Default for first 8 channels
                this.mappingRules.ubo.push({
                    snapshotField: `channel${i}`,
                    uboChannelIndex: i,
                    defaultValue: 0.0
                });
            }
            console.log("VisualizerController: Using default placeholder UBO mapping rules.");
        }

        if (definition && definition.directParams && Array.isArray(definition.directParams)) {
            definition.directParams.forEach(ruleDef => {
                const rule = { ...ruleDef };
                if (rule.snapshotField && rule.coreStateName && rule.hasOwnProperty('defaultValue')) {
                    const validatedTransform = this._validateAndPrepareTransform(rule.transform, `Direct param rule for ${rule.snapshotField}`);
                    if (validatedTransform) {
                        rule.transform = validatedTransform;
                    } else if (rule.transform) {
                        console.warn(`VisualizerController: Invalid transform for direct param rule '${rule.snapshotField}'. It will be ignored.`);
                        delete rule.transform; // Remove invalid transform
                    }
                    this.mappingRules.direct[rule.snapshotField] = rule;
                } else {
                    console.warn("VisualizerController: Invalid direct parameter rule in definition:", ruleDef);
                }
            });
        } else {
            // Setup default direct mappings if no definition provided for directParams
            this.mappingRules.direct['polytope_rotationSpeed'] = { coreStateName: 'rotationSpeed', defaultValue: 0.5 };
            this.mappingRules.direct['main_morphFactor'] = { coreStateName: 'morphFactor', defaultValue: 0.5 };
            this.mappingRules.direct['visual_glitchIntensity'] = { coreStateName: 'glitchIntensity', defaultValue: 0.0 };
            console.log("VisualizerController: Using default placeholder direct mapping rules.");
        }
        // No return needed as it modifies this.mappingRules directly
    }

    /**
     * Validates and prepares a transform configuration.
     * @param {string|object} transformConfig - The transform configuration from the rule (a string name or a config object).
     * @param {string} ruleContext - A string describing the rule being processed (e.g., "UBO rule for myField"), used for logging.
     * @returns {object|null} A prepared transform object like `{ name: string, func: function, params: Array }` or `null` if invalid.
     *                        The `params` array contains arguments that will be passed to the transform function after the main value.
     * @private
     */
    _validateAndPrepareTransform(transformConfig, ruleContext) {
        if (!transformConfig) {
            return null;
        }

        const TF = window.TransformFunctions || (typeof TransformFunctions !== 'undefined' ? TransformFunctions : null);
        if (!TF) {
            console.error(`VisualizerController: TransformFunctions utility is not available. Cannot process transforms for ${ruleContext}.`);
            return null;
        }

        if (typeof transformConfig === 'string') {
            // Simple transform: string is the function name
            if (typeof TF[transformConfig] === 'function') {
                // For simple string transforms, parameters might be expected directly on the rule
                // e.g., rule.min, rule.max for 'clamp'. This will be handled at execution time.
                return { name: transformConfig, func: TF[transformConfig], params: [] }; // Params might be extracted from rule later
            } else {
                console.warn(`VisualizerController: Unknown transform function name '${transformConfig}' in ${ruleContext}.`);
                return null;
            }
        } else if (typeof transformConfig === 'object') {
            if (typeof TF[transformConfig.name] === 'function') {
                let params = [];
                // Order of parameters matters for TransformFunctions
                // This is a naive direct mapping; a more robust solution might involve named parameters
                // or specific parameter extraction logic for each function.
                switch (transformConfig.name) {
                    case 'linearScale':
                    case 'logScale':
                        params = [transformConfig.domain, transformConfig.range];
                        break;
                    case 'clamp':
                        params = [transformConfig.min, transformConfig.max];
                        break;
                    case 'threshold':
                        params = [transformConfig.thresholdValue, transformConfig.belowValue, transformConfig.aboveValue];
                        break;
                    case 'stringToEnum':
                        // 'map' from rule becomes 'enumMap' for the function
                        params = [transformConfig.map, transformConfig.defaultOutput !== undefined ? transformConfig.defaultOutput : transformConfig.defaultValue];
                        break;
                    case 'colorStringToVec':
                         // 'defaultOutput' from rule becomes 'defaultValue' for the function.
                         // If not specified, use rule's main defaultValue.
                        params = [transformConfig.defaultOutput !== undefined ? transformConfig.defaultOutput : transformConfig.defaultValue];
                        break;
                    default:
                        // For functions without specific params defined here, or that take variable args
                        if (Array.isArray(transformConfig.params)) {
                            params = transformConfig.params;
                        } else {
                             console.warn(`VisualizerController: Transform '${transformConfig.name}' in ${ruleContext} is an object, but 'params' are not defined or not an array. Assuming no parameters other than value.`);
                        }
                        break;
                }

                // Validate essential parameters for specific functions
                if ((transformConfig.name === 'linearScale' || transformConfig.name === 'logScale') && (!Array.isArray(params[0]) || !Array.isArray(params[1]) || params[0].length !== 2 || params[1].length !== 2)) {
                    console.warn(`VisualizerController: Invalid 'domain' or 'range' for ${transformConfig.name} in ${ruleContext}. Expected [min,max] arrays.`, transformConfig);
                    return null;
                }
                if (transformConfig.name === 'clamp' && (typeof params[0] !== 'number' || typeof params[1] !== 'number')) {
                    console.warn(`VisualizerController: Invalid 'min' or 'max' for clamp in ${ruleContext}. Expected numbers.`, transformConfig);
                    return null;
                }
                if (transformConfig.name === 'stringToEnum' && (typeof params[0] !== 'object' || params[0] === null)) {
                     console.warn(`VisualizerController: Invalid 'map' for stringToEnum in ${ruleContext}. Expected an object.`, transformConfig);
                    return null;
                }


                return { name: transformConfig.name, func: TF[transformConfig.name], params: params };
            } else {
                console.warn(`VisualizerController: Unknown transform function name '${transformConfig.name}' in object in ${ruleContext}.`, transformConfig);
                return null;
            }
        } else if (typeof transformConfig === 'function') {
             // Legacy: direct function assignment (less configurable through JSON)
             console.warn(`VisualizerController: Direct function assignment for transform in ${ruleContext} is deprecated. Consider using string or object configuration.`);
             return { name: 'custom', func: transformConfig, params: [] };
        }else {
            console.warn(`VisualizerController: Invalid transform configuration in ${ruleContext}:`, transformConfig);
            return null;
        }
    }


    /**
     * Sets the current polytope (geometry).
     * @param {string} polytopeName - The registered name of the geometry.
     */
    setPolytope(polytopeName) {
        if (typeof polytopeName === 'string') {
            this.core.updateParameters({ geometryType: polytopeName });
            console.log(`VisualizerController: Polytope changed to ${polytopeName}`);
        } else {
            console.error("VisualizerController: Invalid polytopeName provided.");
        }
    }

    /**
     * Sets global visual style parameters.
     * @param {object} styleParams - Object containing style parameters.
     * Example: { core: { morphFactor: 0.5, rotationSpeed: 0.1 }, projection: { perspective: { baseDistance: 3.0 } } }
     */
    setVisualStyle(styleParams) {
        if (typeof styleParams !== 'object' || styleParams === null) {
            console.error("VisualizerController: Invalid styleParams object provided.");
            return;
        }

        const paramsToUpdate = {};

        // Helper to recursively flatten and map parameters
        const processParams = (obj, prefix = '') => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    const fullKey = prefix ? `${prefix}_${key}` : key;

                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        // Check for specific known object structures like colorScheme first
                        if (key === 'colorScheme') {
                            // colorScheme is a direct state property in HypercubeCore,
                            // but its sub-properties (primary, secondary, background) are what we update.
                            // HypercubeCore's updateParameters handles merging of colorScheme objects.
                            paramsToUpdate.colorScheme = { ...(this.core.state.colorScheme || {}), ...value };
                        } else if (key === 'colors') { // Legacy support for styleParams.colors.primary
                             paramsToUpdate.colorScheme = {
                                ...(this.core.state.colorScheme || {}),
                                ...(paramsToUpdate.colorScheme || {}), // merge with already processed colorScheme if any
                             };
                             if(value.primary) paramsToUpdate.colorScheme.primary = value.primary;
                             if(value.secondary) paramsToUpdate.colorScheme.secondary = value.secondary;
                             if(value.background) paramsToUpdate.colorScheme.background = value.background;
                        } else {
                            // For other nested objects, create a flattened key structure for HypercubeCore state
                            // e.g., projection: { perspective: { baseDistance: 3.0 } } becomes proj_perspective_baseDistance
                            // This requires HypercubeCore.state to have keys like 'proj_perspective_baseDistance'
                            // This part assumes that the structure in styleParams matches the flattened structure
                            // expected by HypercubeCore's DEFAULT_STATE and updateParameters logic.
                            // Example: styleParams.projection.perspective.baseDistance should map to
                            // core.state.proj_perspective_baseDistance
                            // We will assume for now that the keys in styleParams are already somewhat flattened
                            // or directly match HypercubeCore state keys.
                            // A more robust system would use a predefined schema or map.

                            // Let's try a simple flattening for common prefixes like 'proj' and 'geom' and 'lattice'
                            if (prefix === 'projection' || prefix === 'geometry' || prefix === 'lattice') {
                                // e.g. projection.perspective.baseDistance -> proj_perspective_baseDistance
                                // geometry.hypercube.wCoordFactor1 -> geom_hypercube_wCoordFactor1
                                // lattice.lineWidth -> lattice_lineWidth (if not already prefixed)
                                 processParams(value, `${prefix.substring(0,4)}_${key}`);
                            } else if (prefix === '' && (key === 'projection' || key === 'geometry' || key === 'lattice' || key === 'core')) {
                                 processParams(value, key === 'core' ? '' : key); // 'core' prefix is not added to state keys
                            } else {
                                // For other nested objects not following the pattern, they are ignored for now
                                // or would require specific handling.
                                console.warn(`VisualizerController: Unsupported nested style structure for key '${fullKey}'.`);
                            }
                        }
                    } else {
                        // Direct value or already flattened key
                        // If prefix is 'core', we don't add it (e.g. core.morphFactor -> morphFactor)
                        const stateKey = (prefix === 'core' || prefix === '') ? key : fullKey;
                        paramsToUpdate[stateKey] = value;
                    }
                }
            }
        };

        processParams(styleParams);

        // Legacy direct properties (kept for some backward compatibility or simple cases)
        // These will be overwritten by the processParams if there are conflicts, which is usually fine.
        if (styleParams.hasOwnProperty('dimensions') && typeof styleParams.dimensions === 'number') {
            paramsToUpdate.dimensions = styleParams.dimensions;
        }
        if (styleParams.hasOwnProperty('projectionMethod') && typeof styleParams.projectionMethod === 'string') {
            paramsToUpdate.projectionMethod = styleParams.projectionMethod;
        }
        // ... (add other direct top-level properties from the old setVisualStyle if needed)

        if (Object.keys(paramsToUpdate).length > 0) {
            this.core.updateParameters(paramsToUpdate);
            console.log("VisualizerController: Visual styles updated", paramsToUpdate);
        } else {
            console.log("VisualizerController: No valid visual styles provided or mapped to update.");
        }
    }

    /**
     * Updates the data channels and direct parameters of the HypercubeCore based on the provided data snapshot
     * and the established mapping rules. Transformations defined in the rules are applied here.
     * @param {object} dataSnapshot - An object where keys are `snapshotField` names (matching those in mapping rules)
     *                                and values are the data to be processed and mapped.
     */
    updateData(dataSnapshot) {
        if (typeof dataSnapshot !== 'object' || dataSnapshot === null) {
            console.error("VisualizerController: Invalid dataSnapshot object provided to updateData.");
            return;
        }

        // Ensure globalDataBuffer is available and has a length, otherwise use a default size.
        const uboSize = (this.core && this.core.globalDataBuffer && this.core.globalDataBuffer.length > 0)
                        ? this.core.globalDataBuffer.length
                        : 64; // Default UBO size if core or buffer not fully initialized

        let uboDataArray = new Float32Array(uboSize).fill(0.0);
        const directParamsToUpdate = {};
        const unmappedFields = { ...dataSnapshot };

        // UBO Mapping
        if (this.mappingRules.ubo && Array.isArray(this.mappingRules.ubo)) {
            this.mappingRules.ubo.forEach(rule => {
                let rawValue;
                let value;
                if (dataSnapshot.hasOwnProperty(rule.snapshotField)) {
                    rawValue = dataSnapshot[rule.snapshotField];
                    value = rawValue; // Start with raw value
                    delete unmappedFields[rule.snapshotField]; // Mark as mapped
                } else {
                    rawValue = rule.defaultValue; // if field missing, consider defaultValue as the "raw" input for transform
                    value = rule.defaultValue;
                }

                if (rule.transform && typeof rule.transform === 'object' && typeof rule.transform.func === 'function') {
                    try {
                        let transformParams = [...rule.transform.params]; // Clone to avoid modification if params are objects/arrays

                        // Special handling for simple string transforms that might expect params from rule itself
                        if (rule.transform.params.length === 0) {
                            if (rule.transform.name === 'clamp') {
                                if (rule.hasOwnProperty('min') && rule.hasOwnProperty('max')) {
                                    transformParams = [rule.min, rule.max];
                                } else {
                                    console.warn(`VisualizerController: 'clamp' transform for UBO field '${rule.snapshotField}' is missing 'min' or 'max' properties on the rule. Using raw value.`);
                                }
                            }
                            // Add other simple string cases if necessary
                        }

                        // The first argument to the transform function is always the current value
                        value = rule.transform.func(rawValue, ...transformParams);

                    } catch (e) {
                        console.warn(`VisualizerController: Error transforming UBO field '${rule.snapshotField}' with transform '${rule.transform.name}':`, e, "Raw value:", rawValue, "Rule:", rule);
                        value = rule.defaultValue; // Fallback on transform error
                    }
                } else if (rule.transform && typeof rule.transform !== 'object') {
                     console.warn(`VisualizerController: Invalid transform object for UBO field '${rule.snapshotField}'. Using raw or default value. Rule:`, rule);
                }


                const numericValue = parseFloat(value);
                if (!isNaN(numericValue)) {
                    if (rule.uboChannelIndex >= 0 && rule.uboChannelIndex < uboSize) {
                        uboDataArray[rule.uboChannelIndex] = numericValue;
                        // console.log(`VisualizerController: Mapped UBO field '${rule.snapshotField}' (raw: ${dataSnapshot[rule.snapshotField]}, transformed: ${numericValue}) to channel ${rule.uboChannelIndex}`);
                    } else {
                        console.warn(`VisualizerController: Invalid channel index ${rule.uboChannelIndex} for UBO field '${rule.snapshotField}'`);
                    }
                } else {
                    console.warn(`VisualizerController: Could not parse float for UBO field '${rule.snapshotField}' (value: ${value}). Using default ${rule.defaultValue}.`);
                    uboDataArray[rule.uboChannelIndex] = parseFloat(rule.defaultValue); // Ensure default is also float
                }
            });
            console.log("UBO Data Sent:", uboDataArray); // Added for verification
            this.core.updateParameters({ dataChannels: uboDataArray });
        } else {
            console.warn("VisualizerController: UBO mapping rules are missing or not an array.");
        }

        // Direct Parameter Mapping
        if (this.mappingRules.direct && typeof this.mappingRules.direct === 'object') {
            for (const snapshotField in this.mappingRules.direct) {
                const rule = this.mappingRules.direct[snapshotField];
                let rawValue;
                let value;

                if (dataSnapshot.hasOwnProperty(snapshotField)) {
                    rawValue = dataSnapshot[snapshotField];
                    value = rawValue; // Start with raw value
                    delete unmappedFields[snapshotField]; // Mark as mapped
                } else {
                    rawValue = rule.defaultValue; // if field missing, consider defaultValue as the "raw" input for transform
                    value = rule.defaultValue;
                }

                if (rule.transform && typeof rule.transform === 'object' && typeof rule.transform.func === 'function') {
                    try {
                        let transformParams = [...rule.transform.params]; // Clone

                        // Special handling for simple string transforms that might expect params from rule itself
                        if (rule.transform.params.length === 0) {
                            if (rule.transform.name === 'clamp') {
                                 if (rule.hasOwnProperty('min') && rule.hasOwnProperty('max')) {
                                    transformParams = [rule.min, rule.max];
                                } else {
                                    console.warn(`VisualizerController: 'clamp' transform for direct param '${rule.coreStateName}' is missing 'min' or 'max' properties on the rule. Using raw value.`);
                                }
                            }
                            // stringToEnum: 'map' and 'defaultOutput' are already pushed to params during _validateAndPrepareTransform
                            // colorStringToVec: 'defaultOutput' (as defaultValue for func) is also pushed
                        }
                         // The first argument to the transform function is always the current value
                        value = rule.transform.func(rawValue, ...transformParams);

                    } catch (e)
                    {
                        console.warn(`VisualizerController: Error transforming direct param '${rule.coreStateName}' (field '${snapshotField}') with transform '${rule.transform.name}':`, e, "Raw value:", rawValue, "Rule:", rule);
                        value = rule.defaultValue; // Fallback on transform error
                    }
                } else if (rule.transform && typeof rule.transform !== 'object') {
                    console.warn(`VisualizerController: Invalid transform object for direct param '${rule.coreStateName}'. Using raw or default value. Rule:`, rule);
                }


                // Basic type validation based on defaultValue's type (could be more robust)
                if (typeof value !== typeof rule.defaultValue && rule.defaultValue !== null && typeof rule.defaultValue !== 'undefined') {
                     // Attempt type coersion for numbers specifically if default is number and value is string
                    if (typeof rule.defaultValue === 'number' && typeof value === 'string') {
                        const parsedValue = parseFloat(value);
                        if (!isNaN(parsedValue)) {
                            value = parsedValue;
                        } else {
                             console.warn(`VisualizerController: Type mismatch for direct param '${rule.coreStateName}'. Expected type ~${typeof rule.defaultValue}, got ${typeof value}. Value:`, dataSnapshot[snapshotField], `Rule:`, rule, `Using default.`);
                             value = rule.defaultValue;
                        }
                    } else if (typeof rule.defaultValue === 'boolean' && typeof value !== 'boolean') {
                        // Simple coersion for boolean
                        value = !!value;
                    }
                    else {
                        console.warn(`VisualizerController: Type mismatch for direct param '${rule.coreStateName}'. Expected type ~${typeof rule.defaultValue}, got ${typeof value}. Value:`, dataSnapshot[snapshotField], `Rule:`, rule, `Using default.`);
                        value = rule.defaultValue;
                    }
                }
                directParamsToUpdate[rule.coreStateName] = value;
                // console.log(`VisualizerController: Mapped direct field '${snapshotField}' to core parameter '${rule.coreStateName}' (raw: ${dataSnapshot[snapshotField]}, final value: ${JSON.stringify(value)})`);
            }
        } else {
            console.warn("VisualizerController: Direct mapping rules are missing or not an object.");
        }

        if (Object.keys(directParamsToUpdate).length > 0) {
            this.core.updateParameters(directParamsToUpdate);
        }

        // Log unmapped fields
        if (Object.keys(unmappedFields).length > 0) {
            console.log("VisualizerController: Unmapped fields in dataSnapshot:", unmappedFields);
        }
    }

    /**
     * Sets or updates the data mapping rules for how snapshot data is transformed and applied
     * to UBO channels or direct HypercubeCore parameters.
     *
     * @param {object} newRules - Defines the new mapping rules.
     * @param {Array<object>} [newRules.ubo] - Array of UBO mapping rules. Each rule object:
     *   @param {string} snapshotField - Key in the data snapshot.
     *   @param {number} uboChannelIndex - Target UBO channel index.
     *   @param {*} defaultValue - Default value if field is missing or transform fails.
     *   @param {string|object} [transform] - Transformation to apply.
     *     - String: Name of a function in `TransformFunctions` (e.g., `'clamp'`).
     *               Rule object should include params like `min`, `max` if needed by the simple transform.
     *     - Object: `{ name: 'transformName', param1: value1, ... }`. Examples:
     *       - `{ name: 'linearScale', domain: [0,100], range: [0,1] }`
     *       - `{ name: 'stringToEnum', map: {"OK":[0,1,0], "WARN":[1,1,0]}, defaultOutput: [0.5,0.5,0.5] }`
     * @param {object} [newRules.direct] - Object where keys are `snapshotField` names, and values are direct parameter mapping rules. Each rule object:
     *   @param {string} coreStateName - Target parameter name in `HypercubeCore.state`.
     *   @param {*} defaultValue - Default value.
     *   @param {string|object} [transform] - Transformation to apply (see UBO transform explanation).
     *
     * @example
     * const newRules = {
     *   ubo: [
     *     {
     *       snapshotField: 'temperature',
     *       uboChannelIndex: 0,
     *       defaultValue: 60,
     *       transform: { name: 'linearScale', domain: [50, 100], range: [0, 1] }
     *     },
     *     {
     *       snapshotField: 'cpu_load', // Rule object contains params for simple string transform
     *       uboChannelIndex: 1,
     *       defaultValue: 0.5,
     *       transform: 'clamp', // Name of function in TransformFunctions
     *       min: 0, // Parameter for 'clamp'
     *       max: 1  // Parameter for 'clamp'
     *     }
     *   ],
     *   direct: {
     *     'status': {
     *       coreStateName: 'statusColor', // Example core state name in HypercubeCore
     *       defaultValue: [0.5, 0.5, 0.5], // Default color (e.g., gray)
     *       transform: {
     *         name: 'stringToEnum',
     *         map: { "OK": [0,1,0], "WARN": [1,1,0], "ERROR": [1,0,0] }, // Map status strings to colors
     *         defaultOutput: [0.5,0.5,0.5] // Fallback color
     *       }
     *     },
     *     'backgroundColorString': {
     *        coreStateName: 'colorScheme.background', // Target a nested property
     *        defaultValue: [0,0,0.1], // Default dark blue
     *        transform: {
     *          name: 'colorStringToVec',
     *          defaultOutput: [0,0,0.1] // Fallback if color string is invalid
     *        }
     *     }
     *   }
     * };
     * vizController.setDataMappingRules(newRules);
     */
    setDataMappingRules(newRules) {
        if (typeof newRules !== 'object' || newRules === null) {
            console.error("VisualizerController: Invalid newRules object provided to setDataMappingRules.");
            return;
        }

        if (newRules.ubo && Array.isArray(newRules.ubo)) {
            const validatedUboRules = [];
            newRules.ubo.forEach(ruleDef => {
                const rule = { ...ruleDef };
                if (rule.snapshotField && typeof rule.uboChannelIndex === 'number' && rule.hasOwnProperty('defaultValue')) {
                    const validatedTransform = this._validateAndPrepareTransform(rule.transform, `UBO rule for ${rule.snapshotField} (new)`);
                    if (validatedTransform) {
                        rule.transform = validatedTransform;
                    } else if (rule.transform) {
                        console.warn(`VisualizerController: Invalid transform for new UBO rule '${rule.snapshotField}'. It will be ignored.`);
                        delete rule.transform;
                    }
                    validatedUboRules.push(rule);
                } else {
                    console.warn("VisualizerController: Invalid UBO channel rule in newRules:", ruleDef);
                }
            });
            this.mappingRules.ubo = validatedUboRules;
            console.log("VisualizerController: UBO mapping rules updated.");
        }

        if (newRules.direct && typeof newRules.direct === 'object') {
            for (const snapshotField in newRules.direct) {
                const ruleDef = newRules.direct[snapshotField];
                const rule = { ...ruleDef }; // Create a copy to modify
                if (rule.coreStateName && rule.hasOwnProperty('defaultValue')) {
                    const validatedTransform = this._validateAndPrepareTransform(rule.transform, `Direct param rule for ${snapshotField} (new)`);
                    if (validatedTransform) {
                        rule.transform = validatedTransform;
                    } else if (rule.transform) {
                        console.warn(`VisualizerController: Invalid transform for new direct param rule '${snapshotField}'. It will be ignored.`);
                        delete rule.transform;
                    }
                    this.mappingRules.direct[snapshotField] = rule;
                } else {
                    console.warn("VisualizerController: Invalid direct parameter rule in newRules for field:", snapshotField, ruleDef);
                }
            }
            console.log("VisualizerController: Direct mapping rules updated.");
        }
        console.log("VisualizerController: Mapping rules are now:", JSON.parse(JSON.stringify(this.mappingRules)));
    }

    setSpecificUniform(uniformName, value) {
        // The warning can be softened as HypercubeCore.updateParameters now handles many state vars that map to uniforms.
        console.log(`VisualizerController: setSpecificUniform('${uniformName}', `, value, `) called. This directly updates a HypercubeCore state parameter.`);
        if (typeof uniformName === 'string') {
            this.core.updateParameters({ [uniformName]: value });
        } else {
            console.error("VisualizerController: Invalid uniformName for setSpecificUniform.");
        }
    }

    /**
     * Asynchronously captures a snapshot of the current visualization using WebGPU for offscreen rendering.
     *
     * @param {object} [config={}] - Configuration for the snapshot.
     * @param {string} [config.format='png'] - Desired output format. Supported values:
     *                                         - `'png'`: Returns a PNG image as a data URL.
     *                                         - `'jpeg'`: Returns a JPEG image as a data URL.
     *                                         - `'buffer'`: Returns an `ArrayBuffer` containing the raw pixel data (RGBA8).
     * @param {number} [config.width=0] - Width of the snapshot. If 0 or not provided, defaults to the current canvas width.
     * @param {number} [config.height=0] - Height of the snapshot. If 0 or not provided, defaults to the current canvas height.
     * @param {number} [config.quality=0.9] - Quality setting for JPEG format, ranging from 0.0 to 1.0.
     * @returns {Promise<string|ArrayBuffer>} A promise that resolves with:
     *                                        - A string (data URL) if `config.format` is 'png' or 'jpeg'.
     *                                        - An `ArrayBuffer` of the raw pixel data if `config.format` is 'buffer'.
     *                                        The promise rejects if there's an error during capture or processing.
     */
    async getSnapshot(config = { format: 'png', width: 0, height: 0, quality: 0.9 }) {
        if (!this.core || !this.core.device) {
            return Promise.reject(new Error("HypercubeCore or WebGPU device not initialized."));
        }

        // Ensure HypercubeCore's async initialization (if any) is complete
        if (this.core._asyncInitialization) {
            try {
                await this.core._asyncInitialization;
            } catch (initError) {
                console.error("HypercubeCore async initialization failed:", initError);
                return Promise.reject(new Error("HypercubeCore async initialization failed."));
            }
        }
        if (!this.core.device) { // Check again after await
             return Promise.reject(new Error("WebGPU device not available after core initialization."));
        }

        const device = this.core.device;

        const snapshotWidth = (config.width && config.width > 0) ? config.width : this.core.canvas.width;
        const snapshotHeight = (config.height && config.height > 0) ? config.height : this.core.canvas.height;

        if (snapshotWidth <= 0 || snapshotHeight <= 0) {
            return Promise.reject(new Error(`Invalid snapshot dimensions: ${snapshotWidth}x${snapshotHeight}`));
        }

        const snapshotTextureFormat = navigator.gpu.getPreferredCanvasFormat(); // Or 'rgba8unorm'

        const snapshotTexture = device.createTexture({
            size: { width: snapshotWidth, height: snapshotHeight, depthOrArrayLayers: 1 },
            format: snapshotTextureFormat,
            usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // Ensure the core's state (especially time) is what you want for the snapshot.
        // This might involve calling this.core.updateParameters({ time: specificTime }) before getSnapshot.
        // For this example, we'll use the current time from the core or performance.now().
        const timestamp = this.core.state.time ?? (performance.now() / 1000);

        const renderSuccess = this.core._renderToTexture(
            timestamp,
            snapshotTexture.createView(),
            snapshotTextureFormat,
            { width: snapshotWidth, height: snapshotHeight }
        );

        if (!renderSuccess) {
            snapshotTexture.destroy();
            return Promise.reject(new Error("Failed to render frame to offscreen texture."));
        }

        // Calculate buffer size and bytesPerRow, ensuring bytesPerRow is a multiple of 256
        const bytesPerPixel = 4; // Assuming RGBA8 format (e.g., rgba8unorm)
        const bytesPerRow = Math.ceil(snapshotWidth * bytesPerPixel / 256) * 256;
        const bufferSize = bytesPerRow * snapshotHeight;

        const pixelBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture: snapshotTexture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { buffer: pixelBuffer, offset: 0, bytesPerRow: bytesPerRow, rowsPerImage: snapshotHeight },
            { width: snapshotWidth, height: snapshotHeight, depthOrArrayLayers: 1 }
        );

        device.queue.submit([commandEncoder.finish()]);

        try {
            await pixelBuffer.mapAsync(GPUMapMode.READ, 0, bufferSize);
            const mappedRange = pixelBuffer.getMappedRange(0, bufferSize);

            // Create a copy of the pixel data because the underlying ArrayBuffer is invalidated on unmap.
            const pixelDataCopy = new Uint8Array(mappedRange.slice(0));
            pixelBuffer.unmap();

            // Cleanup GPU resources
            snapshotTexture.destroy();
            pixelBuffer.destroy();

            // Correct for row padding and convert to image format
            const correctedPixelData = new Uint8ClampedArray(snapshotWidth * snapshotHeight * bytesPerPixel);
            for (let y = 0; y < snapshotHeight; y++) {
                const sourceOffset = y * bytesPerRow;
                const destinationOffset = y * snapshotWidth * bytesPerPixel;
                correctedPixelData.set(
                    pixelDataCopy.subarray(sourceOffset, sourceOffset + snapshotWidth * bytesPerPixel),
                    destinationOffset
                );
            }

            if (config.format === 'buffer') {
                return correctedPixelData.buffer;
            }

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = snapshotWidth;
            tempCanvas.height = snapshotHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
                 return Promise.reject(new Error("Failed to create 2D context for image conversion."));
            }

            const imageData = tempCtx.createImageData(snapshotWidth, snapshotHeight);
            imageData.data.set(correctedPixelData);
            tempCtx.putImageData(imageData, 0, 0);

            if (config.format === 'png') {
                return tempCanvas.toDataURL('image/png');
            } else if (config.format === 'jpeg') {
                return tempCanvas.toDataURL('image/jpeg', config.quality || 0.9);
            } else {
                return Promise.reject(new Error(`Unsupported snapshot format: ${config.format}`));
            }

        } catch (err) {
            console.error("Error during snapshot pixel data processing:", err);
            // Ensure cleanup even on error
            if (snapshotTexture && !snapshotTexture.destroyed) snapshotTexture.destroy();
            if (pixelBuffer && !pixelBuffer.destroyed) pixelBuffer.destroy();
            return Promise.reject(err);
        }
    }

    // Placeholder for dispose
    dispose() {
        console.log("VisualizerController: dispose() called.");
        if (this.core && typeof this.core.dispose === 'function') {
            this.core.dispose();
        }
        this.core = null; // Release reference
    }
}
export default VisualizerController;
