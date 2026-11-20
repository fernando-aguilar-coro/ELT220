/**
 * 2D Top-Down Archimedean Spiral Pancake Coil Canvas Renderer
 */
import { SimulationResult } from '../types.ts';

export class SpiralCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public render(res: SimulationResult) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Scale so outer radius fits comfortably
    const maxDrawRadius = Math.min(width, height) * 0.42;
    const scale = maxDrawRadius / res.coil.r_out;

    // 1. Draw Cookware Plate Outline (Ghost circle)
    const panDrawRadius = res.operating.pan_radius * scale;
    ctx.beginPath();
    ctx.arc(centerX, centerY, panDrawRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw Radial Ferrite Bars (underneath, 8 radial bars)
    ctx.fillStyle = 'rgba(75, 85, 99, 0.45)';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1.0;
    const numBars = 8;
    for (let b = 0; b < numBars; b++) {
      const angle = (b * 2 * Math.PI) / numBars;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      const barInner = (res.coil.r_in - 0.005) * scale;
      const barLen = (res.coil.radialDepth + 0.015) * scale;
      ctx.fillRect(barInner, -6, barLen, 12);
      ctx.strokeRect(barInner, -6, barLen, 12);
      ctx.restore();
    }

    // 3. Draw Continuous Archimedean Spiral
    const totalAngle = 2 * Math.PI * res.coil.num_turns;
    const steps = res.coil.num_turns * 120;
    const dTheta = totalAngle / steps;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i <= steps; i++) {
      const theta = i * dTheta;
      const r = res.coil.r_in + (res.coil.radialDepth / totalAngle) * theta;
      const px = centerX + r * scale * Math.cos(theta);
      const py = centerY + r * scale * Math.sin(theta);

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    // Glow effect
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 4. Central Terminal and Outer Terminal markers
    const innerX = centerX + res.coil.r_in * scale;
    const innerY = centerY;
    ctx.beginPath();
    ctx.arc(innerX, innerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    const outerTheta = totalAngle;
    const outerR = res.coil.r_out;
    const outerX = centerX + outerR * scale * Math.cos(outerTheta);
    const outerY = centerY + outerR * scale * Math.sin(outerTheta);
    ctx.beginPath();
    ctx.arc(outerX, outerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    // 5. Annotations
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`Cookware Base Perimeter (Ø ${(res.operating.pan_radius * 2e3).toFixed(0)} mm)`, centerX - 85, centerY - panDrawRadius - 8);
    ctx.fillText(`Coil Outer Ø ${(res.coil.r_out * 2e3).toFixed(0)} mm`, outerX + 10, outerY + 4);
    ctx.fillText(`Inner Ø ${(res.coil.r_in * 2e3).toFixed(0)} mm`, innerX - 60, innerY - 8);
  }
}
