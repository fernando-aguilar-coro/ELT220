/**
 * Biot-Savart Law Formulation for Planar Circular Coils
 */
import { MU_0 } from '../constants.ts';
import { ellipticKandE } from '../math/elliptic.ts';
import { FieldGridData } from '../types.ts';

export interface BFieldVector {
  b_r: number;
  b_z: number;
}

/**
 * Calculates the vector magnetic field (B_r, B_z) at cylindrical position (r, z)
 * due to a circular loop of radius 'a' at z=0 carrying current I.
 */
export function singleFilamentBField(a: number, I: number, r: number, z: number): BFieldVector {
  if (Math.abs(r) < 1e-9) {
    // Axis of symmetry (r=0): B_r = 0, B_z = \mu_0 * I * a^2 / (2 * (a^2 + z^2)^(3/2))
    const hypot3 = Math.pow(a * a + z * z, 1.5);
    const b_z = (MU_0 * I * a * a) / (2.0 * hypot3);
    return { b_r: 0.0, b_z };
  }

  const distSqSum = Math.pow(a + r, 2) + z * z;
  let distSqDiff = Math.pow(a - r, 2) + z * z;
  if (distSqDiff < 1e-12) distSqDiff = 1e-12;

  const m = (4.0 * a * r) / distSqSum;
  const { K, E } = ellipticKandE(m);

  const sqrtSum = Math.sqrt(distSqSum);
  const commonFactor = (MU_0 * I) / (2.0 * Math.PI * sqrtSum);

  const b_z = commonFactor * (K + ((a * a - r * r - z * z) / distSqDiff) * E);
  const b_r = (commonFactor * (z / r)) * (-K + ((a * a + r * r + z * z) / distSqDiff) * E);

  return { b_r, b_z };
}

/**
 * Superposition of B-field across all concentric spiral filaments.
 */
export function computeTotalCoilBField(
  filamentRadii: number[],
  I: number,
  r: number,
  z: number,
  ferriteFactor: number = 1.35
): { b_r: number; b_z: number; b_mag: number } {
  let b_r_tot = 0.0;
  let b_z_tot = 0.0;

  for (const a_k of filamentRadii) {
    const f = singleFilamentBField(a_k, I, r, z);
    b_r_tot += f.b_r;
    b_z_tot += f.b_z;
  }

  b_r_tot *= ferriteFactor;
  b_z_tot *= ferriteFactor;
  const b_mag = Math.sqrt(b_r_tot * b_r_tot + b_z_tot * b_z_tot);

  return { b_r: b_r_tot, b_z: b_z_tot, b_mag };
}

/**
 * Computes 2D vector field grid for canvas rendering.
 */
export function computeFieldGrid2D(
  filamentRadii: number[],
  I_peak: number,
  ferriteFactor: number,
  rMax: number = 0.13,
  zMin: number = -0.012,
  zMax: number = 0.035,
  nr: number = 40,
  nz: number = 32
): FieldGridData {
  const dr = rMax / (nr - 1);
  const dz = (zMax - zMin) / (nz - 1);

  const rCoords: number[] = [];
  for (let j = 0; j < nr; j++) rCoords.push(j * dr);

  const zCoords: number[] = [];
  for (let i = 0; i < nz; i++) zCoords.push(zMin + i * dz);

  const bMag: number[][] = [];
  const bR: number[][] = [];
  const bZ: number[][] = [];

  for (let i = 0; i < nz; i++) {
    const rowMag: number[] = [];
    const rowR: number[] = [];
    const rowZ: number[] = [];
    const z = zCoords[i];

    for (let j = 0; j < nr; j++) {
      const r = rCoords[j];
      const { b_r, b_z, b_mag } = computeTotalCoilBField(filamentRadii, I_peak, r, z, ferriteFactor);
      rowR.push(b_r);
      rowZ.push(b_z);
      rowMag.push(b_mag);
    }
    bMag.push(rowMag);
    bR.push(rowR);
    bZ.push(rowZ);
  }

  return { rCoords, zCoords, bMag, bR, bZ };
}
