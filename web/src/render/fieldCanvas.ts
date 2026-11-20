/**
 * 2D Magnetic Field Heatmap and Vector Streamlines Canvas Renderer
 */
import { SimulationResult } from '../types.ts';
import { computeFieldGrid2D, singleFilamentBField } from '../physics/biotSavart.ts';

export class FieldCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tooltip: HTMLElement;

  private currentResult: SimulationResult | null = null;
  private showVectors: boolean = true;
  private showHeatmap: boolean = true;
  private showAnnotations: boolean = true;

  // Viewport bounds in physical units [m]
  private rMin = 0.0;
  private rMax = 0.135;  // 135 mm
  private zMin = -0.015; // -15 mm
  private zMax = 0.038;  // +38 mm

  constructor(canvas: HTMLCanvasElement, tooltip: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.tooltip = tooltip;
    this.setupInteractivity();
  }

  public setToggles(vectors: boolean, heatmap: boolean, annotations: boolean) {
    this.showVectors = vectors;
    this.showHeatmap = heatmap;
    this.showAnnotations = annotations;
    if (this.currentResult) this.render(this.currentResult);
  }

  public render(res: SimulationResult) {
    this.currentResult = res;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Coordinate transforms: world (r, z) -> screen (x, y)
    const toScreenX = (r: number) => ((r - this.rMin) / (this.rMax - this.rMin)) * (width - 60) + 45;
    const toScreenY = (z: number) => height - 35 - ((z - this.zMin) / (this.zMax - this.zMin)) * (height - 60);

    // Compute grid data for B-field
    const grid = computeFieldGrid2D(
      res.coil.filamentRadii,
      res.operating.I_peak,
      1.35,
      this.rMax,
      this.zMin,
      this.zMax,
      44,
      34
    );

    // 1. Draw Heatmap
    if (this.showHeatmap) {
      const maxBVal = 0.022; // 22 mT scale
      const nr = grid.rCoords.length;
      const nz = grid.zCoords.length;

      for (let i = 0; i < nz - 1; i++) {
        const z0 = grid.zCoords[i];
        const z1 = grid.zCoords[i + 1];
        const y0 = toScreenY(z1);
        const y1 = toScreenY(z0);
        const blockH = Math.max(1, y1 - y0);

        for (let j = 0; j < nr - 1; j++) {
          const r0 = grid.rCoords[j];
          const r1 = grid.rCoords[j + 1];
          const x0 = toScreenX(r0);
          const x1 = toScreenX(r1);
          const blockW = Math.max(1, x1 - x0);

          const bVal = 0.25 * (grid.bMag[i][j] + grid.bMag[i + 1][j] + grid.bMag[i][j + 1] + grid.bMag[i + 1][j + 1]);
          const norm = Math.min(1.0, bVal / maxBVal);

          ctx.fillStyle = this.getTurboColor(norm);
          ctx.fillRect(x0, y0, blockW + 0.8, blockH + 0.8);
        }
      }
    } else {
      ctx.fillStyle = '#e8edf3';
      ctx.fillRect(45, 20, width - 60, height - 55);
    }

    // 2. Draw Vector Arrows
    if (this.showVectors) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.lineWidth = 1.0;

      const stepR = 3;
      const stepZ = 3;
      for (let i = 2; i < grid.zCoords.length - 1; i += stepZ) {
        const z = grid.zCoords[i];
        const py = toScreenY(z);

        for (let j = 2; j < grid.rCoords.length - 1; j += stepR) {
          const r = grid.rCoords[j];
          const px = toScreenX(r);

          const br = grid.bR[i][j];
          const bz = grid.bZ[i][j];
          const mag = grid.bMag[i][j];

          if (mag > 1e-5) {
            const dirX = br / mag;
            const dirY = -bz / mag; // Screen y is inverted
            const len = Math.min(16, 6 + (mag / 0.02) * 12);

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + dirX * len, py + dirY * len);
            ctx.stroke();

            // Arrowhead
            const arrowAngle = Math.atan2(dirY, dirX);
            ctx.beginPath();
            ctx.moveTo(px + dirX * len, py + dirY * len);
            ctx.lineTo(
              px + dirX * len - 4 * Math.cos(arrowAngle - Math.PI / 6),
              py + dirY * len - 4 * Math.sin(arrowAngle - Math.PI / 6)
            );
            ctx.lineTo(
              px + dirX * len - 4 * Math.cos(arrowAngle + Math.PI / 6),
              py + dirY * len - 4 * Math.sin(arrowAngle + Math.PI / 6)
            );
            ctx.fill();
          }
        }
      }
    }

    // 3. Draw Physical Geometry Overlays
    // (a) Ferrite Bars (z < 0)
    const fx0 = toScreenX(0.015);
    const fx1 = toScreenX(res.coil.r_out + 0.01);
    const fy0 = toScreenY(-0.002);
    const fy1 = toScreenY(-0.011);
    ctx.fillStyle = 'rgba(55, 65, 81, 0.75)';
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);

    // (b) Ceramic Glass Top (0 to 4 mm)
    const gx0 = toScreenX(0.0);
    const gx1 = toScreenX(this.rMax);
    const gy0 = toScreenY(0.004);
    const gy1 = toScreenY(0.0);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

    // (c) Cookware Base Plate (z = z_pan, thickness = 3 mm)
    const px0 = toScreenX(0.0);
    const px1 = toScreenX(res.operating.pan_radius);
    const pyTop = toScreenY(res.operating.z_pan + 0.0035);
    const pyBot = toScreenY(res.operating.z_pan);
    ctx.fillStyle = res.material.isFerromagnetic ? 'rgba(239, 68, 68, 0.55)' : 'rgba(148, 163, 184, 0.45)';
    ctx.strokeStyle = res.material.isFerromagnetic ? '#ef4444' : '#94a3b8';
    ctx.lineWidth = 2.0;
    ctx.fillRect(px0, pyTop, px1 - px0, pyBot - pyTop);
    ctx.strokeRect(px0, pyTop, px1 - px0, pyBot - pyTop);

    // (d) Coil Turns (copper circular cross-sections at z=0)
    for (const r_k of res.coil.filamentRadii) {
      const cx = toScreenX(r_k);
      const cy = toScreenY(0.0);
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Current direction symbol (dot)
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    // 4. Annotations & Labels
    if (this.showAnnotations) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px system-ui, sans-serif';

      ctx.fillText(`Cookware: ${res.material.name} (z = ${(res.operating.z_pan * 1e3).toFixed(1)} mm)`, px0 + 10, pyTop - 6);
      ctx.fillText('Ceramic Glass (4 mm)', gx0 + 10, gy0 + 14);
      ctx.fillText(`Planar Spiral Coil (${res.coil.num_turns} turns, z = 0)`, toScreenX(res.coil.r_in), toScreenY(0.0) + 16);
      ctx.fillText('Ferrite Magnetic Shield (z < 0)', fx0 + 10, fy0 + 15);
    }

    // Axes & Scale markings
    this.renderAxes(ctx, width, height, toScreenX, toScreenY);
  }

  private renderAxes(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    toScreenX: (r: number) => number,
    toScreenY: (z: number) => number
  ) {
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.lineWidth = 1;

    // R-axis
    ctx.beginPath();
    ctx.moveTo(45, height - 35);
    ctx.lineTo(width - 15, height - 35);
    ctx.stroke();

    for (let r = 0; r <= 120; r += 20) {
      const sx = toScreenX(r * 1e-3);
      ctx.beginPath();
      ctx.moveTo(sx, height - 35);
      ctx.lineTo(sx, height - 30);
      ctx.stroke();
      ctx.fillText(`${r}`, sx - 8, height - 18);
    }
    ctx.fillText('Radial Distance r [mm]', width / 2 - 40, height - 5);

    // Z-axis
    ctx.beginPath();
    ctx.moveTo(45, 20);
    ctx.lineTo(45, height - 35);
    ctx.stroke();

    for (let z = -10; z <= 30; z += 10) {
      const sy = toScreenY(z * 1e-3);
      ctx.beginPath();
      ctx.moveTo(40, sy);
      ctx.lineTo(45, sy);
      ctx.stroke();
      ctx.fillText(`${z}`, 16, sy + 3);
    }

    ctx.save();
    ctx.translate(12, height / 2 + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Axial z [mm]', 0, 0);
    ctx.restore();
  }

  private getTurboColor(t: number): string {
    // Smooth magma/inferno color mapping
    const r = Math.floor(255 * Math.min(1.0, Math.max(0.0, 1.5 * t)));
    const g = Math.floor(255 * Math.min(1.0, Math.max(0.0, 1.8 * Math.pow(t, 2))));
    const b = Math.floor(255 * Math.min(1.0, Math.max(0.0, 0.4 * Math.sin(t * Math.PI))));
    return `rgba(${r}, ${g}, ${b}, 0.88)`;
  }

  private setupInteractivity() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.currentResult) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Inverse transform to world coordinates
      const r = this.rMin + ((mouseX - 45) / (this.canvas.width - 60)) * (this.rMax - this.rMin);
      const z = this.zMin + ((this.canvas.height - 35 - mouseY) / (this.canvas.height - 60)) * (this.zMax - this.zMin);

      if (r >= 0 && r <= this.rMax && z >= this.zMin && z <= this.zMax) {
        let brTot = 0.0;
        let bzTot = 0.0;
        for (const a_k of this.currentResult.coil.filamentRadii) {
          const f = singleFilamentBField(a_k, this.currentResult.operating.I_peak, r, z);
          brTot += f.b_r;
          bzTot += f.b_z;
        }
        brTot *= 1.35;
        bzTot *= 1.35;
        const bMag = Math.sqrt(brTot * brTot + bzTot * bzTot);

        this.tooltip.classList.remove('hidden');
        if (document.documentElement.classList.contains('app-scaled')) {
          // Con transform: scale en #app, position:fixed queda relativo a #app;
          // hay que convertir coordenadas visuales a unidades locales pre-escala
          const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1;
          const appRect = document.getElementById('app')!.getBoundingClientRect();
          this.tooltip.style.left = `${(e.clientX + 15 - appRect.left) / scale}px`;
          this.tooltip.style.top = `${(e.clientY - 20 - appRect.top) / scale}px`;
        } else {
          this.tooltip.style.left = `${e.clientX + 15}px`;
          this.tooltip.style.top = `${e.clientY - 20}px`;
        }
        this.tooltip.innerHTML = `
          <div class="tooltip-title">Field Probe</div>
          <div>r: ${(r * 1e3).toFixed(1)} mm | z: ${(z * 1e3).toFixed(1)} mm</div>
          <div>|B|: <strong>${(bMag * 1e3).toFixed(2)} mT</strong></div>
          <div>B<sub>r</sub>: ${(brTot * 1e3).toFixed(2)} mT | B<sub>z</sub>: ${(bzTot * 1e3).toFixed(2)} mT</div>
        `;
      } else {
        this.tooltip.classList.add('hidden');
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.tooltip.classList.add('hidden');
    });
  }
}

