// by 45ninjat/45ninjas heavily derived from this great
// tutorial by Iskander Samatov.
// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/

const RadialWave = {
    radius: 300,
    radius_margin: 200,
    revolutions: 5,
    rotate_speed: 0.08,
    power: 1.7,
    scale: 0.0175,
    volume_scale: 1,
    line_width: 2,
    draw(ctx, samples_data) {
        let samples = samples_data.length;

        // Get the middle of the canvas.
        let middle_x = canvas.width / 2;
        let middle_y = canvas.height / 2;

        // Create our gradient.
        var gradient = ctx.createRadialGradient(middle_x, middle_y, this.radius - this.line_width * 2, middle_x, middle_y, this.radius + this.radius_margin);
        gradient.addColorStop(0, "rgba(0,0,0,1)");
        gradient.addColorStop(0.1, "#044224");
        gradient.addColorStop(0.50, "#32ff00");
        gradient.addColorStop(0.80, "#99ffcd");

        let value;
        ctx.beginPath();

        for (let i = 0; i < samples * 2; i++) {

            // Get the scale of this point.
            // We are sampling the data in both directions.
            if (i >= samples) {
                value = samples_data[samples - i + samples];
            }
            else {
                value = samples_data[i];
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
                middle_x + (this.radius + value) * Math.cos(t),
                middle_y + (this.radius + value) * Math.sin(t)
            );
        }
        ctx.closePath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.line_width;
        ctx.stroke();
    }
}

const Renderer = {
    visualiser: RadialWave,
    analyser: null,
    video_ctx: null,
    time: 0.0,
    last_time: null,
    freq_data_buffer: null,
    anim_frame_handle: null,
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
        window.cancelAnimationFrame(Renderer.anim_frame_handle)
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
        // this.analyser.smoothingTimeConstant = 0.775;
        this.analyser.smoothingTimeConstant = 0.95;

        this.analyser.fftSize = 512;
        this.analyser.minDecibels = -70;
        this.analyser.maxDecibels = -20;

        // Connect our analyser to the audio.
        audio_source.connect(this.analyser);
        this.analyser.connect(audio_ctx.destination);

        // Create our data buffer.
        this.freq_data_buffer = new Uint8Array(this.analyser.frequencyBinCount);

        console.log(this.analyser);
    },
    frame_callback() {
        // Draw our frame.
        Renderer.tick();

        // Get a render frame.
        Renderer.anim_frame_handle = window.requestAnimationFrame(Renderer.frame_callback);
    },
    tick() {
        // Bail if there's not audio, video or visualiser.
        if (this.analyser == null) {
            console.log(this.analyser);
            console.warn("Audio has not been initialised.");
            return;
        }
        if (this.visualiser == null) {
            console.warn("No Visualiser to animate.");
            return;
        }
        if (this.video_ctx == null) {
            console.warn("Video has not been initialised.");
            return;
        }

        // Only slightly clear the screen.
        // this.video_ctx.fillStyle = "rgba(0,0,0,0.2)";
        // this.video_ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.video_ctx.clearRect(0,0, canvas.width, canvas.height);

        // Get the delta time.
        let now = Date.now();
        let delta = (now - this.last_time) / 1000;
        this.last_time = now;

        if (!isNaN(delta)) {
            this.time += delta;
        }

        // Get the audio spectrum data.
        this.analyser.getByteFrequencyData(this.freq_data_buffer);

        // Draw the visualiser.
        this.visualiser.draw(this.video_ctx, this.freq_data_buffer);
    },
    intensity_range: 0.25,
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