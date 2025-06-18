// File: shaders/wgsl/modules/geometry/hypercube.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// fn rotXW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYW(angle: f32) -> mat4x4<f32> { ... }
// fn rotZW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYZ(angle: f32) -> mat4x4<f32> { ... }
// (And any other necessary matrix ops or math helpers like smoothstep, mix, pow, fract, abs, max, dot, length)

struct HypercubeUniforms {
    gridDensity_channel0Factor: f32,
    gridDensity_timeFactor: f32,
    lineThickness_channel1Factor: f32,
    wCoord_pCoeffs1: vec3<f32>,
    wCoord_timeFactor1: f32,
    wCoord_pLengthFactor: f32,
    wCoord_timeFactor2: f32,
    wCoord_channel1Factor: f32,
    wCoord_coeffs2: vec3<f32>,
    baseSpeedFactor: f32,
    rotXW_timeFactor: f32,
    rotXW_channel2Factor: f32,
    rotXW_morphFactor: f32,
    rotYZ_timeFactor: f32,
    rotYZ_channel1Factor: f32,
    rotYZ_morphFactor: f32,
    rotYZ_angleScale: f32,
    rotZW_timeFactor: f32,
    rotZW_channel0Factor: f32,
    rotZW_morphFactor: f32,
    rotZW_angleScale: f32,
    rotYW_timeFactor: f32,
    rotYW_morphFactor: f32,
    finalLattice_minUniverseMod: f32,
};

// The project_fn parameter represents the active projection function (e.g., project4Dto3D_perspective)
// Its signature should match what the projection modules will provide.
// For example: fn(p4: vec4<f32>, global_uniforms: GlobalUniforms, proj_channels: DataChannels, /* specific proj uniforms */ ) -> vec3<f32>
// For simplicity in this isolated module, we'll use a slightly more generic fn signature for project_fn
// and assume the caller (base_fragment.wgsl) will correctly pass the necessary arguments.
fn calculateLattice_hypercube(
    p: vec3<f32>, // Input point (typically from raymarching in world or camera space)
    global: GlobalUniforms,
    channels: DataChannels,
    geom: HypercubeUniforms,
    project_fn: fn(p4: vec4<f32>, global_uniforms: GlobalUniforms, proj_channels: DataChannels) -> vec3<f32>
) -> f32 {
    // Parameterized dynamicGridDensity
    let dynamicGridDensity = max(0.1, global.gridDensity * (1.0 + channels.pmk_channels[0] * geom.gridDensity_channel0Factor));
    // Parameterized dynamicLineThickness
    let dynamicLineThickness = max(0.002, global.lineThickness * (1.0 - channels.pmk_channels[1] * geom.lineThickness_channel1Factor));

    // Use u_geom_hypercube_gridDensity_timeFactor for time-based grid animation
    let p_grid3D = fract(p * dynamicGridDensity * 0.5 + global.time * geom.gridDensity_timeFactor);
    let dist3D = abs(p_grid3D - vec3<f32>(0.5));
    let box3D = max(dist3D.x, max(dist3D.y, dist3D.z));
    var finalLattice = smoothstep(0.5, 0.5 - dynamicLineThickness, box3D);

    let dim_factor = smoothstep(3.0, 4.5, global.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord calculation
        let w_coord_sin_arg = dot(p, geom.wCoord_pCoeffs1) + global.time * geom.wCoord_timeFactor1;
        let w_coord_cos_arg = length(p) * geom.wCoord_pLengthFactor - global.time * geom.wCoord_timeFactor2 + channels.pmk_channels[1] * geom.wCoord_channel1Factor;
        let w_coord_factor_coeffs = geom.wCoord_coeffs2.x + global.morphFactor * geom.wCoord_coeffs2.y + channels.pmk_channels[2] * geom.wCoord_coeffs2.z;

        let w_coord = sin(w_coord_sin_arg) * cos(w_coord_cos_arg) * dim_factor * w_coord_factor_coeffs;

        var p4d = vec4<f32>(p.x, p.y, p.z, w_coord); // Ensure correct construction
        let baseSpeed = global.rotationSpeed * geom.baseSpeedFactor;

        // Parameterized 4D rotations
        let time_rot1 = global.time * geom.rotXW_timeFactor * baseSpeed + channels.pmk_channels[2] * geom.rotXW_channel2Factor + global.morphFactor * geom.rotXW_morphFactor;
        let time_rot2 = global.time * geom.rotYZ_timeFactor * baseSpeed - channels.pmk_channels[1] * geom.rotYZ_channel1Factor + global.morphFactor * geom.rotYZ_morphFactor;
        let time_rot3 = global.time * geom.rotZW_timeFactor * baseSpeed + channels.pmk_channels[0] * geom.rotZW_channel0Factor + global.morphFactor * geom.rotZW_morphFactor;

        // WGSL matrix multiplication is M * v
        p4d = rotXW(time_rot1) * p4d;
        p4d = rotYZ(time_rot2 * geom.rotYZ_angleScale) * p4d;
        p4d = rotZW(time_rot3 * geom.rotZW_angleScale) * p4d;


        let finalYW_rot_angle = global.time * geom.rotYW_timeFactor * baseSpeed + global.morphFactor * geom.rotYW_morphFactor;
        p4d = rotYW(finalYW_rot_angle) * p4d;

        // project_fn will require specific projection uniforms, passed by the main shader.
        // The signature of project_fn here is simplified for what this function itself passes.
        // The actual project_fn (e.g., project4Dto3D_perspective) will have its own proj_uniforms arg.
        let projectedP = project_fn(p4d, global, channels);

        let p_grid4D_proj = fract(projectedP * dynamicGridDensity * 0.5 + global.time * (geom.gridDensity_timeFactor + 0.005));
        let dist4D_proj = abs(p_grid4D_proj - vec3<f32>(0.5));
        let box4D_proj = max(dist4D_proj.x, max(dist4D_proj.y, dist4D_proj.z));
        let lattice4D_proj = smoothstep(0.5, 0.5 - dynamicLineThickness, box4D_proj);
        finalLattice = mix(finalLattice, lattice4D_proj, smoothstep(0.0, 1.0, global.morphFactor));
    }
    // Parameterized finalLattice power
    return pow(finalLattice, 1.0 / max(geom.finalLattice_minUniverseMod, global.universeModifier));
}
