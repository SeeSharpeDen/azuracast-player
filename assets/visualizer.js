// by 45ninjat/45ninjas heavily derived from this great
// tutorial by Iskander Samatov.
// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/

// The main visualiser.
const Visualisers = {
    RadialWave: {
        radius: 200,
        radius_margin: 170,
        revolutions: 1,
        rotate_speed: 0.08,
        power: 1.7,
        scale: 0.4,
        volume_scale: 1,
        line_width: 3,
        radius_intensity: 40,
        draw(ctx, samples_data, intensity) {
            let samples = Math.round(samples_data.length * 0.6);

            // Get the middle of the canvas.
            let middle_x = canvas.width / 2;
            let middle_y = canvas.height / 2;

            let radius = this.radius + (intensity * this.radius_intensity);

            // Create our gradient.
            var gradient = ctx.createRadialGradient(middle_x, middle_y, radius - this.line_width * 4, middle_x, middle_y, radius + this.radius_margin);
            gradient.addColorStop(0, "#000000");
            gradient.addColorStop(0.05, "#ff0000");
            // gradient.addColorStop(0.5, "#ff0000");
            gradient.addColorStop(0.7, "#ffffff");

            let value;

            ctx.beginPath();

            for (let i = 0; i < samples * 2; i++) {

                // Get the scale of this point.
                // We are sampling the data in both directions.
                if (i >= samples) {
                    value = samples_data[samples - i + samples] / 256.0;
                }
                else {
                    value = samples_data[i] / 256.0;
                }
                value = Math.pow(value, this.power);
                // Scale our value.
                value *= this.scale;
                // Compensate for the volume slider.
                value *= Math.max(1.0 / this.volume_scale, 2.0);

                // How many steps are there?
                let t = (i * 0.5) / samples;
                // how many times around a circle should we go?
                t *= this.revolutions * 2 * Math.PI;
                // rotate that circle over time.
                t += Renderer.time * this.rotate_speed;

                // Draw the circle.
                ctx.lineTo(
                    middle_x + (radius + (value * this.radius_margin)) * Math.cos(t),
                    middle_y + (radius + (value * this.radius_margin)) * Math.sin(t)
                );
            }
            ctx.strokeStyle = gradient;
            ctx.fillStyle = "black";
            ctx.lineWidth = this.line_width;

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(middle_x, middle_y, radius, 0, 360);
            ctx.fill();
            ctx.stroke();
        }
    },
    // Just a plain jane visualiser for debugging purposes.
    Spectrum: {
        line_width: 1,
        draw(ctx, samples_data, intensity) {
            let samples = samples_data.length;
            let spacing = canvas.width / samples;

            // Draw the waveform multiplied by the function.
            ctx.lineWidth = this.line_width + intensity * 10;
            ctx.beginPath();
            let start = Math.max(0, Renderer.intensity_g_offset - Renderer.intensity_g_width * 2);
            let end = Math.min(samples, Renderer.intensity_g_offset + Renderer.intensity_g_width * 2);
            for (let i = start; i < end; i++) {
                ctx.lineTo(i * spacing, intensity * 256 + gaussian(i, Renderer.intensity_g_width, Renderer.intensity_g_offset) * samples_data[i]);
            }
            ctx.strokeStyle = "green";
            ctx.stroke();

            // Draw the Gaussian function.
            ctx.beginPath();
            ctx.lineWidth = this.line_width;
            for (let i = 0; i < samples; i++) {
                ctx.lineTo(i * spacing, gaussian(i, Renderer.intensity_g_width, Renderer.intensity_g_offset) * 100);
            }
            ctx.strokeStyle = "red";
            ctx.stroke();

            // Just draw the waveform.
            ctx.beginPath();
            for (let i = 0; i < samples; i++) {
                ctx.lineTo(spacing * i, samples_data[i]);
            }
            ctx.strokeStyle = "white";
            ctx.stroke();
        }
    }
}

// The actual renderer.
const Renderer = {
    // An array of visualisers to use.
    visualiser: Visualisers.RadialWave,
    analyser: null,
    video_ctx: null,
    time: 0.0,
    last_time: null,
    freq_data_buffer: null,
    intensity_g_width: 3,
    intensity_g_offset: 5,
    frame_handle: 0,

    play() {

        if (this.analyser == null) {
            console.info("Initialising Audio for the first time.");
            this.init_audio();
        }

        if (this.video_ctx == null) {
            console.info("Initialising Video for the first time.");
            this.init_video();
        }

        this.frame_callback()
    },
    stop() {
        this.video_ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.cancelAnimationFrame(Renderer.frame_handle);
        console.log("Stopping");
    },
    set_visualiser(name) {
        let v = Visualisers[name];
        if (v != undefined && v != null) {
            this.visualiser = v;
            this.play();
            console.info(`Changing visualiser to ${name}`);
        } else {
            this.visualiser = null;
            this.stop();
            console.info("Turning off visualiser");
        }
    },
    init_video() {
        // Get the canvas.
        var canvas = document.getElementById("canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Get the canvas context.
        this.video_ctx = canvas.getContext("2d");

        // Reset the time.
        this.time = 0.0;
    },
    init_audio() {
        // Create the audio context and audio source.
        let audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
        let audio_source = audio_ctx.createMediaElementSource(Radio.audio);

        // Create our audio analyser.
        this.analyser = audio_ctx.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.775;
        // this.analyser.smoothingTimeConstant = 0.95;

        // this.analyser.fftSize = 512;
        this.analyser.fftSize = 2048;
        this.analyser.minDecibels = -70;
        this.analyser.maxDecibels = -20;

        // Connect our analyser to the audio.
        audio_source.connect(this.analyser);
        this.analyser.connect(audio_ctx.destination);

        // Create our data buffer.
        this.freq_data_buffer = new Uint8Array(this.analyser.frequencyBinCount);
    },
    frame_callback() {
        // Draw our frame.
        if (Renderer.tick()) {
            // Looks like it's OK to render another frame.
            Renderer.frame_handle = window.requestAnimationFrame(Renderer.frame_callback);
        }
    },
    tick() {
        // Bail if there's not audio, video or visualiser.
        if (this.analyser == null) {
            console.warn("Audio has not been initialised.");
            return false;
        }
        if (this.visualiser == null) {
            console.warn("No Visualiser to render");
            return false;
        }
        if (this.video_ctx == null) {
            console.warn("Video has not been initialised.");
            return false;
        }

        // Only slightly clear the screen.
        // this.video_ctx.fillStyle = "rgba(0,0,0,0.2)";
        // this.video_ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.video_ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get the delta time.
        let now = Date.now();
        let delta = (now - this.last_time) / 1000;
        this.last_time = now;

        if (!isNaN(delta)) {
            this.time += delta;
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
        // intensity = Math.exp(intensity);
        // intensity = Math.sqrt(intensity);
        intensity = Math.pow(intensity, 2);

        // Draw the visualiser.
        this.visualiser.draw(this.video_ctx, this.freq_data_buffer, intensity);

        return true;
    },
}

// Thanks ChatGPT. You slowed me down to come up with this. Thanks for confusing me.
// Used to filter out a section of the waveform for "intensity"/beat detection.
function gaussian(x, width, offset) {
    return Math.exp(-Math.pow((offset - x) / width, 2));
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
    console.log("Resizing canvas.");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setResizeHandler(resize_canvas, 350);