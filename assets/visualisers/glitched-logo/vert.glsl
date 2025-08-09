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

float offset_scale = 0.3;
float time_scale = 0.001;
float noise_scale = 0.08;
float noise_displacement = 0.08;
float noise_scaler = 1.2;
float amplitude_displacement = 1.2;


void main() {
    float noise = texture(u_noise, vec2(0.0, (a_uv.y * noise_scale) + (time * time_scale))).r;
    float noise_dsiplace = (1.0 - noise * 2.0) * noise_displacement;

    float amplitude = texture(u_audio_tex, vec2(noise, 0)).r;
    amplitude = pow(amplitude, 2.0) * amplitude_displacement;
    
    vec2 offset = vec2((amplitude * noise * noise_scaler) + noise_dsiplace, 0.0);
    gl_Position = vec4(a_pos + offset, 0.0, 1.0);
    v_uv = a_uv;
}
