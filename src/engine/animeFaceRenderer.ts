import * as THREE from 'three';
import { Ragdoll3D } from '../types/physics3d';
import { updateVoxel3DFace } from './voxelFaceRenderer';

export type AnimeExpression = 'normal' | 'pain' | 'blush' | 'dead' | 'surprised';

export interface AnimeFaceData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh?: THREE.Mesh;
  expression: AnimeExpression;
  eyeColorHex: number;
  blinkTimer: number;
  blinkDuration: number;
  blinkProgress: number; // 0 = fully open, 1 = fully closed
  isBlinking: boolean;
  painTimer: number;
  blushTimer: number;
  
  // Dynamic high-fidelity multi-use parameters
  painVariant?: number;
  pleasureVariant?: number;
  blushLevel?: number;
  leftEyeBlink?: number;
  rightEyeBlink?: number;
  eyeDirectionX?: number;
  eyeDirectionY?: number;
  trembleIntensity?: number;
  mouthOpenness?: number;
  mouthShape?: 'neutral' | 'happy' | 'pain' | 'pleasure' | 'o' | 'wavy' | 'line';
  hasTears?: boolean;
  hasSteam?: boolean;

  // Cached states to avoid unnecessary redrawing
  lastDrawnExpression?: string;
  lastDrawnBlink?: number;
  lastDrawnFatigue?: number;
  lastDrawnPainVariant?: number;
  lastDrawnPleasureVariant?: number;
  lastDrawnBlushLevel?: number;
  lastDrawnLeftEyeBlink?: number;
  lastDrawnRightEyeBlink?: number;
  lastDrawnEyeDirectionX?: number;
  lastDrawnEyeDirectionY?: number;
  lastDrawnTremble?: number;
  lastDrawnMouthOpenness?: number;
  lastDrawnMouthShape?: string;
  lastDrawnTears?: boolean;
  lastDrawnSteam?: boolean;
}

const CANVAS_SIZE = 512;

/**
 * Draws a comprehensive, highly expressive 2D Anime Face directly onto a 2D Canvas.
 * Supports multiple transitioned pleasure and pain variants, asymmetrical winking/blinking,
 * trembling/shaking, custom mouth shapes, and real-time animated steam/hearts.
 */
export function drawAnimeFaceCanvas(
  ctx: CanvasRenderingContext2D,
  expression: AnimeExpression,
  blinkProgress: number, // 0.0 to 1.0 (average/general blink)
  eyeColorHex: number = 0x0284c7,
  hairColorHex: number = 0x1c1917,
  painVariant: number = 0,
  fatigue: number = 0.0,
  blushLevel: number = 0.0,
  leftEyeBlink?: number,
  rightEyeBlink?: number,
  pleasureVariant: number = 0,
  eyeDirectionX: number = 0,
  eyeDirectionY: number = 0,
  trembleIntensity: number = 0,
  mouthOpenness: number = 0,
  mouthShape?: 'neutral' | 'happy' | 'pain' | 'pleasure' | 'o' | 'wavy' | 'line',
  hasTears: boolean = false,
  hasSteam: boolean = false
) {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;

  // Convert eye color hex to string rgb
  const r = (eyeColorHex >> 16) & 255;
  const g = (eyeColorHex >> 8) & 255;
  const b = eyeColorHex & 255;
  const eyeColorBase = `rgb(${r}, ${g}, ${b})`;
  const eyeColorLight = `rgb(${Math.min(255, r + 70)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 90)})`;
  const eyeColorDark = `rgb(${Math.max(0, r - 70)}, ${Math.max(0, g - 70)}, ${Math.max(0, b - 70)})`;

  // --- 0. Fallback Derivation & Dynamic State Adaptation ---
  let finalBlush = blushLevel;
  if (expression === 'blush' && blushLevel === 0) {
    if (pleasureVariant === 0) finalBlush = 0.70;
    else if (pleasureVariant === 1) finalBlush = 0.90;
    else if (pleasureVariant === 2) finalBlush = 1.00;
    else if (pleasureVariant === 3) finalBlush = 0.80;
    else finalBlush = 0.75;
  } else if (expression === 'normal' && blushLevel === 0) {
    finalBlush = 0.05;
  }

  let finalLeftBlink = leftEyeBlink !== undefined ? leftEyeBlink : blinkProgress;
  let finalRightBlink = rightEyeBlink !== undefined ? rightEyeBlink : blinkProgress;

  // Combine natural blink/winks and fatigue/tiredness
  finalLeftBlink = Math.max(finalLeftBlink, fatigue);
  finalRightBlink = Math.max(finalRightBlink, fatigue);

  // If dead or sleeping, eyelids are fully shut
  if (expression === 'dead') {
    finalLeftBlink = 1.0;
    finalRightBlink = 1.0;
  }

  // Fallback eye direction (gazing direction)
  let finalDirX = eyeDirectionX;
  let finalDirY = eyeDirectionY;
  if (expression === 'blush' && eyeDirectionY === 0) {
    if (pleasureVariant === 0) {
      finalDirY = 0.35; // Rolling slightly up
      finalDirX = 0.0;
    } else if (pleasureVariant === 1) {
      finalDirY = 0.75; // Rolled heavily upwards (ecstatic / Ahegao)
      finalDirX = -0.15; // Slightly cross-eyed inward
    } else if (pleasureVariant === 2) {
      finalDirY = 0.0; // Squinted shut, no gaze needed
      finalDirX = 0.0;
    } else if (pleasureVariant === 3) {
      finalDirY = 0.45; // Rolling up playful
      finalDirX = 0.0;
    }
  }

  // Fallback trembling / jitter speed
  let finalTremble = trembleIntensity;
  if (expression === 'blush' && trembleIntensity === 0) {
    if (pleasureVariant === 0) finalTremble = 0.15;
    else if (pleasureVariant === 1) finalTremble = 0.48; // Heavily trembling
    else if (pleasureVariant === 2) finalTremble = 0.65; // Extremely intense overload tremble
    else if (pleasureVariant === 3) finalTremble = 0.22;
  } else if (expression === 'pain' && trembleIntensity === 0) {
    if (painVariant === 1) finalTremble = 0.40; // Shaking Small Pupil
    else if (painVariant === 2) finalTremble = 0.25;
    else finalTremble = 0.20;
  }

  // Fallback mouth openness and shape
  let finalMouthOpen = mouthOpenness;
  let finalMouthShape = mouthShape;
  if (!finalMouthShape) {
    if (expression === 'blush') {
      if (pleasureVariant === 0) { finalMouthShape = 'pleasure'; finalMouthOpen = 0.45; }
      else if (pleasureVariant === 1) { finalMouthShape = 'wavy'; finalMouthOpen = 0.95; } // Tongue out
      else if (pleasureVariant === 2) { finalMouthShape = 'happy'; finalMouthOpen = 0.85; } // Overload smile
      else if (pleasureVariant === 3) { finalMouthShape = 'wavy'; finalMouthOpen = 0.60; }
    } else if (expression === 'pain') {
      if (painVariant === 0) { finalMouthShape = 'pain'; finalMouthOpen = 1.0; } // Screaming
      else if (painVariant === 1) { finalMouthShape = 'line'; finalMouthOpen = 0.35; } // Gritted grid teeth
      else if (painVariant === 2) { finalMouthShape = 'wavy'; finalMouthOpen = 0.15; } // Slanted grimace
      else if (painVariant === 3) { finalMouthShape = 'line'; finalMouthOpen = 0.0; } // Clenched closed mouth
    } else if (expression === 'surprised') {
      finalMouthShape = 'o';
      finalMouthOpen = 0.85;
    } else {
      finalMouthShape = 'neutral';
      finalMouthOpen = 0.0;
    }
  }

  // Fallback tears and steam triggers
  let finalTears = hasTears;
  if (expression === 'pain') finalTears = true;
  if (expression === 'blush' && (pleasureVariant === 1 || pleasureVariant === 2)) finalTears = true; // Ecstasy/melting tears

  let finalSteam = hasSteam;
  if (expression === 'blush') finalSteam = true;

  // --- 1. CHEEK BLUSH & MULTI-LAYER STEAM ---
  const drawBlush = (_level: number) => {
    // Red face aura/blush disabled per request ("sacale el coso rojo de cara")
    return;
  };

  // Draw blushing based on derived finalBlush level
  drawBlush(finalBlush);

  // Steam puffs / floating hearts rising if finalSteam is true (Intimate/Pleasure)
  if (finalSteam) {
    const pulse = Math.sin(Date.now() * 0.006) * 0.18 + 0.92;
    const count = expression === 'blush' && pleasureVariant === 2 ? 4 : 3;
    ctx.fillStyle = `rgba(255, 182, 193, ${0.52 + finalBlush * 0.45})`;

    // Rising puffs or hearts
    for (let p = 0; p < count; p++) {
      const side = p % 2 === 0 ? 1 : -1;
      const lift = (Date.now() * 0.03 + p * 85) % 140;
      const sy = cy - 30 - lift;
      const sx = cx + side * (110 + p * 35) + Math.sin(Date.now() * 0.012 + p) * 22;
      
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.sin(Date.now() * 0.005 + p) * 0.25);
      ctx.scale(pulse * (0.55 + p * 0.22), pulse * (0.55 + p * 0.22));

      // Draw cute heart or steam cloud
      if (p % 2 === 0 || (expression === 'blush' && pleasureVariant >= 1)) {
        // Heart
        const heartSize = 11;
        ctx.beginPath();
        ctx.moveTo(0, heartSize * 0.7);
        ctx.bezierCurveTo(-heartSize, heartSize * 0.1, -heartSize, -heartSize * 0.7, 0, -heartSize * 0.3);
        ctx.bezierCurveTo(heartSize, -heartSize * 0.7, heartSize, heartSize * 0.1, 0, heartSize * 0.7);
        ctx.fill();
      } else {
        // Steam cloud puff
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.arc(-8, -6, 11, 0, Math.PI * 2);
        ctx.arc(8, -6, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // --- 2. NOSE ---
  const drawNose = () => {
    ctx.fillStyle = 'rgba(30, 20, 20, 0.48)';
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle nose shadow
    ctx.fillStyle = 'rgba(30, 20, 20, 0.16)';
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 24, 3.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawNose();

  // --- 3. EYES & EYEBROWS ---
  const eyeOffsetY = cy - 28;
  const eyeDistX = 100;

  // Single Eye Drawer Function
  const drawAnimeEye = (
    eyeCenterX: number,
    isLeft: boolean,
    expr: AnimeExpression,
    blinkVal: number
  ) => {
    ctx.save();
    const sign = isLeft ? 1 : -1;

    // Eyebrows styling
    const hr = (hairColorHex >> 16) & 255;
    const hg = (hairColorHex >> 8) & 255;
    const hb = hairColorHex & 255;
    ctx.strokeStyle = `rgb(${Math.max(20, hr - 30)}, ${Math.max(20, hg - 30)}, ${Math.max(20, hb - 30)})`;
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';

    const browBaseY = eyeOffsetY - 62;
    const browJitterY = finalTremble > 0 ? Math.sin(Date.now() * 0.08) * finalTremble * 3.8 : 0;

    ctx.save();
    ctx.translate(0, browJitterY);

    if (expr === 'pain') {
      if (painVariant === 1) {
        // Worried/shocked sad arched eyebrows
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 35, browBaseY + 14);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 4, eyeCenterX + sign * 35, browBaseY + 12);
        ctx.stroke();
      } else if (painVariant === 2) {
        // Asymmetric brows (one furrowed down, one raised up)
        ctx.beginPath();
        if (isLeft) {
          ctx.moveTo(eyeCenterX - 38, browBaseY + 12);
          ctx.quadraticCurveTo(eyeCenterX, browBaseY - 4, eyeCenterX + 35, browBaseY - 10);
        } else {
          ctx.moveTo(eyeCenterX + 35, browBaseY - 14);
          ctx.quadraticCurveTo(eyeCenterX, browBaseY - 24, eyeCenterX - 35, browBaseY - 10);
        }
        ctx.stroke();
      } else if (painVariant === 3) {
        // Pressed deep down in severe agony
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 35, browBaseY + 18);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY + 4, eyeCenterX + sign * 35, browBaseY + 18);
        ctx.stroke();
      } else {
        // Standard sharp furrowed eyebrow in agony
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 40, browBaseY + 12);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 6, eyeCenterX + sign * 35, browBaseY - 14);
        ctx.stroke();
      }
    } else if (expr === 'blush') {
      if (pleasureVariant === 1) {
        // Highly-raised trembling ecstatic/Ahegao eyebrows
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 38, browBaseY - 12);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 26, eyeCenterX + sign * 38, browBaseY - 16);
        ctx.stroke();
      } else if (pleasureVariant === 2) {
        // Squeezed downward arched brows (ecstatic wince)
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 35, browBaseY + 15);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 2, eyeCenterX + sign * 35, browBaseY + 10);
        ctx.stroke();
      } else if (pleasureVariant === 3 && !isLeft) {
        // Wink brow (playfully raised asymmetrical)
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 38, browBaseY - 10);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 20, eyeCenterX + sign * 38, browBaseY - 8);
        ctx.stroke();
      } else {
        // Soft swooning arched brow with trembling jitter
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 38, browBaseY + 6);
        ctx.quadraticCurveTo(eyeCenterX, browBaseY - 16, eyeCenterX + sign * 38, browBaseY - 4);
        ctx.stroke();
      }
    } else if (expr === 'dead') {
      // Relaxed dropped down brow for peaceful sleeping/dead
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - sign * 35, browBaseY + 6);
      ctx.quadraticCurveTo(eyeCenterX, browBaseY - 2, eyeCenterX + sign * 35, browBaseY + 8);
      ctx.stroke();
    } else if (expr === 'surprised') {
      // High raised surprised eyebrow
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - sign * 35, browBaseY - 18);
      ctx.quadraticCurveTo(eyeCenterX, browBaseY - 32, eyeCenterX + sign * 35, browBaseY - 16);
      ctx.stroke();
    } else {
      // Normal gentle curved cute eyebrow
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - sign * 38, browBaseY);
      ctx.quadraticCurveTo(eyeCenterX, browBaseY - 14, eyeCenterX + sign * 38, browBaseY - 4);
      ctx.stroke();
    }
    ctx.restore(); // end eyebrow restore

    // --- Eye Closing Override/Wink Checks ---
    const isWinkingThisEye = isLeft ? (finalLeftBlink >= 0.8) : (finalRightBlink >= 0.8);

    if (isWinkingThisEye) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      ctx.save();
      const eyeJitterX = finalTremble > 0 ? Math.sin(Date.now() * 0.12) * finalTremble * 3.5 : 0;
      const eyeJitterY = finalTremble > 0 ? Math.cos(Date.now() * 0.12) * finalTremble * 3.5 : 0;
      ctx.translate(eyeJitterX, eyeJitterY);

      ctx.beginPath();
      if (expr === 'blush') {
        if (pleasureVariant === 2) {
          // Ecstatic squint (> < or tightly shut happy arches)
          ctx.moveTo(eyeCenterX - sign * 35, eyeOffsetY - 12);
          ctx.lineTo(eyeCenterX + sign * 28, eyeOffsetY + 4);
          ctx.lineTo(eyeCenterX - sign * 35, eyeOffsetY + 16);
        } else {
          // Happy smiling closed eye (^ ^)
          ctx.moveTo(eyeCenterX - sign * 38, eyeOffsetY + 8);
          ctx.quadraticCurveTo(eyeCenterX, eyeOffsetY - 18, eyeCenterX + sign * 38, eyeOffsetY + 8);
        }
      } else {
        // Relaxed closed eye (⌒ ⌒) for sleep, dead, or highly tired
        ctx.moveTo(eyeCenterX - sign * 38, eyeOffsetY);
        ctx.quadraticCurveTo(eyeCenterX, eyeOffsetY + 14, eyeCenterX + sign * 38, eyeOffsetY);
      }
      ctx.stroke();

      // Cute tiny side lash flick
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - sign * 34, eyeOffsetY + 2);
      ctx.lineTo(eyeCenterX - sign * 44, eyeOffsetY - 6);
      ctx.stroke();

      ctx.restore();
      ctx.restore(); // restore eye main save
      return;
    }

    // --- Expression: PAIN (Multiple Damage Face Variants) ---
    if (expr === 'pain') {
      const eyeJitterX = finalTremble > 0 ? Math.sin(Date.now() * 0.12) * finalTremble * 3.5 : 0;
      const eyeJitterY = finalTremble > 0 ? Math.cos(Date.now() * 0.12) * finalTremble * 3.5 : 0;

      ctx.save();
      ctx.translate(eyeJitterX, eyeJitterY);

      if (painVariant === 1) {
        // --- Variant 1: Teary Shock Eyes (trembling wide-open, crying) ---
        const eyeWidth = 46;
        const eyeHeight = 46;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(eyeCenterX, eyeOffsetY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Shaking small pupil/iris
        const pJitterX = Math.sin(Date.now() * 0.15) * 2;
        const pJitterY = Math.cos(Date.now() * 0.15) * 2;
        const irisW = 20;
        const irisH = 20;

        const irisGrad = ctx.createRadialGradient(
          eyeCenterX + pJitterX, eyeOffsetY + pJitterY, 2,
          eyeCenterX + pJitterX, eyeOffsetY + pJitterY, irisW
        );
        irisGrad.addColorStop(0, eyeColorLight);
        irisGrad.addColorStop(1, eyeColorDark);
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(eyeCenterX + pJitterX, eyeOffsetY + pJitterY, irisW, 0, Math.PI * 2);
        ctx.fill();

        // White specular
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeCenterX + pJitterX - 4, eyeOffsetY + pJitterY - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Dark upper eyelash outline
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(eyeCenterX, eyeOffsetY, eyeWidth, -Math.PI * 0.9, -Math.PI * 0.1);
        ctx.stroke();

        // Flying tear drops
        if (finalTears) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const tearX = eyeCenterX + (isLeft ? -45 : 45);
          const tearY = eyeOffsetY + 16;
          ctx.ellipse(tearX, tearY, 7, 11, (isLeft ? -0.4 : 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // White specular
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tearX - (isLeft ? -2 : 2), tearY - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();
        return;
      } else if (painVariant === 2) {
        // --- Variant 2: Asymmetric Squint Grimace (One eye tight closed, one eye wincing) ---
        if (isLeft) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 6.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(eyeCenterX - 35, eyeOffsetY + 4);
          ctx.quadraticCurveTo(eyeCenterX, eyeOffsetY + 16, eyeCenterX + 35, eyeOffsetY + 4);
          ctx.stroke();
          ctx.restore();
          ctx.restore();
          return;
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(eyeCenterX - 35, eyeOffsetY - 18);
          ctx.lineTo(eyeCenterX + 28, eyeOffsetY);
          ctx.lineTo(eyeCenterX - 35, eyeOffsetY + 18);
          ctx.stroke();
          ctx.restore();
          ctx.restore();
          return;
        }
      } else if (painVariant === 3) {
        // --- Variant 3: Agony tears (Both eyes tightly closed, severe crease) ---
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 35, eyeOffsetY + 2);
        ctx.quadraticCurveTo(eyeCenterX, eyeOffsetY - 12, eyeCenterX + sign * 35, eyeOffsetY + 4);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(eyeCenterX - sign * 30, eyeOffsetY - 8);
        ctx.quadraticCurveTo(eyeCenterX, eyeOffsetY - 18, eyeCenterX + sign * 30, eyeOffsetY - 6);
        ctx.stroke();

        // Heavy tears streaming down!
        if (finalTears) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const tearY = eyeOffsetY + 16;
          ctx.ellipse(eyeCenterX - sign * 15, tearY, 8, 14, (isLeft ? -0.2 : 0.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // White specular on streaming tear
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(eyeCenterX - sign * 15 - sign * 2, tearY - 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();
        return;
      } else {
        // --- Variant 0: Sharp anime wincing eyes (> <) ---
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Left eye is '>', right eye is '<'
        ctx.moveTo(eyeCenterX - sign * 32, eyeOffsetY - 16);
        ctx.lineTo(eyeCenterX + sign * 24, eyeOffsetY);
        ctx.lineTo(eyeCenterX - sign * 32, eyeOffsetY + 16);
        ctx.stroke();

        // Glistening tear drops flying out
        if (finalTears) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const tearX = eyeCenterX + (isLeft ? -45 : 45);
          const tearY = eyeOffsetY + 14;
          ctx.ellipse(tearX, tearY, 6, 10, (isLeft ? -0.4 : 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // White specular on tear
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tearX - (isLeft ? -2 : 2), tearY - 3, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();
        return;
      }
    }

    // --- STANDARD OPEN EYE RENDERING (Normal, Blush, Surprise, Tired) ---
    const eyeJitterX = finalTremble > 0 ? Math.sin(Date.now() * 0.15) * finalTremble * 3.5 : 0;
    const eyeJitterY = finalTremble > 0 ? Math.cos(Date.now() * 0.15) * finalTremble * 3.5 : 0;

    const finalEyeCenterX = eyeCenterX + eyeJitterX;
    const finalEyeOffsetY = eyeOffsetY + eyeJitterY;

    // Use left or right blink value based on which eye we are drawing!
    const activeBlinkVal = isLeft ? finalLeftBlink : finalRightBlink;

    const eyeWidth = 48;
    const eyeHeight = 58 * (1 - activeBlinkVal * 0.75);

    // 1. Sclera (White background)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(finalEyeCenterX, finalEyeOffsetY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Top sclera inner shadow
    const scleraShadow = ctx.createLinearGradient(
      finalEyeCenterX,
      finalEyeOffsetY - eyeHeight,
      finalEyeCenterX,
      finalEyeOffsetY
    );
    scleraShadow.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
    scleraShadow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = scleraShadow;
    ctx.fill();

    // 2. Iris (Large expressive anime gradient)
    const irisW = 34;
    const irisH = 50 * (1 - activeBlinkVal * 0.75);

    // Roll/Focus eyes based on direction parameters
    const lookXShift = -finalDirX * irisW * 0.55 * sign;
    const lookYShift = -finalDirY * irisH * 0.55;

    const irisCenterY = finalEyeOffsetY + 2 + lookYShift;
    const irisCenterX = finalEyeCenterX + lookXShift;

    const irisGrad = ctx.createLinearGradient(
      irisCenterX,
      irisCenterY - irisH,
      irisCenterX,
      irisCenterY + irisH
    );
    irisGrad.addColorStop(0, eyeColorDark);
    irisGrad.addColorStop(0.5, eyeColorBase);
    irisGrad.addColorStop(1, eyeColorLight);

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(irisCenterX, irisCenterY, irisW, irisH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris bottom bright crescent glow
    const crescentGrad = ctx.createRadialGradient(
      irisCenterX,
      irisCenterY + irisH * 0.65,
      2,
      irisCenterX,
      irisCenterY + irisH * 0.65,
      irisW * 0.85
    );
    crescentGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    crescentGrad.addColorStop(0.5, eyeColorLight);
    crescentGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = crescentGrad;
    ctx.beginPath();
    ctx.ellipse(irisCenterX, irisCenterY + irisH * 0.55, irisW * 0.8, irisH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Pupil & Special Effects
    const isHeartPupil = false;

    if (isHeartPupil) {
      // HEART PUPILS (♥ ♥) for Intimate / Pleasure with dynamic Heartbeat Pulse
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(irisCenterX, irisCenterY - 1, irisW * 0.48, irisH * 0.50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer glowing pink aura
      const heartPulse = Math.sin(Date.now() * 0.008) * 0.18 + 1.12;
      ctx.fillStyle = 'rgba(251, 113, 133, 0.42)';
      ctx.beginPath();
      ctx.ellipse(irisCenterX, irisCenterY - 1, irisW * 0.38 * heartPulse, irisH * 0.38 * heartPulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sweet glowing pink heart in the center
      ctx.fillStyle = '#fecdd3'; // sweet soft glowing rose-pink
      const heartSize = (9 + (pleasureVariant === 1 ? 3.0 : 0)) * heartPulse;
      const hx = irisCenterX;
      const hy = irisCenterY - 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy + heartSize * 0.7);
      ctx.bezierCurveTo(
        hx - heartSize,
        hy + heartSize * 0.1,
        hx - heartSize,
        hy - heartSize * 0.7,
        hx,
        hy - heartSize * 0.3
      );
      ctx.bezierCurveTo(
        hx + heartSize,
        hy - heartSize * 0.7,
        hx + heartSize,
        hy + heartSize * 0.1,
        hx,
        hy + heartSize * 0.7
      );
      ctx.fill();
    } else {
      // Standard deep black anime pupil
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(irisCenterX, irisCenterY - 1, irisW * 0.4, irisH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Sparkling Anime Light Highlights (Gleam reflections from top-left light source)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(irisCenterX - 10, irisCenterY - irisH * 0.35, 9, 13, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Secondary smaller bottom highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(irisCenterX + 10, irisCenterY + irisH * 0.35, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Tiny star glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(irisCenterX - 4, irisCenterY + irisH * 0.15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end eye clip

    // 5. Upper Eyelash Line & Wings (Dark, thick, iconic anime styling)
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    const lashY = finalEyeOffsetY - eyeHeight * 0.85;
    ctx.moveTo(finalEyeCenterX + sign * (eyeWidth + 2), lashY + 16);
    ctx.quadraticCurveTo(finalEyeCenterX, lashY - 10, finalEyeCenterX - sign * (eyeWidth - 2), lashY + 4);
    // Outer Winged Flick
    ctx.lineTo(finalEyeCenterX - sign * (eyeWidth + 14), lashY - 8);
    ctx.stroke();

    // Double eyelid subtle crease
    ctx.strokeStyle = 'rgba(30, 20, 20, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(finalEyeCenterX + sign * 20, lashY - 14);
    ctx.quadraticCurveTo(finalEyeCenterX, lashY - 22, finalEyeCenterX - sign * 28, lashY - 16);
    ctx.stroke();

    // Lower delicate eyelash
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(finalEyeCenterX - sign * 18, finalEyeOffsetY + eyeHeight * 0.85);
    ctx.quadraticCurveTo(finalEyeCenterX, finalEyeOffsetY + eyeHeight * 0.92, finalEyeCenterX + sign * 24, finalEyeOffsetY + eyeHeight * 0.82);
    ctx.stroke();

    // Tear trickle down on the side of the eye
    if (finalTears && expr === 'blush') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      const tearX = finalEyeCenterX - sign * (eyeWidth - 10);
      const tearY = finalEyeOffsetY + eyeHeight * 0.5;
      ctx.ellipse(tearX, tearY + 8, 4.2, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end drawAnimeEye restore
  };

  // Draw both eyes independently
  drawAnimeEye(cx - eyeDistX, true, expression, finalLeftBlink);
  drawAnimeEye(cx + eyeDistX, false, expression, finalRightBlink);

  // --- 4. SWEAT DROP (PAIN & SURPRISE) ---
  if (expression === 'pain' || expression === 'surprised') {
    const swX = cx + 165;
    const swY = cy - 65;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(swX, swY - 22);
    ctx.bezierCurveTo(swX + 16, swY - 5, swX + 16, swY + 18, swX, swY + 18);
    ctx.bezierCurveTo(swX - 16, swY + 18, swX - 16, swY - 5, swX, swY - 22);
    ctx.fill();

    // Specular shine on sweat drop
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(swX - 4, swY + 4, 3, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 5. MOUTH (EXPRESSIVE ANIME MOUTHS) ---
  const mouthY = cy + 76;

  if (finalMouthShape === 'pain') {
    // Open screaming pain mouth with teeth and deep rosy coral cavity
    ctx.fillStyle = '#be123c';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;

    const mw = 36 * (0.6 + finalMouthOpen * 0.4);
    const mh = 48 * finalMouthOpen;

    ctx.beginPath();
    ctx.moveTo(cx - mw, mouthY - 10);
    ctx.quadraticCurveTo(cx, mouthY - 14, cx + mw, mouthY - 10);
    ctx.quadraticCurveTo(cx + mw * 0.8, mouthY - 10 + mh * 0.9, cx, mouthY - 10 + mh);
    ctx.quadraticCurveTo(cx - mw * 0.8, mouthY - 10 + mh * 0.9, cx - mw, mouthY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White upper teeth row
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - mw * 0.8, mouthY - 9);
    ctx.quadraticCurveTo(cx, mouthY - 7, cx + mw * 0.8, mouthY - 9);
    ctx.lineTo(cx + mw * 0.7, mouthY + 4);
    ctx.quadraticCurveTo(cx, mouthY + 6, cx - mw * 0.7, mouthY + 4);
    ctx.closePath();
    ctx.fill();

    // Pink tongue
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(cx, mouthY - 10 + mh * 0.75, mw * 0.5, Math.PI, 0);
    ctx.fill();

  } else if (finalMouthShape === 'pleasure' || finalMouthShape === 'wavy') {
    // Cute open panting/flustered/wavy mouth with soft pink oral cavity
    ctx.fillStyle = '#fda4af';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;

    const mw = 22 + finalMouthOpen * 14;
    const mh = 12 + finalMouthOpen * 22;

    ctx.save();
    if (finalTremble > 0) {
      const mJitX = Math.sin(Date.now() * 0.1) * finalTremble * 2;
      const mJitY = Math.cos(Date.now() * 0.1) * finalTremble * 2;
      ctx.translate(mJitX, mJitY);
    }

    ctx.beginPath();
    if (finalMouthShape === 'wavy') {
      // Ecstatic wavy mouth (like a wobbly wavy panting curve)
      ctx.moveTo(cx - mw, mouthY - 4);
      ctx.bezierCurveTo(cx - mw * 0.5, mouthY - 12, cx - mw * 0.1, mouthY - 2, cx, mouthY - 6);
      ctx.bezierCurveTo(cx + mw * 0.1, mouthY - 2, cx + mw * 0.5, mouthY - 12, cx + mw, mouthY - 4);
      ctx.quadraticCurveTo(cx + mw * 0.8, mouthY + mh, cx, mouthY + mh + 4);
      ctx.quadraticCurveTo(cx - mw * 0.8, mouthY + mh, cx - mw, mouthY - 4);
    } else {
      // Normal cute open blush mouth
      ctx.moveTo(cx - mw, mouthY - 4);
      ctx.quadraticCurveTo(cx, mouthY - 12, cx + mw, mouthY - 4);
      ctx.quadraticCurveTo(cx + mw * 0.8, mouthY + mh, cx, mouthY + mh + 2);
      ctx.quadraticCurveTo(cx - mw * 0.8, mouthY + mh, cx - mw, mouthY - 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute pink tongue tip
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    const tongueRadius = mw * 0.55;
    ctx.arc(cx, mouthY + mh * 0.6, tongueRadius, 0, Math.PI * 2);
    ctx.fill();

    // Glistening saliva drool thread and droplet during heavy panting pleasure
    if (expression === 'blush' && finalMouthOpen > 0.45) {
      const timeMs = Date.now();
      const droolSway = Math.sin(timeMs * 0.008) * 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 8, mouthY + mh * 0.4);
      ctx.quadraticCurveTo(cx - 10 + droolSway, mouthY + mh + 10, cx - 9 + droolSway, mouthY + mh + 20);
      ctx.stroke();

      // Drool droplet at tip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(cx - 9 + droolSway, mouthY + mh + 20, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

  } else if (finalMouthShape === 'happy') {
    // Smiling wide happy/panting mouth with soft rose oral cavity
    ctx.fillStyle = '#fb7185';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;

    const mw = 32 * (0.7 + finalMouthOpen * 0.3);
    const mh = 14 + finalMouthOpen * 18;

    ctx.beginPath();
    ctx.moveTo(cx - mw, mouthY - 8);
    ctx.quadraticCurveTo(cx, mouthY + 12, cx + mw, mouthY - 8);
    ctx.quadraticCurveTo(cx + mw * 0.7, mouthY + mh, cx, mouthY + mh + 4);
    ctx.quadraticCurveTo(cx - mw * 0.7, mouthY + mh, cx - mw, mouthY - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White upper tooth strip
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - mw * 0.8, mouthY - 7);
    ctx.quadraticCurveTo(cx, mouthY + 2, cx + mw * 0.8, mouthY - 7);
    ctx.quadraticCurveTo(cx, mouthY - 3, cx - mw * 0.8, mouthY - 7);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(cx, mouthY + mh * 0.55, mw * 0.5, Math.PI, 0);
    ctx.fill();

  } else if (finalMouthShape === 'o') {
    // Small surprised round "O" mouth
    ctx.fillStyle = '#e11d48';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 6, 12, 12 + finalMouthOpen * 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

  } else if (finalMouthShape === 'line') {
    // Trembling/closed straight gritted teeth or holding back
    ctx.fillStyle = '#be123c';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;

    const mw = 35 + finalMouthOpen * 10;
    const mh = 10 + finalMouthOpen * 6;

    ctx.beginPath();
    ctx.roundRect(cx - mw / 2, mouthY, mw, mh, 4);
    ctx.fill();
    ctx.stroke();

    // White grid teeth lines
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - mw / 2 + 3, mouthY + mh / 2);
    ctx.lineTo(cx + mw / 2 - 3, mouthY + mh / 2);
    ctx.stroke();

  } else {
    // NORMAL / NEUTRAL: Delicate, cute anime mouth curve.
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 20, mouthY - 2);
    ctx.quadraticCurveTo(cx, mouthY + 8, cx + 20, mouthY - 2);
    ctx.stroke();
  }
}

/**
 * Creates and initializes AnimeFaceGeometry for a ragdoll, attaching the curved 2D canvas decal to the head.
 * Size increased significantly as requested ("mas grande sea cara en cabesa").
 */
function createAnimeFaceGeometry(scale: number, style: 'pseudo3d' | 'blocky' | 'cylinder') {
  // Proportional plane envelope to fit the 512x512 canvas elements onto the head
  const planeW = 0.38 * scale;
  const planeH = 0.38 * scale;
  const isBlocky = style === 'blocky';
  const isCylinder = style === 'cylinder';

  const geom = new THREE.PlaneGeometry(planeW, planeH, 24, 12);
  const posAttr = geom.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);

    if (isBlocky) {
      posAttr.setZ(i, 0);
    } else if (isCylinder) {
      // Curve horizontally along head cylinder radius (r ~ 0.20 * scale)
      const r = 0.20 * scale;
      const radClamped = Math.min(r * 0.98, Math.abs(vx));
      const deltaZ = r - Math.sqrt(Math.max(0.0001, r * r - radClamped * radClamped));
      posAttr.setZ(i, -deltaZ * 1.05);
    } else {
      // Pseudo3D spherical curve along head sphere radius (r ~ 0.225 * scale)
      const r = 0.225 * scale;
      const distSq = vx * vx + vy * vy;
      const rSq = r * r;
      const deltaZ = distSq < rSq ? r - Math.sqrt(rSq - distSq) : 0.04 * scale;
      posAttr.setZ(i, -deltaZ * 1.08);
    }
  }

  geom.computeVertexNormals();
  return geom;
}

function getAnimeFaceZPosition(scale: number, style: 'pseudo3d' | 'blocky' | 'cylinder'): number {
  if (style === 'blocky') {
    return 0.146 * scale;
  } else if (style === 'cylinder') {
    return 0.207 * scale;
  } else {
    return 0.231 * scale;
  }
}

export function setupAnimeFace(ragdoll: Ragdoll3D): AnimeFaceData | null {
  const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
  if (!cabeza || !cabeza.voxelsGroup) return null;

  // 1. Remove old EyesGroup/Face meshes
  const oldEyes = cabeza.voxelsGroup.getObjectByName('EyesGroup');
  if (oldEyes) {
    cabeza.voxelsGroup.remove(oldEyes);
  }

  const oldFaceMesh = cabeza.voxelsGroup.getObjectByName('AnimeFaceMesh');
  if (oldFaceMesh) {
    cabeza.voxelsGroup.remove(oldFaceMesh);
    if (oldFaceMesh instanceof THREE.Mesh) {
      oldFaceMesh.geometry?.dispose();
      if (Array.isArray(oldFaceMesh.material)) oldFaceMesh.material.forEach((m) => m.dispose());
      else oldFaceMesh.material?.dispose();
    }
  }

  // Clean old face voxel blocks
  if (cabeza.voxelBlocks) {
    cabeza.voxelBlocks = cabeza.voxelBlocks.filter(
      (b) =>
        !b.id.startsWith('ojo_voxel_') &&
        b.id !== 'cabeza_eye_left' &&
        b.id !== 'cabeza_eye_right' &&
        b.id !== 'cabeza_mouth_ext'
    );
  }

  // 2. Create offscreen 2D Canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const eyeColorHex = (ragdoll as any).eyeColorHex ?? 0x0284c7;
  const hairColorHex = (ragdoll as any).hairColorHex ?? 0x1c1917;

  // Initial draw
  drawAnimeFaceCanvas(ctx, 'normal', 0, eyeColorHex, hairColorHex, 0, 0.0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const scale = ragdoll.scale ?? 1.0;
  const style = ragdoll.contourJointStyle || 'cylinder';

  // 3. Create front-facing curved decal geometry
  const faceGeom = createAnimeFaceGeometry(scale, style);
  const facePosZ = getAnimeFaceZPosition(scale, style);
  const facePosY = -0.010 * scale;

  const faceMat = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    roughness: 0.40,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -10.0,
    polygonOffsetUnits: -10.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const faceMesh = new THREE.Mesh(faceGeom, faceMat);
  faceMesh.name = 'AnimeFaceMesh';
  faceMesh.position.set(0, facePosY, facePosZ);
  faceMesh.renderOrder = 999;
  faceMesh.userData = { lastScale: scale, lastStyle: style };

  cabeza.voxelsGroup.add(faceMesh);

  const faceData: AnimeFaceData = {
    canvas,
    ctx,
    texture,
    mesh: faceMesh,
    expression: 'normal',
    eyeColorHex,
    blinkTimer: 1.5 + Math.random() * 2.5,
    blinkDuration: 0.15,
    blinkProgress: 0,
    isBlinking: false,
    painTimer: 0,
    blushTimer: 0,
    painVariant: 0,
    pleasureVariant: 0,
    blushLevel: 0,
    leftEyeBlink: 0,
    rightEyeBlink: 0,
    eyeDirectionX: 0,
    eyeDirectionY: 0,
    trembleIntensity: 0,
    mouthOpenness: 0,
    mouthShape: 'neutral',
    hasTears: false,
    hasSteam: false,
    lastDrawnExpression: 'normal',
    lastDrawnBlink: 0,
    lastDrawnFatigue: 0,
    lastDrawnPainVariant: 0,
    lastDrawnPleasureVariant: 0,
    lastDrawnBlushLevel: 0,
    lastDrawnLeftEyeBlink: 0,
    lastDrawnRightEyeBlink: 0,
    lastDrawnEyeDirectionX: 0,
    lastDrawnEyeDirectionY: 0,
    lastDrawnTremble: 0,
    lastDrawnMouthOpenness: 0,
    lastDrawnMouthShape: 'neutral',
    lastDrawnTears: false,
    lastDrawnSteam: false,
  };

  (ragdoll as any).faceData = faceData;
  return faceData;
}

/**
 * Updates blinking, expression states, timers, transitions pleasure/pain variants,
 * manages independent eye winks, and redraws the 2D canvas texture efficiently.
 */
export function updateAnimeFace(ragdoll: Ragdoll3D, dt: number) {
  let faceData: AnimeFaceData = (ragdoll as any).faceData;
  if (!faceData || !faceData.ctx) {
    const created = setupAnimeFace(ragdoll);
    if (!created || !created.ctx) return;
    faceData = created;
  }

  // 0.0 Consolidate any fallback timers set directly on the ragdoll object
  if ((ragdoll as any).painTimer !== undefined) {
    faceData.painTimer = Math.max(faceData.painTimer, (ragdoll as any).painTimer);
    delete (ragdoll as any).painTimer;
  }
  if ((ragdoll as any).blushTimer !== undefined) {
    faceData.blushTimer = Math.max(faceData.blushTimer, (ragdoll as any).blushTimer);
    delete (ragdoll as any).blushTimer;
  }

  // 0. Update geometry/position if style or scale changed
  const scale = ragdoll.scale ?? 1.0;
  const style = ragdoll.contourJointStyle || 'cylinder';
  const faceMode = ragdoll.faceFeatureMode || 'anime_canvas';

  if (faceData.mesh) {
    faceData.mesh.visible = faceMode === 'anime_canvas' || faceMode === 'hybrid';
    if (faceData.mesh.userData.lastScale !== scale || faceData.mesh.userData.lastStyle !== style) {
      faceData.mesh.geometry.dispose();
      faceData.mesh.geometry = createAnimeFaceGeometry(scale, style);
      faceData.mesh.position.set(0, 0.005 * scale, getAnimeFaceZPosition(scale, style));
      faceData.mesh.userData.lastScale = scale;
      faceData.mesh.userData.lastStyle = style;
    }
  }

  // 1. Update Expression Timers
  if (faceData.painTimer > 0) {
    faceData.painTimer -= dt;
  }

  if (faceData.blushTimer > 0) {
    faceData.blushTimer -= dt;
  }

  // 2. Determine Current Active Expression
  let targetExpr: AnimeExpression = 'normal';
  if (!ragdoll.isAlive || ragdoll.totalHealth <= 0 || (ragdoll as any).isSleeping) {
    targetExpr = 'dead';
  } else if (faceData.painTimer > 0) {
    targetExpr = 'pain';
  } else if (faceData.blushTimer > 0) {
    targetExpr = 'blush';
  }

  faceData.expression = targetExpr;

  // 2.5 Smooth Dynamic Blush Level Transitions & Continuous Micro-Animations
  (faceData as any).animTime = ((faceData as any).animTime ?? 0) + dt;
  const animTime = (faceData as any).animTime;

  if (targetExpr === 'blush') {
    // Increase blush level smoothly towards 1.0 in pleasure state
    faceData.blushLevel = Math.min(1.0, (faceData.blushLevel ?? 0) + dt * 0.85);

    // Continuous Panting Breath Cycle (mouth opening and closing in sighing rhythm)
    const panting = Math.sin(animTime * 7.5) * 0.5 + 0.5;
    faceData.mouthOpenness = 0.42 + panting * 0.48;
    faceData.mouthShape = faceData.pleasureVariant === 1 ? 'wavy' : (faceData.pleasureVariant === 2 ? 'happy' : 'pleasure');

    // Quivering Heavy-Lidded Eyelid Flutter (ecstatic quivering eyelids)
    const flutter = (Math.sin(animTime * 14.0) * 0.5 + 0.5) * 0.22;
    faceData.leftEyeBlink = flutter;
    faceData.rightEyeBlink = flutter;

    // Continuous Micro-Tremble Jitter
    faceData.trembleIntensity = 0.35 + 0.40 * (faceData.blushLevel ?? 0.5);

    // Dynamic Eye Rolling for Variant 1 (Ecstasy / Ahegao roll)
    if (faceData.pleasureVariant === 1) {
      faceData.eyeDirectionY = 0.72 + 0.12 * Math.sin(animTime * 2.5);
      faceData.eyeDirectionX = -0.10 + 0.05 * Math.cos(animTime * 3.0);
    } else {
      faceData.eyeDirectionY = 0.15 * Math.sin(animTime * 1.8);
      faceData.eyeDirectionX = 0;
    }

    // Always enable steam puffs/hearts and tears during pleasure
    faceData.hasSteam = true;
    faceData.hasTears = faceData.pleasureVariant === 1 || faceData.pleasureVariant === 2 || (faceData.blushLevel ?? 0) > 0.8;
  } else if (targetExpr === 'pain') {
    // Pain also causes a flustered/struggling blush smoothly rising to 0.6
    faceData.blushLevel = Math.min(0.6, (faceData.blushLevel ?? 0) + dt * 0.5);
    faceData.hasSteam = false;
  } else {
    // Cool down slowly back to normal (fade out blush over ~4 seconds)
    faceData.blushLevel = Math.max(0.0, (faceData.blushLevel ?? 0) - dt * 0.25);
    faceData.hasSteam = false;
  }

  // 3. Cycle & Transition Varied Pleasure / Pain Expressions Over Time
  if (targetExpr === 'blush') {
    if (faceData.pleasureVariant === undefined || faceData.pleasureVariant === 0) {
      faceData.pleasureVariant = Math.floor(Math.random() * 4); // Choose from 4 unique pleasure styles!
    }
    // Cycle pleasure expressions every 1.5s for dynamic transitions
    (faceData as any).pleasureCycleTimer = ((faceData as any).pleasureCycleTimer ?? 1.5) - dt;
    if ((faceData as any).pleasureCycleTimer <= 0) {
      (faceData as any).pleasureCycleTimer = 1.5;
      faceData.pleasureVariant = (faceData.pleasureVariant + 1) % 4;
    }
  } else {
    faceData.pleasureVariant = 0;
  }

  if (targetExpr === 'pain') {
    if (faceData.painVariant === undefined || faceData.painVariant === 0) {
      faceData.painVariant = Math.floor(Math.random() * 4); // Choose from 4 unique pain styles!
    }
    // Cycle pain expressions every 1.2s for rich, changing animations of agony
    (faceData as any).painCycleTimer = ((faceData as any).painCycleTimer ?? 1.2) - dt;
    if ((faceData as any).painCycleTimer <= 0) {
      (faceData as any).painCycleTimer = 1.2;
      faceData.painVariant = (faceData.painVariant + 1) % 4;
    }
  } else {
    faceData.painVariant = 0;
  }

  // 4. Update Natural Blinking Cycle
  if (targetExpr !== 'dead' && targetExpr !== 'pain') {
    faceData.blinkTimer -= dt;
    if (faceData.blinkTimer <= 0) {
      if (!faceData.isBlinking) {
        faceData.isBlinking = true;
        faceData.blinkProgress = 0;
      }
      const blinkSpeed = 1 / faceData.blinkDuration;
      faceData.blinkProgress += dt * blinkSpeed * 2;

      if (faceData.blinkProgress >= 2.0) {
        faceData.isBlinking = false;
        faceData.blinkProgress = 0;
        faceData.blinkTimer = 2.0 + Math.random() * 3.5; // Next natural blink
      }
    }
  } else {
    faceData.isBlinking = false;
    faceData.blinkProgress = 0;
  }

  let effectiveBlink = 0;
  if (faceData.isBlinking) {
    effectiveBlink =
      faceData.blinkProgress <= 1.0
        ? faceData.blinkProgress
        : 2.0 - faceData.blinkProgress;
    effectiveBlink = Math.max(0, Math.min(1, effectiveBlink));
  }

  // 5. Asynchronous Eye Winks (Single-eye blinks) for Rich Detail
  if (targetExpr === 'normal' || targetExpr === 'blush') {
    (faceData as any).winkTimer = ((faceData as any).winkTimer ?? (3.5 + Math.random() * 6.5)) - dt;
    if ((faceData as any).winkTimer <= 0) {
      (faceData as any).isWinking = true;
      (faceData as any).winkDuration = 0.45;
      (faceData as any).winkProgress = 0;
      (faceData as any).winkEye = Math.random() < 0.5 ? 'left' : 'right';
      (faceData as any).winkTimer = 7.0 + Math.random() * 12.0; // Trigger again in 7-19s
    }

    if ((faceData as any).isWinking) {
      (faceData as any).winkProgress += dt / (faceData as any).winkDuration;
      if ((faceData as any).winkProgress >= 1.0) {
        (faceData as any).isWinking = false;
        faceData.leftEyeBlink = 0;
        faceData.rightEyeBlink = 0;
      } else {
        const winkVal = Math.sin((faceData as any).winkProgress * Math.PI);
        if ((faceData as any).winkEye === 'left') {
          faceData.leftEyeBlink = winkVal;
          faceData.rightEyeBlink = 0;
        } else {
          faceData.rightEyeBlink = winkVal;
          faceData.leftEyeBlink = 0;
        }
      }
    } else {
      faceData.leftEyeBlink = 0;
      faceData.rightEyeBlink = 0;
    }
  } else {
    faceData.leftEyeBlink = 0;
    faceData.rightEyeBlink = 0;
  }

  // Combine blink, fatigue/droopiness, and wink overrides
  const rFatigue = ragdoll.fatigue ?? 0.0;
  const baseBlink = Math.max(effectiveBlink, rFatigue);

  const finalLeftBlink = Math.max(baseBlink, faceData.leftEyeBlink ?? 0);
  const finalRightBlink = Math.max(baseBlink, faceData.rightEyeBlink ?? 0);

  // Decoupled quantization for cached state comparisons
  const leftBlinkQ = Math.round(finalLeftBlink * 8) / 8;
  const rightBlinkQ = Math.round(finalRightBlink * 8) / 8;
  const fatigueQ = Math.round(rFatigue * 8) / 8;
  const blushLevelQ = Math.round((faceData.blushLevel ?? 0) * 8) / 8;
  const eyeDirXQ = Math.round((faceData.eyeDirectionX ?? 0) * 8) / 8;
  const eyeDirYQ = Math.round((faceData.eyeDirectionY ?? 0) * 8) / 8;
  const trembleQ = Math.round((faceData.trembleIntensity ?? 0) * 8) / 8;
  const mouthOpenQ = Math.round((faceData.mouthOpenness ?? 0) * 8) / 8;

  // We redraw if any parameter value has changed
  const stateChanged =
    faceData.lastDrawnExpression !== faceData.expression ||
    faceData.lastDrawnLeftEyeBlink !== leftBlinkQ ||
    faceData.lastDrawnRightEyeBlink !== rightBlinkQ ||
    faceData.lastDrawnFatigue !== fatigueQ ||
    faceData.lastDrawnPainVariant !== faceData.painVariant ||
    faceData.lastDrawnPleasureVariant !== faceData.pleasureVariant ||
    faceData.lastDrawnBlushLevel !== blushLevelQ ||
    faceData.lastDrawnEyeDirectionX !== eyeDirXQ ||
    faceData.lastDrawnEyeDirectionY !== eyeDirYQ ||
    faceData.lastDrawnTremble !== trembleQ ||
    faceData.lastDrawnMouthOpenness !== mouthOpenQ ||
    faceData.lastDrawnMouthShape !== faceData.mouthShape ||
    faceData.lastDrawnTears !== faceData.hasTears ||
    faceData.lastDrawnSteam !== faceData.hasSteam ||
    // Always redraw on trembling expressions so the jitter is fully animated
    faceData.expression === 'blush' ||
    (faceData.expression === 'pain' && (faceData.painVariant === 1 || faceData.painVariant === 0));

  const is3DActive = (ragdoll.faceFeatureMode && ragdoll.faceFeatureMode !== 'anime_canvas');
  if (is3DActive) {
    // In 3D feature mode, clear canvas so head has no duplicate 2D drawn eyes/mouth/eyebrows underneath!
    if (faceData.lastDrawnExpression !== 'cleared_for_3d') {
      if (faceData.ctx) {
        faceData.ctx.clearRect(0, 0, 256, 256);
      }
      if (faceData.texture) {
        faceData.texture.needsUpdate = true;
      }
      faceData.lastDrawnExpression = 'cleared_for_3d';
    }
  } else if (stateChanged && faceData.ctx) {
    const hairColorHex = (ragdoll as any).hairColorHex ?? 0x1c1917;
    drawAnimeFaceCanvas(
      faceData.ctx,
      faceData.expression,
      effectiveBlink,
      faceData.eyeColorHex,
      hairColorHex,
      faceData.painVariant ?? 0,
      rFatigue,
      faceData.blushLevel ?? 0,
      finalLeftBlink,
      finalRightBlink,
      faceData.pleasureVariant ?? 0,
      faceData.eyeDirectionX ?? 0,
      faceData.eyeDirectionY ?? 0,
      faceData.trembleIntensity ?? 0,
      faceData.mouthOpenness ?? 0,
      faceData.mouthShape,
      faceData.hasTears ?? false,
      faceData.hasSteam ?? false
    );
    faceData.texture.needsUpdate = true;
    faceData.lastDrawnExpression = faceData.expression;
    faceData.lastDrawnLeftEyeBlink = leftBlinkQ;
    faceData.lastDrawnRightEyeBlink = rightBlinkQ;
    faceData.lastDrawnFatigue = fatigueQ;
    faceData.lastDrawnPainVariant = faceData.painVariant;
    faceData.lastDrawnPleasureVariant = faceData.pleasureVariant;
    faceData.lastDrawnBlushLevel = blushLevelQ;
    faceData.lastDrawnEyeDirectionX = eyeDirXQ;
    faceData.lastDrawnEyeDirectionY = eyeDirYQ;
    faceData.lastDrawnTremble = trembleQ;
    faceData.lastDrawnMouthOpenness = mouthOpenQ;
    faceData.lastDrawnMouthShape = faceData.mouthShape;
    faceData.lastDrawnTears = faceData.hasTears;
    faceData.lastDrawnSteam = faceData.hasSteam;
  }

  // 6. Update 3D Voxel / Pseudo face meshes and floating depth animations
  updateVoxel3DFace(ragdoll, faceData, dt);
}
