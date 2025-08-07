export const details = {
    title: "DVD",
    description: "DVD screensaver from your nan's DVD player",
    icon: "assets/graphics/dvd.png",
}

export function start() {
    // TODO: Signal that this is a legacy visualizer.
}

let dvd_paths = [
    "M128.81,10.16H147S169,9,168.45,20.32c-.87,17.47-27.65,16.22-27.65,16.22L146,13.83h-18.2L120.2,46.7h18.06s18,.8,32.88-6.35c15.8-7.62,15.94-21,15.94-21a15.3,15.3,0,0,0-7.76-13.4C170,.42,157.87,0,157.87,0H118.09L94.53,30.62,84.65,0H16.08L13.54,10.16h18.2S53.75,9,53.19,20.32c-.87,17.47-27.65,16.22-27.65,16.22l5.22-22.71H12.56L4.94,46.7H23s18,.8,32.87-6.35c15.8-7.62,15.94-21,15.94-21a35,35,0,0,0-.7-5.5c-.43-1.41-1-3.67-1-3.67H71L87.76,57.28l41.05-47.12Z",
    "M88.32,57.28C39.54,57.28,0,63,0,70s39.54,12.7,88.32,12.7S176.64,77,176.64,70,137.1,57.28,88.32,57.28ZM45.54,76.92H41.82L34.06,63.73h5.21l4.46,8,4.48-8h5.22Zm20.93,0h-4.8V63.73h4.8Zm17,0h-6.8V63.73h6.8c5.15,0,9.38,2.89,9.38,6.59S88.58,76.92,83.46,76.92Zm29.16-10.28h-5.7v2.2h5.41v2.9h-5.41V74h5.7v2.9h-10.5V63.73h10.5Zm19.29,10.72c-5.93,0-10.21-3-10.21-7.28,0-4,4.89-6.78,10.21-6.78s10.21,2.79,10.21,6.78C142.12,74.35,137.83,77.36,131.91,77.36Z",
    "M131.91,66.62c2.86,0,5.21,1.66,5.21,3.48,0,2.27-2.35,3.93-5.21,3.93s-5.22-1.66-5.22-3.93c0-1.82,2.35-3.48,5.22-3.48Z",
    "M82.58,66.64H81.45V74h1.08c2.87,0,5.32-1.12,5.32-3.69C87.85,68,85.67,66.64,82.58,66.64Z"
]

let vel_x = 100.0 , vel_y = 100.0;
let dvd_logo = null;
let pos_x = 0.0, pos_y = 0.0;
let width = 188, height = 84;
let colours = [
    "#800000", "#008000", "#808000", "#000080",
    "#800080", "#008080", "#ff0000", "#00ff00",
    "#ffff00", "#0000ff", "#ff00ff", "#00ffff"
];
export function draw_frame(ctx, samples_data, delta_time, intensity) {

    if (dvd_logo == null) {
        // Create the dvd logo.
        var path = new Path2D(dvd_paths[0]);
        path.addPath(new Path2D(dvd_paths[1]));
        path.addPath(new Path2D(dvd_paths[2]));
        path.addPath(new Path2D(dvd_paths[3]));
        dvd_logo = path;

        ctx.fillStyle = colours[Math.round(Math.random() * colours.length)];

        // Set the position to the middle.
        pos_x = (canvas.width - width) * 0.5;
        pos_y = (canvas.height - height) * 0.5;
    } else {
        let x = pos_x + vel_x * delta_time;
        let y = pos_y + vel_y * delta_time;

        let bounced = false;
        // Left + right Bounces.
        if (x < 0) {
            x = 0
            vel_x = -vel_x
            bounced = true;
        }
        if (x > canvas.width - width) {
            x = canvas.width - width
            vel_x = -vel_x
            bounced = true;
        }

        // Top and bottom Bounces.
        if (y < 0) {
            y = 0
            vel_y = -vel_y
            bounced = true;
        }
        if (y > canvas.height - height) {
            y = canvas.height - height
            vel_y = -vel_y
            bounced = true;
        }

        if (bounced) {
            let colour = ctx.fillStyle
            while (colour == ctx.fillStyle) {
                ctx.fillStyle = colours[Math.round(Math.random() * colours.length)]
            }
        }

        ctx.setTransform(1, 0, 0, 1, x, y);
        ctx.fill(dvd_logo);
        ctx.lineWidth = intensity * 10;
        ctx.resetTransform();

        pos_x = x;
        pos_y = y;
    }
}