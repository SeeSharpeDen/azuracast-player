// by 45ninjat/45ninjas heavily derived from this great
// tutorial by Iskander Samatov.
// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/

const Visualisers = [
    'dvd.js',
    'radial-wave.js',
    'spectrum.js',
    'starfield.js'
]
// The actual renderer.
const Renderer = {
    // An array of visualisers to use.
    visualiser: null,
    analyser: null,
    gl: null,
    canvas: null,
    run_time: 0.0,
    last_time: null,
    freq_data_buffer: null,
    intensity_g_width: 3,
    intensity_g_offset: 5,
    frame_handle: 0,
    audio_tex: {
        width: 1024,
        height: 512,
        data: null,
        gl_texture: null
    },

    projection_matrix: new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]),
    ubo: null,

    kill: {
        red: null,
        blue: null,
    },

    init() {
        this.init_video();
        Renderer.frame_callback()
    },

    stop() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        window.cancelAnimationFrame(Renderer.frame_handle);
        console.log("Stopping");
    },
    set_visualiser(path) {

        import(`./visualisers/${path}`).then(module => {
            console.log('loaded visualiser: ', module);
            // Remove the old visualizer class from the canvas element.
            if (this.visualiser != null) {
                this.canvas.classList.remove(this.visualiser.css_class);
            }

            window.localStorage.setItem("last_visualiser", path);

            // Set our new visualizer and add it's class to the canvas element.
            this.visualiser = module;
            this.canvas.classList.add(this.visualiser.css_class);

            this.visualiser.start(this.gl, this.ubo);

            Renderer.frame_callback();
        }).catch(error => {
            console.error('Failed to load visualiser:', error);
        });
    },
    init_video() {
        // Get the canvas.
        this.canvas = document.getElementById("canvas");

        // Get the canvas context.
        this.gl = canvas.getContext("webgl2");

        if (!this.gl) {
            throw new Error("WebGL 2.0 is not supported.");
        } else {
            console.log("Using WebGL 2 context");
        }

        // Create our UBO
        // TODO: add 'kill' to our UBO.

        const projection_size = this.projection_matrix.byteLength;
        const float_size = 2 * Float32Array.BYTES_PER_ELEMENT;

        const ubo_size = projection_size + float_size + 20;
        console.log(`UBO Size: ${ubo_size}`);


        this.ubo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ubo);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, ubo_size, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

        resize_canvas();

        // Reset the time.
        this.run_time = 0.0;
        this.last_time = Date.now();
        this.kill_red = document.querySelector("#kill_red");
        this.kill_blue = document.querySelector("#kill_blue");

        // setup the audio texture.
        this.init_audio_texture(this.audio_tex, this.gl);
    },
    init_audio(ctx) {

        // Create the audio context and audio source.
        this.analyser = ctx.createAnalyser();

        this.analyser.smoothingTimeConstant = 0.8;
        this.analyser.minDecibels = -80;
        this.analyser.maxDecibels = -15;
        this.analyser.fftSize = this.audio_tex.width * 2;

        // Create our data buffer.
        this.freq_data_buffer = new Uint8Array(this.analyser.frequencyBinCount);
    },
    init_audio_texture(tex, gl) {
        tex.data = new Uint8Array(tex.width * tex.height);
        tex.gl_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.gl_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Set the texture to repeat in both the S (horizontal) and T (vertical) directions
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

        gl.texImage2D(
            gl.TEXTURE_2D, 0,
            gl.LUMINANCE, tex.width, tex.height, 0,
            gl.LUMINANCE, gl.UNSIGNED_BYTE, // Texture type.
            tex.data // The data.
        );


    },
    frame_callback() {
        // Draw our frame.
        Renderer.tick();
        // if (Renderer.tick()) {
        // Looks like it's OK to render another frame.
        Renderer.frame_handle = window.requestAnimationFrame(Renderer.frame_callback);
        // }
    },
    tick() {
        // Bail if there's not audio, video or visualiser.
        if (this.analyser == null || this.visualiser == null || this.gl == null) {
            return false;
        }

        // Get the delta time.
        let now = Date.now();
        let delta_time = (now - this.last_time) / 1000;
        this.last_time = now;

        if (!isNaN(delta_time)) {
            this.run_time += Math.min(delta_time, 0.33);
        }

        // Get the audio spectrum data.
        // this.analyser.getByteFrequencyData(this.freq_data_buffer);
        this.update_audio_texture(this.audio_tex, this.gl);

        // Get the intensity of the music by applying a gaussian function to the waveform.
        let intensity = 0.0;
        let gaussian_total = 0.0;

        let start = Math.max(0.0, this.intensity_g_offset - this.intensity_g_width * 2);
        let end = Math.min(this.freq_data_buffer.length, this.intensity_g_offset + this.intensity_g_width * 2);

        // Only iterate over the area under the gaussian curve.
        for (let i = start; i < end; i++) {
            let g = gaussian(i, this.intensity_g_width, this.intensity_g_offset);
            gaussian_total += g;
            intensity += g * this.freq_data_buffer[i] / 256.0;
        }
        intensity = intensity / gaussian_total;

        // Added for extra affect.
        intensity = Math.pow(intensity, 2);

        if (this.kill != null) {
            update_kill(intensity);
        }

        this.update_ubo(this.gl, intensity, this.run_time);

        // Draw the visualiser.
        this.visualiser.draw_frame(this.gl, this.freq_data_buffer, delta_time, intensity);

        return true;
    },
    update_ubo(gl, intensity, time) {
        const projection_size = this.projection_matrix.byteLength;
        const float_size = 1 * Float32Array.BYTES_PER_ELEMENT;

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection_size, new Float32Array([intensity]));
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection_size + float_size, new Float32Array([time]));

        gl.bindBuffer(Renderer.gl.UNIFORM_BUFFER, null);
    },

    update_audio_texture(tex, gl) {
        // The the frequency data.

        this.analyser.getByteFrequencyData(this.freq_data_buffer);

        // TODO: Instead of the CPU moving the data around, we can make the GPU handle this
        // by keeping track of what row of pixels is the latest and offset the UV coordinates
        // in the shaders.

        // Move the old data down one row of pixels.
        const old_view = tex.data.subarray(0, tex.data.length - tex.width);
        tex.data.set(old_view, tex.width);

        // Insert this frame's audio data to the first row of pixels.
        tex.data.set(this.freq_data_buffer, 0);

        // Update the texture.
        gl.bindTexture(gl.TEXTURE_2D, tex.gl_texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D, 0, // Texture and mip map level.
            0, 0, tex.width, tex.height, // x,y,width & height of the texture.
            gl.LUMINANCE, gl.UNSIGNED_BYTE, // Texture type.
            tex.data // The data.
        );
    }
}

// Thanks ChatGPT. You slowed me down to come up with this. Thanks for confusing me.
// Used to filter out a section of the waveform for "intensity"/beat detection.
function gaussian(x, width, offset) {
    return Math.exp(-Math.pow((offset - x) / width, 2));
}

function update_kill(intensity) {
    let kill = Math.round(intensity * 8);
    if (kill > 4) {
        this.kill_red.setAttribute("dx", -kill);
        this.kill_blue.setAttribute("dx", kill);

        if (kill > 6) {
            this.kill_red.setAttribute("dy", kill / 2);
            this.kill_blue.setAttribute("dy", -kill / 2);
        } else {
            this.kill_red.setAttribute("dy", "0");
            this.kill_blue.setAttribute("dy", "0");
        }
    } else {
        this.kill_red.setAttribute("dx", "0");
        this.kill_blue.setAttribute("dx", "0");

        this.kill_red.setAttribute("dy", "0");
        this.kill_blue.setAttribute("dy", "0");
    }
}


// For resizing
// https://stackoverflow.com/a/30688151

function setResizeHandler(callback, timeout) {
    var timer_id = undefined;
    window.addEventListener("resize", function () {
        if (timer_id != undefined) {
            clearTimeout(timer_id);
            timer_id = undefined;
        }
        timer_id = setTimeout(function () {
            timer_id = undefined;
            resize_canvas();
        }, timeout);
    });
}

function resize_canvas() {
    let parent_rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = parent_rect.width;
    canvas.height = parent_rect.height;

    Renderer.gl.viewport(0, 0, canvas.width, canvas.height);

    let aspect = canvas.width / canvas.height;
    if (aspect > 1) {
        Renderer.projection_matrix[0] = 1.0 / aspect;
        Renderer.projection_matrix[5] = 1.0;
    } else {
        Renderer.projection_matrix[0] = 1.0
        Renderer.projection_matrix[5] = aspect
    }
    Renderer.gl.bindBuffer(Renderer.gl.UNIFORM_BUFFER, Renderer.ubo);
    Renderer.gl.bufferSubData(Renderer.gl.UNIFORM_BUFFER, 0, Renderer.projection_matrix);
    Renderer.gl.bindBuffer(Renderer.gl.UNIFORM_BUFFER, null);

}
setResizeHandler(resize_canvas, 350);