/**
 * Presentación de producto: visor 3D del diseño de referencia.
 * No carga gráficas ni controles de simulación.
 */
import './dashboard.css';
import { CoilParams, OperatingParams } from './types.ts';
import { MATERIALS } from './constants.ts';
import { runInductionSimulation } from './physics/simulationEngine.ts';
import { ThreeSceneManager } from './render/threeScene.ts';

const REFERENCE_COIL: CoilParams = {
  r_in: 0.025,
  r_out: 0.100,
  num_turns: 20,
  num_strands: 120,
  strand_diameter: 0.2e-3,
  ferrite_factor: 1.35
};

const REFERENCE_OPERATING: OperatingParams = {
  frequency: 25000,
  I_rms: 16.5,
  z_pan: 0.007,
  pan_radius: 0.110
};

function init() {
  const stage = document.getElementById('productStage');
  if (!stage) return;

  const scene = new ThreeSceneManager(stage);
  const result = runInductionSimulation(
    REFERENCE_COIL,
    REFERENCE_OPERATING,
    MATERIALS.stainless_430
  );
  scene.updateModel(result);
  window.dispatchEvent(new Event('resize'));

  // Scroll-driven: el conjunto se abre a medida que se recorre la página
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scene.setExplodedFactor(Math.max(0, Math.min(1, (p - 0.12) / 0.5)));
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

window.addEventListener('DOMContentLoaded', init);
