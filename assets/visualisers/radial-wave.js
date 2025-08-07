export const details = {
    title: "Radial Wave",
    description: "Spiky ball of music flying through space.",
    icon: "assets/graphics/radial-wave.png",
    css_class: 'RadialWave'
}

const samples = 1400;
let vertices = [];
let texture_location = null;

export function start(gl, ubo) {
    const circle = Math.PI * 2;
    const slice = circle / samples;
    for (let i = 0; i < samples; i++) {
        const x = Math.cos(slice * i);
        const y = Math.sin(slice * i);
        vertices.push(x);
        vertices.push(y);
        vertices.push(x);
        vertices.push(y);
    }
    // Create a buffer for the vertices
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Define your shaders and program (as discussed previously)
    const vertexShaderSource = `#version 300 es

in vec2 a_pos;
in vec2 a_uv;

uniform u_visualizer {
    mat4 u_projection;
    float u_intensity;
    float u_time;
};

uniform sampler2D u_audio_tex;

float radius = 0.56;
float scale = 0.35;
float power = 1.5;
float kill_scale = 0.25;
float time_scale_color = 0.2;
float rotate_speed = 0.6;
float timewarp_factor = 0.08;
float x_mn = 0.08;
float x_mx = 0.7;
float colour_flicker = 5.6;
out float colour_shift;
out float intensity;

void main() {

    // Music stuff.
    float x = abs(a_uv.x) * (x_mx - x_mn) + x_mn;
    vec2 uv = vec2(x, timewarp_factor * a_uv.y);
    float amplitude = texture(u_audio_tex, uv).r;
    float value = (u_intensity * kill_scale) + radius + (pow(amplitude, power) * scale);

    float c = cos(u_time * rotate_speed);
    float s = sin(u_time * rotate_speed);

    // Rotation
    mat2 rotation_mat = mat2 (
        c, -s,
        s, c
    );

    vec2 rotated_pos = rotation_mat * a_pos;

    gl_Position = u_projection * vec4(rotated_pos * value, 0.0, 1.0);
    intensity = u_intensity;
    colour_shift = u_time * time_scale_color + u_intensity * colour_flicker;
}
`;

    const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 FragColor;
in float colour_shift;
in float intensity;

vec3 hue_shift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cos_angle = cos(hue);
    return vec3(color * cos_angle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cos_angle));
}

void main() {
    FragColor = vec4(hue_shift(vec3(1.0, intensity, intensity), colour_shift), 1.0);
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
    // Point the UBO to shader.
    gl.uniformBlockBinding(program, ubo_index, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);

    texture_location = gl.getUniformLocation(program, 'u_audio_tex');

    // Set the viewport and clear the canvas
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

let radius_scale = 0.65;
let radius_margin = 200;
let revolutions = 1;
let rotate_speed = 0.08;
let power = 1.5;
let scale = 0.8;
let line_width = 3;
let radius_intensity = 40;

export function draw_frame(gl, samples_data, delta_time, intensity) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, Renderer.audio_tex.gl_texture);
    gl.uniform1i(texture_location, 0);

    // Draw the circle using LINE_LOOP
    gl.drawArrays(gl.LINE_LOOP, 0, vertices.length / 4);
}

function validate_shader(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);

        throw new Error(`Failed to compile shader: ${info}`);
    }
}