// File: shaders/wgsl/modules/geometry/hypertetrahedron.wgsl

// Assumed to be in scope from base_fragment.wgsl or a common module:
// struct GlobalUniforms { ... }
// struct DataChannels { ... }
// fn rotXW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYW(angle: f32) -> mat4x4<f32> { ... }
// fn rotZW(angle: f32) -> mat4x4<f32> { ... }
// fn rotYZ(angle: f32) -> mat4x4<f32> { ... } // Though not used in this specific GLSL snippet directly
// (And any other necessary matrix ops or math helpers like smoothstep, mix, pow, fract, abs, max, dot, length, sin, cos, normalize, min)

struct HypertetrahedronUniforms {
    density_gridFactor: f32,
    density_channel0Factor: f32,
    thickness_channel1Factor: f32,
    pMod3D_timeFactor: f32,
    wCoord_pCoeffsCos: vec3<f32>,
    wCoord_timeFactorCos: f32,
    wCoord_pLengthFactor: f32,
    wCoord_timeFactorSin: f32,
    wCoord_channel1Factor: f32,
    wCoord_dimFactorOffset: f32,
    wCoord_morphFactor: f32,
    wCoord_channel2Factor: f32,
    baseSpeedFactor: f32,
    rotXW_timeFactor: f32,
    rotXW_channel2Factor: f32,
    rotXW_angleScale: f32,
    pMod4D_timeFactor: f32,
    finalLattice_minUniverseMod: f32,
    // GLSL used time_rot2, time_rot3 with hardcoded factors. These are not uniforms.
    // They will be calculated directly in the function if their logic is fixed.
};

fn calculateLattice_hypertetrahedron(
    p: vec3<f32>,
    global: GlobalUniforms,
    channels: DataChannels,
    geom: HypertetrahedronUniforms,
    project_fn: fn(p4: vec4<f32>, global_uniforms: GlobalUniforms, proj_channels: DataChannels) -> vec3<f32>
) -> f32 {
    // Parameterized density and thickness
    let density = max(0.1, global.gridDensity * geom.density_gridFactor * (1.0 + channels.pmk_channels[0] * geom.density_channel0Factor));
    let dynamicThickness = max(0.003, global.tetraThickness * (1.0 - channels.pmk_channels[1] * geom.thickness_channel1Factor));

    let c1 = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let c2 = normalize(vec3<f32>(-1.0, -1.0, 1.0));
    let c3 = normalize(vec3<f32>(-1.0, 1.0, -1.0));
    let c4 = normalize(vec3<f32>(1.0, -1.0, -1.0));

    // Parameterized p_mod3D time factor
    let p_mod3D = fract(p * density * 0.5 + 0.5 + global.time * geom.pMod3D_timeFactor) - vec3<f32>(0.5);
    let d1 = dot(p_mod3D, c1);
    let d2 = dot(p_mod3D, c2);
    let d3 = dot(p_mod3D, c3);
    let d4 = dot(p_mod3D, c4);
    let minDistToPlane3D = min(min(abs(d1), abs(d2)), min(abs(d3), abs(d4)));
    let lattice3D = 1.0 - smoothstep(0.0, dynamicThickness, minDistToPlane3D);

    var finalLattice = lattice3D;
    let dim_factor = smoothstep(3.0, 4.5, global.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord
        let w_coord_cos_arg = dot(p, geom.wCoord_pCoeffsCos) + global.time * geom.wCoord_timeFactorCos;
        let w_coord_sin_arg = length(p) * geom.wCoord_pLengthFactor + global.time * geom.wCoord_timeFactorSin - channels.pmk_channels[1] * geom.wCoord_channel1Factor;
        let w_coord_overall_factor = dim_factor * (geom.wCoord_dimFactorOffset + global.morphFactor * geom.wCoord_morphFactor + channels.pmk_channels[2] * geom.wCoord_channel2Factor);
        let w_coord = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d = vec4<f32>(p.x, p.y, p.z, w_coord);
        // Parameterized baseSpeed for rotations
        let baseSpeed = global.rotationSpeed * geom.baseSpeedFactor;

        // Example parameterization for one rotation (time_rot1 for rotXW)
        let time_rot1 = global.time * geom.rotXW_timeFactor * baseSpeed + channels.pmk_channels[2] * geom.rotXW_channel2Factor;
        // GLSL's time_rot2 and time_rot3 were simplified.
        let time_rot2 = global.time * 0.36 * baseSpeed - channels.pmk_channels[0] * 0.2 + global.morphFactor * 0.4;
        let time_rot3 = global.time * 0.32 * baseSpeed + channels.pmk_channels[1] * 0.15;

        p4d = rotXW(time_rot1 * geom.rotXW_angleScale) * p4d;
        p4d = rotYW(time_rot2 * 1.05) * p4d; // Assuming rotYW is available; 1.05 could be geom.rotYW_angleScale
        p4d = rotZW(time_rot3) * p4d; // Assuming rotZW is available

        let projectedP = project_fn(p4d, global, channels);

        // Parameterized p_mod4D_proj time factor
        let p_mod4D_proj = fract(projectedP * density * 0.5 + 0.5 + global.time * geom.pMod4D_timeFactor) - vec3<f32>(0.5);
        let dp1 = dot(p_mod4D_proj, c1);
        let dp2 = dot(p_mod4D_proj, c2);
        let dp3 = dot(p_mod4D_proj, c3);
        let dp4 = dot(p_mod4D_proj, c4);
        let minDistToPlane4D = min(min(abs(dp1), abs(dp2)), min(abs(dp3), abs(dp4)));
        let lattice4D_proj = 1.0 - smoothstep(0.0, dynamicThickness, minDistToPlane4D);
        finalLattice = mix(lattice3D, lattice4D_proj, smoothstep(0.0, 1.0, global.morphFactor));
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), max(geom.finalLattice_minUniverseMod, global.universeModifier));
}
