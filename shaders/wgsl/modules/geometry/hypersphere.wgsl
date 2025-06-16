// File: shaders/wgsl/modules/geometry/hypersphere.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// fn rotXW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYW(angle: f32) -> mat4x4<f32> { ... }
// fn rotZW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYZ(angle: f32) -> mat4x4<f32> { ... }
// (And any other necessary matrix ops or math helpers like smoothstep, mix, pow, fract, abs, max, dot, length, sin, cos)

struct HypersphereUniforms {
    density_gridFactor: f32,
    density_channel0Factor: f32,
    shellWidth_channel1Factor: f32,
    phase_tauFactor: f32,
    phase_rotSpeedFactor: f32,
    phase_channel2Factor: f32,
    wCoord_radiusFactor: f32,
    wCoord_timeFactorCos: f32,
    wCoord_pCoeffs: vec3<f32>,
    wCoord_timeFactorSin: f32,
    wCoord_dimFactorOffset: f32,
    wCoord_morphFactor: f32,
    wCoord_channel1Factor: f32,
    baseSpeedFactor: f32,
    rotXW_timeFactor: f32,
    rotXW_channel2Factor: f32,
    rotXW_angleScale: f32,
    // GLSL used time_rot2, time_rot3 with hardcoded values. These are not uniforms.
    // They will be calculated directly in the function if their logic is fixed.
    finalLattice_minUniverseMod: f32,
};

fn calculateLattice_hypersphere(
    p: vec3<f32>,
    global: GlobalUniforms,
    channels: DataChannels,
    geom: HypersphereUniforms,
    project_fn: fn(p4: vec4<f32>, global_uniforms: GlobalUniforms, proj_channels: DataChannels) -> vec3<f32>
) -> f32 {
    let radius3D = length(p);
    // Parameterized densityFactor
    let densityFactor = max(0.1, global.gridDensity * geom.density_gridFactor * (1.0 + channels.pmk_channels[0] * geom.density_channel0Factor));
    // Parameterized dynamicShellWidth
    let dynamicShellWidth = max(0.005, global.shellWidth * (1.0 + channels.pmk_channels[1] * geom.shellWidth_channel1Factor));
    // Parameterized phase calculation (3D)
    let phase = radius3D * densityFactor * geom.phase_tauFactor - global.time * global.rotationSpeed * geom.phase_rotSpeedFactor + channels.pmk_channels[2] * geom.phase_channel2Factor;
    var shells3D = 0.5 + 0.5 * sin(phase);
    shells3D = smoothstep(1.0 - dynamicShellWidth, 1.0, shells3D);

    var finalLattice = shells3D;
    let dim_factor = smoothstep(3.0, 4.5, global.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord calculation
        let w_coord_cos_arg = radius3D * geom.wCoord_radiusFactor - global.time * geom.wCoord_timeFactorCos;
        let w_coord_sin_arg = dot(p, geom.wCoord_pCoeffs) + global.time * geom.wCoord_timeFactorSin;
        let w_coord_overall_factor = dim_factor * (geom.wCoord_dimFactorOffset + global.morphFactor * geom.wCoord_morphFactor + channels.pmk_channels[1] * geom.wCoord_channel1Factor);

        let w_coord = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d = vec4<f32>(p.x, p.y, p.z, w_coord);
        // Parameterized 4D rotations base speed
        let baseSpeed = global.rotationSpeed * geom.baseSpeedFactor;

        let time_rot1 = global.time * geom.rotXW_timeFactor * baseSpeed + channels.pmk_channels[2] * geom.rotXW_channel2Factor;
        // GLSL's time_rot2 and time_rot3 were simplified and used hardcoded values.
        // We'll replicate that simplified logic here.
        // These could be further parameterized with more geom uniforms if needed.
        let time_rot2 = global.time * 0.31 * baseSpeed + global.morphFactor * 0.6;
        let time_rot3 = global.time * -0.24 * baseSpeed + channels.pmk_channels[0] * 0.25;

        p4d = rotXW(time_rot1 * geom.rotXW_angleScale) * p4d;
        p4d = rotYZ(time_rot2) * p4d; // Assuming rotYZ is available
        p4d = rotYW(time_rot3 * 0.95) * p4d; // Assuming rotYW is available; 0.95 could be geom.rotYW_angleScale

        let projectedP = project_fn(p4d, global, channels);
        let radius4D_proj = length(projectedP);
        // Use same parameterized phase factors for 4D
        let phase4D = radius4D_proj * densityFactor * geom.phase_tauFactor - global.time * global.rotationSpeed * geom.phase_rotSpeedFactor + channels.pmk_channels[2] * geom.phase_channel2Factor;
        var shells4D_proj = 0.5 + 0.5 * sin(phase4D);
        shells4D_proj = smoothstep(1.0 - dynamicShellWidth, 1.0, shells4D_proj);
        finalLattice = mix(shells3D, shells4D_proj, smoothstep(0.0, 1.0, global.morphFactor));
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), max(geom.finalLattice_minUniverseMod, global.universeModifier));
}
