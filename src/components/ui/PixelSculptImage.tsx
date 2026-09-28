import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';

export interface PixelSculptImageProps {
  /** Image URI (remote or local file) or local require module */
  source?: string | number;
  /** Fixed width in points (optional, falls back to container layout) */
  width?: number;
  /** Fixed height in points (optional, falls back to container layout) */
  height?: number;
  /** Number of tile columns (default: 40) */
  tileResolution?: number;
  /** Depth displacement scale based on image luminance (default: 0.35) */
  depthScale?: number;
  /** Ambient light coefficient (default: 0.45) */
  ambientLight?: number;
  /** Diffuse directional light coefficient (default: 0.75) */
  diffuseLight?: number;
  /** Optional view styling */
  style?: StyleProp<ViewStyle>;
  /** Whether touch gestures directly on the component trigger ripples (default: true) */
  interactive?: boolean;
  /** External 3D tilt override (e.g. from parent card perspective tilt) */
  tilt?: { x: number; y: number };
}

export interface PixelSculptImageRef {
  /** Trigger or update a wave ripple at normalized UV coordinate [0..1, 0..1] */
  triggerRipple: (u: number, v: number, strength?: number) => void;
  /** Release the ripple wave, letting it decay smoothly */
  releaseRipple: () => void;
  /** Update 3D tilt angle (in degrees or normalized units) */
  setTilt: (tiltX: number, tiltY: number) => void;
}

// -----------------------------------------------------------------------------
// GLSL Shaders
// -----------------------------------------------------------------------------

const VERTEX_SHADER = `
precision highp float;

attribute vec2 aPosition;   // Local tile quad corner offset (-1..1, -1..1)
attribute vec2 aTileCenter; // Tile center in normalized device space (-1..1, -1..1)
attribute vec2 aTileUV;     // Tile center in UV space (0..1, 0..1)
attribute vec2 aTileSize;   // Tile half-extents in NDC (hw, hh)

uniform sampler2D uTexture;
uniform float uTime;
uniform float uDepthScale;
uniform vec2 uTouchUV;
uniform float uTouchStrength;
uniform float uTouchTime;
uniform vec2 uTilt;

varying vec2 vTileUV;
varying vec2 vTileCoord;
varying float vDepth;
varying vec3 vNormal;
varying vec4 vColor;

void main() {
  vTileUV = aTileUV;
  vTileCoord = aPosition;

  // Sample luminance at tile center to elevate the tile uniformly as a 3D block
  vec4 color = texture2D(uTexture, aTileUV);
  vColor = color;

  // Standard NTSC / Rec. 601 luminance
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Dynamic ripple wave from touch interaction
  float dist = distance(aTileUV, uTouchUV);
  float wave = sin(dist * 20.0 - uTime * 6.0) * exp(-dist * 8.0) * uTouchStrength;

  // Subtle organic breathing wave when idle
  float ambientWave = sin(aTileUV.x * 5.0 + aTileUV.y * 4.0 + uTime * 1.5) * 0.02;

  // Combined Z depth displacement
  float zDisplacement = (luminance * uDepthScale) + wave + ambientWave;
  vDepth = zDisplacement;

  // Base tile quad vertex position in XY model space
  vec2 localPos = aTileCenter + aPosition * aTileSize;

  // Perspective projection and subtle 3D tilt
  float rotX = uTilt.y * 0.35; // tilt on X axis (pitch)
  float rotY = uTilt.x * 0.35; // tilt on Y axis (yaw)

  float cy = cos(rotY);
  float sy = sin(rotY);
  float cx = cos(rotX);
  float sx = sin(rotX);

  // Rotate around Y axis
  float x1 = localPos.x * cy + zDisplacement * sy;
  float z1 = -localPos.x * sy + zDisplacement * cy;

  // Rotate around X axis
  float y2 = localPos.y * cx - z1 * sx;
  float z2 = localPos.y * sx + z1 * cx;

  // Perspective camera foreshortening
  float camDist = 2.4;
  float perspective = camDist / (camDist - z2);

  // Normal orientation after tilt
  vec3 baseNorm = vec3(0.0, 0.0, 1.0);
  vec3 rotatedNorm = vec3(
    baseNorm.x * cy + baseNorm.z * sy,
    baseNorm.y,
    -baseNorm.x * sy + baseNorm.z * cy
  );
  rotatedNorm = vec3(
    rotatedNorm.x,
    rotatedNorm.y * cx - rotatedNorm.z * sx,
    rotatedNorm.y * sx + rotatedNorm.z * cx
  );
  vNormal = normalize(rotatedNorm);

  gl_Position = vec4(x1 * perspective, y2 * perspective, -z2 * 0.1, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D uTexture;
uniform float uAmbientLight;
uniform float uDiffuseLight;
uniform float uTime;

varying vec2 vTileUV;
varying vec2 vTileCoord;
varying float vDepth;
varying vec3 vNormal;
varying vec4 vColor;

void main() {
  vec2 absCoord = abs(vTileCoord);
  float maxEdge = max(absCoord.x, absCoord.y);

  // Deep crevices / seams between 3D physical relief blocks
  float crevice = 1.0 - smoothstep(0.76, 0.98, maxEdge) * 0.78;

  // Bevel normals: chamfer block borders so each tile has sculpted 3D slopes
  vec2 bevel = vec2(0.0);
  if (absCoord.x > 0.55) {
    bevel.x = -sign(vTileCoord.x) * smoothstep(0.55, 0.96, absCoord.x) * 0.85;
  }
  if (absCoord.y > 0.55) {
    bevel.y = -sign(vTileCoord.y) * smoothstep(0.55, 0.96, absCoord.y) * 0.85;
  }

  vec3 N = normalize(vec3(vNormal.xy + bevel, vNormal.z));

  // Key directional light from upper left
  vec3 L = normalize(vec3(-0.45, 0.55, 0.85));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  // Lambertian diffuse shading
  float diff = max(dot(N, L), 0.0);

  // Specular reflection highlight on glossy block surfaces
  float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.55;

  // Base tile color from sampled texture
  vec3 baseColor = vColor.rgb;

  // Dark metallic undertone for cyber/fintech aesthetic
  vec3 metallicDark = vec3(0.08, 0.09, 0.14);
  baseColor = max(baseColor, metallicDark * (1.0 - vDepth));

  // Combine lighting components
  vec3 ambient = baseColor * uAmbientLight;
  vec3 diffuse = baseColor * diff * uDiffuseLight;
  vec3 specular = vec3(0.95, 0.98, 1.0) * spec;

  // Subtle cyan/violet iridescent rim Fresnel highlight
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 iridescentRim = vec3(0.35, 0.45, 0.90) * (rim * 0.35);

  vec3 finalColor = (ambient + diffuse + specular + iridescentRim) * crevice;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// -----------------------------------------------------------------------------
// Helper: Procedural High-Contrast Dark Metallic Avatar Texture
// -----------------------------------------------------------------------------

function createProceduralAvatarTexture(gl: ExpoWebGLRenderingContext): WebGLTexture | null {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1); // 0 at bottom, 1 at top
      const idx = (y * size + x) * 4;

      // Distance from center
      const dx = u - 0.5;
      const dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);

      // Head silhouette: center (0.5, 0.62), radius 0.16
      const hdx = u - 0.5;
      const hdy = v - 0.62;
      const hr = Math.sqrt(hdx * hdx + hdy * hdy);

      // Torso silhouette: center (0.5, 0.22), elliptical
      const tdx = (u - 0.5) / 0.32;
      const tdy = (v - 0.22) / 0.22;
      const tr = Math.sqrt(tdx * tdx + tdy * tdy);

      // Dark metallic carbon / titanium base background
      const angle = Math.atan2(dy, dx);
      const rings = Math.sin(r * 45.0) * 0.06;
      const brushed = Math.sin(angle * 12.0) * 0.04;

      let rVal = Math.floor((0.08 + rings + brushed) * 255);
      let gVal = Math.floor((0.09 + rings + brushed) * 255);
      let bVal = Math.floor((0.14 + rings * 1.5 + brushed) * 255);

      // Head silhouette with smooth edge
      if (hr < 0.16) {
        const headEdge = 1.0 - Math.min(1.0, Math.max(0.0, (hr - 0.13) / 0.03));
        const headLuma = 0.85 + Math.sin(hr * 20.0) * 0.1;
        rVal = Math.floor(rVal * (1 - headEdge) + 210 * headLuma * headEdge);
        gVal = Math.floor(gVal * (1 - headEdge) + 220 * headLuma * headEdge);
        bVal = Math.floor(bVal * (1 - headEdge) + 250 * headLuma * headEdge);
      }

      // Torso silhouette
      if (tr < 1.0 && v <= 0.44) {
        const torsoEdge = 1.0 - Math.min(1.0, Math.max(0.0, (tr - 0.85) / 0.15));
        const torsoLuma = 0.75 + Math.cos(tr * 3.14) * 0.15;
        rVal = Math.floor(rVal * (1 - torsoEdge) + 190 * torsoLuma * torsoEdge);
        gVal = Math.floor(gVal * (1 - torsoEdge) + 205 * torsoLuma * torsoEdge);
        bVal = Math.floor(bVal * (1 - torsoEdge) + 245 * torsoLuma * torsoEdge);
      }

      // Outer circular frame / cyber rim glow
      if (r > 0.46) {
        const borderGlow = Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(r - 0.48) / 0.02));
        rVal += Math.floor(borderGlow * 120);
        gVal += Math.floor(borderGlow * 140);
        bVal += Math.floor(borderGlow * 220);
      }

      pixels[idx] = Math.min(255, Math.max(0, rVal));
      pixels[idx + 1] = Math.min(255, Math.max(0, gVal));
      pixels[idx + 2] = Math.min(255, Math.max(0, bVal));
      pixels[idx + 3] = 255;
    }
  }

  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

// -----------------------------------------------------------------------------
// Helper: Shader & Program Setup
// -----------------------------------------------------------------------------

function compileShader(
  gl: ExpoWebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('PixelSculptImage Shader Error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: ExpoWebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('PixelSculptImage Program Link Error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// -----------------------------------------------------------------------------
// Helper: Single Draw Call Geometry Mesh Builder
// -----------------------------------------------------------------------------

interface TileMesh {
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  indexCount: number;
  stride: number;
}

function buildTileMesh(
  gl: ExpoWebGLRenderingContext,
  tileResolution: number,
  aspectRatio: number = 1.0
): TileMesh {
  const cols = Math.max(4, tileResolution);
  const rows = Math.max(4, Math.round(tileResolution / Math.max(0.1, aspectRatio)));
  const totalTiles = cols * rows;

  // 8 floats per vertex:
  // aPosition (2): (-1..1, -1..1) local tile corner offset
  // aTileCenter (2): tile center in NDC [-1, 1]
  // aTileUV (2): tile center in UV [0, 1]
  // aTileSize (2): half-width and half-height in NDC (with 9% gap for crevices)
  const vertexData = new Float32Array(totalTiles * 4 * 8);
  const indexData = new Uint16Array(totalTiles * 6);

  const hw = (1.0 / cols) * 0.91;
  const hh = (1.0 / rows) * 0.91;

  let vOffset = 0;
  let iOffset = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Tile UV center
      const u = (c + 0.5) / cols;
      const v = (r + 0.5) / rows; // 0 at bottom, 1 at top

      // Tile NDC center in [-1, 1]
      const cx = u * 2.0 - 1.0;
      const cy = v * 2.0 - 1.0;

      const baseVertexIndex = (r * cols + c) * 4;

      // 4 Quad Corners:
      // 0: Bottom-Left  (-1, -1)
      // 1: Bottom-Right ( 1, -1)
      // 2: Top-Right    ( 1,  1)
      // 3: Top-Left     (-1,  1)
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];

      for (let k = 0; k < 4; k++) {
        const [px, py] = corners[k];
        // aPosition
        vertexData[vOffset++] = px;
        vertexData[vOffset++] = py;
        // aTileCenter
        vertexData[vOffset++] = cx;
        vertexData[vOffset++] = cy;
        // aTileUV
        vertexData[vOffset++] = u;
        vertexData[vOffset++] = v;
        // aTileSize
        vertexData[vOffset++] = hw;
        vertexData[vOffset++] = hh;
      }

      // Two triangles per tile quad: (0, 1, 2) and (0, 2, 3)
      indexData[iOffset++] = baseVertexIndex + 0;
      indexData[iOffset++] = baseVertexIndex + 1;
      indexData[iOffset++] = baseVertexIndex + 2;
      indexData[iOffset++] = baseVertexIndex + 0;
      indexData[iOffset++] = baseVertexIndex + 2;
      indexData[iOffset++] = baseVertexIndex + 3;
    }
  }

  const vertexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: indexData.length,
    stride: 8 * 4, // 32 bytes
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const PixelSculptImage = forwardRef<PixelSculptImageRef, PixelSculptImageProps>(
  (
    {
      source,
      width,
      height,
      tileResolution = 40,
      depthScale = 0.35,
      ambientLight = 0.45,
      diffuseLight = 0.75,
      style,
      interactive = true,
      tilt,
    },
    ref
  ) => {
    const [hasGlError, setHasGlError] = useState(false);

    const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const meshRef = useRef<TileMesh | null>(null);
    const rafRef = useRef<number | null>(null);
    const isMounted = useRef<boolean>(true);

    const layoutWidth = useRef<number>(width || 340);
    const layoutHeight = useRef<number>(height || 210);

    // Animation & Touch State
    const startTimeRef = useRef<number>(Date.now());
    const touchUVRef = useRef<[number, number]>([0.5, 0.5]);
    const touchStrengthRef = useRef<number>(0.0);
    const touchTargetStrengthRef = useRef<number>(0.0);
    const touchTimeRef = useRef<number>(0.0);
    const tiltRef = useRef<[number, number]>([0.0, 0.0]);

    // Synchronize external tilt prop if passed
    useEffect(() => {
      if (tilt) {
        tiltRef.current = [tilt.x, tilt.y];
      }
    }, [tilt]);

    // Expose Imperative Methods
    useImperativeHandle(ref, () => ({
      triggerRipple: (u: number, v: number, strength: number = 1.0) => {
        touchUVRef.current = [u, v];
        touchTargetStrengthRef.current = strength;
        touchStrengthRef.current = strength;
        touchTimeRef.current = (Date.now() - startTimeRef.current) * 0.001;
      },
      releaseRipple: () => {
        touchTargetStrengthRef.current = 0.0;
      },
      setTilt: (tiltX: number, tiltY: number) => {
        tiltRef.current = [tiltX, tiltY];
      },
    }));

    // Async Image Loader into WebGL Texture
    const loadTexture = useCallback(
      async (gl: ExpoWebGLRenderingContext, tex: WebGLTexture, src?: string | number) => {
        if (!src) return;

        try {
          let localUri: string | null = null;

          if (typeof src === 'number') {
            const assets = await Asset.loadAsync(src);
            if (assets && assets[0]?.localUri) {
              localUri = assets[0].localUri;
            }
          } else if (typeof src === 'string' && src.trim().length > 0) {
            if (src.startsWith('file://')) {
              localUri = src;
            } else if (src.startsWith('http://') || src.startsWith('https://')) {
              const assets = await Asset.loadAsync(src);
              if (assets && assets[0]?.localUri) {
                localUri = assets[0].localUri;
              }
            } else {
              localUri = `file://${src}`;
            }
          }

          if (!localUri) return;

          if (Platform.OS === 'web') {
            const img = new (window as any).Image();
            img.crossOrigin = 'anonymous';
            img.src = localUri;
            img.onload = () => {
              if (!isMounted.current || !gl) return;
              gl.bindTexture(gl.TEXTURE_2D, tex);
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            };
          } else {
            // Android / iOS native: expo-gl texImage2D accepts { localUri }
            const validUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              { localUri: validUri } as any
            );
          }
        } catch (err) {
          console.warn('PixelSculptImage: Image texture load failed, using procedural fallback', err);
        }
      },
      []
    );

    // Watch for source updates and reload texture
    useEffect(() => {
      const gl = glRef.current;
      const tex = textureRef.current;
      if (gl && tex && source) {
        loadTexture(gl, tex, source);
      }
    }, [source, loadTexture]);

    // WebGL Context Creation Handler
    const handleContextCreate = (gl: ExpoWebGLRenderingContext) => {
      glRef.current = gl;

      try {
        const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        if (!program) {
          setHasGlError(true);
          return;
        }
        programRef.current = program;

        // Initialize procedural avatar placeholder texture synchronously
        const texture = createProceduralAvatarTexture(gl);
        if (!texture) {
          setHasGlError(true);
          return;
        }
        textureRef.current = texture;

        // Load custom image asynchronously if provided
        if (source) {
          loadTexture(gl, texture, source);
        }

        // Build single WebGL draw call geometry mesh
        const aspect = layoutWidth.current / Math.max(1, layoutHeight.current);
        const mesh = buildTileMesh(gl, tileResolution, aspect);
        meshRef.current = mesh;

        // Uniform locations
        const uTextureLoc = gl.getUniformLocation(program, 'uTexture');
        const uTimeLoc = gl.getUniformLocation(program, 'uTime');
        const uDepthScaleLoc = gl.getUniformLocation(program, 'uDepthScale');
        const uTouchUVLoc = gl.getUniformLocation(program, 'uTouchUV');
        const uTouchStrengthLoc = gl.getUniformLocation(program, 'uTouchStrength');
        const uTouchTimeLoc = gl.getUniformLocation(program, 'uTouchTime');
        const uTiltLoc = gl.getUniformLocation(program, 'uTilt');
        const uAmbientLightLoc = gl.getUniformLocation(program, 'uAmbientLight');
        const uDiffuseLightLoc = gl.getUniformLocation(program, 'uDiffuseLight');

        // Attribute locations
        const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
        const aTileCenterLoc = gl.getAttribLocation(program, 'aTileCenter');
        const aTileUVLoc = gl.getAttribLocation(program, 'aTileUV');
        const aTileSizeLoc = gl.getAttribLocation(program, 'aTileSize');

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Frame rendering loop with gl.endFrameEXP()
        const renderLoop = () => {
          if (!isMounted.current || !glRef.current) return;

          const now = (Date.now() - startTimeRef.current) * 0.001;

          // Smooth decay of touch ripple strength
          touchStrengthRef.current +=
            (touchTargetStrengthRef.current - touchStrengthRef.current) * 0.08;

          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.clearColor(0.04, 0.04, 0.07, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          gl.useProgram(program);

          // Upload uniforms
          gl.uniform1i(uTextureLoc, 0);
          gl.uniform1f(uTimeLoc, now);
          gl.uniform1f(uDepthScaleLoc, depthScale);
          gl.uniform2f(uTouchUVLoc, touchUVRef.current[0], touchUVRef.current[1]);
          gl.uniform1f(uTouchStrengthLoc, touchStrengthRef.current);
          gl.uniform1f(uTouchTimeLoc, touchTimeRef.current);
          gl.uniform2f(uTiltLoc, tiltRef.current[0], tiltRef.current[1]);
          gl.uniform1f(uAmbientLightLoc, ambientLight);
          gl.uniform1f(uDiffuseLightLoc, diffuseLight);

          // Bind texture
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

          // Bind mesh buffers
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

          // Configure attribute pointers (interleaved stride: 32 bytes)
          const stride = mesh.stride;
          gl.enableVertexAttribArray(aPositionLoc);
          gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, stride, 0);

          gl.enableVertexAttribArray(aTileCenterLoc);
          gl.vertexAttribPointer(aTileCenterLoc, 2, gl.FLOAT, false, stride, 8);

          gl.enableVertexAttribArray(aTileUVLoc);
          gl.vertexAttribPointer(aTileUVLoc, 2, gl.FLOAT, false, stride, 16);

          gl.enableVertexAttribArray(aTileSizeLoc);
          gl.vertexAttribPointer(aTileSizeLoc, 2, gl.FLOAT, false, stride, 24);

          // Single draw call for all physical 3D sculpt tiles
          gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

          gl.flush();
          gl.endFrameEXP();

          rafRef.current = requestAnimationFrame(renderLoop);
        };

        rafRef.current = requestAnimationFrame(renderLoop);
      } catch (err) {
        console.error('PixelSculptImage initialization error:', err);
        setHasGlError(true);
      }
    };

    // Component Cleanup
    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        const gl = glRef.current;
        if (gl) {
          if (programRef.current) gl.deleteProgram(programRef.current);
          if (textureRef.current) gl.deleteTexture(textureRef.current);
          if (meshRef.current) {
            gl.deleteBuffer(meshRef.current.vertexBuffer);
            gl.deleteBuffer(meshRef.current.indexBuffer);
          }
        }
      };
    }, []);

    // Layout tracking
    const handleLayout = (e: LayoutChangeEvent) => {
      const { width: lw, height: lh } = e.nativeEvent.layout;
      if (lw > 0 && lh > 0) {
        layoutWidth.current = lw;
        layoutHeight.current = lh;
      }
    };

    // Touch Event Handlers
    const handleTouchStart = (e: GestureResponderEvent) => {
      if (!interactive) return;
      const { locationX, locationY } = e.nativeEvent;
      const w = layoutWidth.current;
      const h = layoutHeight.current;
      const u = Math.max(0, Math.min(1, locationX / w));
      const v = Math.max(0, Math.min(1, 1.0 - locationY / h));

      touchUVRef.current = [u, v];
      touchTargetStrengthRef.current = 1.0;
      touchStrengthRef.current = 1.0;
      touchTimeRef.current = (Date.now() - startTimeRef.current) * 0.001;

      // Subtle tilt towards touch point
      if (!tilt) {
        tiltRef.current = [(u - 0.5) * 0.25, (v - 0.5) * 0.25];
      }
    };

    const handleTouchMove = (e: GestureResponderEvent) => {
      if (!interactive) return;
      const { locationX, locationY } = e.nativeEvent;
      const w = layoutWidth.current;
      const h = layoutHeight.current;
      const u = Math.max(0, Math.min(1, locationX / w));
      const v = Math.max(0, Math.min(1, 1.0 - locationY / h));

      touchUVRef.current = [u, v];
      touchTargetStrengthRef.current = 1.0;

      if (!tilt) {
        tiltRef.current = [(u - 0.5) * 0.25, (v - 0.5) * 0.25];
      }
    };

    const handleTouchEnd = () => {
      if (!interactive) return;
      touchTargetStrengthRef.current = 0.0;
      if (!tilt) {
        tiltRef.current = [0.0, 0.0];
      }
    };

    // Fallback if WebGL fails
    if (hasGlError) {
      return (
        <View
          style={[styles.container, width ? { width } : null, height ? { height } : null, style]}
        >
          {source ? (
            <Image
              source={typeof source === 'string' ? { uri: source } : source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallbackPlaceholder]} />
          )}
        </View>
      );
    }

    return (
      <View
        style={[styles.container, width ? { width } : null, height ? { height } : null, style]}
        onLayout={handleLayout}
        onTouchStart={interactive ? handleTouchStart : undefined}
        onTouchMove={interactive ? handleTouchMove : undefined}
        onTouchEnd={interactive ? handleTouchEnd : undefined}
        onTouchCancel={interactive ? handleTouchEnd : undefined}
      >
        <GLView style={StyleSheet.absoluteFill} onContextCreate={handleContextCreate} />
      </View>
    );
  }
);

PixelSculptImage.displayName = 'PixelSculptImage';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0b10',
  },
  fallbackPlaceholder: {
    backgroundColor: '#11131a',
  },
});

export default PixelSculptImage;
