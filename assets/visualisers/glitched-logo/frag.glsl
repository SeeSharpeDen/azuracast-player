#version 300 es
precision mediump float;

in vec2 v_uv;
uniform sampler2D u_image;
out vec4 outColor;

void main() {
    float base = texture(u_image, v_uv).r;
    outColor = vec4(base, base, base, base);
}
