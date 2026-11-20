"""
Scientific Plot Generation for Induction Cooktop Design.
Produces publication-grade plots saved in simulation/output/.
"""

import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from physics_engine import (
    CoilGeometry,
    MATERIALS,
    compute_b_field_grid,
    compute_pan_electromagnetics,
    compute_skin_depth,
)

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Plot styling configuration
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 10,
    "axes.labelsize": 11,
    "axes.titlesize": 12,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,
    "figure.titlesize": 13,
})


def plot_fig1_magnetic_field_map():
    """Figure 1: 2D Magnetic Flux Density Heatmap & Field Streamlines in (r, z) space."""
    print("Generating Figure 1: 2D Magnetic Field Map...")
    coil = CoilGeometry(r_in=0.025, r_out=0.100, num_turns=20)
    I_peak = 16.5 * np.sqrt(2.0)

    r_vec = np.linspace(0.001, 0.140, 100)  # 0 to 140 mm
    z_vec = np.linspace(-0.015, 0.040, 90)   # -15 mm to +40 mm

    b_r, b_z, b_mag = compute_b_field_grid(coil, I_peak, r_vec, z_vec)

    R_grid, Z_grid = np.meshgrid(r_vec * 1e3, z_vec * 1e3)  # In millimeters

    fig, ax = plt.subplots(figsize=(9, 6), dpi=250)

    # Contour heatmap of |B| in mT
    b_mag_mt = b_mag * 1e3
    levels = np.linspace(0, min(np.percentile(b_mag_mt, 98), 25.0), 40)
    cf = ax.contourf(R_grid, Z_grid, b_mag_mt, levels=levels, cmap="magma", extend="max")
    cbar = fig.colorbar(cf, ax=ax, pad=0.02)
    cbar.set_label(r"Magnetic Flux Density $|\mathbf{B}|$ [mT]", fontweight="bold")

    # Streamlines of magnetic field
    ax.streamplot(
        R_grid,
        Z_grid,
        b_r,
        b_z,
        color="white",
        density=1.1,
        linewidth=0.8,
        arrowsize=0.9,
    )

    # Physical components overlay
    # 1. Coil turns (small copper circles at z=0)
    for r_k in coil.filament_radii:
        ax.plot(r_k * 1e3, 0.0, "o", color="#ff9900", markersize=4.5, markeredgecolor="black")
    ax.plot([], [], "o", color="#ff9900", label="Coil Turns (z = 0 mm)")

    # 2. Ceramic glass top (0 to 4 mm)
    glass_rect = Rectangle(
        (0, 0), 140, 4.0, linewidth=1, edgecolor="cyan", facecolor="cyan", alpha=0.15, label="Ceramic Glass (4 mm)"
    )
    ax.add_patch(glass_rect)

    # 3. Cookware base plate (z = 7 mm, thickness 3 mm)
    pan_rect = Rectangle(
        (0, 7.0), 110, 3.0, linewidth=1.2, edgecolor="#e63946", facecolor="#e63946", alpha=0.35, label="Cookware Base (z = 7 mm)"
    )
    ax.add_patch(pan_rect)

    # 4. Ferrite shielding underneath (z = -10 to -2 mm)
    ferrite_rect = Rectangle(
        (15, -10.0), 95, 8.0, linewidth=1, edgecolor="#333333", facecolor="#444444", alpha=0.25, label="Ferrite Concentrators (z < 0)"
    )
    ax.add_patch(ferrite_rect)

    ax.set_title(r"Induction Cooktop: Magnetic Flux Density $|\mathbf{B}|$ and Vector Field", fontweight="bold")
    ax.set_xlabel("Radial Distance $r$ [mm]")
    ax.set_ylabel("Axial Distance $z$ [mm]")
    ax.set_xlim(0, 135)
    ax.set_ylim(-14, 35)
    ax.legend(loc="upper right", framealpha=0.9)
    plt.tight_layout()

    out_path = os.path.join(OUTPUT_DIR, "fig1_magnetic_field_map.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved: {out_path}")


def plot_fig2_induced_current_density():
    """Figure 2: Radial Current Density K_theta(r) & Heat Dissipation Profile."""
    print("Generating Figure 2: Induced Current & Power Density...")
    coil = CoilGeometry(r_in=0.025, r_out=0.100, num_turns=20)
    freq = 25000.0
    I_rms = 16.5
    z_gap = 0.007

    mat_keys = ["stainless_430", "cast_iron", "carbon_steel_1018", "aluminum_6061"]
    colors = {"stainless_430": "#1f77b4", "cast_iron": "#2ca02c", "carbon_steel_1018": "#ff7f0e", "aluminum_6061": "#d62728"}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=250)

    for k in mat_keys:
        res = compute_pan_electromagnetics(coil, I_rms, freq, MATERIALS[k], z_pan=z_gap)
        r_mm = res["r_vals"] * 1e3
        k_ka_m = res["k_theta_rms"] / 1e3
        p_kw_m2 = res["power_density_eddy"] / 1e3

        ax1.plot(r_mm, k_ka_m, label=MATERIALS[k].name, color=colors[k], linewidth=2.0)
        ax2.plot(r_mm, p_kw_m2, label=MATERIALS[k].name, color=colors[k], linewidth=2.0)

    # Coil region highlight
    for ax in (ax1, ax2):
        ax.axvspan(coil.r_in * 1e3, coil.r_out * 1e3, color="gray", alpha=0.15, label="Coil Span (25-100 mm)")
        ax.set_xlabel("Cookware Radius $r$ [mm]")
        ax.set_xlim(0, 110)

    ax1.set_ylabel(r"Surface Current Density $|K_\theta(r)|$ [kA/m]", fontweight="bold")
    ax1.set_title("Induced Surface Current Density Distribution", fontweight="bold")
    ax1.legend(loc="upper left")

    ax2.set_ylabel(r"Local Heat Dissipation $p_{\mathrm{eddy}}(r)$ [kW/m$^2$]", fontweight="bold")
    ax2.set_title("Annular Heat Generation Density", fontweight="bold")
    ax2.legend(loc="upper left")

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "fig2_induced_current_density.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved: {out_path}")


def plot_fig3_skin_depth_materials():
    """Figure 3: Penetration Depth vs Operating Frequency for Cookware Materials."""
    print("Generating Figure 3: Skin Depth vs Frequency...")
    freqs = np.linspace(10000, 100000, 100)  # 10 kHz to 100 kHz

    fig, ax = plt.subplots(figsize=(8, 5), dpi=250)

    styles = {
        "stainless_430": ("#1f77b4", "-", 2.5),
        "cast_iron": ("#2ca02c", "--", 2.2),
        "carbon_steel_1018": ("#ff7f0e", "-.", 2.2),
        "stainless_304": ("#9467bd", ":", 2.2),
        "aluminum_6061": ("#d62728", "-", 1.8),
        "copper": ("#8c564b", "-.", 1.8),
    }

    for k, mat in MATERIALS.items():
        deltas_mm = [compute_skin_depth(f, mat) * 1e3 for f in freqs]
        color, ls, lw = styles[k]
        ax.plot(freqs / 1e3, deltas_mm, label=mat.name, color=color, linestyle=ls, linewidth=lw)

    # Highlight typical induction frequency band (20 to 40 kHz)
    ax.axvspan(20, 40, color="gold", alpha=0.2, label="Induction Cooking Band (20 - 40 kHz)")

    ax.set_yscale("log")
    ax.set_xlabel("Inverter Operating Frequency $f$ [kHz]", fontweight="bold")
    ax.set_ylabel(r"Electromagnetic Skin Depth $\delta$ [mm]", fontweight="bold")
    ax.set_title(r"Skin Effect: Penetration Depth $\delta = \sqrt{2 / (\omega \mu \sigma)}$ vs Frequency", fontweight="bold")
    ax.set_xlim(10, 100)
    ax.legend(loc="upper right", framealpha=0.95)
    plt.tight_layout()

    out_path = os.path.join(OUTPUT_DIR, "fig3_skin_depth_materials.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved: {out_path}")


def plot_fig4_power_vs_gap_and_freq():
    """Figure 4: Power and Efficiency vs Air Gap & Inverter Frequency."""
    print("Generating Figure 4: Power and Efficiency vs Gap & Frequency...")
    coil = CoilGeometry(r_in=0.025, r_out=0.100, num_turns=20)
    I_rms = 16.5
    mat = MATERIALS["stainless_430"]

    # Sweep 1: Air gap (lift-off)
    gaps_mm = np.linspace(3, 20, 25)
    p_gap = []
    eff_gap = []
    for g in gaps_mm:
        res = compute_pan_electromagnetics(coil, I_rms, 25000.0, mat, z_pan=g * 1e-3)
        p_gap.append(res["total_pan_power_w"])
        eff_gap.append(res["electrical_efficiency"] * 100)

    # Sweep 2: Frequency
    freqs_khz = np.linspace(15, 60, 25)
    p_freq = []
    eff_freq = []
    for f in freqs_khz:
        res = compute_pan_electromagnetics(coil, I_rms, f * 1e3, mat, z_pan=0.007)
        p_freq.append(res["total_pan_power_w"])
        eff_freq.append(res["electrical_efficiency"] * 100)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=250)

    # Subplot 1: vs Gap
    color_p = "#1f77b4"
    color_eff = "#2ca02c"
    ax1.plot(gaps_mm, p_gap, color=color_p, linewidth=2.2, label="Pan Power [W]")
    ax1.set_xlabel("Lift-off Gap $z_{\mathrm{pan}}$ [mm]", fontweight="bold")
    ax1.set_ylabel("Cookware Power [W]", color=color_p, fontweight="bold")
    ax1.tick_params(axis="y", labelcolor=color_p)

    ax1_twin = ax1.twinx()
    ax1_twin.plot(gaps_mm, eff_gap, color=color_eff, linestyle="--", linewidth=2.0, label="Efficiency [%]")
    ax1_twin.set_ylabel("Efficiency $\eta$ [%]", color=color_eff, fontweight="bold")
    ax1_twin.tick_params(axis="y", labelcolor=color_eff)
    ax1_twin.set_ylim(80, 100)
    ax1.set_title("Coupling Drop vs Lift-Off Gap ($f = 25$ kHz)", fontweight="bold")

    # Subplot 2: vs Frequency
    ax2.plot(freqs_khz, p_freq, color=color_p, linewidth=2.2, label="Pan Power [W]")
    ax2.set_xlabel("Frequency $f$ [kHz]", fontweight="bold")
    ax2.set_ylabel("Cookware Power [W]", color=color_p, fontweight="bold")
    ax2.tick_params(axis="y", labelcolor=color_p)

    ax2_twin = ax2.twinx()
    ax2_twin.plot(freqs_khz, eff_freq, color=color_eff, linestyle="--", linewidth=2.0, label="Efficiency [%]")
    ax2_twin.set_ylabel("Efficiency $\eta$ [%]", color=color_eff, fontweight="bold")
    ax2_twin.tick_params(axis="y", labelcolor=color_eff)
    ax2_twin.set_ylim(90, 100)
    ax2.set_title("Performance vs Inverter Frequency ($z = 7$ mm)", fontweight="bold")

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "fig4_power_vs_gap_and_freq.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved: {out_path}")


def plot_fig5_loss_breakdown_and_efficiency():
    """Figure 5: Power Breakdown (Eddy vs Hysteresis vs Coil) and Efficiency."""
    print("Generating Figure 5: Loss Breakdown and Efficiency...")
    coil = CoilGeometry(r_in=0.025, r_out=0.100, num_turns=20)
    I_rms = 16.5
    f_nom = 25000.0

    names = []
    eddy_watts = []
    hyst_watts = []
    coil_watts = []
    efficiencies = []

    for k, mat in MATERIALS.items():
        res = compute_pan_electromagnetics(coil, I_rms, f_nom, mat)
        names.append(mat.name.replace(" Steel", "").replace(" Stainless", " SS"))
        eddy_watts.append(res["p_eddy_w"])
        hyst_watts.append(res["p_hyst_w"])
        coil_watts.append(res["p_coil_loss_w"])
        efficiencies.append(res["electrical_efficiency"] * 100)

    x = np.arange(len(names))
    width = 0.55

    fig, ax1 = plt.subplots(figsize=(10, 5), dpi=250)

    # Stacked bars for power
    p1 = ax1.bar(x, eddy_watts, width, label="Eddy Current Heat [W]", color="#2b5c8f")
    p2 = ax1.bar(x, hyst_watts, width, bottom=eddy_watts, label="Hysteresis Heat [W]", color="#e28743")
    bottom_eddy_hyst = np.array(eddy_watts) + np.array(hyst_watts)
    p3 = ax1.bar(x, coil_watts, width, bottom=bottom_eddy_hyst, label="Coil Copper Loss [W]", color="#888888")

    ax1.set_ylabel("Power Dissipated [W]", fontweight="bold")
    ax1.set_title("Power Distribution (Eddy vs Hysteresis vs Coil Loss) Across Materials", fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(names, rotation=15, ha="right")
    ax1.legend(loc="upper left")

    # Efficiency overlay line
    ax2 = ax1.twinx()
    ax2.plot(x, efficiencies, color="#e63946", marker="o", linewidth=2.2, label="Efficiency $\eta$ [%]")
    ax2.set_ylabel("Electrical Efficiency $\eta$ [%]", color="#e63946", fontweight="bold")
    ax2.tick_params(axis="y", labelcolor="#e63946")
    ax2.set_ylim(40, 105)
    ax2.legend(loc="upper right")

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "fig5_loss_breakdown_and_efficiency.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved: {out_path}")


def main():
    plot_fig1_magnetic_field_map()
    plot_fig2_induced_current_density()
    plot_fig3_skin_depth_materials()
    plot_fig4_power_vs_gap_and_freq()
    plot_fig5_loss_breakdown_and_efficiency()
    print("\nAll 5 figures successfully created in simulation/output/!")


if __name__ == "__main__":
    main()
