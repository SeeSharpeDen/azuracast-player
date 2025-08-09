export const details = {
    title: "Radial Wave",
    description: "Spiky ball of music flying through space.",
    icon: "assets/graphics/radial-wave.png",
    css_class: 'RadialWave'
}

const samples = 1400;
let vertices = [];
let texture_location = null;

const resrouces = {
    vertex_source: null,
    fragment_source: null,
}

let shader_program = null;

const float_bytes = Float32Array.BYTES_PER_ELEMENT;
const vert_stride = 4 * float_bytes;

export async function load_assets(path) {
    const vertex_fetch = fetch(`${path}/vert.glsl`).then((resp) => resp.text());
    const frag_fetch = fetch(`${path}/frag.glsl`).then((resp) => resp.text());

    const values = await Promise.all([vertex_fetch, frag_fetch]);
    resrouces.vertex_source = values[0];
    resrouces.fragment_source = values[1];
}

export function start(gl, ctx) {

    // Create a circle of vertices with X, Y, U, V.
    const circle = Math.PI * 2;
    const circle_slice = circle / samples;
    const half_samples = samples / 2;
    for (let i = 0; i < samples; i++) {

        // Set the X and Y of the circle.
        const x = Math.cos(circle_slice * i);
        const y = Math.sin(circle_slice * i);
        vertices.push(x);
        vertices.push(y);
        // Wrap U around the circle symmetrically.
        let u = (i / samples);
        if (i < half_samples) {
            vertices.push(u * 2);
        } else {
            vertices.push((1.0 - u) * 2);
        }
        vertices.push(y);
    }
    // Create a vertex buffer and fill it with the vertices.
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create our shader program from the downloaded resources.
    const shader_sources = [
        { source: resrouces.vertex_source, type: gl.VERTEX_SHADER },
        { source: resrouces.fragment_source, type: gl.FRAGMENT_SHADER }
    ]
    shader_program = ctx.shader_mananger.create_program("radial-wave", shader_sources);

    gl.useProgram(shader_program);


    // Set the a_pos attribute of the shader program to the first 2 floats of the vertex.
    const pos_location = gl.getAttribLocation(shader_program, "a_pos");
    gl.enableVertexAttribArray(pos_location);
    const pos_offset = 0;
    gl.vertexAttribPointer(pos_location, 2, gl.FLOAT, false, vert_stride, pos_offset);

    // Set the a_uv attribute of the shader program to the last 2 floats of the vertex.
    const uv_location = gl.getAttribLocation(shader_program, "a_uv");
    gl.enableVertexAttribArray(uv_location);
    const uv_offset = float_bytes * 2;
    gl.vertexAttribPointer(uv_location, 2, gl.FLOAT, false, vert_stride, uv_offset);

    // Set the u_visualizer UBO. This contains information like intensity and time.
    const ubo_index = gl.getUniformBlockIndex(shader_program, 'u_visualizer');
    gl.uniformBlockBinding(shader_program, ubo_index, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ctx.ubo);

    // Get the location of the texture.
    texture_location = gl.getUniformLocation(shader_program, 'u_audio_tex');

    // Set the clear colour and clear the canvas.
    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function draw_frame(gl, ctx) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.audio_tex);
    gl.uniform1i(texture_location, 0);

    // Draw the circle using LINE_LOOP
    gl.useProgram(shader_program);
    gl.drawArrays(gl.LINE_LOOP, 0, vertices.length / 4);
}