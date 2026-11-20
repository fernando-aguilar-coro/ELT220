r"""
Electromagnetism Simulation Engine for Induction Cooktop Design.
Theoretical framework based on Maxwell's Equations and Coupled-Transformer Theory:
- Planar spiral coil geometry & Wheeler self-inductance
- Biot-Savart vector magnetic field via complete elliptic integrals
- High-frequency skin effect & Litz wire bundle AC resistance
- Coupled-circuit eddy current dissipation in cookware
- Hysteresis losses via empirical Steinmetz formulation
- Reflected impedance, equivalent circuit, and transfer efficiency
"""

import math
from dataclasses import dataclass
from typing import Dict, Tuple
import numpy as np
from scipy.special import ellipk, ellipe

# Physical Constants
MU_0 = 4.0 * math.pi * 1e-7  # Permeability of free space [H/m]


@dataclass
class Material:
    name: str
    relative_permeability: float  # \mu_r
    electrical_conductivity: float  # \sigma [S/m]
    steinmetz_eta: float  # \eta_St [J/m^3]
    steinmetz_n: float  # Steinmetz exponent (typically 1.6)
    density: float  # [kg/m^3]
    description: str


# Standard Cookware Material Catalog
MATERIALS: Dict[str, Material] = {
    "stainless_430": Material(
        name="430 Ferritic Stainless Steel",
        relative_permeability=300.0,
        electrical_conductivity=1.7e6,
        steinmetz_eta=950.0,
        steinmetz_n=1.6,
        density=7700.0,
        description="Standard magnetic stainless steel base for modern induction-ready cookware.",
    ),
    "cast_iron": Material(
        name="Cast Iron",
        relative_permeability=200.0,
        electrical_conductivity=1.5e6,
        steinmetz_eta=850.0,
        steinmetz_n=1.6,
        density=7200.0,
        description="High relative permeability and moderate conductivity. Excellent induction heating efficiency.",
    ),
    "carbon_steel_1018": Material(
        name="1018 Carbon Steel",
        relative_permeability=150.0,
        electrical_conductivity=6.0e6,
        steinmetz_eta=700.0,
        steinmetz_n=1.6,
        density=7850.0,
        description="Wok and skillet material; high magnetic coupling with higher electrical conductivity.",
    ),
    "stainless_304": Material(
        name="304 Austenitic Stainless Steel",
        relative_permeability=1.02,
        electrical_conductivity=1.4e6,
        steinmetz_eta=15.0,
        steinmetz_n=1.6,
        density=8000.0,
        description="Non-magnetic food-grade stainless steel; low heating without a bonded magnetic base plate.",
    ),
    "aluminum_6061": Material(
        name="6061 Aluminum",
        relative_permeability=1.0,
        electrical_conductivity=3.5e7,
        steinmetz_eta=0.0,
        steinmetz_n=1.6,
        density=2700.0,
        description="High conductivity, non-magnetic. Secondary loop is reactance-limited; negligible heating.",
    ),
    "copper": Material(
        name="Pure Copper (OFHC)",
        relative_permeability=1.0,
        electrical_conductivity=5.8e7,
        steinmetz_eta=0.0,
        steinmetz_n=1.6,
        density=8960.0,
        description="Very high conductivity, non-magnetic. Secondary resistance is near zero; cannot heat.",
    ),
}


@dataclass
class CoilGeometry:
    r_in: float  # Inner radius [m]
    r_out: float  # Outer radius [m]
    num_turns: int  # Number of turns N
    num_strands: int = 120  # Litz wire strand count
    strand_diameter: float = 0.2e-3  # Litz wire strand diameter [m] (0.2 mm, AWG 32)
    ferrite_factor: float = 1.35  # Magnetic concentration factor from bottom ferrite bars

    @property
    def mean_radius(self) -> float:
        return 0.5 * (self.r_in + self.r_out)

    @property
    def radial_depth(self) -> float:
        return self.r_out - self.r_in

    @property
    def total_length(self) -> float:
        return math.pi * self.num_turns * (self.r_in + self.r_out)

    @property
    def filament_radii(self) -> np.ndarray:
        """Concentric equivalent loop radii for electromagnetic superposition."""
        k = np.arange(1, self.num_turns + 1)
        return self.r_in + (k - 0.5) * (self.radial_depth / self.num_turns)

    def compute_self_inductance_wheeler(self) -> float:
        """Coil self-inductance using Harold Wheeler's formula for planar spirals [H]."""
        a = self.mean_radius
        c = self.radial_depth
        n = self.num_turns
        l_air = (31.33 * MU_0 * (n**2) * (a**2)) / (8.0 * a + 11.0 * c)
        return l_air * self.ferrite_factor

    def compute_dc_resistance(self) -> float:
        """DC resistance of the copper Litz bundle [Ohms]."""
        sigma_cu = 5.8e7
        strand_area = math.pi * (self.strand_diameter / 2.0) ** 2
        total_bundle_area = self.num_strands * strand_area
        return self.total_length / (sigma_cu * total_bundle_area)

    def compute_ac_resistance(self, frequency: float) -> float:
        """
        AC resistance of the Litz wire coil accounting for skin effect on individual strands.
        Because strand diameter d_s <= 0.2 mm < 2*delta_Cu, AC resistance penalty is small.
        """
        r_dc = self.compute_dc_resistance()
        delta_cu = compute_skin_depth(frequency, MATERIALS["copper"])
        d_s = self.strand_diameter
        if delta_cu > 0:
            gamma = (d_s / (2.0 * delta_cu)) ** 4
            r_ac = r_dc * (1.0 + gamma / 48.0)
        else:
            r_ac = r_dc
        return r_ac


def compute_skin_depth(frequency: float, material: Material) -> float:
    r"""Calculates penetration skin depth \delta = sqrt(2 / (\omega * \mu * \sigma)) [m]."""
    omega = 2.0 * math.pi * frequency
    mu = MU_0 * material.relative_permeability
    sigma = material.electrical_conductivity
    if omega <= 0 or sigma <= 0 or mu <= 0:
        return float("inf")
    return math.sqrt(2.0 / (omega * mu * sigma))


def compute_surface_resistance(frequency: float, material: Material) -> float:
    r"""Calculates surface resistance R_s = 1 / (\sigma * \delta) [\Omega/square]."""
    delta = compute_skin_depth(frequency, material)
    if math.isinf(delta) or delta <= 0:
        return 0.0
    return 1.0 / (material.electrical_conductivity * delta)


def single_filament_b_field(
    a: float, I: float, r: float, z: float
) -> Tuple[float, float]:
    r"""
    Computes (B_r, B_z) in cylindrical coordinates for a circular filament of radius 'a'
    located at z=0 carrying current I, using complete elliptic integrals.
    """
    if abs(r) < 1e-9:
        hypot3 = (a**2 + z**2) ** 1.5
        b_z = (MU_0 * I * (a**2)) / (2.0 * hypot3)
        return 0.0, b_z

    dist_sq_sum = (a + r) ** 2 + z**2
    dist_sq_diff = (a - r) ** 2 + z**2

    if dist_sq_diff < 1e-12:
        dist_sq_diff = 1e-12

    m = (4.0 * a * r) / dist_sq_sum
    if m >= 1.0:
        m = 0.99999999999

    k_ellip = float(ellipk(m))
    e_ellip = float(ellipe(m))

    sqrt_sum = math.sqrt(dist_sq_sum)
    common_factor = (MU_0 * I) / (2.0 * math.pi * sqrt_sum)

    b_z = common_factor * (k_ellip + ((a**2 - r**2 - z**2) / dist_sq_diff) * e_ellip)
    b_r = (common_factor * (z / r)) * (
        -k_ellip + ((a**2 + r**2 + z**2) / dist_sq_diff) * e_ellip
    )

    return b_r, b_z


def compute_coil_b_field(
    coil: CoilGeometry, I: float, r: float, z: float
) -> Tuple[float, float, float]:
    """
    Superposition of magnetic field across all coil turns.
    Returns (B_r, B_z, B_norm).
    """
    b_r_tot = 0.0
    b_z_tot = 0.0
    for a_k in coil.filament_radii:
        br, bz = single_filament_b_field(a_k, I, r, z)
        b_r_tot += br
        b_z_tot += bz

    b_r_tot *= coil.ferrite_factor
    b_z_tot *= coil.ferrite_factor
    b_norm = math.sqrt(b_r_tot**2 + b_z_tot**2)
    return b_r_tot, b_z_tot, b_norm


def compute_b_field_grid(
    coil: CoilGeometry,
    I_peak: float,
    r_coords: np.ndarray,
    z_coords: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes vector B-field on a 2D meshgrid in (r, z) space.
    Returns 2D arrays: B_r_grid, B_z_grid, B_magnitude_grid.
    """
    nr = len(r_coords)
    nz = len(z_coords)
    b_r = np.zeros((nz, nr), dtype=float)
    b_z = np.zeros((nz, nr), dtype=float)

    for i, z in enumerate(z_coords):
        for j, r in enumerate(r_coords):
            br, bz, _ = compute_coil_b_field(coil, I_peak, r, z)
            b_r[i, j] = br
            b_z[i, j] = bz

    b_mag = np.sqrt(b_r**2 + b_z**2)
    return b_r, b_z, b_mag


def compute_pan_electromagnetics(
    coil: CoilGeometry,
    I_rms: float,
    frequency: float,
    material: Material,
    z_pan: float = 0.007,  # 7 mm above coil plane
    pan_radius: float = 0.11,  # 11 cm radius (22 cm diameter pan)
    num_radial_points: int = 150,
) -> Dict:
    r"""
    Full coupled-transformer & electrodynamic simulation of the cooktop-pan system.

    Parameters:
    - Primary coil: L_1, R_1 (Litz AC)
    - Cookware base: Secondary single-turn loop with equivalent inductance L_2 and resistance R_2
    - Coupling factor k(z) = k_0 * exp(-z / z_decay)
    - Mutual inductance M = k * sqrt(L_1 * L_2)
    - Reflected resistance into primary: R_ref = (omega^2 * M^2 * R_2) / (R_2^2 + (omega * L_2)^2)
    - Local field and current density distributions along the pan radius r.
    """
    omega = 2.0 * math.pi * frequency
    I_peak = I_rms * math.sqrt(2.0)
    delta = compute_skin_depth(frequency, material)
    r_s = compute_surface_resistance(frequency, material)

    # 1. Primary Coil Parameters
    l_1 = coil.compute_self_inductance_wheeler()
    r_1 = coil.compute_ac_resistance(frequency)

    # 2. Secondary (Pan) Equivalent Lumped Parameters
    # The cookware base behaves as a single effective turn of radius r_mean_pan
    r_mean_pan = min(coil.mean_radius * 1.15, pan_radius * 0.75)
    effective_annulus_width = coil.radial_depth * 1.1

    # Secondary self-inductance of thin circular sheet loop:
    # L_2 = \mu_0 * r_mean * [ln(8 * r_mean / effective_annulus_width) - 0.5]
    l_2 = MU_0 * r_mean_pan * (math.log(max(8.0 * r_mean_pan / effective_annulus_width, 2.5)) - 0.5)

    # Secondary loop resistance: R_2 = 2 * \pi * r_mean / (\sigma * \delta * effective_width)
    # R_2 = (2 * \pi * r_mean / effective_width) * R_s
    geom_resistance_factor = (2.0 * math.pi * r_mean_pan) / effective_annulus_width
    r_2 = geom_resistance_factor * r_s

    # Coupling factor k between pancake coil and cookware base:
    # Decreases exponentially with lift-off gap z_pan
    # Ferromagnetic boundary condition pulls magnetic flux toward base (increasing k)
    mu_coupling_boost = 1.0 + 0.18 * math.tanh((material.relative_permeability - 1.0) / 40.0)
    k_0 = 0.68 * mu_coupling_boost
    z_decay = coil.mean_radius * 0.65
    k_coupling = float(min(k_0 * math.exp(-z_pan / z_decay), 0.85))

    # Mutual Inductance M = k * sqrt(L_1 * L_2)
    m_mutual = k_coupling * math.sqrt(l_1 * l_2)

    # 3. Reflected Impedance to Primary
    # Z_ref = \omega^2 * M^2 / (R_2^2 + \omega^2 * L_2^2) * (R_2 - j * \omega * L_2)
    omega_l2 = omega * l_2
    z_2_sq = (r_2**2) + (omega_l2**2)

    r_reflected = float((omega**2) * (m_mutual**2) * r_2 / z_2_sq)
    x_reflected = float((omega**2) * (m_mutual**2) * omega_l2 / z_2_sq)

    # 4. Global Power Balance
    # Primary coil loss:
    p_coil_loss = float((I_rms**2) * r_1)

    # Eddy current power transferred into pan base:
    p_eddy = float((I_rms**2) * r_reflected)

    # 5. Radial Field and Current Density Distribution
    r_vals = np.linspace(0.002, pan_radius, num_radial_points)
    dr = r_vals[1] - r_vals[0]

    bz_peak_vals = np.zeros_like(r_vals)
    b_mag_vals = np.zeros_like(r_vals)
    for idx, r in enumerate(r_vals):
        br, bz, bmag = compute_coil_b_field(coil, I_peak, r, z_pan)
        bz_peak_vals[idx] = bz * mu_coupling_boost
        b_mag_vals[idx] = bmag * mu_coupling_boost

    bz_rms = bz_peak_vals / math.sqrt(2.0)

    # Cumulative flux and local induced electric field:
    flux_cum = np.cumsum(2.0 * math.pi * r_vals * bz_rms) * dr
    e_theta_rms = (omega * flux_cum) / (2.0 * math.pi * r_vals)

    # Local surface current density K_\theta(r) shaped by annular impedance
    annulus_l = MU_0 * r_vals * 1.5
    local_z_sq = (r_s**2) + ((omega * annulus_l)**2)
    local_shape = e_theta_rms / np.sqrt(local_z_sq)
    # Normalize local eddy power density so spatial integral matches lumped p_eddy
    raw_power_density = r_s * (local_shape**2)
    raw_integral = float(np.sum(2.0 * math.pi * r_vals * raw_power_density * dr))
    norm_factor = (p_eddy / raw_integral) if raw_integral > 0 else 1.0

    power_density_eddy = raw_power_density * norm_factor
    k_theta_rms = np.sqrt(power_density_eddy / max(r_s, 1e-9))
    j_surface_rms = k_theta_rms / delta if delta > 0 and not math.isinf(delta) else np.zeros_like(r_vals)

    # 6. Hysteresis Power Dissipation (Steinmetz formula)
    # Inside the ferromagnetic conductor, the internal magnetic flux density B_metal
    # is concentrated by \mu_r up to the saturation limit B_sat (~1.2 T for cookware steel).
    avg_b_peak = float(np.mean(b_mag_vals))
    b_sat = 1.25  # Saturation flux density [T]
    b_internal_peak = float(min(avg_b_peak * (material.relative_permeability ** 0.65), b_sat))

    active_volume = math.pi * (pan_radius**2) * min(delta, 0.002)
    if material.relative_permeability > 2.0 and material.steinmetz_eta > 0:
        p_hyst = float(
            material.steinmetz_eta
            * frequency
            * (b_internal_peak**material.steinmetz_n)
            * active_volume
        )
    else:
        p_hyst = 0.0

    total_pan_power = p_eddy + p_hyst
    total_system_power = total_pan_power + p_coil_loss

    # Equivalent resistance seen by inverter
    r_equivalent = r_1 + r_reflected + (p_hyst / (I_rms**2) if I_rms > 0 else 0.0)

    # Electrical Transfer Efficiency \eta = P_pan / (P_pan + P_coil)
    efficiency = float(total_pan_power / total_system_power) if total_system_power > 0 else 0.0

    return {
        "material": material.name,
        "frequency_hz": frequency,
        "I_rms": I_rms,
        "I_peak": I_peak,
        "z_pan_m": z_pan,
        "pan_radius_m": pan_radius,
        "skin_depth_m": delta,
        "skin_depth_mm": delta * 1e3,
        "surface_resistance_ohm_sq": r_s,
        "avg_b_field_mt": avg_b_peak * 1e3,
        "max_b_field_mt": float(np.max(b_mag_vals)) * 1e3,
        "p_eddy_w": p_eddy,
        "p_hyst_w": p_hyst,
        "total_pan_power_w": total_pan_power,
        "p_coil_loss_w": p_coil_loss,
        "total_system_power_w": total_system_power,
        "r_coil_ac_ohm": r_1,
        "r_secondary_ohm": r_2,
        "l_secondary_uh": l_2 * 1e6,
        "r_reflected_ohm": r_reflected,
        "x_reflected_ohm": x_reflected,
        "r_equivalent_ohm": r_equivalent,
        "l_coil_uh": l_1 * 1e6,
        "m_mutual_uh": m_mutual * 1e6,
        "coupling_factor_k": k_coupling,
        "electrical_efficiency": efficiency,
        "r_vals": r_vals,
        "b_z_rms": bz_rms,
        "k_theta_rms": k_theta_rms,
        "j_surface_rms": j_surface_rms,
        "power_density_eddy": power_density_eddy,
    }
