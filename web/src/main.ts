/**
 * Orquestador Principal de la Aplicación (En Español)
 * Simulación y Diseño Electromagnético de una Cocina de Inducción
 */
import './style.css';
import { CoilParams, Material, OperatingParams } from './types.ts';
import { MATERIALS } from './constants.ts';
import { runInductionSimulation } from './physics/simulationEngine.ts';
import { FieldCanvasRenderer } from './render/fieldCanvas.ts';
import { SpiralCanvasRenderer } from './render/spiralCanvas.ts';
import { ChartsManager } from './render/chartsManager.ts';
import { ThreeSceneManager } from './render/threeScene.ts';
import { renderTheoryMath } from './render/mathRenderer.ts';

// Estado global de la simulación
const state = {
  coil: {
    r_in: 0.025,
    r_out: 0.100,
    num_turns: 20,
    num_strands: 120,
    strand_diameter: 0.2e-3,
    ferrite_factor: 1.35
  } as CoilParams,
  operating: {
    frequency: 25000,
    I_rms: 16.5,
    z_pan: 0.007,
    pan_radius: 0.110
  } as OperatingParams,
  material: MATERIALS.stainless_430 as Material
};

// Instancias de renderizado
let fieldRenderer: FieldCanvasRenderer;
let spiralRenderer: SpiralCanvasRenderer;
let chartsManager: ChartsManager;
let threeManager: ThreeSceneManager;

function init() {
  // 1. Renderizador 3D Interactivo con Three.js
  const threeContainer = document.getElementById('threeContainer') as HTMLElement;
  if (threeContainer) {
    threeManager = new ThreeSceneManager(threeContainer);
  }

  // 2. Canvases 2D
  const fieldCanvas = document.getElementById('bFieldCanvas') as HTMLCanvasElement;
  const fieldTooltip = document.getElementById('fieldTooltip') as HTMLElement;
  fieldRenderer = new FieldCanvasRenderer(fieldCanvas, fieldTooltip);

  const spiralCanvas = document.getElementById('spiralCanvas') as HTMLCanvasElement;
  spiralRenderer = new SpiralCanvasRenderer(spiralCanvas);

  // 3. Gráficas Científicas
  chartsManager = new ChartsManager();

  // 4. Enlace de Eventos de la Interfaz
  bindControlEvents();
  bindTabEvents();
  bindPresetEvents();
  bindExportEvent();
  bindExplodedViewEvent();

  // 5. Primera pasada de simulación
  updateSimulation();

  // 6. Renderizado de fórmulas KaTeX
  setTimeout(renderTheoryMath, 250);
}

function updateSimulation() {
  const result = runInductionSimulation(state.coil, state.operating, state.material);

  // 1. Tarjetas Superiores de Métricas Clave
  const dispTotalPanPower = document.getElementById('dispTotalPanPower')!;
  const dispPowerBreakdown = document.getElementById('dispPowerBreakdown')!;
  const dispEfficiency = document.getElementById('dispEfficiency')!;
  const dispRReflected = document.getElementById('dispRReflected')!;
  const dispKCoupling = document.getElementById('dispKCoupling')!;
  const dispL1 = document.getElementById('dispL1')!;
  const dispCoilLoss = document.getElementById('dispCoilLoss')!;

  dispTotalPanPower.textContent = `${result.powers.total_pan_power_w.toFixed(1)} W`;
  dispPowerBreakdown.textContent = `Foucault: ${result.powers.p_eddy_w.toFixed(1)} W | Histéresis: ${result.powers.p_hyst_w.toFixed(1)} W`;
  dispEfficiency.textContent = `${result.powers.efficiency_pct.toFixed(1)}%`;
  dispRReflected.textContent = `${result.powers.r_reflected_ohm.toFixed(2)} Ω`;
  dispKCoupling.textContent = `${result.electromagnetic.coupling_factor_k.toFixed(2)}`;
  dispL1.textContent = `${(result.coil.l_1 * 1e6).toFixed(1)} µH`;
  dispCoilLoss.textContent = `${result.powers.p_coil_loss_w.toFixed(1)} W`;

  // 2. Caja de Información del Material y Estado de Compatibilidad
  const dispMur = document.getElementById('dispMur')!;
  const dispSigma = document.getElementById('dispSigma')!;
  const dispSkinDepth = document.getElementById('dispSkinDepth')!;
  const dispSurfaceR = document.getElementById('dispSurfaceR')!;
  const badge = document.getElementById('matCompatibilityBadge')!;

  dispMur.textContent = `${state.material.mu_r.toFixed(1)}`;
  dispSigma.innerHTML = `${(state.material.sigma / 1e6).toFixed(2)} &times; 10<sup>6</sup> S/m`;
  dispSkinDepth.textContent = `${result.electromagnetic.skin_depth_mm.toFixed(3)} mm`;
  dispSurfaceR.textContent = `${(result.electromagnetic.surface_resistance_ohm_sq * 1e3).toFixed(2)} mΩ/cuadro`;

  if (result.powers.efficiency_pct > 88) {
    badge.textContent = 'Óptimo';
    badge.className = 'badge badge-success';
  } else if (result.powers.efficiency_pct > 70) {
    badge.textContent = 'Aceptable';
    badge.className = 'badge badge-warning';
  } else {
    badge.textContent = 'Incompatible';
    badge.className = 'badge badge-danger';
  }

  // 3. Pestaña de Parámetros del Circuito Acoplado
  const setTxt = (id: string, val: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('dispParamL1', `${(result.coil.l_1 * 1e6).toFixed(1)} µH`);
  setTxt('dispParamL2', `${result.electromagnetic.l_2_uh.toFixed(2)} µH`);
  setTxt('dispParamM', `${result.electromagnetic.m_mutual_uh.toFixed(2)} µH`);
  setTxt('dispParamK', `${result.electromagnetic.coupling_factor_k.toFixed(2)}`);
  setTxt('dispParamR1', `${(result.coil.r_1 * 1e3).toFixed(1)} mΩ`);
  setTxt('dispParamR2', `${result.electromagnetic.r_2_mohm.toFixed(1)} mΩ`);
  setTxt('dispParamRref', `${result.powers.r_reflected_ohm.toFixed(2)} Ω`);
  setTxt('dispParamEff', `${result.powers.efficiency_pct.toFixed(1)}%`);

  // 4. Medidas de la Bobina
  setTxt('dispCoilLength', `${result.coil.totalLength.toFixed(2)} m`);
  setTxt('dispCoilPitch', `${(result.coil.pitch * 1e3).toFixed(2)} mm`);

  // 5. Actualizar Renderizadores y Gráficas
  fieldRenderer.render(result);
  spiralRenderer.render(result);
  chartsManager.update(result);
  if (threeManager) {
    threeManager.updateModel(result);
  }
}

function bindControlEvents() {
  // Selector de material
  const matSelect = document.getElementById('matSelect') as HTMLSelectElement;
  const customFields = document.getElementById('customMatFields')!;
  const inputCustomMur = document.getElementById('inputCustomMur') as HTMLInputElement;
  const inputCustomSigma = document.getElementById('inputCustomSigma') as HTMLInputElement;
  const valCustomMur = document.getElementById('valCustomMur')!;
  const valCustomSigma = document.getElementById('valCustomSigma')!;

  matSelect.addEventListener('change', () => {
    if (matSelect.value === 'custom') {
      customFields.classList.remove('hidden');
      state.material = {
        id: 'custom',
        name: 'Material Personalizado',
        mu_r: parseFloat(inputCustomMur.value),
        sigma: parseFloat(inputCustomSigma.value) * 1e6,
        steinmetz_eta: 800.0,
        steinmetz_n: 1.6,
        density: 7500.0,
        isFerromagnetic: parseFloat(inputCustomMur.value) > 2.0,
        description: 'Permeabilidad magnética y conductividad eléctrica definidas por el usuario.'
      };
    } else {
      customFields.classList.add('hidden');
      state.material = MATERIALS[matSelect.value];
    }
    updateSimulation();
  });

  const updateCustomMat = () => {
    valCustomMur.textContent = inputCustomMur.value;
    valCustomSigma.textContent = inputCustomSigma.value;
    if (matSelect.value === 'custom') {
      state.material.mu_r = parseFloat(inputCustomMur.value);
      state.material.sigma = parseFloat(inputCustomSigma.value) * 1e6;
      state.material.isFerromagnetic = state.material.mu_r > 2.0;
      updateSimulation();
    }
  };
  inputCustomMur.addEventListener('input', updateCustomMat);
  inputCustomSigma.addEventListener('input', updateCustomMat);

  // Deslizadores de Geometría de Bobina
  bindSlider('inputRin', 'valRin', (v) => { state.coil.r_in = v * 1e-3; }, ' mm');
  bindSlider('inputRout', 'valRout', (v) => { state.coil.r_out = v * 1e-3; }, ' mm');
  bindSlider('inputTurns', 'valTurns', (v) => { state.coil.num_turns = Math.round(v); }, ' vueltas');
  bindSlider('inputStrands', 'valStrands', (v) => { state.coil.num_strands = Math.round(v); }, ' hilos');

  const checkFerrite = document.getElementById('checkFerrite') as HTMLInputElement;
  checkFerrite.addEventListener('change', () => {
    state.coil.ferrite_factor = checkFerrite.checked ? 1.35 : 1.0;
    updateSimulation();
  });

  // Deslizadores de Excitación
  bindSlider('inputFreq', 'valFreq', (v) => { state.operating.frequency = v * 1e3; }, ' kHz');
  bindSlider('inputCurrent', 'valCurrent', (v) => { state.operating.I_rms = v; }, ' A');
  bindSlider('inputGap', 'valGap', (v) => { state.operating.z_pan = v * 1e-3; }, ' mm');
  bindSlider('inputPanRadius', 'valPanRadius', (v) => { state.operating.pan_radius = v * 1e-3; }, ' mm');

  // Conmutadores del lienzo 2D
  const checkVectors = document.getElementById('checkVectors') as HTMLInputElement;
  const checkHeatmap = document.getElementById('checkHeatmap') as HTMLInputElement;
  const checkOverlayLabels = document.getElementById('checkOverlayLabels') as HTMLInputElement;

  const updateFieldToggles = () => {
    fieldRenderer.setToggles(checkVectors.checked, checkHeatmap.checked, checkOverlayLabels.checked);
  };
  if (checkVectors && checkHeatmap && checkOverlayLabels) {
    checkVectors.addEventListener('change', updateFieldToggles);
    checkHeatmap.addEventListener('change', updateFieldToggles);
    checkOverlayLabels.addEventListener('change', updateFieldToggles);
  }
}

function bindSlider(inputId: string, valId: string, setter: (val: number) => void, unit: string) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const label = document.getElementById(valId);
  if (!input || !label) return;
  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    label.textContent = `${val.toFixed(1)}${unit}`;
    setter(val);
    updateSimulation();
  });
}

function bindTabEvents() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      if (targetId) {
        document.getElementById(targetId)?.classList.add('active');
      }

      // Si se abre la pestaña 3D, forzar reajuste de tamaño del renderizador
      if (targetId === 'tab-3d' && threeManager) {
        window.dispatchEvent(new Event('resize'));
      }
    });
  });
}

function bindPresetEvents() {
  const select = document.getElementById('presetSelect') as HTMLSelectElement;
  if (!select) return;

  select.addEventListener('change', () => {
    const val = select.value;
    const matSelect = document.getElementById('matSelect') as HTMLSelectElement;
    const inputFreq = document.getElementById('inputFreq') as HTMLInputElement;
    const inputCurrent = document.getElementById('inputCurrent') as HTMLInputElement;
    const inputGap = document.getElementById('inputGap') as HTMLInputElement;

    if (val === 'standard_1800w') {
      matSelect.value = 'stainless_430';
      state.material = MATERIALS.stainless_430;
      inputFreq.value = '25.0';
      state.operating.frequency = 25000;
      inputCurrent.value = '28.0';
      state.operating.I_rms = 28.0;
      inputGap.value = '7.0';
      state.operating.z_pan = 0.007;
    } else if (val === 'cast_iron_high') {
      matSelect.value = 'cast_iron';
      state.material = MATERIALS.cast_iron;
      inputFreq.value = '22.0';
      state.operating.frequency = 22000;
      inputCurrent.value = '26.0';
      state.operating.I_rms = 26.0;
      inputGap.value = '6.0';
      state.operating.z_pan = 0.006;
    } else if (val === 'carbon_steel_wok') {
      matSelect.value = 'carbon_steel_1018';
      state.material = MATERIALS.carbon_steel_1018;
      inputFreq.value = '28.0';
      state.operating.frequency = 28000;
      inputCurrent.value = '20.0';
      state.operating.I_rms = 20.0;
      inputGap.value = '7.0';
      state.operating.z_pan = 0.007;
    } else if (val === 'ss304_poor') {
      matSelect.value = 'stainless_304';
      state.material = MATERIALS.stainless_304;
      inputFreq.value = '25.0';
      state.operating.frequency = 25000;
      inputCurrent.value = '16.5';
      state.operating.I_rms = 16.5;
      inputGap.value = '7.0';
      state.operating.z_pan = 0.007;
    } else if (val === 'aluminum_incompatible') {
      matSelect.value = 'aluminum_6061';
      state.material = MATERIALS.aluminum_6061;
      inputFreq.value = '25.0';
      state.operating.frequency = 25000;
      inputCurrent.value = '16.5';
      state.operating.I_rms = 16.5;
      inputGap.value = '7.0';
      state.operating.z_pan = 0.007;
    } else if (val === 'high_gap') {
      matSelect.value = 'stainless_430';
      state.material = MATERIALS.stainless_430;
      inputGap.value = '15.0';
      state.operating.z_pan = 0.015;
    }

    // Actualizar etiquetas
    const setLbl = (id: string, txt: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    setLbl('valFreq', `${(state.operating.frequency / 1e3).toFixed(1)} kHz`);
    setLbl('valCurrent', `${state.operating.I_rms.toFixed(1)} A`);
    setLbl('valGap', `${(state.operating.z_pan * 1e3).toFixed(1)} mm`);

    updateSimulation();
  });
}

function bindExplodedViewEvent() {
  const slider = document.getElementById('inputExploded') as HTMLInputElement;
  const valLabel = document.getElementById('valExploded');
  if (slider && threeManager) {
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      if (valLabel) valLabel.textContent = `${Math.round(v * 100)}%`;
      threeManager.setExplodedFactor(v);
    });
  }
}

function bindExportEvent() {
  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    const result = runInductionSimulation(state.coil, state.operating, state.material);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `simulacion_induccion_${state.material.id}.json`);
    dlAnchor.click();
  });
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', init);
