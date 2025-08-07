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
    video_ctx: null,
    canvas: null,
    time: 0.0,
    last_time: null,
    freq_data_buffer: null,
    intensity_g_width: 3,
    intensity_g_offset: 5,
    frame_handle: 0,

    kill: {
        red: null,
        blue: null,
    },

    init() {
        this.init_video();
        Renderer.frame_callback()
    },

    stop() {
        this.video_ctx.clearRect(0, 0, canvas.width, canvas.height);
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

            Renderer.frame_callback();
        }).catch(error => {
            console.error('Failed to load visualiser:', error);
        });
    },
    init_video() {
        // Get the canvas.
        this.canvas = document.getElementById("canvas");

        // Get the canvas context.
        this.video_ctx = canvas.getContext("2d");

        resize_canvas();

        // Reset the time.
        this.time = 0.0;

        Object.keys(Visualisers).forEach(key => {
            console.log(`Visualizer ${key}`);
            Visualisers[key].class_name = key.toString();
        });

        this.kill_red = document.querySelector("#kill_red");
        this.kill_blue = document.querySelector("#kill_blue");
    },
    init_audio(ctx) {
        // Create the audio context and audio source.
        this.analyser = ctx.createAnalyser();

        this.analyser.smoothingTimeConstant = 0.8;

        // this.analyser.fftSize = 512;
        this.analyser.fftSize = 2048;
        // this.analyser.minDecibels = -90;
        // this.analyser.maxDecibels = -20;

        // Create our data buffer.
        this.freq_data_buffer = new Uint8Array(this.analyser.frequencyBinCount);
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
        if (this.analyser == null || this.visualiser == null || this.video_ctx == null) {
            return false;
        }

        this.video_ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get the delta time.
        let now = Date.now();
        let delta_time = (now - this.last_time) / 1000;
        this.last_time = now;

        if (!isNaN(delta_time)) {
            this.time += delta_time;
        }

        // Get the audio spectrum data.
        this.analyser.getByteFrequencyData(this.freq_data_buffer);

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

        // Draw the visualiser.
        this.visualiser.draw_frame(this.video_ctx, this.freq_data_buffer, delta_time, intensity);

        return true;
    },
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
    console.log(canvas);
}
setResizeHandler(resize_canvas, 350);