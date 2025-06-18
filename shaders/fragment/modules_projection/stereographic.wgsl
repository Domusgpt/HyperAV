// File: shaders/wgsl/modules/projection/stereographic.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// (And any necessary math helpers like sign, max, abs, normalize, smoothstep, mix)

struct StereographicUniforms {
    basePoleW: f32,
    channelImpact: f32,
    epsilon: f32,
    singularityScale: f32,
    morphFactorImpact: f32,
};

fn project4Dto3D_stereographic(
    p: vec4<f32>,                // Input 4D point
    global: GlobalUniforms,      // Global uniforms (e.g., u_morphFactor)
    channels: DataChannels,    // Data channels (e.g., pmk_channels)
    proj: StereographicUniforms   // Specific uniforms for this projection
) -> vec3<f32> {
    let dynamicPoleW = sign(proj.basePoleW) * max(0.1, abs(proj.basePoleW + channels.pmk_channels[2] * proj.channelImpact * sign(proj.basePoleW)));
    let denominator = p.w - dynamicPoleW;

    var projectedP: vec3<f32>;
    if (abs(denominator) < proj.epsilon) {
        projectedP = normalize(p.xyz + vec3<f32>(proj.epsilon, proj.epsilon, proj.epsilon)) * proj.singularityScale; // Added epsilon to all components of vec3 for safety, matching normalize intent
    } else {
        // The GLSL was: float scale = (-dynamicPoleW) / denominator;
        // However, standard stereographic projection from a pole 'P' to a hyperplane is often (point - P_on_hyperplane) * scale_factor.
        // A common formulation for projecting from a pole (0,0,0,PoleW) to hyperplane w=0 is p.xyz * (-PoleW / (p.w - PoleW)).
        // Let's stick to the GLSL provided:
        let scale = (-dynamicPoleW) / denominator; // This implies projecting towards the origin on the hyperplane.
        projectedP = p.xyz * scale;
    }

    let morphT = smoothstep(0.0, 1.0, global.morphFactor * proj.morphFactorImpact);

    // The GLSL mixes with p.xyz (orthographic component).
    // This might be an intentional effect or a simplification.
    let orthoP = p.xyz;
    return mix(projectedP, orthoP, morphT);
}
