#version 300 es

in vec2 a_pos;
in vec2 a_uv;

uniform u_visualizer {
    mat4 u_projection;
    float u_intensity;
    float u_time;
};

uniform sampler2D u_audio_tex;

float radius = 0.56;
float scale = 0.45;
float power = 1.5;
float kill_scale = 0.25;
float time_scale_color = 0.2;
float rotate_speed = 0.6;
float timewarp_factor = 0.08;
float x_mn = 0.01;
float x_mx = 0.56;
float colour_flicker = 5.6;
out float colour_shift;
out float intensity;
out float inner_value;
out float dist;
void main() {

    // Music stuff.
    float x = abs(a_uv.x) * (x_mx - x_mn) + x_mn;
    vec2 uv = vec2(x, timewarp_factor * a_uv.y);
    float amplitude = texture(u_audio_tex, uv).r;
    float inside_value = (u_intensity * kill_scale) + radius;
    float value = inside_value + (pow(amplitude, power)) * scale;

    float c = cos(u_time * rotate_speed);
    float s = sin(u_time * rotate_speed);

    // Rotation
    mat2 rotation_mat = mat2 (
        c, -s,
        s, c
    );

    vec2 rotated_pos = rotation_mat * a_pos * value;
    gl_Position = u_projection * vec4(rotated_pos, 0.0, 1.0);
    intensity = u_intensity;
    colour_shift = u_time * time_scale_color + u_intensity * colour_flicker;
    dist = length(rotated_pos);
    inner_value = inside_value;
}
