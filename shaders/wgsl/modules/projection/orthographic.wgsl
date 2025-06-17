// File: shaders/wgsl/modules/projection/orthographic.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// (And any necessary math helpers like max, smoothstep, mix)

struct OrthographicUniforms {
    // The GLSL example uses hardcoded values for basePerspectiveDistance, channelImpact, and denomMin
    // within the orthographic shader when it mixes with a perspective-like calculation.
    // If these are intended to be configurable specifically for this projection's "perspective mix" part,
    // they should be defined here.
    // For this translation, we'll make them configurable as suggested by the target structure.
    basePerspectiveDistance: f32, // e.g., GLSL had 2.5 hardcoded
    channelImpact: f32,         // e.g., GLSL had 0.4 hardcoded for pmk_channels[1]
    denomMin: f32,              // e.g., GLSL had 0.1 hardcoded for max()
};

fn project4Dto3D_orthographic(
    p: vec4<f32>,                // Input 4D point
    global: GlobalUniforms,      // Global uniforms (e.g., u_morphFactor)
    channels: DataChannels,    // Data channels (e.g., pmk_channels)
    proj: OrthographicUniforms   // Specific uniforms for this projection's perspective mix part
) -> vec3<f32> {
    let orthoP = p.xyz;

    // The "perspective" part that gets mixed in:
    let dynamicPerspectiveDistance = max(0.2, proj.basePerspectiveDistance * (1.0 - channels.pmk_channels[1] * proj.channelImpact));
    let perspDenominator = dynamicPerspectiveDistance + p.w;
    let persp_w_factor = dynamicPerspectiveDistance / max(proj.denomMin, perspDenominator);
    let perspP = p.xyz * persp_w_factor;

    let morphT = smoothstep(0.0, 1.0, global.morphFactor);
    return mix(orthoP, perspP, morphT);
}
