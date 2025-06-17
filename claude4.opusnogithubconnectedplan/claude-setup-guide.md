# Visualization Kernel - Claude Code Environment Setup Guide

## Quick Start

1. **Clone and organize your repository**:
```bash
# Clone your repository
git clone https://github.com/Domusgpt/HyperAV.git visualization-kernel
cd visualization-kernel

# Create the new structure
mkdir -p .claude controllers pmk-integration/{schemas,parsers,optimizers} tests examples docs
```

2. **Move existing files to new locations**:
```bash
# Move core files
mv js/HypercubeCore.js core/
mv js/ShaderManager.js core/
mv js/GeometryManager.js core/
mv js/ProjectionManager.js core/

# Move geometries
mv js/geometries/* geometries/

# Move projections  
mv js/projections/* projections/

# Move controller
mv js/VisualizerController.js controllers/
```

3. **Add Claude context files**:
```bash
# Copy the claude.md content from the artifact
echo "# Copy claude.md content here" > .claude/claude.md
echo "# Copy pmk-integration.md content here" > .claude/pmk-integration.md
echo "# Copy development-roadmap.md content here" > .claude/development-roadmap.md
```

4. **Add the new PMK integration files**:
```bash
# Add KerbelizedParserator
# Copy the code from the artifact into:
touch pmk-integration/parsers/KerbelizedParserator.js

# Add PPPProjector
# Copy the code from the artifact into:
touch pmk-integration/parsers/PPPProjector.js

# Add PMKDataAdapter
# Copy the code from the artifact into:
touch controllers/PMKDataAdapter.js
```

5. **Create placeholder files for future components**:
```bash
# Schema components
touch pmk-integration/schemas/BaseSchema.js
touch pmk-integration/schemas/AdaptiveSchemaGraph.js

# Optimizer components
touch pmk-integration/optimizers/BayesianFocusOptimizer.js
touch pmk-integration/optimizers/TimestampedThoughtBuffer.js

# Bridge components
touch controllers/HOASBridge.js
```

## Environment Configuration

### 1. Package.json Setup

Update your `package.json` with the configuration from the artifact, then:

```bash
npm install
```

### 2. Test the Basic Visualization

Create a test file `test-setup.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Visualization Kernel Test</title>
    <style>
        body { margin: 0; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="viz-canvas"></canvas>
    <script type="module">
        import { HypercubeCore } from './core/HypercubeCore.js';
        import { VisualizerController } from './controllers/VisualizerController.js';
        
        const canvas = document.getElementById('viz-canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const core = new HypercubeCore(canvas);
        const controller = new VisualizerController(core, {
            baseParameters: {
                geometryType: 'hypercube',
                dimension: 4,
                rotationSpeed: 0.5
            }
        });
        
        core.start();
        
        // Test data update
        setInterval(() => {
            controller.updateData({
                architect: {
                    confidence: Math.random(),
                    planComplexity: Math.random() * 10
                },
                focus: {
                    temperature: 0.7 + Math.sin(Date.now() * 0.001) * 0.3
                }
            });
        }, 100);
    </script>
</body>
</html>
```

### 3. Test PMK Integration

Create `examples/test-pmk-integration.js`:

```javascript
import { HypercubeCore } from '../core/HypercubeCore.js';
import { VisualizerController } from '../controllers/VisualizerController.js';
import { PMKDataAdapter } from '../controllers/PMKDataAdapter.js';
import { KerbelizedParserator } from '../pmk-integration/parsers/KerbelizedParserator.js';

// Initialize visualization
const canvas = document.getElementById('viz-canvas');
const core = new HypercubeCore(canvas);
const vizController = new VisualizerController(core);
const pmkAdapter = new PMKDataAdapter(vizController);

// Initialize Kerbelized Parserator
const parserator = new KerbelizedParserator({
    maxIterations: 10,
    convergenceThreshold: 0.95
});

// Start visualization
core.start();

// Test parsing with visualization
async function testParse() {
    const testData = {
        contact: "John Doe",
        email: "john@example.com",
        nested: {
            address: "123 Main St",
            phone: "555-0123"
        }
    };
    
    const context = {
        schema: "contact",
        confidence: 0.8,
        mode: "parsing"
    };
    
    // Parse with Kerbelized Parserator
    const result = await parserator.parseWithContext(testData, context);
    
    // Update visualization through PMK adapter
    await pmkAdapter.processPMKUpdate({
        mode: 'parsing',
        architect: {
            confidence: result.confidence,
            planComplexity: result.metadata.focusParams.temperature,
            activeNodes: result.iterations
        },
        ppp: result.metadata.pppProjection,
        focus: result.metadata.focusParams,
        schema: {
            type: 'contact',
            nodeCount: 10
        }
    });
}

// Run test
testParse();
```

## Development Workflow

### 1. Working with Claude Code

When using Claude Code, the assistant will have access to:
- All files in the `.claude/` directory for context
- The ability to create and modify files
- Understanding of the project architecture and goals

### 2. Key Development Tasks

#### Implement Missing Components

Start with these foundational pieces:

**AdaptiveSchemaGraph.js**:
```javascript
export class AdaptiveSchemaGraph {
    constructor(config = {}) {
        this.nodes = new Map();
        this.edges = new Map();
        this.rootSchema = this.createDefaultSchema();
    }
    
    getRootSchema() {
        return this.rootSchema;
    }
    
    async adaptSchema(currentSchema, parseResult) {
        // Implement schema adaptation logic
        return currentSchema;
    }
    
    createDefaultSchema() {
        return {
            type: 'default',
            extractionSteps: [],
            complexity: 1
        };
    }
}
```

**BayesianFocusOptimizer.js**:
```javascript
export class BayesianFocusOptimizer {
    constructor(config = {}) {
        this.history = [];
        this.currentBest = null;
    }
    
    async optimize(params) {
        // Implement Bayesian optimization
        return {
            temperature: params.temperature || 0.7,
            abstractionWeight: params.abstractionWeight || 0.5,
            contextWeight: 0.8
        };
    }
}
```

**TimestampedThoughtBuffer.js**:
```javascript
export class TimestampedThoughtBuffer {
    constructor(config = {}) {
        this.buffer = [];
        this.maxSize = config.maxSize || 1000;
    }
    
    inject(timestamp, data, weight) {
        this.buffer.push({ timestamp, data, weight });
        this.cleanup();
    }
    
    getActivityLevel(timestamp, window) {
        const start = timestamp - window / 2;
        const end = timestamp + window / 2;
        const active = this.buffer.filter(
            item => item.timestamp >= start && item.timestamp <= end
        );
        return active.length / this.maxSize;
    }
    
    getCurrentState() {
        return this.buffer.slice(-100);
    }
    
    getRecentContext() {
        return this.buffer.slice(-10);
    }
    
    cleanup() {
        if (this.buffer.length > this.maxSize) {
            this.buffer = this.buffer.slice(-this.maxSize);
        }
    }
}
```

### 3. Testing Strategy

Create test files for each major component:

```bash
# Unit tests
touch tests/unit/KerbelizedParserator.test.js
touch tests/unit/PPPProjector.test.js
touch tests/unit/PMKDataAdapter.test.js

# Integration tests
touch tests/integration/pmk-visualization.test.js
touch tests/integration/ppp-injection.test.js

# Performance tests
touch tests/performance/data-throughput.test.js
touch tests/performance/rendering.test.js
```

### 4. Documentation Updates

As you develop, update the documentation:

1. **API_REFERENCE.md**: Document all public methods
2. **PARAMETER_MAPPING.md**: Detail the 64 UBO channels and direct parameters
3. **PMK_INTEGRATION.md**: Expand with real examples
4. **SHADER_ARCHITECTURE.md**: Document shader modifications

## Next Steps

1. **Immediate Priority**: 
   - Implement the missing base classes (AdaptiveSchemaGraph, BayesianFocusOptimizer, TimestampedThoughtBuffer)
   - Test the PPP injection mechanism with real data

2. **Week 1-2**:
   - Complete PMK integration with real parserator data
   - Implement circular reasoning detection and visualization
   - Add performance monitoring

3. **Week 3-4**:
   - Build HOAS bridge for higher-order abstractions
   - Implement Bayesian optimization for focus tuning
   - Create demonstration videos

4. **Month 2**:
   - Integrate with 6G robotics simulation
   - Implement edge device coordination
   - Build production-ready API

## Common Issues and Solutions

### WebGL Context Lost
```javascript
canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    setTimeout(() => core.restart(), 1000);
});
```

### Memory Leaks with High-Frequency Updates
- Use the `updateThrottle` in PMKDataAdapter
- Implement buffer cleanup in TimestampedThoughtBuffer
- Monitor with Chrome DevTools Performance tab

### Circular Reasoning Detection
- Check PPPProjector's `circularityMap` for patterns
- Visualize with increased glitch intensity
- Log circular patterns for analysis

## Resources

- [WebGL2 Fundamentals](https://webgl2fundamentals.org/)
- [Bayesian Optimization Tutorial](https://arxiv.org/abs/1807.02811)
- [N-dimensional Visualization Papers](https://scholar.google.com/scholar?q=n-dimensional+data+visualization)

## Support

For questions or issues:
1. Check the `.claude/` documentation
2. Review the examples directory
3. Use Claude Code for implementation help
4. Create GitHub issues for bugs

Remember: The goal is to create a system that breaks the limitations of current LLMs through visual feedback and non-linear reasoning patterns. Every component should contribute to this vision.
