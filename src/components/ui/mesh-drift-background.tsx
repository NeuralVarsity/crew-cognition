import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 resolution = max(u_scene.xy, vec2(1.0));
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  float t = u_scene.z;
  float scale = u_shape.x;
  vec2 p = uv * scale;

  float warpA = fbm(p * u_surface.x + vec2(t * 0.11, -t * 0.08));
  float warpB = fbm(p * u_surface.y + vec2(-t * 0.07, t * 0.10) + warpA);
  float field = fbm(p + vec2(warpA, warpB) * u_shape.y + t * 0.025);
  field = smoothstep(u_shape.z - 0.34, u_shape.z + 0.34, field);

  vec3 color = mix(u_colors[0], u_colors[3], smoothstep(0.05, 0.42, field));
  color = mix(color, u_colors[2], smoothstep(0.38, 0.72, field));
  color = mix(color, u_colors[1], smoothstep(0.72, 0.97, field) * u_finish.w);
  float vignette = 1.0 - smoothstep(0.45, 1.65, length(uv));
  color *= 0.74 + vignette * 0.26;

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Mesh Drift shader compilation failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function MeshDriftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Mesh Drift shader link failed:", gl.getProgramInfoLog(program));
      return;
    }

    const buffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colors = new Float32Array([
      0.063, 0.063, 0.063,
      0.961, 0.961, 0.961,
      0.690, 0.690, 0.690,
      0.227, 0.227, 0.227,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ]);
    gl.uniform3fv(gl.getUniformLocation(program, "u_colors[0]"), colors);
    gl.uniform4f(gl.getUniformLocation(program, "u_shape"), 1.16, 0.34, 0.50, 0.00);
    gl.uniform4f(gl.getUniformLocation(program, "u_surface"), 2.40, 1.16, 0.00, 1.00);
    gl.uniform4f(gl.getUniformLocation(program, "u_finish"), 0.00, 0.00, 0.000, 0.09);
    gl.uniform4f(gl.getUniformLocation(program, "u_transform"), 1453.0, 0.00, 0.00, 0.0);
    gl.uniform4f(gl.getUniformLocation(program, "u_space"), 0.00, 0.00, 0.00, 0.00);
    gl.uniform4f(gl.getUniformLocation(program, "u_cursor"), 0.0, 2.0, 0.65, 0.46);

    let frame = 0;
    const startedAt = performance.now();
    const sceneLocation = gl.getUniformLocation(program, "u_scene");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (now: number) => {
      resize();
      gl.uniform4f(sceneLocation, canvas.width, canvas.height, ((now - startedAt) / 1000) * 0.73, 4.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    if (!document.hidden) frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full motion-reduce:hidden"
    />
  );
}