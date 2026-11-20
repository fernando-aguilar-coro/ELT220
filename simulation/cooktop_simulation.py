"""
Benchmark Runner and Comparative Analysis for Induction Cooktop Design.
Evaluates electromagnetic performance across materials, frequencies, and lift-off gaps.
"""

from physics_engine import (
    CoilGeometry,
    MATERIALS,
    compute_pan_electromagnetics,
    compute_skin_depth,
    compute_surface_resistance,
)


def run_benchmark():
    print("=" * 80)
    print("       ELECTROMAGNETIC SIMULATION & DESIGN OF AN INDUCTION COOKTOP       ")
    print("=" * 80)

    # 1. Nominal Design Parameters (Standard 1800W induction element)
    coil = CoilGeometry(
        r_in=0.025,  # 25 mm inner radius
        r_out=0.100,  # 100 mm outer radius (200 mm diameter coil)
        num_turns=20,  # 20 planar spiral turns
        num_strands=120,  # 120-strand Litz wire bundle
        strand_diameter=0.2e-3,  # 0.2 mm strand diameter (AWG 32)
        ferrite_factor=1.35,  # Radial ferrite bars underneath
    )

    f_nom = 25000.0  # 25 kHz resonant frequency
    i_rms_nom = 16.5  # 16.5 A RMS primary current (approx 23.3 A peak)
    z_gap_nom = 0.007  # 7 mm gap (4 mm ceramic glass + 3 mm thermal insulation/cushion)
    pan_radius = 0.110  # 110 mm radius (22 cm base diameter pan)

    print(f"\n[1] COIL SPECIFICATIONS & GEOMETRY:")
    print(f"  - Inner Radius:             {coil.r_in*1e3:.1f} mm")
    print(f"  - Outer Radius:             {coil.r_out*1e3:.1f} mm")
    print(f"  - Mean Radius:              {coil.mean_radius*1e3:.1f} mm")
    print(f"  - Radial Depth:             {coil.radial_depth*1e3:.1f} mm")
    print(f"  - Number of Turns (N):      {coil.num_turns}")
    print(f"  - Total Conductor Length:   {coil.total_length:.2f} m")
    print(f"  - Litz Wire Construction:   {coil.num_strands} x 0.20 mm strands")
    print(f"  - Wheeler Inductance (w/ Ferrite): {coil.compute_self_inductance_wheeler()*1e6:.2f} uH")
    print(f"  - DC Coil Resistance:       {coil.compute_dc_resistance()*1e3:.2f} mOhm")
    print(f"  - AC Coil Resistance @25kHz:{coil.compute_ac_resistance(f_nom)*1e3:.2f} mOhm")

    # 2. Material Comparative Study
    print(f"\n[2] COOKWARE MATERIAL COMPARISON (@ f = {f_nom/1e3:.1f} kHz, I_rms = {i_rms_nom:.1f} A, z = {z_gap_nom*1e3:.1f} mm):")
    print("-" * 105)
    header = (
        f"{'Material':<25} | {'mu_r':<6} | {'sigma [S/m]':<11} | {'Skin Depth':<11} | "
        f"{'R_s [mOhm]':<11} | {'P_pan [W]':<10} | {'Efficiency':<10} | {'Status':<12}"
    )
    print(header)
    print("-" * 105)

    results = {}
    for mat_key, mat in MATERIALS.items():
        res = compute_pan_electromagnetics(
            coil=coil,
            I_rms=i_rms_nom,
            frequency=f_nom,
            material=mat,
            z_pan=z_gap_nom,
            pan_radius=pan_radius,
        )
        results[mat_key] = res

        skin_str = f"{res['skin_depth_mm']:.3f} mm" if res['skin_depth_mm'] < 100 else "> 100 mm"
        status = "Optimal" if res["electrical_efficiency"] > 0.88 else (
            "Viable" if res["electrical_efficiency"] > 0.70 else "Incompatible"
        )

        row = (
            f"{mat.name:<25} | {mat.relative_permeability:<6.1f} | {mat.electrical_conductivity:<11.1e} | "
            f"{skin_str:<11} | {res['surface_resistance_ohm_sq']*1e3:<11.3f} | "
            f"{res['total_pan_power_w']:<10.1f} | {res['electrical_efficiency']*100:<9.1f}% | {status:<12}"
        )
        print(row)
    print("-" * 105)

    # 3. Detailed Breakdown for Optimal Material (430 Ferritic Stainless)
    optimal = results["stainless_430"]
    print(f"\n[3] THERMAL & LOSS BREAKDOWN FOR 430 STAINLESS STEEL:")
    print(f"  - Eddy Current Dissipation: {optimal['p_eddy_w']:.1f} W ({optimal['p_eddy_w']/optimal['total_pan_power_w']*100:.1f}%)")
    print(f"  - Hysteresis Loss:          {optimal['p_hyst_w']:.1f} W ({optimal['p_hyst_w']/optimal['total_pan_power_w']*100:.1f}%)")
    print(f"  - Total Useful Pan Power:   {optimal['total_pan_power_w']:.1f} W")
    print(f"  - Coil Copper Loss:         {optimal['p_coil_loss_w']:.1f} W")
    print(f"  - Total Inverter Power:     {optimal['total_system_power_w']:.1f} W")
    print(f"  - Reflected Resistance:     {optimal['r_reflected_ohm']:.3f} Ohm")
    print(f"  - Total Equivalent R_eq:    {optimal['r_equivalent_ohm']:.3f} Ohm")
    print(f"  - Transfer Efficiency:      {optimal['electrical_efficiency']*100:.2f}%")
    print(f"  - Average Peak B-Field:     {optimal['avg_b_field_mt']:.2f} mT")
    print(f"  - Maximum Peak B-Field:     {optimal['max_b_field_mt']:.2f} mT")

    print("\n" + "=" * 80)
    print("SIMULATION COMPLETED SUCCESSFULLY.")
    print("=" * 80)
    return results


if __name__ == "__main__":
    run_benchmark()
