/**
 * Master Simulation Engine for Induction Cooktop Design
 * Fully orchestrates Maxwell-based calculations across all modules.
 */
import { CoilParams, Material, OperatingParams, SimulationResult } from '../types.ts';
import { computeWheelerInductance, computeSecondaryInductance, computeCouplingCoefficient } from './inductance.ts';
import { computeSkinDepth, computeSurfaceResistance, computeLitzACResistance } from './skinEffect.ts';
import { computeFaradayEddyCurrents } from './faradayEddy.ts';
import { computeHysteresisLoss } from './hysteresis.ts';

export function runInductionSimulation(
  coil: CoilParams,
  op: OperatingParams,
  material: Material
): SimulationResult {
  const omega = 2.0 * Math.PI * op.frequency;
  const I_peak = op.I_rms * Math.SQRT2;

  // Geometry parameters
  const meanRadius = 0.5 * (coil.r_in + coil.r_out);
  const radialDepth = coil.r_out - coil.r_in;
  const totalLength = Math.PI * coil.num_turns * (coil.r_in + coil.r_out);
  const pitch = radialDepth / coil.num_turns;

  // Discrete concentric turns for Biot-Savart superposition
  const filamentRadii: number[] = [];
  for (let k = 1; k <= coil.num_turns; k++) {
    filamentRadii.push(coil.r_in + (k - 0.5) * pitch);
  }

  // 1. Primary Coil Parameters
  const l_1 = computeWheelerInductance(coil.r_in, coil.r_out, coil.num_turns, coil.ferrite_factor);
  const r_1 = computeLitzACResistance(totalLength, coil.num_strands, coil.strand_diameter, op.frequency);

  // 2. Material Skin & Secondary Loop Parameters
  const delta = computeSkinDepth(op.frequency, material.mu_r, material.sigma);
  const r_s = computeSurfaceResistance(op.frequency, material.mu_r, material.sigma);

  const r_mean_pan = Math.min(meanRadius * 1.15, op.pan_radius * 0.75);
  const effectiveWidth = radialDepth * 1.1;
  const l_2 = computeSecondaryInductance(r_mean_pan, effectiveWidth);

  const geomFactor = (2.0 * Math.PI * r_mean_pan) / effectiveWidth;
  const r_2 = geomFactor * r_s;

  const k_coupling = computeCouplingCoefficient(op.z_pan, meanRadius, material.mu_r);
  const m_mutual = k_coupling * Math.sqrt(l_1 * l_2);

  // 3. Faraday-Lenz Eddy Current Analysis
  const eddyRes = computeFaradayEddyCurrents(
    filamentRadii,
    I_peak,
    op.I_rms,
    op.frequency,
    r_s,
    delta,
    material.mu_r,
    op.z_pan,
    op.pan_radius,
    l_1,
    l_2,
    r_2,
    k_coupling,
    coil.ferrite_factor,
    80
  );

  // 4. Hysteresis Losses (Steinmetz)
  const hystRes = computeHysteresisLoss(
    material,
    op.frequency,
    eddyRes.b_mag_peak,
    op.pan_radius,
    delta
  );

  // 5. Global Power Balance & Equivalent Circuit
  const p_coil_loss = op.I_rms * op.I_rms * r_1;
  const total_pan_power = eddyRes.p_eddy + hystRes.p_hyst;
  const total_system_power = total_pan_power + p_coil_loss;
  const efficiency_pct = total_system_power > 0 ? (total_pan_power / total_system_power) * 100.0 : 0.0;
  const r_equivalent = r_1 + eddyRes.r_reflected + (op.I_rms > 0 ? hystRes.p_hyst / (op.I_rms * op.I_rms) : 0);

  return {
    coil: {
      r_in: coil.r_in,
      r_out: coil.r_out,
      num_turns: coil.num_turns,
      meanRadius,
      radialDepth,
      totalLength,
      pitch,
      l_1,
      r_1,
      filamentRadii
    },
    operating: {
      ...op,
      I_peak,
      omega
    },
    material,
    electromagnetic: {
      skin_depth_m: delta,
      skin_depth_mm: delta * 1e3,
      surface_resistance_ohm_sq: r_s,
      l_2_uh: l_2 * 1e6,
      r_2_mohm: r_2 * 1e3,
      m_mutual_uh: m_mutual * 1e6,
      coupling_factor_k: k_coupling,
      avg_b_peak_mt: hystRes.avg_b_peak * 1e3,
      max_b_peak_mt: Math.max(...eddyRes.b_mag_peak) * 1e3,
      b_internal_peak_t: hystRes.b_internal_peak
    },
    powers: {
      p_eddy_w: eddyRes.p_eddy,
      p_hyst_w: hystRes.p_hyst,
      total_pan_power_w: total_pan_power,
      p_coil_loss_w: p_coil_loss,
      total_system_power_w: total_system_power,
      r_reflected_ohm: eddyRes.r_reflected,
      x_reflected_ohm: eddyRes.x_reflected,
      r_equivalent_ohm: r_equivalent,
      efficiency_pct
    },
    profiles: {
      r_mm: eddyRes.r_vals.map(r => r * 1e3),
      b_z_rms_mt: eddyRes.b_z_rms.map(b => b * 1e3),
      k_theta_ka_m: eddyRes.k_theta_rms.map(k => k / 1e3),
      j_surface_ma_m2: eddyRes.j_surface_rms.map(j => j / 1e6),
      power_density_kw_m2: eddyRes.power_density_eddy.map(p => p / 1e3)
    }
  };
}
