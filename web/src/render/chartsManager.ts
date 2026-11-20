/**
 * Administrador de Gráficas Científicas con Chart.js (En Español)
 */
import {
  Chart,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { SimulationResult } from '../types.ts';
import { MATERIALS } from '../constants.ts';
import { computeSkinDepth, computeSurfaceResistance } from '../physics/skinEffect.ts';
import { runInductionSimulation } from '../physics/simulationEngine.ts';

// Registrar componentes de Chart.js
Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export class ChartsManager {
  private currentDensityChart!: Chart;
  private heatDensityChart!: Chart;
  private _skinDepthChart!: Chart; // gráfico estático (δ vs f), no requiere update()
  private surfaceRChart!: Chart;
  private powerBreakdownChart!: Chart;

  constructor() {
    this.initCurrentDensityChart();
    this.initHeatDensityChart();
    this.initSkinDepthChart();
    this.initSurfaceRChart();
    this.initPowerBreakdownChart();
  }

  private initCurrentDensityChart() {
    const ctx = (document.getElementById('chartCurrentDensity') as HTMLCanvasElement).getContext('2d')!;
    this.currentDensityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Densidad Superficial |K_θ(r)| [kA/m]',
          data: [],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#334155' } } },
        scales: {
          x: {
            title: { display: true, text: 'Radio del Recipiente r [mm]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569', maxTicksLimit: 8 }
          },
          y: {
            title: { display: true, text: 'Densidad de Corriente [kA/m]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          }
        }
      }
    });
  }

  private initHeatDensityChart() {
    const ctx = (document.getElementById('chartHeatDensity') as HTMLCanvasElement).getContext('2d')!;
    this.heatDensityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Densidad Térmica Local p_eddy(r) [kW/m²]',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#334155' } } },
        scales: {
          x: {
            title: { display: true, text: 'Radio del Recipiente r [mm]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569', maxTicksLimit: 8 }
          },
          y: {
            title: { display: true, text: 'Disipación Térmica [kW/m²]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          }
        }
      }
    });
  }

  private initSkinDepthChart() {
    const ctx = (document.getElementById('chartSkinDepth') as HTMLCanvasElement).getContext('2d')!;
    const freqs = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
    const colors = ['#0284c7', '#16a34a', '#fb923c', '#9333ea', '#dc2626', '#d97706'];

    const datasets = Object.values(MATERIALS).map((mat, idx) => ({
      label: mat.name.replace('Acero Inoxidable ', 'Inox ').replace('Acero al Carbono', 'Carbono'),
      data: freqs.map(f => computeSkinDepth(f * 1e3, mat.mu_r, mat.sigma) * 1e3),
      borderColor: colors[idx % colors.length],
      borderWidth: 2.0,
      tension: 0.3,
      pointRadius: 2.5
    }));

    this._skinDepthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: freqs.map(f => `${f} kHz`),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#334155', boxWidth: 12 } } },
        scales: {
          x: {
            title: { display: true, text: 'Frecuencia de Operación f', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          },
          y: {
            type: 'logarithmic',
            title: { display: true, text: 'Profundidad de Penetración δ [mm]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          }
        }
      }
    });
  }

  private initSurfaceRChart() {
    const ctx = (document.getElementById('chartSurfaceR') as HTMLCanvasElement).getContext('2d')!;
    this.surfaceRChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Resistencia Superficial Rs [mΩ/cuadrado]',
          data: [],
          backgroundColor: ['#0284c7', '#16a34a', '#fb923c', '#9333ea', '#dc2626', '#475569'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } },
          y: {
            title: { display: true, text: 'Rs [mΩ/□]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          }
        }
      }
    });
  }

  private initPowerBreakdownChart() {
    const ctx = (document.getElementById('chartPowerBreakdown') as HTMLCanvasElement).getContext('2d')!;
    this.powerBreakdownChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { label: 'Calor Corrientes Foucault [W]', data: [], backgroundColor: '#0284c7', borderRadius: 2 },
          { label: 'Calor Histéresis Magnética [W]', data: [], backgroundColor: '#fb923c', borderRadius: 2 },
          { label: 'Pérdidas Bobina Primaria [W]', data: [], backgroundColor: '#64748b', borderRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#334155', boxWidth: 12 } } },
        scales: {
          x: { stacked: true, ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } },
          y: {
            stacked: true,
            title: { display: true, text: 'Potencia Disipada [W]', color: '#475569' },
            grid: { color: 'rgba(15, 23, 42, 0.08)' },
            ticks: { color: '#475569' }
          }
        }
      }
    });
  }

  public update(res: SimulationResult) {
    // 1. Densidad de Corriente
    this.currentDensityChart.data.labels = res.profiles.r_mm.map(r => r.toFixed(1));
    this.currentDensityChart.data.datasets[0].data = res.profiles.k_theta_ka_m;
    this.currentDensityChart.update('none');

    // 2. Densidad Térmica
    this.heatDensityChart.data.labels = res.profiles.r_mm.map(r => r.toFixed(1));
    this.heatDensityChart.data.datasets[0].data = res.profiles.power_density_kw_m2;
    this.heatDensityChart.update('none');

    // 3. Resistencia Superficial
    const matList = Object.values(MATERIALS);
    this.surfaceRChart.data.labels = matList.map(m => m.name.replace('Acero Inoxidable ', 'Inox ').replace('Acero al Carbono', 'Carbono'));
    this.surfaceRChart.data.datasets[0].data = matList.map(m => computeSurfaceResistance(res.operating.frequency, m.mu_r, m.sigma) * 1e3);
    this.surfaceRChart.update('none');

    // 4. Distribución de Pérdidas y Potencia
    const eddyVals: number[] = [];
    const hystVals: number[] = [];
    const coilVals: number[] = [];

    const coilParams = {
      r_in: res.coil.r_in,
      r_out: res.coil.r_out,
      num_turns: res.coil.num_turns,
      num_strands: 120,
      strand_diameter: 0.2e-3,
      ferrite_factor: 1.35
    };
    const opParams = {
      frequency: res.operating.frequency,
      I_rms: res.operating.I_rms,
      z_pan: res.operating.z_pan,
      pan_radius: res.operating.pan_radius
    };

    for (const m of matList) {
      const sim = runInductionSimulation(coilParams, opParams, m);
      eddyVals.push(sim.powers.p_eddy_w);
      hystVals.push(sim.powers.p_hyst_w);
      coilVals.push(sim.powers.p_coil_loss_w);
    }

    this.powerBreakdownChart.data.labels = matList.map(m => m.name.replace('Acero Inoxidable ', 'Inox ').replace('Acero al Carbono', 'Carbono'));
    this.powerBreakdownChart.data.datasets[0].data = eddyVals;
    this.powerBreakdownChart.data.datasets[1].data = hystVals;
    this.powerBreakdownChart.data.datasets[2].data = coilVals;
    this.powerBreakdownChart.update('none');
  }
}
