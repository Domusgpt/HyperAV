/* core/GeometryManager.js - v1.4 -- WebGPU Refactor Part 1 */
class BaseGeometry {
    constructor() {}
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error(`getShaderCode() is deprecated. Use getWGSLShaderCode().`); }

    /**
     * Gets the WGSL shader code snippet for this geometry.
     * For SDF types, this is typically the signed distance function.
     * For full-screen effects, this might be the entire fragment shader logic.
     * @param {string} type - Type of WGSL code to return (e.g., 'fragment_module', 'sdf_function').
     * @returns {string} WGSL code string.
     */
    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        return `// BaseGeometry WGSL code placeholder for type: ${type}\n`;
    }

    /**
     * Gets the GPUBindGroupLayoutEntry array for this geometry's specific uniforms.
     * @param {number} groupIndex - The target bind group index (e.g., 1 for geometry uniforms).
     * @returns {Array<GPUBindGroupLayoutEntry>} An array of layout entries.
     */
    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return []; // Base class has no specific uniforms
    }

    /**
     * Gets the WGSL struct definition for this geometry's uniforms.
     * @returns {string|null} WGSL struct definition string, or null if no uniforms.
     */
    getUniformBufferWGSLStruct() {
        return null; // Base class has no specific uniforms
    }
}

class HypercubeGeometry extends BaseGeometry {
    getUniformBufferWGSLStruct() {
        return `
struct HypercubeUniforms {
    gridDensity_channel0Factor: f32,
    gridDensity_timeFactor: f32,
    lineThickness_channel1Factor: f32,
    wCoord_pCoeffs1: vec3<f32>,
    wCoord_timeFactor1: f32,
    wCoord_pLengthFactor: f32,
    wCoord_timeFactor2: f32,
    wCoord_channel1Factor: f32,
    wCoord_coeffs2: vec3<f32>, // Assuming vec3 based on GLSL (x,y,z access)
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
    // Add padding if necessary for std140 layout if this struct is used directly in a UBO
    // For now, assuming direct packing. WebGPU's default layout rules are less strict than std140 for some cases.
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0, // Binding index within this group for HypercubeUniforms
            visibility: GPUShaderStage.FRAGMENT, // Assuming SDF is calculated in fragment shader
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        // Assumes globalUniforms, dataChannels are available in the shader scope.
        // Assumes rotation matrices (rotXW etc.) and project4Dto3D are also globally available.
        return `
fn calculateHypercubeSDF(p_world: vec3<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, geomUniforms: HypercubeUniforms) -> f32 {
    // Parameterized dynamicGridDensity
    let dynamicGridDensity:f32 = max(0.1, globalUniforms.gridDensity * (1.0 + dataChannels.pmk_channels[0] * geomUniforms.gridDensity_channel0Factor));
    // Parameterized dynamicLineThickness
    let dynamicLineThickness:f32 = max(0.002, globalUniforms.lineThickness * (1.0 - dataChannels.pmk_channels[1] * geomUniforms.lineThickness_channel1Factor));

    // Use geomUniforms.gridDensity_timeFactor for time-based grid animation
    let p_grid3D:vec3<f32> = fract(p_world * dynamicGridDensity * 0.5 + globalUniforms.time * geomUniforms.gridDensity_timeFactor);
    let dist3D:vec3<f32> = abs(p_grid3D - 0.5);
    let box3D:f32 = max(dist3D.x, max(dist3D.y, dist3D.z));
    let lattice3D:f32 = smoothstep(0.5, 0.5 - dynamicLineThickness, box3D);

    var finalLattice:f32 = lattice3D;
    let dim_factor:f32 = smoothstep(3.0, 4.5, globalUniforms.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord calculation
        let w_coord_sin_arg:f32 = dot(p_world, geomUniforms.wCoord_pCoeffs1) + globalUniforms.time * geomUniforms.wCoord_timeFactor1;
        let w_coord_cos_arg:f32 = length(p_world) * geomUniforms.wCoord_pLengthFactor - globalUniforms.time * geomUniforms.wCoord_timeFactor2 + dataChannels.pmk_channels[1] * geomUniforms.wCoord_channel1Factor;
        let w_coord_factor_coeffs:f32 = geomUniforms.wCoord_coeffs2.x + globalUniforms.morphFactor * geomUniforms.wCoord_coeffs2.y + dataChannels.pmk_channels[2] * geomUniforms.wCoord_coeffs2.z;

        let w_coord:f32 = sin(w_coord_sin_arg) * cos(w_coord_cos_arg) * dim_factor * w_coord_factor_coeffs;

        var p4d:vec4<f32> = vec4<f32>(p_world, w_coord);
        let baseSpeed:f32 = globalUniforms.rotationSpeed * geomUniforms.baseSpeedFactor;

        // Parameterized 4D rotations
        let time_rot1:f32 = globalUniforms.time * geomUniforms.rotXW_timeFactor * baseSpeed + dataChannels.pmk_channels[2] * geomUniforms.rotXW_channel2Factor + globalUniforms.morphFactor * geomUniforms.rotXW_morphFactor;
        let time_rot2:f32 = globalUniforms.time * geomUniforms.rotYZ_timeFactor * baseSpeed - dataChannels.pmk_channels[1] * geomUniforms.rotYZ_channel1Factor + globalUniforms.morphFactor * geomUniforms.rotYZ_morphFactor;
        let time_rot3:f32 = globalUniforms.time * geomUniforms.rotZW_timeFactor * baseSpeed + dataChannels.pmk_channels[0] * geomUniforms.rotZW_channel0Factor + globalUniforms.morphFactor * geomUniforms.rotZW_morphFactor;

        // WGSL matrix multiplication order is M * v
        p4d = rotXW(time_rot1) * rotYZ(time_rot2 * geomUniforms.rotYZ_angleScale) * rotZW(time_rot3 * geomUniforms.rotZW_angleScale) * p4d;

        let finalYW_rot_angle:f32 = globalUniforms.time * geomUniforms.rotYW_timeFactor * baseSpeed + globalUniforms.morphFactor * geomUniforms.rotYW_morphFactor;
        p4d = rotYW(finalYW_rot_angle) * p4d;

        // Assuming project4Dto3D is globally available (e.g. from base_fragment.wgsl or projection module)
        let projectedP:vec3<f32> = project4Dto3D_placeholder(p4d); // Using placeholder for now

        // Use geomUniforms.gridDensity_timeFactor for 4D grid animation too (or a new one)
        let p_grid4D_proj:vec3<f32> = fract(projectedP * dynamicGridDensity * 0.5 + globalUniforms.time * (geomUniforms.gridDensity_timeFactor + 0.005)); // slight variation for 4D
        let dist4D_proj:vec3<f32> = abs(p_grid4D_proj - 0.5);
        let box4D_proj:f32 = max(dist4D_proj.x, max(dist4D_proj.y, dist4D_proj.z));
        let lattice4D_proj:f32 = smoothstep(0.5, 0.5 - dynamicLineThickness, box4D_proj);
        finalLattice = mix(lattice3D, lattice4D_proj, smoothstep(0.0, 1.0, globalUniforms.morphFactor));
    }
    // Parameterized finalLattice power
    return pow(finalLattice, 1.0 / max(geomUniforms.finalLattice_minUniverseMod, globalUniforms.universeModifier));
}
`;
    }
}

class HypersphereGeometry extends BaseGeometry {
    getUniformBufferWGSLStruct() {
        return `
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
    finalLattice_minUniverseMod: f32,
    // TODO: Add other geom_hsphere_... uniforms if they were missed from DEFAULT_STATE
    // For example, the GLSL mentions time_rot2 and time_rot3 were simplified, implying more uniforms.
    // rotYZ_timeFactor, rotYZ_morphFactor, rotYW_timeFactor etc. might be needed.
    // For now, using what was explicitly in DEFAULT_STATE for geom_hsphere_
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        return `
fn calculateHypersphereSDF(p_world: vec3<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, geomUniforms: HypersphereUniforms) -> f32 {
    let radius3D:f32 = length(p_world);
    // Parameterized densityFactor
    let densityFactor:f32 = max(0.1, globalUniforms.gridDensity * geomUniforms.density_gridFactor * (1.0 + dataChannels.pmk_channels[0] * geomUniforms.density_channel0Factor));
    // Parameterized dynamicShellWidth
    let dynamicShellWidth:f32 = max(0.005, globalUniforms.shellWidth * (1.0 + dataChannels.pmk_channels[1] * geomUniforms.shellWidth_channel1Factor));
    // Parameterized phase calculation (3D)
    let phase:f32 = radius3D * densityFactor * geomUniforms.phase_tauFactor - globalUniforms.time * globalUniforms.rotationSpeed * geomUniforms.phase_rotSpeedFactor + dataChannels.pmk_channels[2] * geomUniforms.phase_channel2Factor;
    var shells3D:f32 = 0.5 + 0.5 * sin(phase);
    shells3D = smoothstep(1.0 - dynamicShellWidth, 1.0, shells3D);

    var finalLattice:f32 = shells3D;
    let dim_factor:f32 = smoothstep(3.0, 4.5, globalUniforms.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord calculation
        let w_coord_cos_arg:f32 = radius3D * geomUniforms.wCoord_radiusFactor - globalUniforms.time * geomUniforms.wCoord_timeFactorCos;
        let w_coord_sin_arg:f32 = dot(p_world, geomUniforms.wCoord_pCoeffs) + globalUniforms.time * geomUniforms.wCoord_timeFactorSin;
        let w_coord_overall_factor:f32 = dim_factor * (geomUniforms.wCoord_dimFactorOffset + globalUniforms.morphFactor * geomUniforms.wCoord_morphFactor + dataChannels.pmk_channels[1] * geomUniforms.wCoord_channel1Factor);

        let w_coord:f32 = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d:vec4<f32> = vec4<f32>(p_world, w_coord);
        // Parameterized 4D rotations base speed
        let baseSpeed:f32 = globalUniforms.rotationSpeed * geomUniforms.baseSpeedFactor;
        // Example parameterization for one rotation (time_rot1 for rotXW) - others would follow similar pattern
        let time_rot1:f32 = globalUniforms.time * geomUniforms.rotXW_timeFactor * baseSpeed + dataChannels.pmk_channels[2] * geomUniforms.rotXW_channel2Factor;

        // Simplified rotations from GLSL, assuming these factors would be part of a more complete HypersphereUniforms struct
        let time_rot2:f32 = globalUniforms.time * 0.31 * baseSpeed + globalUniforms.morphFactor * 0.6;
        let time_rot3:f32 = globalUniforms.time * -0.24 * baseSpeed + dataChannels.pmk_channels[0] * 0.25;

        p4d = rotXW(time_rot1 * geomUniforms.rotXW_angleScale) * rotYZ(time_rot2) * rotYW(time_rot3 * 0.95) * p4d; // rotYW's 0.95 could be geomUniforms.rotYW_angleScale

        let projectedP:vec3<f32> = project4Dto3D_placeholder(p4d);
        let radius4D_proj:f32 = length(projectedP);
        // Use same parameterized phase factors for 4D
        let phase4D:f32 = radius4D_proj * densityFactor * geomUniforms.phase_tauFactor - globalUniforms.time * globalUniforms.rotationSpeed * geomUniforms.phase_rotSpeedFactor + dataChannels.pmk_channels[2] * geomUniforms.phase_channel2Factor;
        var shells4D_proj:f32 = 0.5 + 0.5 * sin(phase4D);
        shells4D_proj = smoothstep(1.0 - dynamicShellWidth, 1.0, shells4D_proj);
        finalLattice = mix(shells3D, shells4D_proj, smoothstep(0.0, 1.0, globalUniforms.morphFactor));
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), 1.0 / max(geomUniforms.finalLattice_minUniverseMod, globalUniforms.universeModifier));
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("HypersphereGeometry: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class HypertetrahedronGeometry extends BaseGeometry {
    getUniformBufferWGSLStruct() {
        return `
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
    // TODO: Add other geom_htetra_... uniforms if they were missed from DEFAULT_STATE
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        return `
fn calculateHypertetrahedronSDF(p_world: vec3<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, geomUniforms: HypertetrahedronUniforms) -> f32 {
    // Parameterized density and thickness
    let density:f32 = max(0.1, globalUniforms.gridDensity * geomUniforms.density_gridFactor * (1.0 + dataChannels.pmk_channels[0] * geomUniforms.density_channel0Factor));
    let dynamicThickness:f32 = max(0.003, globalUniforms.tetraThickness * (1.0 - dataChannels.pmk_channels[1] * geomUniforms.thickness_channel1Factor));

    let c1:vec3<f32> = normalize(vec3<f32>(1.0,1.0,1.0));
    let c2:vec3<f32> = normalize(vec3<f32>(-1.0,-1.0,1.0));
    let c3:vec3<f32> = normalize(vec3<f32>(-1.0,1.0,-1.0));
    let c4:vec3<f32> = normalize(vec3<f32>(1.0,-1.0,-1.0));
    // Parameterized p_mod3D time factor
    let p_mod3D:vec3<f32> = fract(p_world * density * 0.5 + 0.5 + globalUniforms.time * geomUniforms.pMod3D_timeFactor) - 0.5;
    let d1:f32 = dot(p_mod3D, c1);
    let d2:f32 = dot(p_mod3D, c2);
    let d3:f32 = dot(p_mod3D, c3);
    let d4:f32 = dot(p_mod3D, c4);
    let minDistToPlane3D:f32 = min(min(abs(d1), abs(d2)), min(abs(d3), abs(d4)));
    let lattice3D:f32 = 1.0 - smoothstep(0.0, dynamicThickness, minDistToPlane3D);

    var finalLattice:f32 = lattice3D;
    let dim_factor:f32 = smoothstep(3.0, 4.5, globalUniforms.dimension);

    if (dim_factor > 0.01) {
        // Parameterized w_coord
        let w_coord_cos_arg:f32 = dot(p_world, geomUniforms.wCoord_pCoeffsCos) + globalUniforms.time * geomUniforms.wCoord_timeFactorCos;
        let w_coord_sin_arg:f32 = length(p_world) * geomUniforms.wCoord_pLengthFactor + globalUniforms.time * geomUniforms.wCoord_timeFactorSin - dataChannels.pmk_channels[1] * geomUniforms.wCoord_channel1Factor;
        let w_coord_overall_factor:f32 = dim_factor * (geomUniforms.wCoord_dimFactorOffset + globalUniforms.morphFactor * geomUniforms.wCoord_morphFactor + dataChannels.pmk_channels[2] * geomUniforms.wCoord_channel2Factor);
        let w_coord:f32 = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d:vec4<f32> = vec4<f32>(p_world, w_coord);
        // Parameterized baseSpeed for rotations
        let baseSpeed:f32 = globalUniforms.rotationSpeed * geomUniforms.baseSpeedFactor;
        // Example parameterization for one rotation (time_rot1 for rotXW)
        let time_rot1:f32 = globalUniforms.time * geomUniforms.rotXW_timeFactor * baseSpeed + dataChannels.pmk_channels[2] * geomUniforms.rotXW_channel2Factor;
        // Simplified rotations from GLSL, assuming these factors would be part of a more complete HypertetrahedronUniforms struct
        let time_rot2:f32 = globalUniforms.time * 0.36 * baseSpeed - dataChannels.pmk_channels[0] * 0.2 + globalUniforms.morphFactor * 0.4;
        let time_rot3:f32 = globalUniforms.time * 0.32 * baseSpeed + dataChannels.pmk_channels[1] * 0.15;

        p4d = rotXW(time_rot1 * geomUniforms.rotXW_angleScale) * rotYW(time_rot2 * 1.05) * rotZW(time_rot3) * p4d; // Simplified scales

        let projectedP:vec3<f32> = project4Dto3D_placeholder(p4d);

        // Parameterized p_mod4D_proj time factor
        let p_mod4D_proj:vec3<f32> = fract(projectedP * density * 0.5 + 0.5 + globalUniforms.time * geomUniforms.pMod4D_timeFactor) - 0.5;
        let dp1:f32 = dot(p_mod4D_proj,c1);
        let dp2:f32 = dot(p_mod4D_proj,c2);
        let dp3:f32 = dot(p_mod4D_proj,c3);
        let dp4:f32 = dot(p_mod4D_proj,c4);
        let minDistToPlane4D:f32 = min(min(abs(dp1), abs(dp2)), min(abs(dp3), abs(dp4)));
        let lattice4D_proj:f32 = 1.0 - smoothstep(0.0, dynamicThickness, minDistToPlane4D);
        finalLattice = mix(lattice3D, lattice4D_proj, smoothstep(0.0, 1.0, globalUniforms.morphFactor));
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), 1.0 / max(geomUniforms.finalLattice_minUniverseMod, globalUniforms.universeModifier));
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("HypertetrahedronGeometry: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class DuocylinderGeometry extends BaseGeometry {
    getUniformBufferWGSLStruct() {
        return `
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
    // TODO: Add other geom_duocyl_... uniforms if they were missed from DEFAULT_STATE
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        return `
fn calculateDuocylinderSDF(p_world: vec3<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, geomUniforms: DuocylinderUniforms) -> f32 {
    // Parameterized r1, r2, dynamicShellWidth
    let r1_base:f32 = geomUniforms.r1_base;
    let r1:f32 = r1_base + globalUniforms.morphFactor * geomUniforms.r1_morphFactor;
    let r2_base:f32 = geomUniforms.r2_base;
    let r2:f32 = r2_base + dataChannels.pmk_channels[0] * geomUniforms.r2_channel0Factor;
    let dynamicShellWidth:f32 = max(0.005, globalUniforms.shellWidth * (1.0 - dataChannels.pmk_channels[1] * geomUniforms.shellWidth_channel1Factor));

    // Parameterized Base 3D shape (fallback)
    var lattice3D:f32 = 0.5 + 0.5 * sin(length(p_world) * (geomUniforms.fallback_pLengthFactor + dataChannels.pmk_channels[2] * geomUniforms.fallback_channel2Factor) - globalUniforms.time * globalUniforms.rotationSpeed);
    lattice3D = smoothstep(1.0 - dynamicShellWidth, 1.0, lattice3D);

    var finalLattice:f32 = lattice3D;
    let dim_factor:f32 = smoothstep(3.5, 4.5, globalUniforms.dimension); // This range could also be parameterized

    if (dim_factor > 0.01) {
        // Parameterized w_coord
        let w_coord_cos_arg:f32 = length(p_world.xy) * geomUniforms.wCoord_len_pXY_Factor - globalUniforms.time * geomUniforms.wCoord_timeFactorCos * globalUniforms.rotationSpeed;
        let w_coord_sin_arg:f32 = p_world.z * geomUniforms.wCoord_pzFactor + p_world.x * geomUniforms.wCoord_pxFactor + globalUniforms.time * geomUniforms.wCoord_timeFactorSin * globalUniforms.rotationSpeed;
        let w_coord_overall_factor:f32 = dim_factor * (geomUniforms.wCoord_dimFactorOffset + globalUniforms.morphFactor * geomUniforms.wCoord_morphFactor + dataChannels.pmk_channels[2] * geomUniforms.wCoord_channel2Factor);
        let w_coord:f32 = cos(w_coord_cos_arg) * sin(w_coord_sin_arg) * w_coord_overall_factor;

        var p4d:vec4<f32> = vec4<f32>(p_world, w_coord);

        // Parameterized 4D rotations base speed
        let baseSpeed:f32 = globalUniforms.rotationSpeed * geomUniforms.baseSpeedFactor;
        // Example parameterization for one rotation (time_rot1 for rotXW)
        let time_rot1:f32 = globalUniforms.time * geomUniforms.rotXW_timeFactor * baseSpeed + dataChannels.pmk_channels[0] * geomUniforms.rotXW_channel0Factor;
        // Simplified rotations from GLSL
        let time_rot2:f32 = globalUniforms.time * 0.25 * baseSpeed + dataChannels.pmk_channels[1] * 0.35;
        let time_rot3:f32 = globalUniforms.time * -0.20 * baseSpeed + dataChannels.pmk_channels[2] * 0.4;

        p4d = rotXW(time_rot1 * geomUniforms.rotXW_angleScale) * rotYZ(time_rot2) * rotZW(time_rot3) * p4d;
        p4d = rotYW(globalUniforms.time * 0.15 * baseSpeed + globalUniforms.morphFactor * 0.25) * p4d;

        let len_xy:f32 = length(p4d.xy);
        let len_zw:f32 = length(p4d.zw);
        let dist_to_shell_core:f32 = length(vec2<f32>(len_xy - r1, len_zw - r2));
        let lattice4D:f32 = 1.0 - smoothstep(0.0, dynamicShellWidth, dist_to_shell_core);
        finalLattice = mix(lattice3D, lattice4D, dim_factor);
    }
    // Parameterized final power denominator
    return pow(max(0.0, finalLattice), 1.0 / max(geomUniforms.finalLattice_minUniverseMod, globalUniforms.universeModifier));
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("DuocylinderGeometry: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class GeometryManager {
    constructor(options = {}) {
        this.options = { defaultGeometry: 'hypercube', ...options };
        this.geometries = {};
        this._initGeometries();
    }
    _initGeometries() {
        this.registerGeometry('hypercube', new HypercubeGeometry());
        this.registerGeometry('hypersphere', new HypersphereGeometry());
        this.registerGeometry('hypertetrahedron', new HypertetrahedronGeometry());
        this.registerGeometry('duocylinder', new DuocylinderGeometry());
        this.registerGeometry('fullscreenlattice', new FullScreenLatticeGeometry()); // Register new geometry
    }
    registerGeometry(name, instance) {
        const lowerCaseName = name.toLowerCase();
        if (!(instance instanceof BaseGeometry)) { // BaseGeometry is defined in this file
            console.error(`Invalid geometry object for '${lowerCaseName}'. Not an instance of BaseGeometry.`);
            return;
        }
        if (this.geometries[lowerCaseName]) {
            // console.warn(`Overwriting geometry '${lowerCaseName}'.`);
        }
        this.geometries[lowerCaseName] = instance;
    }
    getGeometry(name) {
        const lowerCaseName = name ? name.toLowerCase() : this.options.defaultGeometry;
        const geometry = this.geometries[lowerCaseName];
        if (!geometry) {
            console.warn(`Geometry '${name}' not found. Using default ('${this.options.defaultGeometry}').`);
            return this.geometries[this.options.defaultGeometry.toLowerCase()];
        }
        return geometry;
    }
    getGeometryTypes() { return Object.keys(this.geometries); }
}

// Import FullScreenLatticeGeometry AFTER BaseGeometry is defined and before GeometryManager might use it.
// However, since _initGeometries calls registerGeometry which uses BaseGeometry,
// it's better to import at the top.
import FullScreenLatticeGeometry from '../geometries/FullScreenLatticeGeometry.js';

export { GeometryManager, BaseGeometry, HypercubeGeometry, HypersphereGeometry, HypertetrahedronGeometry, DuocylinderGeometry, FullScreenLatticeGeometry };
export default GeometryManager;
