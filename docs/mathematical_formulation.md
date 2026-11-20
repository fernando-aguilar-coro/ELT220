# Electromagnetic Modeling and Design of an Induction Cooktop

## 1. Introduction and System Overview

An induction cooktop transfers electrical energy directly into cookware via magnetic induction rather than thermal conduction or radiation. The system consists of:
1. **Power Inverter:** High-frequency resonant inverter (half-bridge or full-bridge quasi-resonant topology) operating between $20\text{ kHz}$ and $50\text{ kHz}$.
2. **Work Coil:** Planar spiral (pancake) coil wound with Litz wire to minimize AC resistance.
3. **Flux Concentrators:** Radial ferrite bars placed beneath the coil to channel magnetic flux upward, shield internal electronics, and increase coupling.
4. **Ceramic-Glass Top:** Non-magnetic, non-conductive dielectric spacer ($d_{\text{glass}} \approx 4\text{--}6\text{ mm}$).
5. **Cookware Base:** Conducting, ferromagnetic plate (cast iron, 430 ferritic stainless steel, or multi-ply composite) where eddy currents and hysteresis dissipate heat.

```
       [ Cookware Base (Ferromagnetic Conductor: \mu_r, \sigma) ]   z = z_pan
       =========================================================
       ---------------------------------------------------------   z = d_glass
       [          Ceramic-Glass Dielectric Layer               ]
       ---------------------------------------------------------   z = 0
       (o) (o) (o) [ Planar Spiral Pancake Coil (Litz) ] (o) (o) (o)
       =========================================================   z = -d_ferrite
       [        Ferrite Bars (Magnetic Shield / Concentrator)  ]
```

---

## 2. Planar Spiral (Pancake) Coil Geometry

### 2.1 Spiral Parameterization
An Archimedean planar spiral in polar coordinates $(r, \theta)$ with inner radius $r_{\text{in}}$, outer radius $r_{\text{out}}$, and $N$ turns is described by:

$$r(\theta) = r_{\text{in}} + \frac{r_{\text{out}} - r_{\text{in}}}{2\pi N} \theta, \quad \theta \in [0, 2\pi N]$$

The turn-to-turn pitch is:
$$p = \frac{r_{\text{out}} - r_{\text{in}}}{N}$$

The total conductor length $L_{\text{coil}}$ is:
$$L_{\text{coil}} = \int_0^{2\pi N} \sqrt{r(\theta)^2 + \left(\frac{dr}{d\theta}\right)^2} d\theta \approx \pi N (r_{\text{in}} + r_{\text{out}})$$

### 2.2 Coil Self-Inductance (Harold Wheeler Formulation)
For a planar spiral coil, Harold Wheeler's empirical formula provides high accuracy:

$$L_c \approx \frac{31.33 \mu_0 N^2 a^2}{8a + 11c} \quad [\text{H}]$$

where:
* $a = \frac{r_{\text{in}} + r_{\text{out}}}{2}$ is the mean radius (in meters).
* $c = r_{\text{out}} - r_{\text{in}}$ is the radial depth (in meters).
* $\mu_0 = 4\pi \times 10^{-7}\text{ H/m}$.

---

## 3. Magnetic Field Calculation (Biot-Savart Law & Elliptic Integrals)

To determine the magnetic flux density $\mathbf{B}(r, z)$ at any point in cylindrical coordinates $(r, \phi, z)$, we approximate the continuous spiral as $N$ concentric circular filaments.

Each $k$-th filament has radius:
$$a_k = r_{\text{in}} + \left(k - \frac{1}{2}\right) \frac{r_{\text{out}} - r_{\text{in}}}{N}, \quad k = 1, 2, \dots, N$$
and carries an alternating current $I(t) = I_0 \cos(\omega t)$ with $\omega = 2\pi f$.

### 3.1 Field of a Single Circular Filament
For a single loop of radius $a$ located in the plane $z'=0$ carrying current $I$:

$$B_z(r, z) = \frac{\mu_0 I}{2\pi \sqrt{(a + r)^2 + z^2}} \left[ K(m) + \frac{a^2 - r^2 - z^2}{(a - r)^2 + z^2} E(m) \right]$$

$$B_r(r, z) = \frac{\mu_0 I z}{2\pi r \sqrt{(a + r)^2 + z^2}} \left[ -K(m) + \frac{a^2 + r^2 + z^2}{(a - r)^2 + z^2} E(m) \right]$$

where the elliptic parameter is:
$$m = k^2 = \frac{4 a r}{(a + r)^2 + z^2}$$

and $K(m)$ and $E(m)$ are the complete elliptic integrals of the first and second kind:
$$K(m) = \int_0^{\pi/2} \frac{d\theta}{\sqrt{1 - m \sin^2\theta}}, \quad E(m) = \int_0^{\pi/2} \sqrt{1 - m \sin^2\theta} \, d\theta$$

On the axis of symmetry ($r = 0$):
$$B_z(0, z) = \frac{\mu_0 I a^2}{2 (a^2 + z^2)^{3/2}}, \quad B_r(0, z) = 0$$

### 3.2 Total Magnetic Field
By linear superposition:
$$\mathbf{B}(r, z) = \sum_{k=1}^N \left[ B_{r, k}(r, z) \hat{\mathbf{r}} + B_{z, k}(r, z) \hat{\mathbf{z}} \right]$$

When ferrite bars are added beneath the coil ($z < 0$), image theory or a flux-concentration multiplier $\kappa_{\text{ferrite}} \approx 1.25\text{--}1.40$ accounts for the enhanced upward flux.

---

## 4. Skin Effect and Conductor Physics

### 4.1 Skin Depth in the Cookware ($\delta_{\text{pan}}$)
The penetration depth of an electromagnetic plane wave in a linear conducting medium is:

$$\delta = \sqrt{\frac{2}{\omega \mu \sigma}} = \sqrt{\frac{1}{\pi f \mu_0 \mu_r \sigma}}$$

where:
* $f$: operating frequency ($20\text{--}50\text{ kHz}$)
* $\mu = \mu_0 \mu_r$: magnetic permeability
* $\sigma$: electrical conductivity ($\text{S/m}$)

#### Material Comparison at $f = 25\text{ kHz}$:
| Material | Relative Permeability $\mu_r$ | Conductivity $\sigma$ ($\text{S/m}$) | Skin Depth $\delta$ | Surface Resistance $R_s$ ($\Omega/\square$) | Compatibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cast Iron** | $\sim 200$ | $1.5 \times 10^6$ | $0.26\text{ mm}$ | $2.56 \times 10^{-3}$ | **Optimal** |
| **430 Ferritic Stainless** | $\sim 300$ | $1.7 \times 10^6$ | $0.20\text{ mm}$ | $2.94 \times 10^{-3}$ | **Optimal** |
| **Carbon Steel (1018)** | $\sim 150$ | $6.0 \times 10^6$ | $0.17\text{ mm}$ | $0.98 \times 10^{-3}$ | **Very Good** |
| **304 Austenitic Stainless** | $1.02$ | $1.4 \times 10^6$ | $2.69\text{ mm}$ | $0.27 \times 10^{-3}$ | **Poor** (non-magnetic) |
| **Aluminum (6061)** | $1.0$ | $3.5 \times 10^7$ | $0.54\text{ mm}$ | $0.05 \times 10^{-3}$ | **Incompatible** |
| **Copper (OFHC)** | $1.0$ | $5.8 \times 10^7$ | $0.41\text{ mm}$ | $0.04 \times 10^{-3}$ | **Incompatible** |

**Physics takeaway:** Aluminum and copper have extremely small surface resistance $R_s$. For a given induced current $I_{\text{ind}}$, the power dissipated $P = I_{\text{ind}}^2 R_s$ is very small, while drawing excessive reactive power and overheating the inverter. Ferromagnetic cookware combines moderate conductivity with high permeability $\mu_r \gg 1$, yielding both high $R_s$ and shallow current penetration.

### 4.2 Litz Wire in the Primary Coil
In the primary coil, copper heating must be minimized. At $25\text{ kHz}$, the skin depth in copper is $\delta_{\text{Cu}} \approx 0.41\text{ mm}$.
If a solid wire of diameter $D = 2.5\text{ mm}$ were used:
$$\frac{D}{2\delta_{\text{Cu}}} \approx 3.0 \gg 1$$
which causes massive skin and proximity effect resistance increases ($R_{\text{AC}} / R_{\text{DC}} > 5$).

Using **Litz wire** consisting of $N_s$ isolated strands with diameter $d_s \le 0.2\text{ mm} < \delta_{\text{Cu}}$ suppresses both skin and intra-bundle proximity effects:
$$R_{\text{AC, coil}} \approx R_{\text{DC}} \left[ 1 + \frac{\pi^2 \omega^2 \mu_0^2 N_s^2 d_s^6 \sigma^2}{768 D_{\text{bundle}}^2} \right] \approx 1.05\text{--}1.15 \cdot R_{\text{DC}}$$

---

## 5. Induced Eddy Currents and Power Dissipation

### 5.1 Induced Electric Field
Applying Faraday's Law in integral form along a circular contour of radius $r$ in the pan plane ($z = z_{\text{pan}}$):

$$\oint \mathbf{E} \cdot d\boldsymbol{\ell} = -\frac{d}{dt} \iint \mathbf{B} \cdot d\mathbf{A}$$

By axial symmetry, $\mathbf{E} = E_\theta(r) \hat{\boldsymbol{\theta}}$:
$$2\pi r E_\theta(r) = -j \omega \Phi(r) = -j \omega \int_0^r 2\pi r' B_z(r', z_{\text{pan}}) dr'$$

$$E_\theta(r) = -j \frac{\omega}{r} \int_0^r r' B_z(r', z_{\text{pan}}) dr'$$

### 5.2 Linear Surface Current Density $K_\theta(r)$
In the thin skin layer limit ($\delta \ll \text{thickness}$), the surface impedance is:
$$Z_s = R_s (1 + j) = \frac{1 + j}{\sigma \delta}$$

The surface current density in the pan bottom is:
$$K_\theta(r) = \frac{E_\theta(r)}{Z_s}$$

### 5.3 Eddy Current Joule Heating
The total power dissipated by eddy currents is obtained by integrating the surface power density across the cookware radius $R_{\text{pan}}$:

$$P_{\text{eddy}} = \int_0^{R_{\text{pan}}} 2\pi r \cdot \frac{1}{2} R_s |K_\theta(r)|^2 \, dr = \pi R_s \int_0^{R_{\text{pan}}} r |K_\theta(r)|^2 \, dr$$

---

## 6. Hysteresis Losses (Steinmetz Equation)

Ferromagnetic cookware undergoes microscopic magnetic domain wall motion and pinning as $\mathbf{B}$ alternates at frequency $f$. The volumetric hysteresis loss density is governed by the empirical Steinmetz equation:

$$p_{\text{hyst}} = \eta_{\text{St}} \cdot f \cdot B_{\max}^n \quad [\text{W/m}^3]$$

where:
* $\eta_{\text{St}}$: Steinmetz material constant ($\approx 500\text{--}1200\text{ J/m}^3$ for cookware steels)
* $n$: Steinmetz exponent ($\approx 1.6\text{--}2.0$)
* $B_{\max}$: Peak flux density inside the cookware skin depth

Integrating over the active volume ($V \approx \pi R_{\text{pan}}^2 \delta_{\text{pan}}$):
$$P_{\text{hyst}} \approx \eta_{\text{St}} \cdot f \cdot B_{\max}^n \cdot \left(\pi R_{\text{pan}}^2 \delta_{\text{pan}}\right)$$

### Total Thermal Power Generated:
$$P_{\text{total}} = P_{\text{eddy}} + P_{\text{hyst}}$$
In typical cast iron or 430 stainless cookware:
* $P_{\text{eddy}} \approx 85\%\text{--}92\%$ of total heat.
* $P_{\text{hyst}} \approx 8\%\text{--}15\%$ of total heat.

---

## 7. Equivalent Transformer Circuit Model

The system operates as a loosely-coupled transformer:
* **Primary (1):** Pancake coil with series resistance $R_1$ and self-inductance $L_1$.
* **Secondary (2):** Cookware base treated as a single short-circuited turn with resistance $R_2$ and self-inductance $L_2$.
* **Coupling:** Mutual inductance $M = k \sqrt{L_1 L_2}$, where $k \approx 0.5\text{--}0.7$.

```
    Primary (Inverter)                 Secondary (Cookware)
      +---[ R_1 ]---[ L_1 ]---+          +---[ R_2 ]---[ L_2 ]---+
      |                       |          |                       |
   V_in(t)                 (M)|<-------->|(M)                 (Short)
      |                       |          |                       |
      +-----------------------+          +-----------------------+
```

### 7.1 Reflected Impedance
The secondary loop equation is:
$$0 = (R_2 + j\omega L_2) I_2 + j\omega M I_1 \implies I_2 = -\frac{j\omega M}{R_2 + j\omega L_2} I_1$$

The total impedance seen by the primary inverter:
$$Z_{\text{eq}} = R_1 + j\omega L_1 + Z_{\text{reflected}}$$

$$Z_{\text{reflected}} = \frac{\omega^2 M^2}{R_2^2 + \omega^2 L_2^2} (R_2 - j\omega L_2) = R_{\text{ref}} - j X_{\text{ref}}$$

### 7.2 System Electrical Efficiency
The electromagnetic transfer efficiency from the coil to the cookware is:
$$\eta_{\text{elec}} = \frac{P_{\text{pan}}}{P_{\text{total}}} = \frac{I_1^2 R_{\text{ref}}}{I_1^2 (R_1 + R_{\text{ref}})} = \frac{R_{\text{ref}}}{R_1 + R_{\text{ref}}}$$

In a well-designed induction system with Litz wire and ferromagnetic cookware:
$$\eta_{\text{elec}} \ge 90\%$$
whereas with an aluminum pan, $R_{\text{ref}}$ drops precipitously, collapsing efficiency below $30\%$ and causing the safety circuit to trip.
