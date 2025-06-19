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

## AI Assistant Context and Guides

For detailed context and guidance relevant to AI-assisted development on this project, please refer to the following files located in the `.claude/` directory:

-   **Core AI Assistant Context:** See `.claude/claude.md`
    *   Provides an overview of the project, core architecture, key components, current capabilities, development focus, integration points, and code patterns.

-   **PMK-Specific Integration Guide:** See `.claude/pmk-integration.md`
    *   Details how to integrate the Visualization Kernel with the Parserator Micro-Kernel (PMK), including data flow, key integration points (schema-driven visualization, real-time data channels, Bayesian focus optimization, PPP projection), mapping rules configuration, error handling, and performance considerations.

-   **Development Priorities and Roadmap:** See `.claude/development-roadmap.md`
    *   Outlines the phased development plan, including core stabilization, PMK integration, HOAS implementation, advanced features, and 6G robotics integration. Also lists technical debt, refactoring goals, and documentation priorities.

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

1. **Create the folder structure** in your repository (if not already matching the above).
2. **Copy existing files** to their new locations (if performing a migration).
3. **Add the Claude context files** to `.claude/` directory (if not already present).
4. **Implement `PMKDataAdapter.js`** as the first integration component.
5. **Create basic tests** for the parameter mapping layer.
6. **Set up development environment** with hot reloading.

Would you like me to help you create any specific components, such as the `KerbelizedParserator.js` or `PPPProjector.js` implementations?
