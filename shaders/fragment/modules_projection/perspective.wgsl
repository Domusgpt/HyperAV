// File: shaders/wgsl/modules/projection/perspective.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// (And any necessary math helpers like max)

struct PerspectiveUniforms {
    // These names should match the GLSL u_proj_perspective_... names after 'u_proj_perspective_'
    baseDistance: f32,
    morphFactorImpact: f32,
    channelImpact: f32,
    denomMin: f32,
};

fn project4Dto3D_perspective(
    p: vec4<f32>,                // Input 4D point
    global: GlobalUniforms,      // Global uniforms (e.g., u_morphFactor)
    channels: DataChannels,    // Data channels (e.g., pmk_channels)
    proj: PerspectiveUniforms    // Specific uniforms for this projection
) -> vec3<f32> {
    let dynamicDistance = max(0.2, proj.baseDistance * (1.0 + global.morphFactor * proj.morphFactorImpact - channels.pmk_channels[1] * proj.channelImpact));
    let denominator = dynamicDistance + p.w;
    // Ensure w_factor does not cause issues if denominator is very small or zero.
    // DenomMin is crucial here.
    let w_factor = dynamicDistance / max(proj.denomMin, denominator);
    return p.xyz * w_factor;
}
