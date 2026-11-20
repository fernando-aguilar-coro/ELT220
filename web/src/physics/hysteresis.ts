/**
 * Ferromagnetic Domain Hysteresis Loss Formulation (Steinmetz Equation)
 * p_hyst = \eta_St * f * B_max^n * Volume [Watts]
 */

export function computeHysteresisLoss(
  material: { mu_r: number; steinmetz_eta: number; steinmetz_n: number },
  frequency: number,
  b_mag_peak: number[],
  pan_radius: number,
  delta: number
): { p_hyst: number; b_internal_peak: number; avg_b_peak: number } {
  if (b_mag_peak.length === 0) return { p_hyst: 0, b_internal_peak: 0, avg_b_peak: 0 };

  const sumBMag = b_mag_peak.reduce((a, b) => a + b, 0);
  const avg_b_peak = sumBMag / b_mag_peak.length;

  // Magnetic flux concentration inside ferromagnetic boundary layer up to saturation
  const bSat = 1.25; // Saturation flux limit [T]
  const b_internal_peak = Math.min(avg_b_peak * Math.pow(material.mu_r, 0.65), bSat);

  const activeVolume = Math.PI * pan_radius * pan_radius * Math.min(delta, 0.002);
  let p_hyst = 0.0;

  if (material.mu_r > 2.0 && material.steinmetz_eta > 0) {
    p_hyst = material.steinmetz_eta * frequency * Math.pow(b_internal_peak, material.steinmetz_n) * activeVolume;
  }

  return { p_hyst, b_internal_peak, avg_b_peak };
}
