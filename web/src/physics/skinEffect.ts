/**
 * Electromagnetic Skin Depth and Surface Impedance
 */
import { MU_0, SIGMA_CU } from '../constants.ts';

/**
 * Penetration depth \delta = \sqrt{2 / (\omega \mu_0 \mu_r \sigma)} [m]
 */
export function computeSkinDepth(frequency: number, mu_r: number, sigma: number): number {
  const omega = 2.0 * Math.PI * frequency;
  const mu = MU_0 * mu_r;
  if (omega <= 0 || sigma <= 0 || mu <= 0) return Infinity;
  return Math.sqrt(2.0 / (omega * mu * sigma));
}

/**
 * Surface resistance R_s = 1 / (\sigma \delta) [\Omega/square]
 */
export function computeSurfaceResistance(frequency: number, mu_r: number, sigma: number): number {
  const delta = computeSkinDepth(frequency, mu_r, sigma);
  if (!isFinite(delta) || delta <= 0) return 0.0;
  return 1.0 / (sigma * delta);
}

/**
 * Litz wire AC resistance accounting for strand skin effect
 */
export function computeLitzACResistance(
  totalLength: number,
  strands: number,
  strandDia: number,
  frequency: number
): number {
  const strandArea = Math.PI * Math.pow(strandDia / 2.0, 2);
  const totalArea = strands * strandArea;
  const r_dc = totalLength / (SIGMA_CU * totalArea);

  const deltaCu = computeSkinDepth(frequency, 1.0, SIGMA_CU);
  if (deltaCu > 0) {
    const gamma = Math.pow(strandDia / (2.0 * deltaCu), 4);
    return r_dc * (1.0 + gamma / 48.0);
  }
  return r_dc;
}
