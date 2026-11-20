/**
 * Renderizador de Ecuaciones Matemáticas con KaTeX (En Español)
 */

declare global {
  interface Window {
    katex?: {
      render: (latex: string, element: HTMLElement, options?: Record<string, unknown>) => void;
    };
  }
}

export function renderTheoryMath() {
  const renderElem = (id: string, latex: string) => {
    const el = document.getElementById(id);
    if (el && window.katex) {
      window.katex.render(latex, el, { displayMode: true, throwOnError: false });
    }
  };

  // 1. Biot-Savart
  renderElem(
    'mathBiotSavart',
    `B_z(r, z) = \\frac{\\mu_0 I}{2\\pi \\sqrt{(a+r)^2 + z^2}} \\left[ K(m) + \\frac{a^2 - r^2 - z^2}{(a-r)^2 + z^2} E(m) \\right]`
  );

  // 2. Faraday-Lenz
  renderElem(
    'mathFaraday',
    `\\oint \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{\\partial}{\\partial t} \\iint \\mathbf{B} \\cdot d\\mathbf{A} \\implies E_\\theta(r) = -\\frac{j\\omega}{r} \\int_0^r r' B_z(r') dr'`
  );

  // 3. Skin Effect & Surface Resistance
  renderElem(
    'mathSkinDepth',
    `\\delta = \\sqrt{\\frac{2}{\\omega \\mu_0 \\mu_r \\sigma}}, \\quad R_s = \\frac{1}{\\sigma \\delta} = \\sqrt{\\frac{\\omega \\mu_0 \\mu_r}{2\\sigma}}`
  );

  // 4. Hysteresis (Steinmetz)
  renderElem(
    'mathSteinmetz',
    `p_{\\mathrm{hyst}} = \\eta_{\\mathrm{St}} \\cdot f \\cdot B_{\\mathrm{max}}^n, \\quad P_{\\mathrm{total}} = P_{\\mathrm{eddy}} + P_{\\mathrm{hyst}}`
  );

  // 5. Wheeler Inductance & Coupled Circuit
  renderElem(
    'mathWheeler',
    `L_1 \\approx \\frac{31.33 \\mu_0 N^2 a^2}{8a + 11c}, \\quad R_{\\mathrm{ref}} = \\frac{\\omega^2 M^2 R_2}{R_2^2 + (\\omega L_2)^2}`
  );
}
