const DEFAULT_PPP_CONFIG = {
  defaultProjectionType: "generic_event",
  timestampSpreadFactor: 10, // milliseconds
  baseFocusWeight: 0.5,
  focusWeightVariability: 0.2, // e.g., 0.2 means +/- 0.1
  projectionSource: "default_ppp_instance"
};

export class PPPProjector {
  constructor(config = {}) {
    // Merge provided config with defaults
    this.config = { ...DEFAULT_PPP_CONFIG, ...config };
    console.log("PPPProjector initialized with config:", this.config);
  }

  projectToTimestampedBuffer(data, buffer) {
    // ... (rest of the method largely unchanged, uses this.config)
    console.log("PPPProjector.projectToTimestampedBuffer called with data:", data);

    if (!buffer || typeof buffer.inject !== 'function') {
        console.error("PPPProjector.projectToTimestampedBuffer: Provided buffer is invalid or missing the 'inject' method.");
        return [];
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

    console.log("PPPProjector: Generated projections:", projections.length);

    projections.forEach(p => {
      buffer.inject(p.timestamp, p.projection, p.focusWeight);
    });
    // console.log(\`PPPProjector: Injected \${projections.length} projections into the buffer.\`);

    return projections;
  }

  calculateOptimalTimestamp(item, index = 0) {
    return Date.now() + index * (this.config.timestampSpreadFactor);
  }

  createProbabilisticProjection(item) {
    let projectedValue = 'unknown_projected';
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        projectedValue = item.toString() + '_projected';
    } else if (item && typeof item.id !== 'undefined') {
        projectedValue = `item_${item.id}_projected`;
    } else if (item && typeof item.name !== 'undefined') {
        projectedValue = `${item.name}_projected`;
    }

    return {
        originalItem: item,
        projectionType: this.config.defaultProjectionType,
        projectedValue: projectedValue,
        confidence: Math.random() * 0.5 + 0.5,
        metadata: {
            source: this.config.projectionSource
        }
    };
  }

  calculateFocusWeight(item) {
    const baseWeight = this.config.baseFocusWeight;
    const variability = this.config.focusWeightVariability;
    return Math.max(0, Math.min(1, baseWeight + (Math.random() * variability - variability / 2)));
  }
}
