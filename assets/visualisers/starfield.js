export const details = {
    title: "Starfield",
    description: "Fly through space while listening to bangers",
    icon: "assets/graphics/starfield.png",
}

export function start() {
    // Called when the visualiser is started. 
}

let stars = [];
let star_count = 1000;
let speed = 1000.0;
let start_velocity = 1000.0;
let inner_radius = 50;
let outer_radius = 500;
let stretch_scale = 30;
let star_scale = 4;
let star_size = 1;
let pow = 4;
let delta_x = 0.0, delta_y = 0.0, distance_scalar = 0.0;

let star = null;

export function draw_frame(ctx, samples_data, delta_time, intensity) {
    const samples = Math.round(samples_data.length * 0.6);

    let pow_intensity = Math.pow(intensity, pow);

    // Get the middle of the canvas.
    const middle_x = canvas.width / 2;
    const middle_y = canvas.height / 2;

    if (stars.length < samples && Math.random() < 0.5) {
        star = {
            x: middle_x,
            y: middle_y,
            vx: (-0.5 + Math.random()) * start_velocity,
            vy: (-0.5 + Math.random()) * start_velocity,
        };
        star.angle = Math.atan2(star.vy, star.vx);
        star.speed = Math.sqrt(star.x * star.x + star.y * star.y)
        stars.push(star);
    }

    const gradient = ctx.createRadialGradient(middle_x, middle_y, inner_radius, middle_x, middle_y, outer_radius);
    gradient.addColorStop(0, "#FFFFFF00");
    gradient.addColorStop(1, "#FFFFFFFF");

    ctx.fillStyle = gradient;
    // ctx.fillStyle = "#ffffff";

    for (let n = 0; n < stars.length; n++) {
        const i = n;
        star = stars[n];

        delta_x = Math.abs(star.x - middle_x) / (canvas.width * 0.5);
        delta_y = Math.abs(star.y - middle_y) / (canvas.height * 0.5);
        distance_scalar = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

        // Move the star along it's velocity.
        let scalar = (1.0 + distance_scalar) * (0.1 + pow_intensity);
        let sample_scalar = samples_data[i] / 256;
        sample_scalar *= star_scale;
        star.x = star.x + star.vx * scalar * delta_time;
        star.y = star.y + star.vy * scalar * delta_time;

        // Reset the star's position if they are out of bounds.
        if (star.x > canvas.width || star.x < 0 || star.y > canvas.height || star.y < 0) {
            stars[n].x = middle_x;
            stars[n].y = middle_y;
        }

        ctx.beginPath();
        // ctx.arc(stars[n].x, stars[n].y, Math.abs(stars[n].y/300+n/500), 0, 2 * Math.PI);

        let size = 0.1 + star_size * sample_scalar;
        ctx.ellipse(star.x, star.y, 0.1 + (scalar * stretch_scale), size, star.angle, 0, 2 * Math.PI);
        ctx.fill();
    }
}