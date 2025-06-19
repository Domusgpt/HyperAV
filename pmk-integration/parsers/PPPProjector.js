// No specific imports needed for this basic version, but TimestampedThoughtBuffer is an expected collaborator.

export class PPPProjector {
  constructor(config = {}) {
    this.config = config; // Store config if any specific parameters are needed later
    console.log("PPPProjector initialized with config:", config);
  }

  projectToTimestampedBuffer(data, buffer) {
    console.log("PPPProjector.projectToTimestampedBuffer called with data:", data);

    if (!buffer || typeof buffer.inject !== 'function') {
        console.error("PPPProjector.projectToTimestampedBuffer: Provided buffer is invalid or missing the 'inject' method.");
        return []; // Return empty array or throw error, depending on desired handling
    }

    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) {
        console.warn("PPPProjector.projectToTimestampedBuffer: No data items to project.");
        return [];
    }

    const projections = items.map((item, index) => ({
      timestamp: this.calculateOptimalTimestamp(item, index),
      projection: this.createProbabilisticProjection(item),
      focusWeight: this.calculateFocusWeight(item)
    }));

    console.log("PPPProjector: Generated projections:", projections);

    projections.forEach(p => {
      buffer.inject(p.timestamp, p.projection, p.focusWeight);
    });
    console.log(`PPPProjector: Injected ${projections.length} projections into the buffer.`);

    return projections; // Return the generated projections
  }

  calculateOptimalTimestamp(item, index = 0) {
    // console.log(`PPPProjector.calculateOptimalTimestamp for item (index ${index}):`, item);
    // Simulate slight temporal spread for multiple items, ensuring unique timestamps if called rapidly
    return Date.now() + index * (this.config.timestampSpreadFactor || 10);
  }

  createProbabilisticProjection(item) {
    // console.log("PPPProjector.createProbabilisticProjection for item:", item);
    let projectedValue = 'unknown_projected';
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        projectedValue = item.toString() + '_projected';
    } else if (item && typeof item.id !== 'undefined') {
        projectedValue = `item_${item.id}_projected`;
    } else if (item && typeof item.name !== 'undefined') {
        projectedValue = `${item.name}_projected`;
    }


    return {
        originalItem: item, // Keep a reference to the original
        projectionType: this.config.defaultProjectionType || 'default_placeholder',
        projectedValue: projectedValue,
        confidence: Math.random() * 0.5 + 0.5, // Confidence between 0.5 and 1.0
        metadata: {
            // Add any other relevant metadata from item or config
            source: this.config.projectionSource || 'unknown_source'
        }
    };
  }

  calculateFocusWeight(item) {
    // console.log("PPPProjector.calculateFocusWeight for item:", item);
    // Example: base weight from config, with some randomness
    const baseWeight = this.config.baseFocusWeight || 0.5;
    const variability = this.config.focusWeightVariability || 0.2; // e.g. 0.2 means +/- 0.1
    return Math.max(0, Math.min(1, baseWeight + (Math.random() * variability - variability / 2)));
  }
}
