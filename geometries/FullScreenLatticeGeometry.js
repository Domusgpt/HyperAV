import { BaseGeometry } from '../core/GeometryManager.js';

class FullScreenLatticeGeometry extends BaseGeometry {
    constructor(options = {}) {
        super(options);
        this.type = 'fullscreenlattice';
    }

    getUniformBufferWGSLStruct() {
        return `
struct LatticeUniforms {
    edgeLineWidth: f32,
    vertexSize: f32,
    distortP_pZ_factor: f32,
    distortP_morphCoeffs: vec3<f32>,
    distortP_timeFactorScale: f32,
    wCoord_pLengthFactor: f32,
    wCoord_timeFactor: f32,
    wCoord_dimOffset: f32,
    rotXW_timeFactor: f32,
    rotYW_timeFactor: f32,
    rotZW_timeFactor: f32,
    glitch_baseFactor: f32,
    glitch_sinFactor: f32,
    glitch_rOffsetCoeffs: vec2<f32>,
    glitch_gOffsetCoeffs: vec2<f32>,
    glitch_bOffsetCoeffs: vec2<f32>,
    moire_densityFactor1: f32,
    moire_densityFactor2: f32,
    moire_blendFactor: f32,
    moire_mixCoeffs: vec3<f32>,
    baseColor: vec3<f32>,
    effectColor: vec3<f32>,
    glow_color: vec3<f32>,
    glow_timeFactor: f32,
    glow_amplitudeOffset: f32,
    glow_amplitudeFactor: f32,
    vignette_inner: f32,
    vignette_outer: f32,
    // Add padding if needed for std140, though WebGPU default layout is often sufficient
    // For vec2, next element must be 8-byte aligned. For vec3, 16-byte.
    // Example: _pad0: f32, (if distortP_morphCoeffs was vec2 and next was f32)
};
`;
    }

    getUniformGroupLayoutEntries(groupIndex = 1) { // eslint-disable-line no-unused-vars
        return [{
            binding: 0, // Binding index within this group for LatticeUniforms
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' }
        }];
    }

    getWGSLShaderCode(type = 'fragment_module') { // eslint-disable-line no-unused-vars
        // This geometry provides a full fragment shader replacement.
        // It assumes GlobalUniforms and DataChannels structs are defined and bound at group 0.
        // It also assumes helper rotation functions (rotXW, etc.) and project4Dto3D are available.
        // These helpers are currently in base_fragment.wgsl, so this code would run in that context.
        return `
${this.getUniformBufferWGSLStruct()}
@group(1) @binding(0) var<uniform> latticeUniforms: LatticeUniforms;

// Helper Functions (could be imported/included from a common module in a more advanced setup)
// For now, assuming these are available from base_fragment.wgsl or similar common scope.
// If not, they need to be included here or ShaderManager needs to prepend them.
// For simplicity of this method, we assume they are present in the final shader.
// mat4x4<f32> lattice_rotateXY... etc.
// vec3<f32> lattice_project4Dto3D... etc.

fn lattice_edges(p: vec3<f32>, gridSize: f32, lineWidth: f32) -> f32 {
    let grid: vec3<f32> = fract(p * gridSize);
    let edges: vec3<f32> = 1.0 - smoothstep(0.0, lineWidth, abs(grid - 0.5));
    return max(max(edges.x, edges.y), edges.z);
}

fn lattice_vertices(p: vec3<f32>, gridSize: f32, vertexSize: f32) -> f32 {
    let grid: vec3<f32> = fract(p * gridSize);
    let distToVertex: vec3<f32> = min(grid, 1.0 - grid);
    let minDist: f32 = min(min(distToVertex.x, distToVertex.y), distToVertex.z);
    return 1.0 - smoothstep(0.0, vertexSize, minDist);
}

fn calculateHypercubeLatticeValue(
    p_calc: vec3<f32>,
    morphFactor_calc: f32,
    gridSize_calc: f32,
    time_calc: f32,
    rotationSpeed_calc: f32,
    dimension_calc: f32,
    globalUniforms: GlobalUniforms // Pass globalUniforms if needed by helpers
) -> f32 {
    let edges: f32 = lattice_edges(p_calc, gridSize_calc, latticeUniforms.edgeLineWidth);
    let vertices: f32 = lattice_vertices(p_calc, gridSize_calc, latticeUniforms.vertexSize);

    let timeFactor: f32 = time_calc * latticeUniforms.distortP_timeFactorScale * rotationSpeed_calc;

    var distortedP: vec3<f32> = p_calc;
    distortedP.x = distortedP.x + sin(p_calc.z * latticeUniforms.distortP_pZ_factor + timeFactor) * morphFactor_calc * latticeUniforms.distortP_morphCoeffs.x;
    distortedP.y = distortedP.y + cos(p_calc.x * latticeUniforms.distortP_pZ_factor + timeFactor) * morphFactor_calc * latticeUniforms.distortP_morphCoeffs.y;
    distortedP.z = distortedP.z + sin(p_calc.y * latticeUniforms.distortP_pZ_factor + timeFactor) * morphFactor_calc * latticeUniforms.distortP_morphCoeffs.z;

    if (dimension_calc > 3.0) {
        let w: f32 = sin(length(p_calc) * latticeUniforms.wCoord_pLengthFactor + time_calc * latticeUniforms.wCoord_timeFactor) * (dimension_calc + latticeUniforms.wCoord_dimOffset);
        var p4d: vec4<f32> = vec4<f32>(distortedP, w);

        p4d = rotXW(timeFactor * latticeUniforms.rotXW_timeFactor) * p4d; // Assuming rotXW is globally available
        p4d = rotYW(timeFactor * latticeUniforms.rotYW_timeFactor) * p4d; // Assuming rotYW is globally available
        p4d = rotZW(timeFactor * latticeUniforms.rotZW_timeFactor) * p4d; // Assuming rotZW is globally available

        distortedP = project4Dto3D_placeholder(p4d); // Assuming project4Dto3D_placeholder is globally available
    }

    let distortedEdges: f32 = lattice_edges(distortedP, gridSize_calc, latticeUniforms.edgeLineWidth);
    let distortedVertices: f32 = lattice_vertices(distortedP, gridSize_calc, latticeUniforms.vertexSize);

    let final_edges: f32 = mix(edges, distortedEdges, morphFactor_calc); // Use morphFactor_calc
    let final_vertices: f32 = mix(vertices, distortedVertices, morphFactor_calc); // Use morphFactor_calc

    return max(final_edges, final_vertices);
}

// Main fragment entry point for this geometry effect
fn calculateFullScreenLatticeFragment(
    fsInput_uv: vec2<f32>, // from VertexOutput.uv
    globalUniforms: GlobalUniforms,
    dataChannels: DataChannels
) -> vec4<f32> {
    var uv_norm: vec2<f32> = fsInput_uv;
    let aspectRatio: f32 = globalUniforms.resolution.x / globalUniforms.resolution.y;
    uv_norm.x = uv_norm.x * aspectRatio;

    let center: vec2<f32> = vec2<f32>(globalUniforms.mouse.x * aspectRatio, globalUniforms.mouse.y);
    var p_base: vec3<f32> = vec3<f32>(uv_norm - center, 0.0);

    let timeRotation: f32 = globalUniforms.time * 0.2 * globalUniforms.rotationSpeed;
    // Construct mat2x2<f32> correctly
    let rotation: mat2x2<f32> = mat2x2<f32>(cos(timeRotation), -sin(timeRotation), sin(timeRotation), cos(timeRotation));
    p_base.xy = rotation * p_base.xy;
    p_base.z = sin(globalUniforms.time * 0.1) * 0.5;

    let glitchAmount: f32 = globalUniforms.glitchIntensity * (latticeUniforms.glitch_baseFactor + latticeUniforms.glitch_baseFactor * sin(globalUniforms.time * latticeUniforms.glitch_sinFactor));

    let rOffset: vec2<f32> = glitchAmount * latticeUniforms.glitch_rOffsetCoeffs;
    let gOffset: vec2<f32> = glitchAmount * latticeUniforms.glitch_gOffsetCoeffs;
    let bOffset: vec2<f32> = glitchAmount * latticeUniforms.glitch_bOffsetCoeffs;

    // Pass globalUniforms to calculateHypercubeLatticeValue if its helpers need it
    let r_val: f32 = calculateHypercubeLatticeValue(vec3<f32>(p_base.xy + rOffset, p_base.z), globalUniforms.morphFactor, globalUniforms.gridDensity_lattice, globalUniforms.time, globalUniforms.rotationSpeed, globalUniforms.dimension, globalUniforms);
    let g_val: f32 = calculateHypercubeLatticeValue(vec3<f32>(p_base.xy + gOffset, p_base.z), globalUniforms.morphFactor, globalUniforms.gridDensity_lattice, globalUniforms.time, globalUniforms.rotationSpeed, globalUniforms.dimension, globalUniforms);
    let b_val: f32 = calculateHypercubeLatticeValue(vec3<f32>(p_base.xy + bOffset, p_base.z), globalUniforms.morphFactor, globalUniforms.gridDensity_lattice, globalUniforms.time, globalUniforms.rotationSpeed, globalUniforms.dimension, globalUniforms);

    let moireGrid1: f32 = calculateHypercubeLatticeValue(p_base, globalUniforms.morphFactor, globalUniforms.gridDensity_lattice * latticeUniforms.moire_densityFactor1, globalUniforms.time, globalUniforms.rotationSpeed, globalUniforms.dimension, globalUniforms);
    let moireGrid2: f32 = calculateHypercubeLatticeValue(p_base, globalUniforms.morphFactor, globalUniforms.gridDensity_lattice * latticeUniforms.moire_densityFactor2, globalUniforms.time, globalUniforms.rotationSpeed, globalUniforms.dimension, globalUniforms);
    let moire: f32 = abs(moireGrid1 - moireGrid2) * latticeUniforms.moire_blendFactor;

    let mixed_r: f32 = mix(r_val, moire, latticeUniforms.moire_mixCoeffs.x);
    let mixed_g: f32 = mix(g_val, moire, latticeUniforms.moire_mixCoeffs.y);
    let mixed_b: f32 = mix(b_val, moire, latticeUniforms.moire_mixCoeffs.z);

    var final_color: vec3<f32> = mix(latticeUniforms.baseColor, latticeUniforms.effectColor, vec3<f32>(mixed_r, mixed_g, mixed_b));
    final_color = final_color + latticeUniforms.glow_color * (latticeUniforms.glow_amplitudeOffset + latticeUniforms.glow_amplitudeFactor * sin(globalUniforms.time * latticeUniforms.glow_timeFactor));

    let vignette: f32 = 1.0 - smoothstep(latticeUniforms.vignette_inner, latticeUniforms.vignette_outer, length(uv_norm - vec2<f32>(center.x, center.y))); // Ensure center is vec2 for length
    final_color = final_color * vignette; // Corrected: GLSL was color *= vignette

    return vec4<f32>(final_color, 1.0);
}
`;
    }

    /** @deprecated Use getWGSLShaderCode instead */
    getShaderCode() {
        throw new Error("FullScreenLatticeGeometry: getShaderCode() is deprecated. Use getWGSLShaderCode() which returns a full WGSL fragment shader source.");
    }
}

export default FullScreenLatticeGeometry;
