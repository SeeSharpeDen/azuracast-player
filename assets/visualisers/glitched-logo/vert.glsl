#version 300 es

in vec2 a_pos;
in vec2 a_uv;

uniform u_visualizer {
    mat4 u_projection;
    float u_intensity;
    float time;
};
uniform sampler2D u_audio_tex;
uniform sampler2D u_noise;

out vec2 v_uv;
out float kill;

float time_scale = 0.008;
float intensity_scale = 0.04;
float noise_scale = 0.025;
float displacement = 0.1;
float time_warp = 0.015;

vec2 pos_correction = vec2(-0.05, 0.0);
float angle = -0.2;

void main() {
    // Scale the uv coordinates.
    float noise_pos = a_uv.y * noise_scale;
    // Offset the noise based on the intensity.
    noise_pos += u_intensity * intensity_scale;
    // Scroll the noise based on the time.
    noise_pos += time * time_scale;

    float noise = texture(u_noise, vec2(0.0, noise_pos)).r;

    float amplitude = texture(u_audio_tex, vec2(noise, 0.0)).r;
    // Offset the amplitude from 0-1 to -1 to 1. (So 127 is zero)
    amplitude = 1.0 - (amplitude * 2.0);
    amplitude = pow(amplitude, 2.0);

    float glitch_displacement = amplitude * (noise * noise) * displacement;

    vec2 offset = vec2(glitch_displacement, 0.0);

    // Rotate the vertices.
    float c = cos(angle);
    float s = sin(angle);
    mat2 rotation_mat = mat2 (
        c, -s,
        s, c
    );
    vec2 rotated_pos = rotation_mat * (a_pos + offset);

    gl_Position = u_projection * vec4(rotated_pos + pos_correction, 0.0, 1.0);
    v_uv = a_uv;
    kill = u_intensity;
}
