/**
 * Type Definitions for Induction Cooktop Electromagnetics Simulation
 */

export interface Material {
  id: string;
  name: string;
  mu_r: number;               // Relative magnetic permeability
  sigma: number;              // Electrical conductivity [S/m]
  steinmetz_eta: number;      // Steinmetz hysteresis constant [J/m^3]
  steinmetz_n: number;        // Steinmetz exponent (~1.6)
  density: number;            // [kg/m^3]
  isFerromagnetic: boolean;
  description: string;
}

export interface CoilParams {
  r_in: number;               // Inner radius [m]
  r_out: number;              // Outer radius [m]
  num_turns: number;          // Turns N
  num_strands: number;        // Litz wire strands
  strand_diameter: number;    // Strand diameter [m] (0.2 mm)
  ferrite_factor: number;     // Bottom ferrite flux concentration factor
}

export interface OperatingParams {
  frequency: number;          // Inverter frequency [Hz]
  I_rms: number;              // Primary current RMS [A]
  z_pan: number;              // Distance from coil plane to pan base [m]
  pan_radius: number;         // Cookware base radius [m]
}

export interface SimulationResult {
  coil: {
    r_in: number;
    r_out: number;
    num_turns: number;
    meanRadius: number;
    radialDepth: number;
    totalLength: number;
    pitch: number;
    l_1: number;              // Self-inductance [H]
    r_1: number;              // AC resistance [Ohms]
    filamentRadii: number[];  // Radii of concentric turns [m]
  };
  operating: OperatingParams & {
    I_peak: number;
    omega: number;
  };
  material: Material;
  electromagnetic: {
    skin_depth_m: number;
    skin_depth_mm: number;
    surface_resistance_ohm_sq: number;
    l_2_uh: number;
    r_2_mohm: number;
    m_mutual_uh: number;
    coupling_factor_k: number;
    avg_b_peak_mt: number;
    max_b_peak_mt: number;
    b_internal_peak_t: number;
  };
  powers: {
    p_eddy_w: number;
    p_hyst_w: number;
    total_pan_power_w: number;
    p_coil_loss_w: number;
    total_system_power_w: number;
    r_reflected_ohm: number;
    x_reflected_ohm: number;
    r_equivalent_ohm: number;
    efficiency_pct: number;
  };
  profiles: {
    r_mm: number[];
    b_z_rms_mt: number[];
    k_theta_ka_m: number[];
    j_surface_ma_m2: number[];
    power_density_kw_m2: number[];
  };
}

export interface FieldGridData {
  rCoords: number[];
  zCoords: number[];
  bMag: number[][];
  bR: number[][];
  bZ: number[][];
}
