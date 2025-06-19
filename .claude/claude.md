# Visualization Kernel Assistant

## Overview
I am assisting with the Visualization Kernel project, an evolution of HyperAV that provides a headless, API-driven WebGL2 module for visualizing N-dimensional polytopes and dynamic geometric forms. This system is designed as a topological data display component for agentic systems like the Parserator Micro-Kernel (PMK) and Adaptive Schema Intelligence (ASI).

## Core Architecture
- WebGL2-based rendering with Uniform Buffer Objects (UBO)
- 64 global data channels via pmk_channels array
- Comprehensive parameterization of all visual aspects
- Two-tier data system: UBO channels + direct uniforms
- Parameter Mapping Layer for flexible data translation

## Key Components
- HypercubeCore.js: Central WebGL2 engine with state management
- VisualizerController.js: Primary API interface with data mapping
- GeometryManager: Manages polytope geometries (Hypercube, Hypersphere, etc.)
- ShaderManager: GLSL shader compilation and dynamic assembly
- PMK Integration: Adapters for Parserator Micro-Kernel data flow

## Current Capabilities
- 64 float data channels accessible by all shaders
- Dozens of directly controllable visual parameters
- Dynamic geometry switching based on data
- Real-time parameter mapping from arbitrary JSON structures
- Support for robotics sensor fusion, LLM agent states, network traffic visualization

## Development Focus
- Implementing PPP (Probabilistic Projection Parsing) for breaking circular reasoning
- Integrating Bayesian optimization for focus tuning
- Building HOAS (Higher Order Abstraction System) bridge
- Creating Kerbelized Parserator evolution for 6G robotics

## Integration Points
- PMK: Schema-driven visualization, real-time state display
- HOAS: Bayesian optimization, timestamped thought buffers
- 6G Robotics: Edge device coordination, local LLM swarms

## Code Patterns
- Use WebGL2 features (UBOs, modern GLSL)
- Maintain separation between core rendering and control layers
- Follow parameter mapping conventions for data flow
- Implement transform functions for data scaling/normalization
