export const details = {
    title: "Glitched Logo",
    description: "The SSD Radio logo. But it glitches to the beat",
    css_class: 'glitched-logo'
}

let texture_location = null;
let image = null;
let noise = null;
let image_location = null;
let noise_location = null;

const resources = {
    vertex_source: null,
    fragment_source: null,
    logo_image: null,
    noise_image: null,
}

let grid_mesh = null;

let shader_program = null;

const float_bytes = Float32Array.BYTES_PER_ELEMENT;
const vert_stride = 4 * float_bytes;

export async function load_assets(path) {

    const vertex_fetch = fetch(`${path}/vert.glsl`)
        .then((resp) => resp.text());

    const frag_fetch = fetch(`${path}/frag.glsl`)
        .then((resp) => resp.text());

    const image_fetch = fetch(`${path}/ssd_radio_unglitched.webp`)
        .then((resp) => resp.blob())
        .then((blob) => createImageBitmap(blob));

    const noise_fetch = fetch(`${path}/noise-texture.webp`)
        .then((resp) => resp.blob())
        .then((blob) => createImageBitmap(blob));

    const values = await Promise.all([vertex_fetch, frag_fetch, image_fetch, noise_fetch]);
    resources.vertex_source = values[0];
    resources.fragment_source = values[1];
    resources.logo_image = values[2];
    resources.noise_image = values[3];
}

export function start(gl, ctx) {
    grid_mesh = generate_grid_mesh(gl, 20, 600, 1.0, 0.5);

    // Create our shader program from the downloaded resources.
    const shader_sources = [
        { source: resources.vertex_source, type: gl.VERTEX_SHADER },
        { source: resources.fragment_source, type: gl.FRAGMENT_SHADER }
    ]
    shader_program = ctx.shader_mananger.create_program("radial-wave", shader_sources);

    gl.useProgram(shader_program);
    // Set the a_pos attribute of the shader program to the first 2 floats of the vertex.
    const pos_location = gl.getAttribLocation(shader_program, "a_pos");
    gl.enableVertexAttribArray(pos_location);
    gl.vertexAttribPointer(pos_location, 2, gl.FLOAT, false, vert_stride, 0);

    // Set the a_uv attribute of the shader program to the last 2 floats of the vertex.
    const uv_location = gl.getAttribLocation(shader_program, "a_uv");
    gl.enableVertexAttribArray(uv_location);
    gl.vertexAttribPointer(uv_location, 2, gl.FLOAT, false, vert_stride, float_bytes * 2);

    // Set the u_visualizer UBO. This contains information like intensity and time.
    const ubo_index = gl.getUniformBlockIndex(shader_program, 'u_visualizer');
    gl.uniformBlockBinding(shader_program, ubo_index, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ctx.ubo);

    // Get the location of the texture.
    texture_location = gl.getUniformLocation(shader_program, 'u_audio_tex');
    image_location = gl.getUniformLocation(shader_program, 'u_image');
    noise_location = gl.getUniformLocation(shader_program, 'u_noise');
    image = texture_from_image(gl, resources.logo_image);
    noise = texture_from_image(gl, resources.noise_image, gl.NEAREST, gl.REPEAT);

    // Set the clear colour and clear the canvas.
    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function draw_frame(gl, ctx) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.audio_tex);
    gl.uniform1i(texture_location, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.uniform1i(image_location, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.uniform1i(noise_location, 2);

    gl.useProgram(shader_program);
    gl.drawElements(gl.TRIANGLES, grid_mesh.triangle_count, gl.UNSIGNED_SHORT, 0);
}

function generate_grid_mesh(gl, x_count, y_count, x_scale, y_scale) {
    // Place a gird of vertices.
    const vertices = [];
    const x_slice = 1.0 / x_count;
    const y_slice = 1.0 / y_count;
    for (let x, y = 0; y <= y_count; y++) {
        for (x = 0; x <= x_count; x++) {
            // Set the X/Y coordinates.
            vertices.push(x_scale * (2 * (x_slice * x) - 1.0));
            vertices.push(y_scale * (2 * (1.0 - (y_slice * y)) - 1.0));

            // Set the U/V coordinates.
            vertices.push(x_slice * x);
            vertices.push(y_slice * y);
        }
    }

    // Create and fill a vertex buffer with our vertices.
    const vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set the triangle indices.
    const triangles = [];
    let i = 0;
    for (let x, y = 0; y < y_count; y++) {
        for (x = 0; x < x_count; x++) {
            i = y * (x_count + 1) + x;
            triangles.push(i, i + 1, i + x_count + 1);
            // triangles.push(i + 1, i, i + x_count + 1);
            triangles.push(i + 1, i + x_count + 2, i + x_count + 1);
            // triangles.push(i + x_count + 2, i + 1, i + x_count + 1);
        }
    }

    // Create and fill a indices buffer with our triangle indices.
    const index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);

    return { vertex_buffer, index_buffer, triangle_count: triangles.length };
}

function texture_from_image(gl, image, filtering = gl.LINEAR, wrapping = gl.CLAMP_TO_EDGE) {
    // Create the texture and bind it.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameters to not wrap and use linear filtering.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapping);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapping);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);

    gl.texImage2D(
        gl.TEXTURE_2D,      // target
        0,                  // miplevel
        gl.R8,              // 8-bit singel channel
        gl.RED,              // 8-bit singel channel
        gl.UNSIGNED_BYTE,   // type
        image
    );

    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
}