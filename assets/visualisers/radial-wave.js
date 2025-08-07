export const details = {
    title: "Radial Wave",
    description: "Spiky ball of music flying through space.",
    icon: "assets/graphics/radial-wave.png",
    css_class: 'RadialWave'
}

export function start() {
    // Called when the visualiser is started. 
}

let radius_scale= 0.65;
let radius_margin= 200;
let revolutions= 1;
let rotate_speed= 0.08;
let power= 1.5;
let scale= 0.8;
let line_width= 3;
let radius_intensity= 40;

export function draw_frame(ctx, samples_data, delta_time, intensity) {

    const samples = Math.round(samples_data.length * 0.6);

    // Get the middle of the canvas.
    const middle_x = canvas.width / 2;
    const middle_y = canvas.height / 2;

    const radius = Math.min(middle_x, middle_y) * radius_scale + (intensity * radius_intensity);

    // Create our gradient.
    const gradient = ctx.createRadialGradient(middle_x, middle_y, radius - line_width * 4, middle_x, middle_y, radius + radius_margin);
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
        value = Math.pow(value, power);

        // Scale our value.
        value *= scale;

        // How many steps are there?
        let t = (i * 0.5) / samples;
        // how many times around a circle should we go?
        t *= revolutions * 2 * Math.PI;
        // rotate that circle over time.
        t += Renderer.time * rotate_speed;

        // Draw the circle.
        ctx.lineTo(
            middle_x + (radius + (value * radius_margin)) * Math.cos(t),
            middle_y + (radius + (value * radius_margin)) * Math.sin(t)
        );
    }
    ctx.strokeStyle = gradient;
    ctx.fillStyle = "black";
    ctx.lineWidth = line_width;

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(middle_x, middle_y, radius, 0, 360);
    ctx.fill();
    ctx.stroke();
}