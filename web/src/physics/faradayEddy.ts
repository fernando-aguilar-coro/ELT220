/**
 * Faraday-Lenz Law Formulation: Induced Eddy Currents & Joule Dissipation
 */
import { MU_0 } from '../constants.ts';
import { computeTotalCoilBField } from './biotSavart.ts';

export interface EddyAnalysisResult {
  p_eddy: number;
  r_reflected: number;
  x_reflected: number;
  r_vals: number[];
  b_z_rms: number[];
  b_mag_peak: number[];
  k_theta_rms: number[];
  j_surface_rms: number[];
  power_density_eddy: number[];
}

/**
 * Computes radial flux linkage, annular loop currents, and eddy dissipation
 */
export function computeFaradayEddyCurrents(
  filamentRadii: number[],
  I_peak: number,
  I_rms: number,
  frequency: number,
  r_s: number,
  delta: number,
  mu_r: number,
  z_pan: number,
  pan_radius: number,
  l_1: number,
  l_2: number,
  r_2: number,
  k_coupling: number,
  ferriteFactor: number,
  numRadialPoints: number = 80
): EddyAnalysisResult {
  const omega = 2.0 * Math.PI * frequency;
  const muBoost = 1.0 + 0.18 * Math.tanh((mu_r - 1.0) / 40.0);

  // 1. Reflected Impedance from Coupled Transformer Secondary
  const m_mutual = k_coupling * Math.sqrt(l_1 * l_2);
  const omega_l2 = omega * l_2;
  const z_2_sq = r_2 * r_2 + omega_l2 * omega_l2;

  const r_reflected = (omega * omega * m_mutual * m_mutual * r_2) / z_2_sq;
  const x_reflected = (omega * omega * m_mutual * m_mutual * omega_l2) / z_2_sq;
  const p_eddy = I_rms * I_rms * r_reflected;

  // 2. Spatial Radial Distribution
  const r_vals: number[] = [];
  const b_z_rms: number[] = [];
  const b_mag_peak: number[] = [];
  const dr = pan_radius / numRadialPoints;

  for (let i = 0; i < numRadialPoints; i++) {
    const r = (i + 0.5) * dr;
    r_vals.push(r);

    const { b_z, b_mag } = computeTotalCoilBField(filamentRadii, I_peak, r, z_pan, ferriteFactor * muBoost);
    b_mag_peak.push(b_mag);
    b_z_rms.push(b_z / Math.SQRT2);
  }

  // Cumulative flux: \Phi(r) = \int_0^r 2\pi r' B_z(r') dr'
  let cumulativeFlux = 0.0;
  const e_theta_rms: number[] = [];
  for (let i = 0; i < numRadialPoints; i++) {
    const r = r_vals[i];
    cumulativeFlux += 2.0 * Math.PI * r * b_z_rms[i] * dr;
    // Induced EMF per unit length: E_\theta = \omega \Phi / (2\pi r)
    e_theta_rms.push((omega * cumulativeFlux) / (2.0 * Math.PI * r));
  }

  // Local power density shaping
  const rawPowerDensity: number[] = [];
  let rawIntegral = 0.0;
  for (let i = 0; i < numRadialPoints; i++) {
    const r = r_vals[i];
    const annulus_l = MU_0 * r * 1.5;
    const local_z_sq = r_s * r_s + Math.pow(omega * annulus_l, 2);
    const shape = e_theta_rms[i] / Math.sqrt(local_z_sq);
    const pLocal = r_s * shape * shape;
    rawPowerDensity.push(pLocal);
    rawIntegral += 2.0 * Math.PI * r * pLocal * dr;
  }

  const normFactor = rawIntegral > 0 ? p_eddy / rawIntegral : 1.0;
  const power_density_eddy = rawPowerDensity.map(p => p * normFactor);
  const k_theta_rms = power_density_eddy.map(p => Math.sqrt(p / Math.max(r_s, 1e-9)));
  const j_surface_rms = k_theta_rms.map(k => (delta > 0 && isFinite(delta) ? k / delta : 0));

  return {
    p_eddy,
    r_reflected,
    x_reflected,
    r_vals,
    b_z_rms,
    b_mag_peak,
    k_theta_rms,
    j_surface_rms,
    power_density_eddy
  };
}
