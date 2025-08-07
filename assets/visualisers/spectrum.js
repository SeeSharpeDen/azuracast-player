export const details = {
    title: "Debug Spectrum",
    description: "Used by nerds to analyze data for developing visualizers",
    icon: "assets/graphics/spectrum.png",
}

export function start() {
    // Called when the visualiser is started. 
}


const line_width = 3;

// Palette from https://lospec.com/palette-list/jehkoba64
export function draw_frame(ctx, samples_data, delta_time, intensity) {
    ctx.lineWidth = line_width;

    let samples = samples_data.length;
    let spacing = canvas.width / samples;
    let height = 1.0 - (canvas.height / 256);

    // draw the waveform.
    ctx.beginPath();
    ctx.lineTo(0, canvas.height + 5)
    for (let i = 0; i < samples; i++) {
        ctx.lineTo(spacing * i, canvas.height + samples_data[i] * height);
    }
    ctx.lineTo(canvas.width, canvas.height + 5)
    ctx.strokeStyle = "#25acf5";
    ctx.stroke();
    ctx.fillStyle = "#24396660"
    ctx.fill();

    // Draw the Gaussian function.
    ctx.beginPath();
    ctx.lineTo(0, canvas.height + 5)
    for (let i = 0; i < samples; i++) {
        ctx.lineTo(i * spacing, canvas.height + 1.0 - gaussian(i, Renderer.intensity_g_width, Renderer.intensity_g_offset) * canvas.height);
    }
    ctx.lineTo(canvas.width, canvas.height + 5)
    ctx.strokeStyle = "#7ccf9a";
    ctx.stroke();
    ctx.fillStyle = "#20806c60"
    ctx.fill();

    // Draw the waveform multiplied by the function.
    ctx.beginPath();
    let start = Math.max(0, Renderer.intensity_g_offset - Renderer.intensity_g_width * 2);
    let end = Math.min(samples, Renderer.intensity_g_offset + Renderer.intensity_g_width * 2);
    for (let i = start; i < end; i++) {
        ctx.lineTo(i * spacing, canvas.height + gaussian(i, Renderer.intensity_g_width, Renderer.intensity_g_offset) * samples_data[i] * height);
    }
    ctx.strokeStyle = "#f58122";
    ctx.stroke();

    ctx.beginPath();
    ctx.lineTo(0, canvas.height + 1.0 - intensity * canvas.height);
    ctx.lineTo(canvas.width, canvas.height + 1.0 - intensity * canvas.height);
    ctx.stroke();
}