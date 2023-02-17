// by 45ninjat/45ninjas heavily derived from this great
// tutorial by Iskander Samatov.
// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/

const Visualiser = {
    radius: 300,
    radius_margin: 200,
    revolutions: 5,
    rotate_speed: 0.08,
    power: 1.7,
    scale: 0.0175,
    volume_scale: 1,
    line_width: 2,
    draw(ctx, samples, samples_data) {
        let middle_x = canvas.width / 2;
        let middle_y = canvas.height / 2;

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
            t += time * this.rotate_speed;

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


let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioSource = null;
let analyser = null;

audioSource = audioCtx.createMediaElementSource(Radio.audio);

// The audio analyser.
analyser = audioCtx.createAnalyser();
// How smooth the changes are.
analyser.smoothingTimeConstant = 0.95;
// How many samples.
analyser.fftSize = 512;

// The range of audio to sample.
analyser.minDecibels = -70;
analyser.maxDecibels = -20;

audioSource.connect(analyser);
analyser.connect(audioCtx.destination);


var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var ctx = canvas.getContext("2d");
// Gentle fade.
// ctx.fillStyle = "rgba(0,0,0,0.1)"
// Slow fade.
// ctx.fillStyle = "rgba(0,0,0,0.03)"
// Fast fade.
ctx.fillStyle = "rgba(0,0,0,0.2)"


const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

let time = 0;
let lastTime;
function animate() {
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    analyser.getByteFrequencyData(dataArray);

    let now = Date.now();
    let delta = (now - lastTime) / 1000;
    lastTime = now;

    if (!isNaN(delta)) {
        time += delta;
    }

    Visualiser.draw(ctx, bufferLength, dataArray);
    requestAnimationFrame(animate);
}

animate();


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