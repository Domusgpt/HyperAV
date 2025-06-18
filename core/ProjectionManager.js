/* core/ProjectionManager.js - WebGPU Refactor */
class BaseProjection {
    constructor() {}
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error(`getShaderCode() is deprecated. Use getWGSLShaderCode().`); }

    /**
     * Gets the WGSL shader code snippet for this projection.
     * @param {string} type - Type of WGSL code to return (e.g., 'projection_function').
     * @returns {string} WGSL code string.
     */
    getWGSLShaderCode(type = 'projection_function') { // eslint-disable-line no-unused-vars
        return `// BaseProjection WGSL code placeholder for type: ${type}\n`;
    }

    /**
     * Gets the GPUBindGroupLayoutEntry array for this projection's specific uniforms.
     * @param {number} groupIndex - The target bind group index (e.g., 2 for projection uniforms).
     * @returns {Array<GPUBindGroupLayoutEntry>} An array of layout entries.
     */
    getUniformGroupLayoutEntries(groupIndex = 2) { // eslint-disable-line no-unused-vars
        return [];
    }

    /**
     * Gets the WGSL struct definition for this projection's uniforms.
     * @returns {string|null} WGSL struct definition string, or null if no uniforms.
     */
    getUniformBufferWGSLStruct() {
        return null;
    }
}

class PerspectiveProjection extends BaseProjection {
    constructor() { super(); }

    getUniformBufferWGSLStruct() {
        return `
struct PerspectiveUniforms {
    baseDistance: f32,
    morphFactorImpact: f32,
    channelImpact: f32,
    denomMin: f32,
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 2) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0, // Binding index within this group
            visibility: GPUShaderStage.FRAGMENT, // Or COMPUTE if used there
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'projection_function') { // eslint-disable-line no-unused-vars
        return `
fn projectPerspective(p_in: vec4<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, projUniforms: PerspectiveUniforms) -> vec3<f32> {
    let dynamicDistance:f32 = max(0.2, projUniforms.baseDistance * (1.0 + globalUniforms.morphFactor * projUniforms.morphFactorImpact - dataChannels.pmk_channels[1] * projUniforms.channelImpact));
    let denominator:f32 = dynamicDistance + p_in.w;
    let w_factor:f32 = dynamicDistance / max(projUniforms.denomMin, denominator);
    return p_in.xyz * w_factor;
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("PerspectiveProjection: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class OrthographicProjection extends BaseProjection {
    getUniformBufferWGSLStruct() {
        // Currently uses a hardcoded basePerspectiveDistance for its mixed mode.
        // If this needs to be configurable, a struct would be defined here.
        // For now, returning null as no specific u_proj_orthographic_ uniforms are defined in DEFAULT_STATE.
        return null;
    }

    getUniformGroupLayoutEntries(groupIndex = 2) { // eslint-disable-line no-unused-vars
        return []; // No specific uniforms for this projection yet
    }

    getWGSLShaderCode(type = 'projection_function') { // eslint-disable-line no-unused-vars
        // Note: pmk_channels[1] was u_audioMid in the GLSL version.
        // The hardcoded basePerspectiveDistance is kept from GLSL. To make it a uniform,
        // it would need to be added to OrthographicUniforms struct and passed in.
        return `
fn projectOrthographic(p_in: vec4<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels) -> vec3<f32> {
    let orthoP:vec3<f32> = p_in.xyz;
    let basePerspectiveDistance:f32 = 2.5; // Hardcoded, was TODO: Parameterize if needed
    let dynamicPerspectiveDistance:f32 = max(0.2, basePerspectiveDistance * (1.0 - dataChannels.pmk_channels[1] * 0.4));
    let perspDenominator:f32 = dynamicPerspectiveDistance + p_in.w;
    let persp_w_factor:f32 = dynamicPerspectiveDistance / max(0.1, perspDenominator);
    let perspP:vec3<f32> = p_in.xyz * persp_w_factor;
    let morphT:f32 = smoothstep(0.0, 1.0, globalUniforms.morphFactor);
    return mix(orthoP, perspP, morphT);
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("OrthographicProjection: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class StereographicProjection extends BaseProjection {
    constructor() { super(); }

    getUniformBufferWGSLStruct() {
        return `
struct StereographicUniforms {
    basePoleW: f32,
    channelImpact: f32,
    epsilon: f32,
    singularityScale: f32,
    morphFactorImpact: f32,
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 2) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'projection_function') { // eslint-disable-line no-unused-vars
        // Note: pmk_channels[2] was u_audioHigh in the GLSL version.
        return `
fn projectStereographic(p_in: vec4<f32>, globalUniforms: GlobalUniforms, dataChannels: DataChannels, projUniforms: StereographicUniforms) -> vec3<f32> {
    let dynamicPoleW:f32 = sign(projUniforms.basePoleW) * max(0.1, abs(projUniforms.basePoleW + dataChannels.pmk_channels[2] * projUniforms.channelImpact * sign(projUniforms.basePoleW)));
    let denominator:f32 = p_in.w - dynamicPoleW;
    var projectedP:vec3<f32>;
    if (abs(denominator) < projUniforms.epsilon) {
        projectedP = normalize(p_in.xyz + vec3<f32>(projUniforms.epsilon)) * projUniforms.singularityScale;
    } else {
        let scale:f32 = (-dynamicPoleW) / denominator; // Original GLSL was: scale = W / denominator, but W was dynamicPoleW. If dynamicPoleW is positive, original point W > pole, then scale is negative.
                                                 // If dynamicPoleW is negative (standard projection point), then scale is positive.
                                                 // The key is that `dynamicPoleW` represents the projection pole's W coordinate.
                                                 // For projection from (0,0,0,W_pole) onto W=0 plane, the formula is typically P.xyz * (-W_pole) / (P.w - W_pole).
        projectedP = p_in.xyz * scale;
    }
    let morphT:f32 = smoothstep(0.0, 1.0, globalUniforms.morphFactor * projUniforms.morphFactorImpact);
    let orthoP:vec3<f32> = p_in.xyz; // Orthographic is a simple passthrough of xyz for the morph
    return mix(projectedP, orthoP, morphT);
}
`;
    }
    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() { throw new Error("StereographicProjection: getShaderCode() is deprecated. Use getWGSLShaderCode()."); }
}

class ProjectionManager {
    constructor(options = {}) { this.options = { defaultProjection: 'perspective', ...options }; this.projections = {}; this._initProjections(); }
    _initProjections() { this.registerProjection('perspective', new PerspectiveProjection()); this.registerProjection('orthographic', new OrthographicProjection()); this.registerProjection('stereographic', new StereographicProjection()); }
    registerProjection(name, instance) { const lowerCaseName = name.toLowerCase(); if (!(instance instanceof BaseProjection)) { console.error(`Invalid projection object for '${lowerCaseName}'.`); return; } if (this.projections[lowerCaseName]) { /* console.warn(`Overwriting projection '${lowerCaseName}'.`); */ } this.projections[lowerCaseName] = instance; }
    getProjection(name) { const lowerCaseName = name ? name.toLowerCase() : this.options.defaultProjection; const projection = this.projections[lowerCaseName]; if (!projection) { console.warn(`Projection '${name}' not found. Using default.`); return this.projections[this.options.defaultProjection.toLowerCase()]; } return projection; }
    getProjectionTypes() { return Object.keys(this.projections); }
}
export { ProjectionManager, BaseProjection, PerspectiveProjection, OrthographicProjection, StereographicProjection };
export default ProjectionManager;
