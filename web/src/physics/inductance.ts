/**
 * Harold Wheeler Spiral Self-Inductance & Coupled Transformer Parameters
 */
import { MU_0 } from '../constants.ts';

/**
 * Wheeler formula for planar spiral coils [H]
 * L = 31.33 * \mu_0 * N^2 * a^2 / (8*a + 11*c)
 */
export function computeWheelerInductance(
  r_in: number,
  r_out: number,
  num_turns: number,
  ferriteFactor: number = 1.35
): number {
  const a = 0.5 * (r_in + r_out); // Mean radius
  const c = r_out - r_in;          // Radial depth
  const l_air = (31.33 * MU_0 * num_turns * num_turns * a * a) / (8.0 * a + 11.0 * c);
  return l_air * ferriteFactor;
}

/**
 * Secondary loop self-inductance of thin circular sheet [H]
 */
export function computeSecondaryInductance(r_mean: number, effectiveWidth: number): number {
  return MU_0 * r_mean * (Math.log(Math.max((8.0 * r_mean) / effectiveWidth, 2.5)) - 0.5);
}

/**
 * Magnetic coupling coefficient k(z) accounting for lift-off gap and ferromagnetic boundary
 */
export function computeCouplingCoefficient(z_pan: number, meanRadius: number, mu_r: number): number {
  const muBoost = 1.0 + 0.18 * Math.tanh((mu_r - 1.0) / 40.0);
  const k_0 = 0.68 * muBoost;
  const z_decay = meanRadius * 0.65;
  return Math.min(k_0 * Math.exp(-z_pan / z_decay), 0.85);
}
