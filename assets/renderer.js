const Visualisers = [
    'dvd.js',
    'radial-wave/module.js',
    'spectrum.js',
    'starfield.js'
]

let active_vis = null;
let analyser = null;
let gl = null;
let canvas = null;
let glitched_logo = null;

const projection = {
    matrix: new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]),
    bytes: Float32Array.BYTES_PER_ELEMENT * 16,
}

const ubo = {
    bytes: projection.bytes + (3 * Float32Array.BYTES_PER_ELEMENT),
    gl_buffer: null,
}

let time = 0.0;
let last_timestamp = 0;
let delta_time = 0.0;

const audio_tex = {
    width: 1024,
    height: 512,
    data: null,
    gl_texture: null,
    buffer: null
}

let intensity_g_width = 3;
let intensity_g_offset = 5;

/**
 * Initialize the renderer and the GL context.
 * @param {Element} canvas_elm The canvas to be rendering to.
 */
async function init(canvas_elm) {
    canvas = canvas_elm;
    gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("WebGL 2.0 is not supported.");
    }

    // Reset the time.
    time = 0;

    // Create the UBO
    console.log(`UBO bytes: ${ubo.bytes}`);

    ubo.gl_buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo.gl_buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 80, gl.DYNAMIC_DRAW);
    // gl.bufferData(gl.UNIFORM_BUFFER, ubo.bytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Now that the UBO has been created, we can update the projection matrix inside it.
    resize();

    // Setup the audio texture.
    audio_tex.data = new Uint8Array(audio_tex.width * audio_tex.height);
    audio_tex.gl_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, audio_tex.gl_texture);

    // Set the texture filtering.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Set the texture wrapping mode.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    gl.texImage2D(
        gl.TEXTURE_2D, 0,
        gl.LUMINANCE, audio_tex.width, audio_tex.height, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, // Texture type.
        audio_tex.data // The data.
    );

    // Load the glitched logo.
    glitched_logo = await load_visualiser("glitched-logo/module.js");

    gl.clearColor(0, 0, 0, 0.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // TODO: support kill again
    // this.kill_red = document.querySelector("#kill_red");
    // this.kill_blue = document.querySelector("#kill_blue");

    // Start rendering frames.
    frame_callback();
}
/**
 * Resizes the viewport and updates the projection matrix to accommodate for the aspect ratio.
 */
function resize() {

    //Is this actually necessary?
    const parent_rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = parent_rect.width;
    canvas.height = parent_rect.height;

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Update the projection to change the width or height of the scene based on screen orientation.
    const aspect = canvas.width / canvas.height;
    if (aspect > 1) {
        projection.matrix[0] = 1.0 / aspect;
        projection.matrix[5] = 1.0;
    } else {
        projection.matrix[0] = 1.0
        projection.matrix[5] = aspect
    }

    // Update the matrix data inside the ubo.
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo.gl_buffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projection.matrix);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}
/**
 * Initializes the audio processing function of the renderer.
 * @param {AudioContext} ctx Active Audio Context/Pipeline.
 */
function init_audio(ctx, source) {

    // Create the audio analyser from the audio context.
    analyser = ctx.createAnalyser();

    // analyser.smoothingTimeConstant = 0.8;
    analyser.smoothingTimeConstant = 0.92;

    analyser.minDecibels = -80;
    analyser.maxDecibels = -15;
    analyser.fftSize = audio_tex.width * 2;

    // Connect the source audio to the analyser.
    source.connect(analyser);

    // Create our data buffer.
    audio_tex.buffer = new Uint8Array(analyser.frequencyBinCount);
}

function tick(timestamp) {
    // Bail if there is an Audio or Video context, and there's something to render.
    if (analyser == null || active_vis == null || gl == null) {
        return false;
    }

    // Update the time.
    // TODO: If delta time isn't being used. There is a simpler way of getting elapsed time.

    if (!last_timestamp) {
        last_timestamp = timestamp;
    }

    delta_time = (timestamp - last_timestamp) / 1000.0;
    last_timestamp = timestamp;

    // If the delta time is very large just limit it.
    time += Math.min(delta_time, 0.333);

    // Get the audio spectrum data.
    update_audio_texture();

    // Get the intensity/beat of the music for this frame.
    let intensity = beat_detection(audio_tex.buffer);

    // Raise it to the powe of 2 for extra punch.
    intensity = Math.pow(intensity, 2);

    // TODO: Do kill again.
    // if (this.kill != null) {
    // update_kill(intensity);
    // }

    // Update the time and intensity value inside the UBO.
    const float_size = 1 * Float32Array.BYTES_PER_ELEMENT;

    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo.gl_buffer);

    // TODO: Make this one call.
    // Set the intensity.
    let offset = projection.bytes;
    gl.bufferSubData(gl.UNIFORM_BUFFER, offset, new Float32Array([intensity]));
    // Set the time.
    offset = offset + float_size;
    gl.bufferSubData(gl.UNIFORM_BUFFER, offset, new Float32Array([time]));
    // Set the delta time.
    offset = offset + float_size;
    gl.bufferSubData(gl.UNIFORM_BUFFER, offset, new Float32Array([delta_time]));

    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    gl.clear(gl.COLOR_BUFFER_BIT);

    const frame_ctx = {
        audio_tex: audio_tex.gl_texture,
        ubo: ubo.gl_buffer,
    };
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    active_vis.draw_frame(gl, frame_ctx);

    if (active_vis.details.draw_logo) {
        glitched_logo.draw_frame(gl, frame_ctx);
    }

    return true;
}
/**
 * Get the intensity of the music by applying a gaussian function to the waveform then averaging them out.
 * @param {Uint8Array} frequency_data 
 */
function beat_detection(frequency_data) {
    const start = Math.max(0.0, intensity_g_offset - intensity_g_width * 2);
    const end = Math.min(frequency_data.length, intensity_g_offset + intensity_g_width * 2);

    let intensity = 0.0;
    let gaussian_total = 0.0;

    // Only iterate over the area under the gaussian curve.
    for (let i = start; i < end; i++) {
        let g = Math.exp(-Math.pow((intensity_g_offset - i) / intensity_g_width, 2));
        gaussian_total += g;
        intensity += g * frequency_data[i] / 255.0;
    }
    return intensity / gaussian_total;
}

/**
 * Update the audio texture with new data from the analyser.
 */
function update_audio_texture() {
    // Put the frequency data into the buffer.
    analyser.getByteFrequencyData(audio_tex.buffer);

    // TODO: Instead of the CPU moving the data around, we can make the GPU handle this
    // by keeping track of what row of pixels is the latest and offset the UV coordinates
    // in the shaders.

    // Move the old data down one row of pixels.
    const old_view = audio_tex.data.subarray(0, audio_tex.data.length - audio_tex.width);
    audio_tex.data.set(old_view, audio_tex.width);

    // Insert this frame's audio data to the first row of pixels.
    audio_tex.data.set(audio_tex.buffer, 0);

    // Update the texture.
    gl.bindTexture(gl.TEXTURE_2D, audio_tex.gl_texture);
    gl.texSubImage2D(
        gl.TEXTURE_2D, 0, // Texture and mip map level.
        0, 0, audio_tex.width, audio_tex.height, // x,y,width & height of the texture.
        gl.LUMINANCE, gl.UNSIGNED_BYTE, // Texture type.
        audio_tex.data // The data.
    );
}

let frame_handle = 0;
function frame_callback(timestamp) {
    tick(timestamp);
    frame_handle = window.requestAnimationFrame(frame_callback);
}
async function load_visualiser(visualiser_name) {
    console.log('loading visualiser: ', visualiser_name);
    const path = `visualisers/${visualiser_name}`;
    const module = await import(`./${path}`);

    // If the module has the load_assets function. Call it.
    if (!!module.load_assets) {
        const parts = path.split('/');
        const dir = parts.slice(0, -1).join('/');
        await module.load_assets?.(`./assets/${dir}`);
    }

    // Start the visualizer.
    const start_ctx = {
        ubo: ubo.gl_buffer,
        shader_mananger: new ShaderManager(gl)
    }
    module.start(gl, start_ctx);

    console.log('Finished loading visualiser: ', visualiser_name);
    return module;
}
async function set_visualiser(visualiser_name) {

    // Reset the gl context.
    reset_gl();

    // Load and start the visualizer.
    const visualiser = await load_visualiser(visualiser_name);

    // Remove the old visualizer class from the canvas element.
    if (active_vis != null) {
        canvas.classList.remove(active_vis.css_class);
    }

    window.localStorage.setItem("last_visualiser", visualiser_name);

    // Set our new visualizer and add it's class to the canvas element.
    active_vis = visualiser;
    canvas.classList.add(active_vis.css_class);


    // Begin rendering.
    // frame_callback();
}

function reset_gl() {
    // Unbind all buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

    // Unbind all textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Unbind vertex array objects (VAOs)
    gl.bindVertexArray(null);

    // Unbind the program
    gl.useProgram(null);

    // Disable common state flags
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.SCISSOR_TEST);

    // Set default blend function
    gl.blendFunc(gl.ONE, gl.ZERO);
}

class ShaderManager {
    constructor(gl) {
        this.gl = gl;
        this.programs = new Map();
    }
    compile_shader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const err = new Error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            throw err;
        }

        return shader;
    }
    create_program(name, shader_sources, tf_varyings = []) {

        // If a shader already exists, return it.
        if (this.programs.has(name)) {
            console.warn(`Program with name '${name}' already exists.`);
            return this.programs.get(name);
        }

        // Compile all the shaders.
        const compiled_shaders = [];
        for (const shader of shader_sources) {
            const compiled = this.compile_shader(shader.source, shader.type);
            compiled_shaders.push(compiled);
        }

        // Create our shader program and link all the compiled shaders to it.
        const program = gl.createProgram();
        for (const shader of compiled_shaders) {
            gl.attachShader(program, shader);
        }

        // If there are any transform feedback varyings, add them.
        if (tf_varyings.length > 0) {
            this.gl.transformFeedbackVaryings(program, tf_varyings, gl.INTERLEAVED_ATTRIBS);
        }

        // Finalize the shader program and check for errors.
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const err = new Error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
            gl.deleteProgram(program);
            throw err;
        }

        // Cleanup the compiled shaders.
        for (const shader of compiled_shaders) {
            gl.detachShader(program, shader);
            gl.deleteShader(shader);
        }

        this.programs.set(name, program);
        return program;
    }

    get_program(name) {
        return this.programs.get(name);
    }

    program_details(program) {
        const gl = this.gl;

        const details = {
            attributes: {},
            uniforms: {},
            ubos: {},
            program: program
        };

        const attrib_count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attrib_count; i++) {
            const item = gl.getActiveAttrib(program, i);
            const location = gl.getAttribLocation(program, item.name);
            details.attributes[item.name] = location;
        }

        const uniform_count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniform_count; i++) {
            const item = gl.getActiveUniform(program, i);
            const location = gl.getUniformLocation(program, item.name);
            if (location) {
                details.uniforms[item.name] = location;
            }
        }

        const ubo_count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
        for (let i = 0; i < ubo_count; i++) {
            const item = gl.getActiveUniformBlockName(program, i);
            const location = gl.getUniformBlockIndex(program, item);
            details.ubos[item] = location;
        }

        return details;
    }
}

export {
    init,
    init_audio,
    set_visualiser,
    analyser,
    ShaderManager
}
// TODO: Add support for kill.
// function update_kill(intensity) {
//     let kill = Math.round(intensity * 8);
//     if (kill > 4) {
//         this.kill_red.setAttribute("dx", -kill);
//         this.kill_blue.setAttribute("dx", kill);

//         if (kill > 6) {
//             this.kill_red.setAttribute("dy", kill / 2);
//             this.kill_blue.setAttribute("dy", -kill / 2);
//         } else {
//             this.kill_red.setAttribute("dy", "0");
//             this.kill_blue.setAttribute("dy", "0");
//         }
//     } else {
//         this.kill_red.setAttribute("dx", "0");
//         this.kill_blue.setAttribute("dx", "0");

//         this.kill_red.setAttribute("dy", "0");
//         this.kill_blue.setAttribute("dy", "0");
//     }
// }


function setResizeHandler(timeout) {
    var timer_id = undefined;
    window.addEventListener("resize", function () {
        if (timer_id != undefined) {
            clearTimeout(timer_id);
            timer_id = undefined;
        }
        timer_id = setTimeout(function () {
            timer_id = undefined;
            resize();
        }, timeout);
    });
}
setResizeHandler(350);