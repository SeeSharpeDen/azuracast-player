#version 300 es

precision mediump float;
out vec4 FragColor;
in float colour_shift;
in float intensity;
in float inner_value;
in float dist;

float line_thickness = 0.012;

vec3 hue_shift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cos_angle = cos(hue);
    return vec3(color * cos_angle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cos_angle));
}

void main() {
    vec4 colour = vec4(hue_shift(vec3(1.0, intensity, intensity), colour_shift), 1.0);
    // FragColor = mix(vec4(0.0), colour, step(1.0 - line_thickness, dist));
    FragColor = mix(colour, colour * 0.1, step(dist + line_thickness, inner_value));
}
