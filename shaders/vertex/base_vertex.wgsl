struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn main(@location(0) position: vec2<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.uv = position * 0.5 + 0.5; // GLSL v_uv = a_position * 0.5 + 0.5;
    out.clip_position = vec4<f32>(position, 0.0, 1.0); // GLSL gl_Position = vec4(a_position, 0.0, 1.0);
    return out;
}
