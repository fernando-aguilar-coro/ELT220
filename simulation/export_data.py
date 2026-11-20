"""
Data exporter for Induction Cooktop Design.
Exports physical properties and benchmark curves to JSON for web integration.
"""

import json
import os
from physics_engine import (
    CoilGeometry,
    MATERIALS,
    compute_pan_electromagnetics,
    compute_skin_depth,
    compute_surface_resistance,
)

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "output", "cooktop_benchmark.json")


def export():
    coil = CoilGeometry(r_in=0.025, r_out=0.100, num_turns=20)
    freq = 25000.0
    i_rms = 16.5
    z_gap = 0.007
    pan_radius = 0.110

    materials_data = {}
    simulation_results = {}

    for k, mat in MATERIALS.items():
        materials_data[k] = {
            "name": mat.name,
            "relative_permeability": mat.relative_permeability,
            "electrical_conductivity": mat.electrical_conductivity,
            "steinmetz_eta": mat.steinmetz_eta,
            "density": mat.density,
            "description": mat.description,
            "skin_depth_mm_25khz": compute_skin_depth(freq, mat) * 1e3,
            "surface_resistance_mohm": compute_surface_resistance(freq, mat) * 1e3,
        }

        res = compute_pan_electromagnetics(coil, i_rms, freq, mat, z_pan=z_gap, pan_radius=pan_radius)
        simulation_results[k] = {
            "total_pan_power_w": round(res["total_pan_power_w"], 2),
            "p_eddy_w": round(res["p_eddy_w"], 2),
            "p_hyst_w": round(res["p_hyst_w"], 2),
            "p_coil_loss_w": round(res["p_coil_loss_w"], 2),
            "electrical_efficiency_pct": round(res["electrical_efficiency"] * 100, 2),
            "r_reflected_ohm": round(res["r_reflected_ohm"], 3),
            "r_equivalent_ohm": round(res["r_equivalent_ohm"], 3),
            "coupling_factor_k": round(res["coupling_factor_k"], 3),
            "skin_depth_mm": round(res["skin_depth_mm"], 3),
            "max_b_field_mt": round(res["max_b_field_mt"], 2),
            "avg_b_field_mt": round(res["avg_b_field_mt"], 2),
            "radial_profiles": {
                "r_mm": [round(float(r * 1e3), 2) for r in res["r_vals"]],
                "k_theta_ka_m": [round(float(k / 1e3), 3) for k in res["k_theta_rms"]],
                "power_density_kw_m2": [round(float(p / 1e3), 3) for p in res["power_density_eddy"]],
            },
        }

    dataset = {
        "coil_specs": {
            "r_in_mm": coil.r_in * 1e3,
            "r_out_mm": coil.r_out * 1e3,
            "mean_radius_mm": coil.mean_radius * 1e3,
            "radial_depth_mm": coil.radial_depth * 1e3,
            "turns": coil.num_turns,
            "strands": coil.num_strands,
            "strand_dia_mm": coil.strand_diameter * 1e3,
            "litz_ac_resistance_mohm": round(coil.compute_ac_resistance(freq) * 1e3, 2),
            "wheeler_inductance_uh": round(coil.compute_self_inductance_wheeler() * 1e6, 2),
        },
        "operating_point": {
            "frequency_khz": freq / 1e3,
            "i_rms_a": i_rms,
            "z_gap_mm": z_gap * 1e3,
            "pan_radius_mm": pan_radius * 1e3,
        },
        "materials": materials_data,
        "results": simulation_results,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"Benchmark dataset exported to: {OUTPUT_FILE}")


if __name__ == "__main__":
    export()
