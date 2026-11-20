# Electromagnetic Simulation and Design of an Induction Cooktop

This project presents a complete electromagnetic modeling, numerical simulation, and interactive visual design suite for an **Induction Cooktop (Cocina de Inducción)**. 

The focus is placed strictly on **Electromagnetism and Classical Electrodynamics** (Maxwell's Equations), bypassing power electronics and treating the coil excitation as a high-frequency alternating current source.

---

## 1. Project Architecture

```
ELT220/
├── docs/
│   └── mathematical_formulation.md   # Complete electromagnetic theory & derivations
│
├── simulation/                        # Python Scientific Simulation Suite
│   ├── physics_engine.py             # Biot-Savart, Elliptic integrals, Faraday, Skin effect, Steinmetz
│   ├── cooktop_simulation.py         # Benchmark runner & material comparison
│   ├── generate_plots.py             # Generates 5 high-resolution scientific figures
│   ├── export_data.py                # Exports benchmark datasets to JSON
│   └── output/                       # Output directory for generated PNGs and JSON
│       ├── fig1_magnetic_field_map.png
│       ├── fig2_induced_current_density.png
│       ├── fig3_skin_depth_materials.png
│       ├── fig4_power_vs_gap_and_freq.png
│       ├── fig5_loss_breakdown_and_efficiency.png
│       └── cooktop_benchmark.json
│
└── web/                              # Interactive Client-Side Web App (Vite + TypeScript)
    ├── index.html                    # Single-page simulation dashboard
    ├── vite.config.js                # Vite build configuration (zero backend/server)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── style.css                 # Sleek dark-mode laboratory theme
        ├── types.ts                  # TypeScript data interfaces
        ├── constants.ts              # Material parameters and physical constants
        ├── main.ts                   # Application bootstrap & UI event handlers
        ├── math/
        │   └── elliptic.ts           # Complete Elliptic Integrals via AGM algorithm
        ├── physics/
        │   ├── biotSavart.ts         # Circular filament Biot-Savart vector field (Br, Bz)
        │   ├── skinEffect.ts         # Skin depth δ(f) and surface resistance Rs
        │   ├── faradayEddy.ts        # Faraday flux linkage, eddy currents, and Joule heating
        │   ├── hysteresis.ts         # Steinmetz volumetric ferromagnetic loss model
        │   ├── inductance.ts         # Wheeler spiral inductance and coupling coefficient k
        │   └── simulationEngine.ts   # Master electrodynamic simulation orchestrator
        └── render/
            ├── fieldCanvas.ts        # 2D B-field heatmap & vector streamline canvas
            ├── spiralCanvas.ts       # 2D Archimedean pancake spiral coil renderer
            ├── chartsManager.ts      # Real-time Chart.js graphs (Current, Heat, Skin, Breakdown)
            └── mathRenderer.ts       # KaTeX mathematical equation renderer
```

---

## 2. Core Electromagnetic Phenomena Covered

1. **Ampère & Biot-Savart Laws:**
   * Planar spiral (pancake) coil geometry parameterization: $r(\theta) = r_{\text{in}} + \frac{r_{\text{out}}-r_{\text{in}}}{2\pi N} \theta$.
   * Accurate magnetic flux density $\mathbf{B}(r, z)$ computed via Complete Elliptic Integrals of the First and Second Kind $K(m)$ and $E(m)$:
     $$B_z(r, z) = \frac{\mu_0 I}{2\pi \sqrt{(a + r)^2 + z^2}} \left[ K(m) + \frac{a^2 - r^2 - z^2}{(a - r)^2 + z^2} E(m) \right]$$
     $$B_r(r, z) = \frac{\mu_0 I z}{2\pi r \sqrt{(a + r)^2 + z^2}} \left[ -K(m) + \frac{a^2 + r^2 + z^2}{(a - r)^2 + z^2} E(m) \right]$$

2. **Faraday-Lenz Law & Eddy Currents:**
   * Time-varying magnetic flux generates an azimuthal electric field:
     $$E_\theta(r) = -j \frac{\omega}{r} \int_0^r r' B_z(r') \, dr'$$
   * Driving surface eddy current density $K_\theta(r)$ and volumetric dissipation $\frac{1}{\sigma}|\mathbf{J}|^2$.

3. **High-Frequency Skin Effect:**
   * Penetration depth in conductors:
     $$\delta = \sqrt{\frac{2}{\omega \mu_0 \mu_r \sigma}}, \quad R_s = \frac{1}{\sigma \delta} = \sqrt{\frac{\omega \mu_0 \mu_r}{2\sigma}}$$
   * Demonstrates why ferromagnetic materials ($\mu_r \approx 150\text{--}300$) produce shallow skin depths ($0.1\text{--}0.2\text{ mm}$) and high surface resistance ($R_s \sim 3\text{--}4\text{ m}\Omega$), while aluminum/copper have tiny $R_s$ and fail to heat efficiently.
   * Litz wire physics in the primary coil: multi-strand transposition ($d_{\text{strand}} < 2\delta_{\text{Cu}}$) to suppress skin and proximity losses.

4. **Ferromagnetic Hysteresis (Steinmetz Equation):**
   * Magnetic domain wall cycling loss:
     $$p_{\text{hyst}} = \eta_{\text{St}} \cdot f \cdot B_{\text{max}}^n \quad [\text{W/m}^3]$$
   * Accounts for $5\text{--}15\%$ of the total cookware heat generation in cast iron and 430 stainless steel.

5. **Mutual Inductance & Reflected Impedance:**
   * Cookware base modeled as an inductively coupled secondary loop:
     $$R_{\text{reflected}} = \frac{\omega^2 M^2 R_2}{R_2^2 + (\omega L_2)^2}$$
   * Explains why the inverter cannot deliver real power to non-magnetic aluminum or copper ($R_2 \to 0 \implies R_{\text{ref}} \to 0$).

---

## 3. Running the Python Simulations

From the project root:

```bash
# 1. Run the benchmark comparison across cookware materials
python simulation/cooktop_simulation.py

# 2. Generate all 5 publication-quality scientific plots
python simulation/generate_plots.py

# 3. Export benchmark dataset to JSON
python simulation/export_data.py
```

Generated plots will be saved in `simulation/output/`:
* `fig1_magnetic_field_map.png`: 2D $(r, z)$ heatmap of $|\mathbf{B}|$ and field streamlines.
* `fig2_induced_current_density.png`: Radial surface current density $K_\theta(r)$ and annular heat distribution.
* `fig3_skin_depth_materials.png`: Skin depth vs. frequency ($10\text{--}100\text{ kHz}$) across 6 materials.
* `fig4_power_vs_gap_and_freq.png`: Power and efficiency vs. lift-off gap $z_{\text{pan}}$ and frequency $f$.
* `fig5_loss_breakdown_and_efficiency.png`: Stacked loss breakdown (Eddy vs. Hysteresis vs. Coil loss).

---

## 4. Running the Interactive Vite Web App (No Server)

The web dashboard is fully client-side and can be run with Vite or statically opened:

```bash
cd web

# Start development preview server:
npm run dev

# Or build the static distribution:
npm run build
```

Once running, navigate to `http://localhost:5173/` to explore:
* **Real-time 2D $|\mathbf{B}|$ Heatmap & Vector Probes:** Hover over any coordinate to measure $B_r, B_z, |\mathbf{B}|$.
* **Archimedean Spiral Coil Visualizer:** Dynamic coil turns, pitch, and current paths.
* **Eddy Current & Annular Heat Graphs:** Live Chart.js radial plots.
* **Skin Depth & Material Explorer:** Interactive material selector (Cast Iron, Stainless 430, 1018 Steel, Aluminum, Copper, Custom).
* **Coupled Transformer Specs:** Mutual inductance $M$, coupling factor $k$, and transfer efficiency $\eta$.
* **Data Exporter:** One-click JSON export of any custom simulation configuration.
