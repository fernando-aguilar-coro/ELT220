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

function captionFor(factor: number): string {
  if (factor < 0.08) {
    return 'Conjunto cerrado. La vitrocerámica queda entre la bobina y la base, y el anillo de calor ya está en el metal.';
  }
  if (factor < 0.4) {
    return 'La base se levanta. El anillo naranja es calor en el fondo del recipiente, no en el vidrio.';
  }
  if (factor < 0.72) {
    return 'El vidrio queda al descubierto: sostiene la olla y deja pasar el campo. No es una resistencia.';
  }
  return 'Abajo, la bobina de cobre genera el campo y las barras de ferrita lo concentran hacia la olla.';
}

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

  const slider = document.getElementById('inputExploded') as HTMLInputElement | null;
  const percent = document.getElementById('valExploded');
  const caption = document.getElementById('explodeCaption');
  if (!slider) return;

  const apply = () => {
    const value = parseFloat(slider.value);
    scene.setExplodedFactor(value);
    if (percent) percent.textContent = `${Math.round(value * 100)}%`;
    if (caption) caption.textContent = captionFor(value);
  };

  slider.addEventListener('input', apply);
}

window.addEventListener('DOMContentLoaded', init);
