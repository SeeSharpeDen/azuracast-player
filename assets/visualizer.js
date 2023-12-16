// by 45ninjat/45ninjas heavily derived from this great
// tutorial by Iskander Samatov.
// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/

// The main visualiser.
const Visualisers = {
    RadialWave: {
        radius_scale: 0.65,
        radius_margin: 170,
        revolutions: 1,
        rotate_speed: 0.08,
        power: 1.5,
        scale: 0.8,
        line_width: 3,
        radius_intensity: 60,
        draw(ctx, samples_data, delta_time, intensity) {

            const samples = Math.round(samples_data.length * 0.6);

            // Get the middle of the canvas.
            const middle_x = canvas.width / 2;
            const middle_y = canvas.height / 2;

            const radius = Math.min(middle_x, middle_y) * this.radius_scale + (intensity * this.radius_intensity);

            // Create our gradient.
            const gradient = ctx.createRadialGradient(middle_x, middle_y, radius - this.line_width * 4, middle_x, middle_y, radius + this.radius_margin);
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
    Starfield: {
        stars: [],
        star_count: 1000,
        speed: 1000.0,
        start_velocity: 1000.0,
        inner_radius: 50,
        outer_radius: 500,
        stretch_scale: 30,
        star_scale: 4,
        star_size: 1,
        pow: 4,
        draw(ctx, samples_data, delta_time, intensity) {

            let stars = this.stars;

            const samples = Math.round(samples_data.length * 0.6);

            let pow_intensity = Math.pow(intensity, this.pow);

            // Get the middle of the canvas.
            const middle_x = canvas.width / 2;
            const middle_y = canvas.height / 2;

            if (stars.length < samples && Math.random() < 0.5) {
                let star = {
                    x: middle_x,
                    y: middle_y,
                    vx: (-0.5 + Math.random()) * this.start_velocity,
                    vy: (-0.5 + Math.random()) * this.start_velocity,
                };
                star.angle = Math.atan2(star.vy, star.vx);
                star.speed = Math.sqrt(star.x * star.x + star.y * star.y)
                stars.push(star);
            }

            const gradient = ctx.createRadialGradient(middle_x, middle_y, this.inner_radius, middle_x, middle_y, this.outer_radius);
            gradient.addColorStop(0, "#FFFFFF00");
            gradient.addColorStop(1, "#FFFFFFFF");

            ctx.fillStyle = gradient;
            // ctx.fillStyle = "#ffffff";

            for (let n = 0; n < stars.length; n++) {
                const i = n;
                let star = stars[n];

                delta_x = Math.abs(star.x - middle_x) / (canvas.width * 0.5);
                delta_y = Math.abs(star.y - middle_y) / (canvas.height * 0.5);
                distance_scalar = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

                // Move the star along it's velocity.
                let scalar = (1.0 + distance_scalar) * (0.1 + pow_intensity);
                let sample_scalar = samples_data[i] / 256;
                sample_scalar *= this.star_scale;
                star.x = star.x + star.vx * scalar * delta_time;
                star.y = star.y + star.vy * scalar * delta_time;

                if (star.x > canvas.width || star.x < 0 || star.y > canvas.height || star.y < 0) {
                    stars[n].x = middle_x;
                    stars[n].y = middle_y;
                }

                ctx.beginPath();
                // ctx.arc(stars[n].x, stars[n].y, Math.abs(stars[n].y/300+n/500), 0, 2 * Math.PI);

                let size = 0.1 + this.star_size * sample_scalar;
                ctx.ellipse(star.x, star.y, 0.1 + (scalar * this.stretch_scale), size, star.angle, 0, 2 * Math.PI);
                ctx.fill();
            }

            this.stars = stars;
        }
    },
    DVD: {
        vel_x: 100.0,
        vel_y: 100.0,
        dvd_logo: null,
        pos_x: 0.0,
        pos_y: 0.0,
        width: 188,
        height: 84,
        colours: ["#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff"],
        draw(ctx, samples_data, delta_time, intensity) {
            if (this.dvd_logo == null) {
                // Create the dvd logo.
                var path = new Path2D("M128.81,10.16H147S169,9,168.45,20.32c-.87,17.47-27.65,16.22-27.65,16.22L146,13.83h-18.2L120.2,46.7h18.06s18,.8,32.88-6.35c15.8-7.62,15.94-21,15.94-21a15.3,15.3,0,0,0-7.76-13.4C170,.42,157.87,0,157.87,0H118.09L94.53,30.62,84.65,0H16.08L13.54,10.16h18.2S53.75,9,53.19,20.32c-.87,17.47-27.65,16.22-27.65,16.22l5.22-22.71H12.56L4.94,46.7H23s18,.8,32.87-6.35c15.8-7.62,15.94-21,15.94-21a35,35,0,0,0-.7-5.5c-.43-1.41-1-3.67-1-3.67H71L87.76,57.28l41.05-47.12Z");
                path.addPath(new Path2D("M88.32,57.28C39.54,57.28,0,63,0,70s39.54,12.7,88.32,12.7S176.64,77,176.64,70,137.1,57.28,88.32,57.28ZM45.54,76.92H41.82L34.06,63.73h5.21l4.46,8,4.48-8h5.22Zm20.93,0h-4.8V63.73h4.8Zm17,0h-6.8V63.73h6.8c5.15,0,9.38,2.89,9.38,6.59S88.58,76.92,83.46,76.92Zm29.16-10.28h-5.7v2.2h5.41v2.9h-5.41V74h5.7v2.9h-10.5V63.73h10.5Zm19.29,10.72c-5.93,0-10.21-3-10.21-7.28,0-4,4.89-6.78,10.21-6.78s10.21,2.79,10.21,6.78C142.12,74.35,137.83,77.36,131.91,77.36Z"));
                path.addPath(new Path2D("M131.91,66.62c2.86,0,5.21,1.66,5.21,3.48,0,2.27-2.35,3.93-5.21,3.93s-5.22-1.66-5.22-3.93c0-1.82,2.35-3.48,5.22-3.48Z"));
                path.addPath(new Path2D("M82.58,66.64H81.45V74h1.08c2.87,0,5.32-1.12,5.32-3.69C87.85,68,85.67,66.64,82.58,66.64Z"));
                this.dvd_logo = path;

                ctx.fillStyle = this.colours[Math.round(Math.random() * this.colours.length)];

                // Set the position to the middle.
                this.pos_x = (canvas.width - this.width) * 0.5;
                this.pos_y = (canvas.height - this.height) * 0.5;
            } else {
                let x = this.pos_x + this.vel_x * delta_time;
                let y = this.pos_y + this.vel_y * delta_time;

                let bounced = false;
                // Left + right Bounces.
                if (x < 0) {
                    x = 0
                    this.vel_x = -this.vel_x
                    bounced = true;
                }
                if (x > canvas.width - this.width) {
                    x = canvas.width - this.width
                    this.vel_x = -this.vel_x
                    bounced = true;
                }

                // Top and bottom Bounces.
                if (y < 0) {
                    y = 0
                    this.vel_y = -this.vel_y
                    bounced = true;
                }
                if (y > canvas.height - this.height) {
                    y = canvas.height - this.height
                    this.vel_y = -this.vel_y
                    bounced = true;
                }

                if (bounced) {
                    let colour = ctx.fillStyle
                    while (colour == ctx.fillStyle) {
                        ctx.fillStyle = this.colours[Math.round(Math.random() * this.colours.length)]
                    }
                }

                ctx.setTransform(1, 0, 0, 1, x, y);
                ctx.fill(this.dvd_logo);
                ctx.lineWidth = intensity * 10;
                ctx.resetTransform();

                this.pos_x = x;
                this.pos_y = y;
            }
        }
    },
    // Just a plain jane visualiser for debugging purposes.
    Spectrum: {
        line_width: 1,
        draw(ctx, samples_data, delta_time, intensity) {
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
        console.info(`Changing visualiser to ${name}`);

        let new_v = Visualisers[name];
        if (new_v != undefined && new_v != null) {

            // Remove the old visualizer class from the canvas element.
            if (this.visualiser != null) {
                this.canvas.classList.remove(this.visualiser.class_name);
            }

            window.localStorage.setItem("last_visualiser", name);

            // Set our new visualizer and add it's class to the canvas element.
            this.visualiser = new_v;
            this.canvas.classList.add(this.visualiser.class_name);

            // Play the visualizer.
            this.play();
        } else {
            // We found no visualizer, just stop.
            this.visualiser = null;
            this.stop();
            console.info("Turning off visualiser");
        }
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

        console.log(`Last value: ${document.getElementById("visualiser").value}`);

        var last_visualiser = window.localStorage.getItem("last_visualiser")
        if (last_visualiser != null && Visualisers[last_visualiser] != null) {
            this.set_visualiser(last_visualiser);
        }
        else {
            this.set_visualiser("RadialWave");
        }

        this.kill_red = document.querySelector("#kill_red");
        this.kill_blue = document.querySelector("#kill_blue");
    },
    init_audio() {
        // Create the audio context and audio source.
        this.analyser = Player.audio.ctx.createAnalyser();
        Player.audio.source.connect(this.analyser);

        this.analyser.smoothingTimeConstant = 0.8;

        // this.analyser.fftSize = 512;
        this.analyser.fftSize = 2048;
        this.analyser.minDecibels = -70;
        this.analyser.maxDecibels = -20;

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
        this.visualiser.draw(this.video_ctx, this.freq_data_buffer, delta_time, intensity);

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