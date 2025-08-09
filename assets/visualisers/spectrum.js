export const details = {
    title: "Debug Spectrum",
    description: "Used by nerds to analyze data for developing visualizers",
    icon: "assets/graphics/spectrum.png",
}
let wf_verts = [
    // X    Y    U    V
    -1.0, -1.0, 0.0, 0.0,
    - 1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 0.0,
];

let texture_location;

export function start(gl, ctx) {
    // Create a buffer for the vertices
    const wf_vert_buff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wf_vert_buff);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wf_verts), gl.STATIC_DRAW);

    // Define your shaders and program (as discussed previously)
    const vertexShaderSource = `#version 300 es

in vec2 a_pos;
in vec2 a_uv;

uniform u_visualizer {
    mat4 u_projection;
    float u_intensity;
    float time;
};

out vec2 v_uv;

void main() {
    //gl_Position = u_projection * vec4(a_pos, 0.0, 1.0);
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = a_uv;
}
`;

    const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 v_uv;
uniform sampler2D u_audio_tex;
out vec4 outColor;

void main() {
    float gray = texture(u_audio_tex, v_uv).r;

    vec4 cold = vec4(0.05, 0.0, 0.2, 1.0);
    vec4 hot = vec4(1.0, 0.87, 0.0, 1.0);

    outColor = mix(cold, hot, gray);
}
`;

    // Compile shaders and create the program
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    validate_shader(gl, vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    validate_shader(gl, fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;

    const pos_location = gl.getAttribLocation(program, "a_pos");
    const uv_location = gl.getAttribLocation(program, "a_uv");

    // Set the pos attribute.
    gl.enableVertexAttribArray(pos_location);
    const pos_offset = 0;
    gl.vertexAttribPointer(pos_location, 2, gl.FLOAT, false, stride, pos_offset);

    // Set the UV attribute.
    gl.enableVertexAttribArray(uv_location);
    const uv_offset = Float32Array.BYTES_PER_ELEMENT * 2;
    gl.vertexAttribPointer(uv_location, 2, gl.FLOAT, false, stride, uv_offset);

    const ubo_index = gl.getUniformBlockIndex(program, 'u_visualizer');

    texture_location = gl.getUniformLocation(program, 'u_audio_tex');
    

    // Point the UBO to shader.
    gl.uniformBlockBinding(program, ubo_index, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ctx.ubo);

    // Set the viewport and clear the canvas
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function draw_frame(gl, ctx) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.audio_tex);
    gl.uniform1i(texture_location, 0);
    

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function validate_shader(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);

        throw new Error(`Failed to compile shader: ${info}`);
    }
}