#version 300 es

layout(location = 0) in vec2 i_position;
layout(location = 1) in vec2 i_velocity;

float distance_scalar = 2.0;
float distance_power = 1.0;

float speed_scalar = 10.0;
float speed_power = 2.0;

float intensity_scale = 1.7;
float audio_scale = 6.7;

float overall_scale = 0.5;

uniform sampler2D u_audio_tex;

uniform u_visualizer {
  mat4 u_projection;
  float u_intensity;
  float time;
  float delta;
};

void main() {
  float id = float(gl_VertexID) / 1500.0;
  float audio = texture(u_audio_tex, vec2(id, id * 0.03)).r;
  // gl_Position = vec4(i_position, 0.0, 1.0);
  gl_Position = vec4(i_position, 0.0, 1.0);
  float scale = 1.0;
  // scale += pow(length(i_position), distance_power) * distance_scalar;
  scale = length(i_position) * speed_scalar;
  scale += u_intensity * intensity_scale;
  scale *= audio * audio_scale;
  // scale = length(i_velocity) * speed_scalar;
  gl_PointSize = scale * overall_scale;
}