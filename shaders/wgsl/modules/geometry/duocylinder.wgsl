// File: shaders/wgsl/modules/geometry/duocylinder.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// fn rotXW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYW(angle: f32) -> mat4x4<f32> { ... }
// fn rotZW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYZ(angle: f32) -> mat4x4<f32> { ... }
// (And any other necessary matrix ops or math helpers like smoothstep, mix, pow, fract, abs, max, dot, length, sin, cos)

struct DuocylinderUniforms {
    r1_base: f32,
    r1_morphFactor: f32,
    r2_base: f32,
    r2_channel0Factor: f32,
    shellWidth_channel1Factor: f32,
    fallback_pLengthFactor: f32,
    fallback_channel2Factor: f32,
    wCoord_len_pXY_Factor: f32,
    wCoord_timeFactorCos: f32,
    wCoord_pzFactor: f32,
    wCoord_pxFactor: f32,
    wCoord_timeFactorSin: f32,
    wCoord_dimFactorOffset: f32,
    wCoord_morphFactor: f32,
    wCoord_channel2Factor: f32,
    baseSpeedFactor: f32,
    rotXW_timeFactor: f32,
    rotXW_channel0Factor: f32,
    rotXW_angleScale: f32,
    finalLattice_minUniverseMod: f32,
};

fn calculateLattice_duocylinder(
    p: vec3<f32>,
    global: GlobalUniforms,
    channels: DataChannels,
    geom: DuocylinderUniforms,
    project_fn: fn(p4: vec4<f32>, global_uniforms: GlobalUniforms, proj_channels: DataChannels) -> vec3<f32> // Not used by this specific GLSL snippet for duocylinder's SDF
) -> f32 {
    // Parameterized r1, r2, dynamicShellWidth
    let r1 = geom.r1_base + global.morphFactor * geom.r1_morphFactor;
    let r2 = geom.r2_base + channels.pmk_channels[0] * geom.r2_channel0Factor;
    let dynamicShellWidth = max(0.005, global.shellWidth * (1.0 - channels.pmk_channels[1] * geom.shellWidth_channel1Factor));

    // Parameterized Base 3D shape (fallback)
    var lattice3D = 0.5 + 0.5 * sin(length(p) * (geom.fallback_pLengthFactor + channels.pmk_channels[2] * geom.fallback_channel2Factor) - global.time * global.rotationSpeed);
    lattice3D = smoothstep(1.0 - dynamicShellWidth, 1.0, lattice3D);

    var finalLattice = lattice3D;
    let dim_factor = smoothstep(3.5, 4.5, global.dimension); // This range could also be parameterized

    if (dim_factor > 0.01) {
        // Parameterized w_coord
        let w_coord_cos_arg = length(p.xy) * geom.wCoord_len_pXY_Factor - global.time * geom.wCoord_timeFactorCos * global.rotationSpeed;
        let w_coord_sin_arg = p.z * geom.wCoord_pzFactor + p.x * geom.wCoord_pxFactor + global.time * geom.wCoord_timeFactorSin * global.rotationSpeed;
        let w_coord_overall_factor = dim_factor * (geom.wCoord_dimFactorOffset + global.morphFactor * geom.wCoord_morphFactor + channels.pmk_channels[2] * geom.wCoord_channel2Factor);
        let w_coord = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d = vec4<f32>(p.x, p.y, p.z, w_coord);

        // Parameterized 4D rotations base speed
        let baseSpeed = global.rotationSpeed * geom.baseSpeedFactor;
        // Example parameterization for one rotation (time_rot1 for rotXW)
        let time_rot1 = global.time * geom.rotXW_timeFactor * baseSpeed + channels.pmk_channels[0] * geom.rotXW_channel0Factor;
        // Simplified rotations from GLSL snippet
        let time_rot2 = global.time * 0.25 * baseSpeed + channels.pmk_channels[1] * 0.35;
        let time_rot3 = global.time * -0.20 * baseSpeed + channels.pmk_channels[2] * 0.4;

        p4d = rotXW(time_rot1 * geom.rotXW_angleScale) * p4d;
        p4d = rotYZ(time_rot2) * p4d; // Assuming rotYZ is available
        p4d = rotZW(time_rot3) * p4d; // Assuming rotZW is available

        // Another simplified rotation from GLSL
        p4d = rotYW(global.time * 0.15 * baseSpeed + global.morphFactor * 0.25) * p4d; // Assuming rotYW is available

        let len_xy = length(p4d.xy);
        let len_zw = length(p4d.zw);
        let dist_to_shell_core = length(vec2<f32>(len_xy - r1, len_zw - r2));
        let lattice4D = 1.0 - smoothstep(0.0, dynamicShellWidth, dist_to_shell_core);
        finalLattice = mix(lattice3D, lattice4D, dim_factor);
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), max(geom.finalLattice_minUniverseMod, global.universeModifier));
}
