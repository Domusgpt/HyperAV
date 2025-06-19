# Component Manifest: AdaptiveSchemaGraph

## 1. Purpose and Role

`AdaptiveSchemaGraph.js` is a core sub-component of `KerbelizedParserator`. Its primary responsibility is to manage a collection of parsing schemas and adapt their relevance (or "strength") based on parsing performance. It also includes capabilities for dynamically generating new schemas when existing ones prove inadequate.

This component embodies the "Adaptive Schema Intelligence (ASI)" by allowing the parsing engine to evolve its strategies over time.

## 2. Key Data Structures

*   **`this.schemas` (Map):**
    *   The central collection storing all known parsing schemas.
    *   Keys are unique schema IDs (typically the `schema.definition.type` string).
    *   Values are "schema objects" (wrappers) with the following structure:
        *   `id` (String): Unique identifier for the schema.
        *   `definition` (Object): The actual schema definition (e.g., `{ type, extractionSteps, complexity, version, parentSchemaId, ... }`).
        *   `strength` (Number): A score indicating the historical effectiveness or preference for this schema. Adjusted by `adaptSchema()`.
        *   `lastUsed` (Timestamp): Timestamp of when this schema was last selected by `getPreferredSchema()`.
        *   `usageCount` (Number): How many times this schema has been selected.

*   **`this.config` (Object):**
    *   Stores the configuration for the `AdaptiveSchemaGraph` instance, merged from defaults and user-provided settings. (See Section 5).

*   `this.nodes`, `this.edges` (Map):
    *   Currently placeholders, potentially for future use in representing the internal graphical structure of a single, complex schema definition (e.g., for visualization or detailed editing). They are not currently used for managing the collection of different schema objects.

## 3. Core Logic and Key Methods

### Initialization (`constructor` and `_initializeSchemas`)
*   Upon instantiation, `AdaptiveSchemaGraph` initializes its configuration by merging provided settings with defaults (see `DEFAULT_ASG_CONFIG`).
*   The `_initializeSchemas()` method is called to set up the initial state of the schema collection. It:
    *   Clears any existing schemas.
    *   Creates an initial schema definition using `_createSchemaDefinitionFromConfig()` (which respects `this.config.initialSchemaDefinition`).
    *   Wraps this definition into a schema object (with `id`, initial `strength` of 1.0, `usageCount`, `lastUsed`) and adds it to the `this.schemas` map.

### Schema Selection (`async getPreferredSchema(context = null)`)
*   **Purpose:** Selects the most suitable schema from the `this.schemas` collection for the current parsing task.
*   **Logic (Current):**
    *   Iterates through all schemas in `this.schemas`.
    *   Returns the schema object that has the highest `strength`.
    *   (Tie-breaking is currently based on iteration order; could be enhanced).
    *   Updates `lastUsed` and `usageCount` for the selected schema.
    *   If no schemas exist (which should be prevented by `_initializeSchemas`), it logs a warning and attempts to re-initialize with a default schema.
*   **Context Parameter:** The `context` parameter is currently unused by the selection logic but is available for future enhancements (e.g., context-aware schema selection based on hints or content analysis).

### Schema Adaptation (`async adaptSchema(usedSchemaObject, parseResult)`)
*   **Purpose:** Adjusts the `strength` of a `usedSchemaObject` based on the `parseResult` (primarily `parseResult.confidence`) and potentially triggers the generation of new schemas.
*   **Strength Adjustment:**
    *   Only proceeds if `parseResult.confidence` is defined and meets or exceeds `this.config.minConfidenceForAdaptation`.
    *   The amount of `strengthChange` depends on `this.config.adaptationStrategy`:
        *   `"conservative"` (default): Small adjustments, rewarding confidence above `minConfidenceForAdaptation`.
        *   `"aggressive_learning"`: Larger adjustments, more significantly rewarding high confidence and penalizing low confidence (relative to a 0.5 baseline).
        *   `"feedback_driven"`: (Placeholder) Would use explicit `parseResult.feedback.strengthAdjustment` if available, otherwise falls back to a moderate confidence-based adjustment.
    *   The schema's `strength` is then updated and clamped (default: between 0.01 and `this.config.maxSchemaComplexity` which serves as a proxy for max strength here).
*   **Dynamic Schema Creation Trigger:**
    *   If `this.config.allowDynamicSchemaCreation` is true AND `parseResult.confidence` is very low (e.g., below `this.config.minConfidenceForAdaptation * 0.5`), it attempts to generate a new schema.
    *   It calls `await this._generateNewSchemaFromStrategy(schemaToAdapt, parseResult.inputContext, parseResult)`.
    *   If `_generateNewSchemaFromStrategy` returns a new schema definition, it's wrapped into a new schema object (with an initial `strength`, e.g., 0.5) and added to `this.schemas`.

### Schema Generation (`async _generateNewSchemaFromStrategy(baseSchemaObject, inputContext, parseResult)`)
*   **Purpose:** Creates a new schema *definition* based on a chosen strategy.
*   **Strategy Selection (Current - Simplified):**
    *   Uses `Math.random()` to probabilistically choose between:
        1.  **"Clone & Simplify":** If `baseSchemaObject` is provided and its `complexity > 1`. Copies the base definition, reduces complexity, shortens `extractionSteps` (placeholder), and updates version/ID.
        2.  **"Generic Template by Input Hint":** If `inputContext.dataTypeHint` (e.g., "email", "date") is provided. Creates a new schema from a hardcoded template for that hint.
        3.  **"Clone & Mutate Parameter":** If `baseSchemaObject` is provided (fallback if simplify wasn't chosen). Copies the base definition, adds/modifies a conceptual `mutatedField`, and updates version/ID.
*   **Output:** Returns a new schema *definition* object or `null` if no strategy applies or generation fails.
*   **Complexity Check:** Ensures the `newDefinition.complexity` does not exceed `this.config.maxSchemaComplexity`.
*   **Unique ID:** Generates a unique `type` (ID) for the new schema definition.

### Utility Methods
*   **`async getSchemaById(schemaId)`:** Retrieves a schema object by its ID.
*   **`_createSchemaDefinitionFromConfig()`:** Internal helper to create a schema definition based on `this.config.initialSchemaDefinition`.

## 4. Configuration (`this.config.schemaGraphConfig`)

Referenced from `docs/kerbelized_parser_config_api.md`, key options include:

*   `initialSchemaDefinition`: The schema to load on startup.
*   `allowDynamicSchemaCreation`: Boolean; enables/disables calling `_generateNewSchemaFromStrategy`.
*   `adaptationStrategy`: String ("conservative", "aggressive_learning", "feedback_driven"); influences how schema strengths are adjusted and potentially which generation strategies are favored.
*   `maxSchemaComplexity`: Number; acts as an upper clamp for schema strength and a check for newly generated schema definitions.
*   `minConfidenceForAdaptation`: Number; threshold for `parseResult.confidence` below which schema strength is not positively adapted (and may trigger dynamic creation if very low).

## 5. Interaction with `KerbelizedParserator`

*   `KerbelizedParserator` instantiates `AdaptiveSchemaGraph` with the `schemaGraphConfig`.
*   In each parsing cycle, `KerbelizedParserator`:
    1.  Calls `getPreferredSchema(originalContext)` to get the schema object to use.
    2.  After (simulated) parsing, calls `adaptSchema(usedSchemaObject, parseResult)` with the outcome. `parseResult` includes `confidence` and the `originalContext` (as `inputContext`) which `adaptSchema` uses for its logic, including passing `inputContext` to `_generateNewSchemaFromStrategy`.

This component is pivotal for the parser's ability to learn from experience and explore new parsing strategies.
