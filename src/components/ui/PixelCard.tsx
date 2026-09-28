import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { colors, borderRadius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface PixelCardProps {
  variant?: 'default' | 'blue' | 'yellow' | 'pink';
  gap?: number;
  speed?: number;
  colors?: string;
  active?: boolean;
  noCardFrame?: boolean;
  centerSoftness?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const VARIANTS = {
  default: {
    gap: 10,
    speed: 1.8,
    // #f8fafc, #f1f5f9, #cbd5e1
    c1: [0.97, 0.98, 0.99] as [number, number, number],
    c2: [0.94, 0.96, 0.98] as [number, number, number],
    c3: [0.80, 0.84, 0.88] as [number, number, number],
    baseAlpha: 0.55,
  },
  blue: {
    gap: 12,
    speed: 1.5,
    c1: [0.88, 0.95, 0.99] as [number, number, number],
    c2: [0.49, 0.83, 0.99] as [number, number, number],
    c3: [0.05, 0.65, 0.91] as [number, number, number],
    baseAlpha: 0.65,
  },
  yellow: {
    gap: 8,
    speed: 1.4,
    c1: [0.99, 0.94, 0.54] as [number, number, number],
    c2: [0.99, 0.88, 0.28] as [number, number, number],
    c3: [0.92, 0.70, 0.03] as [number, number, number],
    baseAlpha: 0.60,
  },
  pink: {
    gap: 10,
    speed: 2.2,
    c1: [0.99, 0.80, 0.83] as [number, number, number],
    c2: [0.99, 0.64, 0.69] as [number, number, number],
    c3: [0.88, 0.11, 0.28] as [number, number, number],
    baseAlpha: 0.65,
  },
};

const VERT_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG_SHADER = `
precision highp float;
varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uGap;
uniform float uSpeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uBaseAlpha;
uniform float uCenterSoftness;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 pixelPos = vUv * uResolution;
  vec2 cell = floor(pixelPos / uGap);
  vec2 inCell = fract(pixelPos / uGap);

  float rnd = hash(cell);
  float rnd2 = hash(cell + vec2(7.3, 13.9));
  float rndColor = hash(cell + vec2(21.1, 47.3));

  // Pulse / Shimmer calculation matching React Bits
  float phase = sin(uTime * uSpeed + rnd * 6.28318);
  float shimmer = smoothstep(-0.4, 0.75, phase);
  float maxPixelHalf = (uGap * 0.38);
  float currentHalf = maxPixelHalf * shimmer * (0.4 + 0.6 * rnd2);

  // Square pixel distance from center of cell
  vec2 d = abs(inCell - vec2(0.5)) * uGap;
  if (d.x < currentHalf && d.y < currentHalf) {
    // Select color variant
    vec3 col = uColor1;
    if (rndColor > 0.66) {
      col = uColor3;
    } else if (rndColor > 0.33) {
      col = uColor2;
    }

    float edgeFade = 1.0 - max(d.x, d.y) / currentHalf;
    float alpha = uBaseAlpha * (0.35 + 0.65 * shimmer) * (0.7 + 0.3 * edgeFade);

    // Center softness / blur aura for overlaying cards or ledger update
    if (uCenterSoftness > 0.5) {
      vec2 centerNorm = (vUv - vec2(0.5)) * vec2(uResolution.x / uResolution.y, 1.0);
      float distFromCenter = length(centerNorm);
      float centerDim = smoothstep(0.12, 0.72, distFromCenter);
      alpha *= (0.22 + 0.78 * centerDim);
    }

    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
`;

/**
 * PixelCard Component
 * Faithful React Native / Expo GL translation of React Bits `PixelCard`
 * (https://reactbits.dev/c/components/pixel-card)
 * Renders shimmering, animated pixel grids in the background of cards or full screen
 */
export const PixelCard: React.FC<PixelCardProps> = ({
  variant = 'default',
  gap,
  speed,
  active = true,
  noCardFrame = false,
  centerSoftness = false,
  style,
  children,
}) => {
  const isReducedMotion = useReducedMotion();
  const [layout, setLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const animFrameRef = useRef<number | null>(null);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const config = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? config.gap;
  const finalSpeed = speed ?? config.speed;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width: Math.round(width), height: Math.round(height) });
    }
  };

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;

    // Compile Vertex Shader
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, VERT_SHADER);
    gl.compileShader(vertShader);

    // Compile Fragment Shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, FRAG_SHADER);
    gl.compileShader(fragShader);

    // Link Program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('PixelCard GL link failed:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry covering full clip space
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Get Uniform Locations
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uGap = gl.getUniformLocation(program, 'uGap');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uColor1 = gl.getUniformLocation(program, 'uColor1');
    const uColor2 = gl.getUniformLocation(program, 'uColor2');
    const uColor3 = gl.getUniformLocation(program, 'uColor3');
    const uBaseAlpha = gl.getUniformLocation(program, 'uBaseAlpha');
    const uCenterSoftness = gl.getUniformLocation(program, 'uCenterSoftness');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const render = () => {
      if (!glRef.current) return;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;

      gl.viewport(0, 0, w, h);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const elapsed = isReducedMotion ? 0.5 : (Date.now() - startTimeRef.current) / 1000;

      gl.uniform2f(uResolution, w, h);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uGap, finalGap * (Platform.OS === 'android' ? 1.5 : 1.0));
      gl.uniform1f(uSpeed, finalSpeed);
      gl.uniform3f(uColor1, config.c1[0], config.c1[1], config.c1[2]);
      gl.uniform3f(uColor2, config.c2[0], config.c2[1], config.c2[2]);
      gl.uniform3f(uColor3, config.c3[0], config.c3[1], config.c3[2]);
      gl.uniform1f(uBaseAlpha, config.baseAlpha);
      gl.uniform1f(uCenterSoftness, centerSoftness ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.endFrameEXP();

      if (active && !isReducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      glRef.current = null;
    };
  }, []);

  return (
    <View
      style={[
        noCardFrame ? styles.bleedContainer : styles.cardContainer,
        style,
      ]}
      onLayout={onLayout}
    >
      {/* Background Pixel Shimmer Layer */}
      {layout.width > 0 && layout.height > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <GLView
            style={StyleSheet.absoluteFill}
            onContextCreate={onContextCreate}
          />
        </View>
      )}

      {/* Card Content Rendered on Top */}
      {children && <View style={styles.contentLayer}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  bleedContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardContainer: {
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#22242B',
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },
});
