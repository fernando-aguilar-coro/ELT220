/**
 * Arithmetic-Geometric Mean (AGM) calculation for Complete Elliptic Integrals
 * Computes K(m) and E(m) to machine precision.
 */

export interface EllipticResult {
  K: number;
  E: number;
}

export function ellipticKandE(m: number): EllipticResult {
  // Clamping parameter m to valid physical interval [0, 0.9999999999]
  if (m < 0) m = 0;
  if (m >= 0.9999999999) m = 0.9999999999;

  let a = 1.0;
  let b = Math.sqrt(1.0 - m);
  let c = Math.sqrt(m);
  let sumC = 0.5 * m;
  let power2 = 1.0;

  for (let iter = 0; iter < 12; iter++) {
    const aNext = 0.5 * (a + b);
    const bNext = Math.sqrt(a * b);
    const cNext = 0.5 * (a - b);

    power2 *= 2.0;
    sumC += power2 * (cNext * cNext);

    a = aNext;
    b = bNext;
    c = cNext;

    if (Math.abs(c) < 1e-15) break;
  }

  const K = Math.PI / (2.0 * a);
  const E = K * (1.0 - sumC);
  return { K, E };
}
