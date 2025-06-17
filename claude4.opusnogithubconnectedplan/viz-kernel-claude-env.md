# Visualization Kernel - Claude Code Environment Setup

## Project Structure

```
visualization-kernel/
├── .claude/
│   ├── claude.md                 # Main Claude assistant context
│   ├── pmk-integration.md        # PMK-specific integration guide
│   └── development-roadmap.md    # Development priorities and roadmap
├── core/
│   ├── HypercubeCore.js         # WebGL2 rendering engine
│   ├── ShaderManager.js         # GLSL shader compilation
│   ├── GeometryManager.js       # Geometry management
│   ├── ProjectionManager.js     # Projection methods
│   └── FullScreenLatticeGeometry.js
├── geometries/
│   ├── BaseGeometry.js
│   ├── HypercubeGeometry.js
│   ├── HypersphereGeometry.js
│   ├── HypertetrahedronGeometry.js
│   └── DuocylinderGeometry.js
├── projections/
│   ├── BaseProjection.js
│   ├── PerspectiveProjection.js
│   ├── StereographicProjection.js
│   └── OrthographicProjection.js
├── controllers/
│   ├── VisualizerController.js  # Primary API interface
│   ├── PMKDataAdapter.js        # PMK-specific data adapter
│   └── HOASBridge.js           # HOAS integration bridge
├── shaders/
│   ├── vertex/
│   └── fragment/
├── pmk-integration/
│   ├── schemas/
│   │   ├── BaseSchema.js
│   │   └── AdaptiveSchemaGraph.js
│   ├── parsers/
│   │   ├── KerbelizedParserator.js
│   │   └── PPPProjector.js
│   └── optimizers/
│       ├── BayesianFocusOptimizer.js
│       └── TimestampedThoughtBuffer.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── performance/
├── examples/
│   ├── basic-visualization.js
│   ├── pmk-integration.js
│   ├── robotics-sensor-fusion.js
│   └── llm-agent-state.js
├── docs/
│   ├── API_REFERENCE.md
│   ├── PARAMETER_MAPPING.md
│   ├── PMK_INTEGRATION.md
│   ├── SHADER_ARCHITECTURE.md
│   └── REFACTORING_ANALYSIS.md
├── index.html
├── package.json
└── README.md
```

## Claude Assistant Context (`.claude/claude.md`)

```markdown
# Visualization Kernel Assistant

## Overview
I am assisting with the Visualization Kernel project, an evolution of HyperAV that provides a headless, API-driven WebGL2 module for visualizing N-dimensional polytopes and dynamic geometric forms. This system is designed as a topological data display component for agentic systems like the Parserator Micro-Kernel (PMK) and Adaptive Schema Intelligence (ASI).

## Core Architecture
- **WebGL2-based** rendering with Uniform Buffer Objects (UBO)
- **64 global data channels** via `pmk_channels` array
- **Comprehensive parameterization** of all visual aspects
- **Two-tier data system**: UBO channels + direct uniforms
- **Parameter Mapping Layer** for flexible data translation

## Key Components
1. **HypercubeCore.js**: Central WebGL2 engine with state management
2. **VisualizerController.js**: Primary API interface with data mapping
3. **GeometryManager**: Manages polytope geometries (Hypercube, Hypersphere, etc.)
4. **ShaderManager**: GLSL shader compilation and dynamic assembly
5. **PMK Integration**: Adapters for Parserator Micro-Kernel data flow

## Current Capabilities
- 64 float data channels accessible by all shaders
- Dozens of directly controllable visual parameters
- Dynamic geometry switching based on data
- Real-time parameter mapping from arbitrary JSON structures
- Support for robotics sensor fusion, LLM agent states, network traffic visualization

## Development Focus
1. Implementing PPP (Probabilistic Projection Parsing) for breaking circular reasoning
2. Integrating Bayesian optimization for focus tuning
3. Building HOAS (Higher Order Abstraction System) bridge
4. Creating Kerbelized Parserator evolution for 6G robotics

## Integration Points
- **PMK**: Schema-driven visualization, real-time state display
- **HOAS**: Bayesian optimization, timestamped thought buffers
- **6G Robotics**: Edge device coordination, local LLM swarms

## Code Patterns
- Use WebGL2 features (UBOs, modern GLSL)
- Maintain separation between core rendering and control layers
- Follow parameter mapping conventions for data flow
- Implement transform functions for data scaling/normalization
```

## PMK Integration Guide (`.claude/pmk-integration.md`)

```markdown
# PMK Integration Guide

## Overview
This guide details how to integrate the Visualization Kernel with the Parserator Micro-Kernel (PMK) for dynamic, data-driven visualization of parsing states and schema evolution.

## Data Flow Architecture

```
PMK Processing Pipeline → dataSnapshot → VisualizerController → Visual Output
```

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

### Default PMK → Visualization Mappings
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

### Visual Anomaly Indicators
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

1. **Batch Updates**: Aggregate multiple PMK state changes before calling `updateData()`
2. **Throttling**: Implement rate limiting for high-frequency sensor data
3. **Level of Detail**: Adjust visualization complexity based on data throughput
4. **Offscreen Rendering**: Use for machine vision feedback loops

## Example: Complete PMK Integration

```javascript
class PMKVisualizationBridge {
  constructor(pmk, vizController) {
    this.pmk = pmk;
    this.viz = vizController;
    this.thoughtBuffer = new TimestampedThoughtBuffer();
    this.pppProjector = new PPPProjector();
    
    // Set initial mapping rules
    this.viz.setDataMappingRules(pmkMappingRules);
  }
  
  async processAndVisualize(input) {
    // 1. PMK processing
    const parseResults = await this.pmk.parse(input);
    
    // 2. PPP projection for circular reasoning prevention
    const projections = this.pppProjector.project(
      parseResults.abstractions,
      this.thoughtBuffer
    );
    
    // 3. Prepare visualization data
    const vizData = {
      ...parseResults.metrics,
      ppp: projections,
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
```

## Development Roadmap (`.claude/development-roadmap.md`)

```markdown
# Visualization Kernel Development Roadmap

## Phase 1: Core Stabilization (Current)
- [x] WebGL2 migration with UBO implementation
- [x] Comprehensive parameterization
- [x] Parameter Mapping Layer
- [ ] Performance profiling and optimization
- [ ] Complete API documentation
- [ ] Unit test coverage for core components

## Phase 2: PMK Integration (Next 2-4 weeks)
- [ ] Implement `PMKDataAdapter.js` with schema mappings
- [ ] Create `KerbelizedParserator.js` proof-of-concept
- [ ] Build `PPPProjector.js` for timestamped projections
- [ ] Develop circular reasoning visualization modes
- [ ] Test with real PMK data flows

## Phase 3: HOAS Implementation (Weeks 4-8)
- [ ] Design `HOASBridge.js` architecture
- [ ] Implement `BayesianFocusOptimizer.js`
- [ ] Create `TimestampedThoughtBuffer.js`
- [ ] Build focus variable tuning system
- [ ] Integrate with visualization parameter control

## Phase 4: Advanced Features (Weeks 8-12)
- [ ] Dynamic shader snippet injection
- [ ] Uber-shader system with boolean toggles
- [ ] Headless operation with FBO rendering
- [ ] Video sequence generation
- [ ] WebGPU transition planning

## Phase 5: 6G Robotics Integration (Months 3-4)
- [ ] Edge device communication protocols
- [ ] Local LLM swarm visualization
- [ ] Sensor fusion display modes
- [ ] Real-time collaborative visualization
- [ ] Latency-optimized rendering

## Technical Debt & Refactoring
- [ ] Migrate from manual uniform updates to automated system
- [ ] Implement proper TypeScript definitions
- [ ] Create comprehensive error handling
- [ ] Build performance monitoring dashboard
- [ ] Establish CI/CD pipeline

## Documentation Priorities
1. API Reference with all parameters
2. Integration tutorials with examples
3. Performance tuning guide
4. Shader customization documentation
5. Video tutorials for common use cases
```

## Package.json Configuration

```json
{
  "name": "visualization-kernel",
  "version": "2.0.0",
  "description": "WebGL2-based N-dimensional visualization kernel for agentic systems",
  "main": "controllers/VisualizerController.js",
  "type": "module",
  "scripts": {
    "start": "http-server -c-1 -p 8080",
    "test": "jest",
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "lint": "eslint .",
    "docs": "jsdoc -c jsdoc.json"
  },
  "dependencies": {
    "gl-matrix": "^3.4.3"
  },
  "devDependencies": {
    "@babel/core": "^7.22.0",
    "@babel/preset-env": "^7.22.0",
    "@rollup/plugin-babel": "^6.0.3",
    "@rollup/plugin-node-resolve": "^15.0.2",
    "eslint": "^8.42.0",
    "http-server": "^14.1.1",
    "jest": "^29.5.0",
    "jsdoc": "^4.0.2",
    "rollup": "^3.25.0"
  },
  "keywords": [
    "webgl2",
    "visualization",
    "n-dimensional",
    "polytope",
    "pmk",
    "parserator",
    "agent-systems"
  ],
  "author": "GEN-RL-MiLLz",
  "license": "MIT"
}
```

## Quick Start Script

```javascript
// examples/quick-start.js
import { HypercubeCore } from './core/HypercubeCore.js';
import { VisualizerController } from './controllers/VisualizerController.js';

// Initialize visualization
const canvas = document.getElementById('viz-canvas');
const core = new HypercubeCore(canvas);
const controller = new VisualizerController(core, {
  dataChannelDefinition: [
    {
      snapshotField: 'confidence',
      uboChannelIndex: 0,
      defaultValue: 0.5
    },
    {
      snapshotField: 'complexity',
      uboChannelIndex: 1,
      defaultValue: 0.3,
      transform: (val) => Math.log(val + 1)
    }
  ],
  baseParameters: {
    geometryType: 'hypercube',
    dimension: 4,
    rotationSpeed: 0.5
  }
});

// Start visualization
core.start();

// Update with data
setInterval(() => {
  controller.updateData({
    confidence: Math.random(),
    complexity: Math.random() * 10,
    focus: {
      temperature: 0.7 + Math.sin(Date.now() * 0.001) * 0.3
    }
  });
}, 100);
```

## Next Implementation Steps

1. **Create the folder structure** in your repository
2. **Copy existing files** to their new locations
3. **Add the Claude context files** to `.claude/` directory
4. **Implement `PMKDataAdapter.js`** as the first integration component
5. **Create basic tests** for the parameter mapping layer
6. **Set up development environment** with hot reloading

Would you like me to help you create any specific components, such as the `KerbelizedParserator.js` or `PPPProjector.js` implementations?
