export const details = {
    title: "Starfield",
    description: "Fly through space while listening to bangers",
    icon: "assets/graphics/starfield.png",
    draw_logo: true,
}

const particles = 1500;

const resources = {
    render_vert_source: null,
    render_frag_source: null,
    update_source: null,
}

let noise_texture = null;

let update_p = null;
let render_p = null;

let buffer1 = null;
let buffer2 = null;

let trans_feedback = null;
const float_bytes = Float32Array.BYTES_PER_ELEMENT;
const vert_stride = 4 * float_bytes;

export async function load_assets(path) {
    // Load the render and update shaders along with the noise texture.
    const jobs = [
        fetch(`${path}/render.vert`).then((resp) => resp.text()),
        fetch(`${path}/render.frag`).then((resp) => resp.text()),
        fetch(`${path}/update.vert`).then((resp) => resp.text()),
    ]

    const values = await Promise.all(jobs);
    resources.render_vert_source = values[0];
    resources.render_frag_source = values[1];
    resources.update_source = values[2];
}

export function start(gl, ctx) {
    // Create our buffers
    buffer1 = gl.createBuffer();
    buffer2 = gl.createBuffer();
    trans_feedback = gl.createTransformFeedback();

    // Set the particles to a random position and velocity.
    const particle_data = [];
    for (let i = 0; i < particles; i++) {
        const x = 1.0 - (Math.random() * 2.0);
        const y = 1.0 - (Math.random() * 2.0);
        particle_data.push(x, y, x, y);
    }

    const flat_data = new Float32Array(particle_data);

    // Fill the buffers.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer1);
    gl.bufferData(gl.ARRAY_BUFFER, flat_data, gl.STREAM_COPY);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
    // gl.bufferData(gl.ARRAY_BUFFER, flat_data, gl.STATIC_DRAW);
    gl.bufferData(gl.ARRAY_BUFFER, flat_data, gl.STREAM_COPY);

    // Create the update shader program.
    {
        const update_sources = [
            { source: resources.update_source, type: gl.VERTEX_SHADER },
            {
                source: `#version 300 es
precision mediump float;

out vec4 o_FragColor;
void main() {
    discard;
}`,
                type: gl.FRAGMENT_SHADER
            },
        ]
        const program = ctx.shader_mananger.create_program("update-stars", update_sources, ['o_position', 'o_velocity']);
        update_p = ctx.shader_mananger.program_details(program);
    }
    // Create the render shader program.
    {
        const render_sources = [
            { source: resources.render_vert_source, type: gl.VERTEX_SHADER },
            { source: resources.render_frag_source, type: gl.FRAGMENT_SHADER },
        ]
        const program = ctx.shader_mananger.create_program("render-stars", render_sources);
        render_p = ctx.shader_mananger.program_details(program);
    }

    noise_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noise_texture);
    gl.texImage2D(gl.TEXTURE_2D,
        0,
        gl.RG16F,
        512, 512,
        0,
        gl.RG,
        gl.FLOAT,
        random_rg_data(2 * 512 * 512));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

export function draw_frame(gl, ctx) {
    // Move the particles.
    gl.useProgram(update_p.program);

    // Bind input buffer and output buffer.
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, trans_feedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer2);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer1);

    // set the i_position (location 0) to the buffer.
    const pos_location = 0;
    gl.enableVertexAttribArray(pos_location);
    gl.vertexAttribPointer(
        pos_location,   // What are we changing.
        2,              // How many things are there.
        gl.FLOAT,       // What is the data.
        false,          // Normalize.
        vert_stride,    // Floats per vertex.
        0,              // Offset.
    );

    // set the i_velocity (location 1) to the buffer.
    const vel_location = 1;
    gl.enableVertexAttribArray(vel_location);
    gl.vertexAttribPointer(
        vel_location,   // What are we changing.
        2,              // How many things are there.
        gl.FLOAT,       // What is the data.
        false,          // Normalize.
        vert_stride,    // Floats per vertex.
        2 * float_bytes,// Offset.
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.audio_tex);
    gl.uniform1i(update_p.uniforms.u_audio_tex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noise_texture);
    gl.uniform1i(update_p.uniforms.u_noise, 1);

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, particles);
    gl.endTransformFeedback();

    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // Disable attributes after the draw call.
    gl.disableVertexAttribArray(pos_location);
    gl.disableVertexAttribArray(vel_location);

    // Render the particles.
    gl.useProgram(render_p.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);

    // set the i_position (location 0) to the buffer.
    gl.enableVertexAttribArray(pos_location);
    gl.vertexAttribPointer(
        pos_location,   // What are we changing.
        2,              // How many things are there.
        gl.FLOAT,       // What is the data.
        false,          // Normalize.
        vert_stride,    // Floats per vertex.
        0,              // Offset.
    );

    // set the i_velocity (location 1) to the buffer.
    gl.enableVertexAttribArray(vel_location);
    gl.vertexAttribPointer(
        vel_location,   // What are we changing.
        2,              // How many things are there.
        gl.FLOAT,       // What is the data.
        false,          // Normalize.
        vert_stride,    // Floats per vertex.
        2 * float_bytes,// Offset.
    );

    // Draw all our points.
    gl.drawArrays(gl.POINTS, 0, particles);

    gl.disableVertexAttribArray(pos_location);
    gl.disableVertexAttribArray(vel_location);


    // Swap the buffers for the next frame.
    [buffer1, buffer2] = [buffer2, buffer1];
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

/**
 * Generates an array of random floats.
 * @param {number} size how many points to generate.
 * @returns return a Float32Array;
 */
function random_rg_data(size) {
    const d = [];
    for (let i = 0; i < size; ++i) {
        d.push(Math.random());
    }
    return new Float32Array(d);
}