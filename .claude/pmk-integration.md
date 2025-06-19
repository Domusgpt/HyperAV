# PMK Integration Guide

## Overview
This guide details how to integrate the Visualization Kernel with the Parserator Micro-Kernel (PMK) for dynamic, data-driven visualization of parsing states and schema evolution.

## Data Flow Architecture
PMK Processing Pipeline → dataSnapshot → VisualizerController → Visual Output

## Key Integration Points

### 1. Schema-Driven Visualization
```javascript
// PMK determines active schema
const activeSchema = pmk.getActiveSchema();

// Map schema to visualization
vizController.setVisualStyle({
  geometryType: schemaToGeometryMap[activeSchema.type],
  colorScheme: activeSchema.confidence > 0.8 ? 'stable' : 'volatile'
});
```

### 2. Real-time Data Channels
```javascript
// PMK data snapshot format
const dataSnapshot = {
  architect: {
    confidence: 0.95,
    planComplexity: 0.7,
    activeNodes: 42
  },
  extractor: {
    load: 0.3,
    throughput: 1250,
    errorRate: 0.02
  },
  focus: {
    temperature: 0.8,
    abstractionLevel: 3,
    contextWindow: [0.1, 0.5, 0.3, 0.1]
  }
};

// Update visualization
vizController.updateData(dataSnapshot);
```

### 3. Bayesian Focus Optimization
```javascript
class PMKFocusOptimizer {
  async optimizeFocus(parseResults) {
    const focusParams = await this.bayesianOptimizer.optimize({
      currentPerformance: parseResults.accuracy,
      contextualRelevance: parseResults.relevanceScore,
      computationalCost: parseResults.tokenCount
    });

    // Apply optimized focus to visualization
    vizController.setDataMappingRules({
      ubo: {
        'focus.temperature': { channelIndex: 0, transform: 'logScale' },
        'focus.abstractionLevel': { channelIndex: 1 }
      }
    });
  }
}
```

### 4. PPP Projection Integration
```javascript
// Project parsing abstractions into timestamped buffer
const pppProjector = new PPPProjector();
const projections = pppProjector.projectToTimestampedBuffer(
  parseResults.abstractions,
  thoughtBuffer
);

// Visualize projections
vizController.updateData({
  ppp: {
    activeProjections: projections.length,
    temporalDistribution: projections.map(p => p.timestamp),
    focusWeights: projections.map(p => p.focusWeight)
  }
});
```

## Mapping Rules Configuration
Default PMK → Visualization Mappings
```javascript
const pmkMappingRules = {
  ubo: {
    // Architect metrics → channels 0-7
    'architect.confidence': { channelIndex: 0 },
    'architect.planComplexity': { channelIndex: 1 },
    'architect.activeNodes': { channelIndex: 2, transform: 'normalize' },

    // Extractor metrics → channels 8-15
    'extractor.load': { channelIndex: 8 },
    'extractor.throughput': { channelIndex: 9, transform: 'logScale' },

    // Focus parameters → channels 16-23
    'focus.temperature': { channelIndex: 16 },
    'focus.abstractionLevel': { channelIndex: 17 },
    'focus.contextWindow[0]': { channelIndex: 18 },
    'focus.contextWindow[1]': { channelIndex: 19 }
  },
  direct: {
    'schema.type': {
      stateName: 'geometryType',
      transform: (type) => schemaGeometryMap[type] || 'hypercube'
    },
    'system.glitchLevel': { stateName: 'glitchIntensity' },
    'system.morphState': { stateName: 'morphFactor' }
  }
};
```

## Error Handling and Anomaly Detection
Visual Anomaly Indicators
```javascript
// Map parsing errors to visual glitches
if (parseResults.errors.length > 0) {
  vizController.setVisualStyle({
    glitchIntensity: Math.min(parseResults.errors.length * 0.1, 1.0),
    colorScheme: 'error',
    rotationSpeed: parseResults.errors.length * 0.5
  });
}

// Circular reasoning detection
if (parseResults.circularDependencies.detected) {
  // Activate PPP projection visualization
  vizController.setPolytope('fullscreenlattice');
  vizController.updateData({
    lattice: {
      distortionFactor: parseResults.circularDependencies.severity,
      moireIntensity: 0.8
    }
  });
}
```

## Performance Considerations
- Batch Updates: Aggregate multiple PMK state changes before calling updateData()
- Throttling: Implement rate limiting for high-frequency sensor data
- Level of Detail: Adjust visualization complexity based on data throughput
- Offscreen Rendering: Use for machine vision feedback loops

## Example: Complete PMK Integration
```javascript
class PMKVisualizationBridge {
  constructor(pmk, vizController) {
    this.pmk = pmk;
    this.viz = vizController;
    this.thoughtBuffer = new TimestampedThoughtBuffer(); // Assuming this is defined
    this.pppProjector = new PPPProjector(); // Assuming this is defined

    // Set initial mapping rules
    this.viz.setDataMappingRules(pmkMappingRules);
  }

  async processAndVisualize(input) {
    // 1. PMK processing
    const parseResults = await this.pmk.parse(input);

    // 2. PPP projection for circular reasoning prevention
    const projections = this.pppProjector.projectToTimestampedBuffer( // Corrected method name
      parseResults.abstractions,
      this.thoughtBuffer
    );

    // 3. Prepare visualization data
    const vizData = {
      // Assuming parseResults.metrics contains architect, extractor, focus etc.
      ...parseResults.metrics,
      ppp: { // Structured PPP data for visualization
          activeProjections: projections.length,
          temporalDistribution: projections.map(p => p.timestamp),
          focusWeights: projections.map(p => p.focusWeight)
      },
      timestamp: Date.now()
    };

    // 4. Update visualization
    this.viz.updateData(vizData);

    // 5. Optional: Get visual feedback for PMK
    if (this.pmk.requiresVisualFeedback) {
      const snapshot = await this.viz.getSnapshot();
      this.pmk.processVisualFeedback(snapshot);
    }

    return parseResults;
  }
}
```
