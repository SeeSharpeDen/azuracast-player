#version 300 es
precision mediump float;

in vec2 v_uv;
in float kill;
uniform sampler2D u_image;
out vec4 outColor;

vec3 kill_red = vec3(1.0, 0.0, 0.4);
vec3 kill_blue = vec3(0.0, 0.6, 1.0);
float kill_alpha = 0.6;

float split_scale = 0.11;
float split_power = 3.0;

float split_min = 0.2;

// Gaussian blur parameters
const int BLUR_SAMPLES = 3;
const float BLUR_SIGMA = 1.0;
const float BLUR_STEP = 0.008;

// A simple 1D Gaussian blur function for a single color channel
float gaussian_blur(sampler2D tex, vec2 uv, vec2 direction) {
    float sum = 0.0;
    float totalWeight = 0.0;
    
    // Calculate weights based on a Gaussian distribution
    for (int i = 0; i < BLUR_SAMPLES; i++) {
        float offset = float(i) - float(BLUR_SAMPLES - 1) / 2.0;
        float weight = exp(-(offset * offset) / (2.0 * BLUR_SIGMA * BLUR_SIGMA));
        totalWeight += weight;
        
        sum += texture(tex, uv + direction * offset * BLUR_STEP).r * weight;
    }
    
    return sum / totalWeight;
}

void main() {
    float split = step(split_min, kill) * kill;
    split = pow(split, split_power);
    split *= split_scale;

    vec2 split_dir = vec2(split, split * 0.0);

    float base = texture(u_image, v_uv).r;
    vec4 base_colour = vec4(base);
    float left = gaussian_blur(u_image, v_uv + split_dir, vec2(1.0, 0.0));
    vec3 red = vec3(left) * kill_red;
    float right = gaussian_blur(u_image, v_uv - split_dir, vec2(1.0, 0.0));
    vec3 blue = vec3(right) * kill_blue;

    // Combine the red and blue distortions.
    vec3 kill_color = red + blue;
    float kill_a = left + right;
    
    vec4 final_kill_color = vec4(kill_color, kill_a * kill_alpha);
    outColor = mix(final_kill_color, base_colour, base_colour.r);;
}