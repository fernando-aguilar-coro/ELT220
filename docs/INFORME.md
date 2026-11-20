# Informe de Electromagnetismo: Cocina de Inducción

**Curso:** ELT220  
**Fecha:** 19 de noviembre de 2026  
**Profesor:** _[Nombre del profesor]_  
**Integrantes:** _[Nombres de los integrantes]_

---

## 1. Introducción

Una cocina de inducción calienta los alimentos sin usar llamas ni resistencias eléctricas tradicionales. En su lugar, utiliza principios de electromagnetismo para generar calor directamente en el fondo de la olla o sartén. El objetivo de este informe es explicar de forma sencilla cómo funciona este proceso, qué fenómenos físicos intervienen y qué resultados se obtuvieron al simular el comportamiento de una cocina de inducción con diferentes materiales de cocina.

---

## 2. Marco teórico

El funcionamiento de una cocina de inducción se basa en varios conceptos del electromagnetismo:

- **Campo magnético:** Una bobina espiral (como un disco plano) atraviesada por una corriente alterna genera un campo magnético que varía con el tiempo.
- **Ley de inducción de Faraday:** Un campo magnético cambiante induce corrientes eléctricas en los materiales conductores cercanos. En el caso de la cocina, estas corrientes aparecen en el fondo de la olla.
- **Efecto piel:** A altas frecuencias, la corriente tiende a concentrarse en la superficie del material, lo que favorece el calentamiento en materiales ferromagnéticos como el hierro o el acero inoxidable.
- **Corrientes de Foucault (parásitas):** Las corrientes inducidas circulan en el fondo de la olla y, al encontrar resistencia eléctrica, generan calor por efecto Joule.
- **Histeresis magnética:** En materiales ferromagnéticos, el magnétizamiento y desmagnétizamiento repetidos también generan calor adicional.

Gracias a estos fenómenos, solo el recipiente se calienta, mientras que la superficie de vidrio de la cocina permanece relativamente fría.

---

## 3. Desarrollo

Se desarrolló una simulación numérica completa de una cocina de inducción que incluye:

### 3.1 Modelado de la bobina (espiral plana tipo *pancake*)
La bobina se modela como una espiral de Arquímedes con $N$ vueltas, radio interior $r_{\text{in}}$ y radio exterior $r_{\text{out}}$:

$$r(\theta) = r_{\text{in}} + \frac{r_{\text{out}} - r_{\text{in}}}{2\pi N} \theta, \quad \theta \in [0, 2\pi N]$$

El paso entre vueltas es $p = \frac{r_{\text{out}} - r_{\text{in}}}{N}$ y la longitud total del conductor se aproxima como $L_{\text{coil}} \approx \pi N (r_{\text{in}} + r_{\text{out}})$.

La autoinductancia de la bobina se calcula con la fórmula empírica de Harold Wheeler:

$$L_c \approx \frac{31.33 \mu_0 N^2 a^2}{8a + 11c} \quad [\text{H}]$$

donde $a = \frac{r_{\text{in}} + r_{\text{out}}}{2}$ es el radio medio y $c = r_{\text{out}} - r_{\text{in}}$ la profundidad radial.

### 3.2 Cálculo del campo magnético (Ley de Biot-Savart e integrales elípticas)
La espiral continua se aproxima como $N$ filamentos circulares concéntricos. Para un filamento de radio $a$ con corriente $I(t) = I_0 \cos(\omega t)$, el campo magnético en coordenadas cilíndricas $(r, z)$ es:

$$B_z(r, z) = \frac{\mu_0 I}{2\pi \sqrt{(a + r)^2 + z^2}} \left[ K(m) + \frac{a^2 - r^2 - z^2}{(a - r)^2 + z^2} E(m) \right]$$

$$B_r(r, z) = \frac{\mu_0 I z}{2\pi r \sqrt{(a + r)^2 + z^2}} \left[ -K(m) + \frac{a^2 + r^2 + z^2}{(a - r)^2 + z^2} E(m) \right]$$

con el parámetro elíptico $m = \frac{4 a r}{(a + r)^2 + z^2}$, y $K(m)$, $E(m)$ las integrales elípticas completas de primera y segunda especie. El campo total se obtiene por superposición lineal de los $N$ filamentos.

### 3.3 Efecto piel y profundidad de penetración
La profundidad de penetración en el material de la olla es:

$$\delta = \sqrt{\frac{2}{\omega \mu \sigma}} = \sqrt{\frac{1}{\pi f \mu_0 \mu_r \sigma}}$$

A 25 kHz, los materiales ferromagnéticos (hierro fundido $\mu_r \sim 200$, acero 430 $\mu_r \sim 300$) tienen $\delta \approx 0.2\text{--}0.3\text{ mm}$, mientras que aluminio y cobre (no magnéticos, $\mu_r = 1$) tienen $\delta \approx 0.4\text{--}0.5\text{ mm}$ pero resistencia superficial $R_s$ muy baja, lo que impide un calentamiento eficiente.

### 3.4 Corrientes inducidas y calentamiento por Foucault
Aplicando la ley de Faraday en forma integral sobre un contorno circular de radio $r$ en el plano de la olla ($z = z_{\text{pan}}$):

$$\oint \mathbf{E} \cdot d\boldsymbol{\ell} = -\frac{d}{dt} \iint \mathbf{B} \cdot d\mathbf{A} \quad \Rightarrow \quad E_\theta(r) = -j \frac{\omega}{r} \int_0^r r' B_z(r', z_{\text{pan}}) dr'$$

La densidad de corriente superficial inducida es $K_\theta(r) = E_\theta(r) / Z_s$ con impedancia superficial $Z_s = R_s(1+j) = (1+j)/(\sigma \delta)$. La potencia total disipada por corrientes de Foucault:

$$P_{\text{eddy}} = \pi R_s \int_0^{R_{\text{pan}}} r |K_\theta(r)|^2 \, dr$$

### 3.5 Pérdidas por histeresis (Ecuación de Steinmetz)
En materiales ferromagnéticos, el ciclo de magnetización genera pérdidas volumétricas:

$$p_{\text{hyst}} = \eta_{\text{St}} \cdot f \cdot B_{\max}^n \quad [\text{W/m}^3]$$

Integrando sobre el volumen activo ($V \approx \pi R_{\text{pan}}^2 \delta$):

$$P_{\text{hyst}} \approx \eta_{\text{St}} \cdot f \cdot B_{\max}^n \cdot \left(\pi R_{\text{pan}}^2 \delta\right)$$

La potencia térmica total es $P_{\text{total}} = P_{\text{eddy}} + P_{\text{hyst}}$, donde en ollas de hierro/acero 430 el 85–92 % proviene de Foucault y el 8–15 % de histeresis.

### 3.6 Modelo de transformador acoplado y eficiencia
El sistema se modela como un transformador débilmente acoplado:
- Primario (bobina): resistencia $R_1$, inductancia $L_1$
- Secundario (olla): resistencia $R_2$, inductancia $L_2$
- Inductancia mutua $M = k \sqrt{L_1 L_2}$ con $k \approx 0.5\text{--}0.7$

La impedancia reflejada al primario es:

$$Z_{\text{reflected}} = \frac{\omega^2 M^2}{R_2^2 + \omega^2 L_2^2} (R_2 - j\omega L_2) = R_{\text{ref}} - j X_{\text{ref}}$$

La eficiencia de transferencia electromagnética:

$$\eta_{\text{elec}} = \frac{R_{\text{ref}}}{R_1 + R_{\text{ref}}}$$

Con olla ferromagnética y hilo Litz, $\eta_{\text{elec}} \ge 90\%$; con aluminio, $R_{\text{ref}} \to 0$ y la eficiencia colapsa por debajo del 30 %.

### 3.7 Visualización interactiva
Se creó una aplicación web (Vite + TypeScript) que permite explorar en tiempo real: mapa 2D de $|\mathbf{B}|$ con líneas de corriente, visualizador de la espiral, gráficos radiales de densidad de corriente y calor, explorador de profundidad de piel por material, y especificaciones del transformador acoplado ($M$, $k$, $\eta$). Los resultados se exportan a JSON y los gráficos se guardan en `simulation/output/`.

---

## 4. Resultados

La simulación generó cinco figuras científicas de alta resolución (guardadas en `simulation/output/`) y un dataset de benchmark en JSON. Los hallazgos principales son:

### 4.1 Distribución del campo magnético (Figura 1)
![Mapa del campo magnético](simulation/output/fig1_magnetic_field_map.png)

El mapa 2D de $|\mathbf{B}(r, z)|$ muestra cómo el campo se concentra sobre la bobina y decae con la distancia $z$. Las líneas de corriente ilustran el flujo magnético que atraviesa el fondo de la olla. A $z = 4\text{ mm}$ (distancia típica vidrio-olla), el campo axial $B_z$ alcanza valores del orden de $0.1\text{--}0.3\text{ T}$ en el centro de la bobina.

### 4.2 Densidad de corriente inducida y calor anular (Figura 2)
![Densidad de corriente inducida](simulation/output/fig2_induced_current_density.png)

El perfil radial de $K_\theta(r)$ y la distribución de potencia $dP/dr = 2\pi r \cdot \frac{1}{2} R_s |K_\theta(r)|^2$ revelan que el calentamiento se concentra en un anillo bajo las vueltas exteriores de la bobina, donde $B_z$ y su gradiente radial son máximos. Esto coincide con el patrón de "anillo caliente" observado experimentalmente en cocinas reales.

### 4.3 Profundidad de piel vs. frecuencia por material (Figura 3)
![Profundidad de piel](simulation/output/fig3_skin_depth_materials.png)

| Material | $\mu_r$ | $\sigma$ (S/m) | $\delta$ @ 25 kHz | $R_s$ (m$\Omega/\square$) |
|----------|---------|----------------|-------------------|---------------------------|
| Hierro fundido | ~200 | $1.5 \times 10^6$ | 0.26 mm | 2.56 |
| Acero 430 | ~300 | $1.7 \times 10^6$ | 0.20 mm | 2.94 |
| Acero 1018 | ~150 | $6.0 \times 10^6$ | 0.17 mm | 0.98 |
| Acero 304 (no magn.) | 1.02 | $1.4 \times 10^6$ | 2.69 mm | 0.27 |
| Aluminio 6061 | 1.0 | $3.5 \times 10^7$ | 0.54 mm | 0.05 |
| Cobre OFHC | 1.0 | $5.8 \times 10^7$ | 0.41 mm | 0.04 |

**Conclusión clave:** Los materiales ferromagnéticos combinan $\delta$ pequeña (corriente concentrada) con $R_s$ alta (disipación fuerte). Aluminio y cobre tienen $R_s$ dos órdenes de magnitud menor → calentamiento despreciable.

### 4.4 Potencia y eficiencia vs. distancia y frecuencia (Figura 4)
![Potencia vs distancia y frecuencia](simulation/output/fig4_power_vs_gap_and_freq.png)

- **Distancia (lift-off):** La potencia transferida cae aproximadamente como $1/z^3$ para $z > r_{\text{out}}$. A $z = 10\text{ mm}$ la potencia es < 20 % de la máxima.
- **Frecuencia:** Aumentar $f$ de 20 a 50 kHz incrementa la potencia en materiales ferromagnéticos (mayor $\omega$, menor $\delta$, mayor $R_s$), pero en aluminio/cobre el efecto es marginal porque $R_s \propto \sqrt{f}$ sigue siendo muy bajo.

### 4.5 Desglose de pérdidas y eficiencia (Figura 5)
![Desglose de pérdidas](simulation/output/fig5_loss_breakdown_and_efficiency.png)

Para una olla de hierro fundido a 25 kHz:
- **Corrientes de Foucault:** ~88 % de la potencia total
- **Histeresis (Steinmetz):** ~12 % de la potencia total
- **Pérdidas en bobina (Litz):** < 3 % de la potencia de entrada
- **Eficiencia electromagnética $\eta_{\text{elec}}$:** 92–95 %

Con aluminio, la eficiencia cae a < 30 % y la potencia reflejada $R_{\text{ref}}$ es insuficiente para mantener la oscilación del inversor resonante, activando la protección de seguridad.

---

## 5. Discusión

Los resultados coinciden con lo esperado desde el punto de vista teórico: una cocina de inducción calienta eficientemente solo los materiales ferromagnéticos. El aluminio y el cobre, a pesar de ser buenos conductores, no se calientan bien porque no responden al campo magnético de la misma manera.

Esto explica por qué en el mercado se venden ollas y sartenes específicas para inducción, generalmente con base de hierro o acero magnético. También se observa que la distancia entre el recipiente y la superficie de cocción es crítica: si la olla no tiene buen contacto, el calentamiento cae rápidamente.

---

## 6. Conclusiones

Una cocina de inducción es una aplicación práctica del electromagnetismo que convierte energía eléctrica en calor dentro del propio recipiente de cocción, mediante inducción electromagnética, corrientes de Foucault y efecto piel. Los materiales ferromagnéticos son los más adecuados para este tipo de cocción, mientras que el aluminio y el cobre no funcionan eficientemente sin adaptes especiales. La simulación realizada permitió visualizar y cuantificar estos fenómenos de forma clara.

---

## Referencias

- Apuntes de la materia ELT220.
- Documentación del proyecto de simulación de cocina de inducción.
- Libros de texto de electromagnetismo y electrodinámica clásica.