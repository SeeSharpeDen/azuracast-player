#version 300 es

layout(location = 0) in vec2 i_position;
layout(location = 1) in vec2 i_velocity;

uniform u_visualizer {
  mat4 u_projection;
  float u_intensity;
  float time;
  float delta;
};
uniform sampler2D u_audio_tex;
uniform sampler2D u_noise;

out vec2 o_position;
out vec2 o_velocity;

float max_dist = 1.42;
float acceleration = 0.2;
float start_speed_min = 0.05;
float start_speed_scalar = 0.4;

float warp_speed = 350.0;

#define PI 3.14159265;
#define PI2 2.0 * PI;


void main() {

  float dist = length(i_position);

  if (dist > max_dist) {
    // if (i_position.x > 1.0 || i_position.x < -1.0 || i_position.y > 1.0 ||
    //     i_position.y < -1.0) {

    // Reset the particle's position;
    o_position = vec2(0.0, 0.0);

    // Get some 'random' values.
    ivec2 noise_coord = ivec2(gl_VertexID % 512, gl_VertexID / 512);
    vec2 rng = texelFetch(u_noise, noise_coord, 0).rg;

    float radius = start_speed_min + (pow(rng.g, 2.0) * start_speed_scalar);
    float angle = rng.r * PI2;

    vec2 dir = vec2(cos(angle), sin(angle)) * radius;

    // Set the velocity of the particle.
    // o_velocity = pow(dir, vec2(2.0)) * start_speed;
    o_velocity = dir;
  } else {
    // Transform the velocity before applying it.
    // vec2 tran_vel = vec4(u_projection * vec4(i_velocity, 0.0, 0.0)).xy;

    vec2 new_vel = i_velocity + (i_velocity * acceleration * delta * pow(u_intensity, 6.0) * warp_speed);
    o_velocity = new_vel;
    o_position = i_position + new_vel * delta * u_intensity;
  }
}