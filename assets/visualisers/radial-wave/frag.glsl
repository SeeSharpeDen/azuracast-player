#version 300 es

precision mediump float;
out vec4 FragColor;
in float colour_shift;
in float intensity;

vec3 hue_shift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cos_angle = cos(hue);
    return vec3(color * cos_angle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cos_angle));
}

void main() {
    FragColor = vec4(hue_shift(vec3(1.0, intensity, intensity), colour_shift), 1.0);
}
