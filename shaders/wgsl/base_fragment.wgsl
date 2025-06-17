struct VertexInput {
    @location(0) uv: vec2<f32>,
};

struct GlobalUniforms {
    resolution: vec2<f32>,
    time: f32,
    dimension: f32,
    morphFactor: f32,
    rotationSpeed: f32,
    universeModifier: f32,
    patternIntensity: f32,
    gridDensity: f32, // For SDF path
    gridDensity_lattice: f32, // For full screen lattice path
    lineThickness: f32,
    shellWidth: f32,
    tetraThickness: f32,
    glitchIntensity: f32,
    colorShift: f32,
    mouse: vec2<f32>,
    isFullScreenEffect: u32, // Use u32 for boolean-like flags
    // Color scheme
    primaryColor: vec3<f32>,
    secondaryColor: vec3<f32>,
    backgroundColor: vec3<f32>,
};
@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;

// Placeholder for data channels, which will be in a separate UBO/storage buffer
struct DataChannels {
    pmk_channels: array<f32, 64>, // Matching GLSL UBO size
};
@group(0) @binding(1) var<uniform> dataChannels: DataChannels;

// (Projection-specific and Geometry-specific uniforms will be in other buffers
// and bound to different groups/bindings later. For now, those GLSL uniforms
// like u_proj_perspective_baseDistance are not included here yet.)

// N-DIMENSIONAL GENERALIZATION POINT:
// The following rotation matrices are specific to 3D/4D.
// For N-dimensional support, these would need to be replaced or supplemented.
fn rotXW(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(c,0,0,-s,  0,1,0,0,  0,0,1,0,  s,0,0,c); }
fn rotYW(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(1,0,0,0,  0,c,0,-s,  0,0,1,0,  0,s,0,c); }
fn rotZW(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(1,0,0,0,  0,1,0,0,  0,0,c,-s,  0,0,s,c); }
fn rotXY(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(c,-s,0,0,  s,c,0,0,  0,0,1,0,  0,0,0,1); }
fn rotYZ(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(1,0,0,0,  0,c,-s,0,  0,s,c,0,  0,0,0,1); }
fn rotXZ(a: f32) -> mat4x4<f32> { let c = cos(a); let s = sin(a); return mat4x4<f32>(c,0,-s,0,  0,1,0,0,  s,0,c,0,  0,0,0,1); }


fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    var p: vec4<f32>;
    if (c.g < c.b) { p = vec4<f32>(c.bg, K.w, K.z); }
    else { p = vec4<f32>(c.gb, K.x, K.y); }

    var q: vec4<f32>;
    if (c.r < p.x) { q = vec4<f32>(p.xyw, c.r); }
    else { q = vec4<f32>(c.r, p.yzx); }

    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

// Placeholder - actual projection code will be in a separate module/pipeline variation
fn project4Dto3D_placeholder(p: vec4<f32>) -> vec3<f32> {
    // Minimalistic projection for now
    // This needs to be replaced with actual projection logic (e.g. perspective, stereographic)
    // which will use uniforms from globalUniforms or specific projection uniform buffers.
    // Example: let effective_w = p.w + globalUniforms.proj_perspective_baseDistance;
    return p.xyz / (p.w + 1.0);
}

// Placeholder - actual geometry code will be in a separate module/pipeline variation
fn calculateLattice_placeholder(p_world: vec3<f32>) -> f32 {
    // This needs to be replaced with actual SDF logic from one of the geometry types.
    // It would use globalUniforms (like u_dimension, u_morphFactor) and specific geometry uniforms.
    // Example: let d = length(p_world.xy) - globalUniforms.gridDensity;
    return length(p_world) * 0.1; // Minimalistic SDF
}

// Placeholder for full screen effect
fn getLatticeEffectColor_placeholder(
    screenUV: vec2<f32>, // v_uv
    time: f32,
    resolution: vec2<f32>,
    mouse: vec2<f32>,
    morphFactor: f32,
    glitchIntensity: f32,
    rotationSpeed: f32,
    dimension: f32,
    gridDensity_lattice: f32
) -> vec3<f32> {
    // This needs to be replaced with the actual FullScreenLatticeEffect logic.
    // It would use its specific set of uniforms.
    return vec3<f32>(screenUV.x, screenUV.y, 0.5);
}


@fragment
fn main(fsInput: VertexInput) -> @location(0) vec4<f32> {
    var finalColor: vec3<f32>;

    if (globalUniforms.isFullScreenEffect == 1u) {
        // FullScreenLatticeEffect path
        finalColor = getLatticeEffectColor_placeholder(
            fsInput.uv,
            globalUniforms.time,
            globalUniforms.resolution,
            globalUniforms.mouse,
            globalUniforms.morphFactor,
            globalUniforms.glitchIntensity,
            globalUniforms.rotationSpeed,
            globalUniforms.dimension,
            globalUniforms.gridDensity_lattice
        );
    } else {
        // Standard SDF rendering path
        let aspect = globalUniforms.resolution.x / globalUniforms.resolution.y;
        // Corrected UV calculation: in GLSL it was v_uv * 2.0 - 1.0.
        // fsInput.uv is already 0-1, so we map it to -1 to 1 range, then apply aspect.
        let uv = (fsInput.uv * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);

        var rayOrigin = vec3<f32>(0.0, 0.0, -2.5); // Matches GLSL
        var rayDirection = normalize(vec3<f32>(uv, 1.0)); // Z positive towards screen

        // Camera rotation from GLSL
        let camRotY = globalUniforms.time * 0.05 * globalUniforms.rotationSpeed + dataChannels.pmk_channels[1] * 0.1;
        let camRotX = sin(globalUniforms.time * 0.03 * globalUniforms.rotationSpeed) * 0.15 + dataChannels.pmk_channels[2] * 0.1;
        // WGSL matrix multiplication order is M * v
        let camMat = rotXY(camRotX) * rotYZ(camRotY);
        rayDirection = (camMat * vec4<f32>(rayDirection, 0.0)).xyz;

        // This p is in camera space. The calculateLattice_placeholder and project4Dto3D_placeholder
        // will need to be adapted depending on whether they expect world space or camera space points.
        // The original GLSL SDFs were defined in world space, with the ray transformed.
        // For now, we pass this transformed ray direction.
        // The '1.5' factor from GLSL might represent a step along the ray, or part of the scene setup.
        let p_world = rayDirection * 1.5; // Assuming this is a point in world space for the SDF

        // The actual SDF calculation would involve multiple steps of raymarching
        // and projecting a 4D point (or N-D) down to 3D for the SDF.
        // For this placeholder, we directly use the 3D point.
        // let p_4d = vec4<f32>(p_world, w_coord_placeholder); // w_coord would come from somewhere
        // let p_3d_projected = project4Dto3D_placeholder(p_4d);
        // let latticeValue = calculateLattice_placeholder(p_3d_projected);

        // Simplified: directly use p_world with 3D placeholder
        let latticeValue = calculateLattice_placeholder(p_world);


        finalColor = mix(globalUniforms.backgroundColor, globalUniforms.primaryColor, latticeValue);
        finalColor = mix(finalColor, globalUniforms.secondaryColor, smoothstep(0.2, 0.7, dataChannels.pmk_channels[1]) * latticeValue * 0.6);

        if (abs(globalUniforms.colorShift) > 0.01) {
            var hsv = rgb2hsv(finalColor);
            hsv.x = fract(hsv.x + globalUniforms.colorShift * 0.5 + dataChannels.pmk_channels[2] * 0.1);
            finalColor = hsv2rgb(hsv);
        }

        finalColor = finalColor * (0.8 + globalUniforms.patternIntensity * 0.7);

        if (globalUniforms.glitchIntensity > 0.001) {
            let glitch = globalUniforms.glitchIntensity * (0.5 + 0.5 * sin(globalUniforms.time * 8.0 + p_world.y * 10.0));
            let offsetR_uv = vec2<f32>(cos(globalUniforms.time*25.0), sin(globalUniforms.time*18.0+p_world.x*5.0)) * glitch * 0.2;
            let offsetB_uv = vec2<f32>(sin(globalUniforms.time*19.0+p_world.y*6.0), cos(globalUniforms.time*28.0)) * glitch * 0.15;

            // Glitch offsets are applied to UVs before ray direction calculation
            let uv_R_glitch = ( (fsInput.uv + offsetR_uv) * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);
            let uv_B_glitch = ( (fsInput.uv + offsetB_uv) * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);

            var rayDirectionR_glitch = normalize(vec3<f32>(uv_R_glitch, 1.0));
            rayDirectionR_glitch = (camMat * vec4<f32>(rayDirectionR_glitch, 0.0)).xyz;
            let pR_glitch_world = rayDirectionR_glitch * 1.5;

            var rayDirectionB_glitch = normalize(vec3<f32>(uv_B_glitch, 1.0));
            rayDirectionB_glitch = (camMat * vec4<f32>(rayDirectionB_glitch, 0.0)).xyz;
            let pB_glitch_world = rayDirectionB_glitch * 1.5;

            let latticeR = calculateLattice_placeholder(pR_glitch_world);
            let latticeB = calculateLattice_placeholder(pB_glitch_world);

            var colorR = mix(globalUniforms.backgroundColor, globalUniforms.primaryColor, latticeR);
            colorR = mix(colorR, globalUniforms.secondaryColor, smoothstep(0.2, 0.7, dataChannels.pmk_channels[1]) * latticeR * 0.6);
            var colorB = mix(globalUniforms.backgroundColor, globalUniforms.primaryColor, latticeB);
            colorB = mix(colorB, globalUniforms.secondaryColor, smoothstep(0.2, 0.7, dataChannels.pmk_channels[1]) * latticeB * 0.6);

            if (abs(globalUniforms.colorShift) > 0.01) {
                var hsvR = rgb2hsv(colorR); hsvR.x = fract(hsvR.x + globalUniforms.colorShift * 0.5 + dataChannels.pmk_channels[2] * 0.1); colorR = hsv2rgb(hsvR);
                var hsvB = rgb2hsv(colorB); hsvB.x = fract(hsvB.x + globalUniforms.colorShift * 0.5 + dataChannels.pmk_channels[2] * 0.1); colorB = hsv2rgb(hsvB);
            }
            finalColor = vec3<f32>(colorR.r, finalColor.g, colorB.b);
            finalColor = finalColor * (0.8 + globalUniforms.patternIntensity * 0.7); // Applied again in GLSL, check if intentional
        }
        finalColor = pow(clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.5)), vec3<f32>(0.9)); // GLSL pow(clamp(finalColor, 0.0, 1.5), vec3(0.9));
    }
    return vec4<f32>(finalColor, 1.0);
}
