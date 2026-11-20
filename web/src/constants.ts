/**
 * Constantes Electromagnéticas y Catálogo de Materiales (En Español)
 */
import { Material } from './types.ts';

export const MU_0 = 4.0 * Math.PI * 1e-7; // Permeabilidad del vacío [H/m]
export const SIGMA_CU = 5.8e7;             // Conductividad del cobre puro [S/m]

export const MATERIALS: Record<string, Material> = {
  stainless_430: {
    id: "stainless_430",
    name: "Acero Inoxidable Ferrítico 430",
    mu_r: 300.0,
    sigma: 1.7e6,
    steinmetz_eta: 950.0,
    steinmetz_n: 1.6,
    density: 7700.0,
    isFerromagnetic: true,
    description: "Acero magnético estándar para bases de cocinas de inducción modernas. Su alta permeabilidad μ_r reduce drásticamente la penetración pelicular y maximiza la resistencia superficial Rs."
  },
  cast_iron: {
    id: "cast_iron",
    name: "Hierro Fundido (Cast Iron)",
    mu_r: 200.0,
    sigma: 1.5e6,
    steinmetz_eta: 850.0,
    steinmetz_n: 1.6,
    density: 7200.0,
    isFerromagnetic: true,
    description: "Excelente respuesta a la inducción. Alta permeabilidad magnética combinada con conductividad moderada y gran capacidad térmica."
  },
  carbon_steel_1018: {
    id: "carbon_steel_1018",
    name: "Acero al Carbono 1018",
    mu_r: 150.0,
    sigma: 6.0e6,
    steinmetz_eta: 700.0,
    steinmetz_n: 1.6,
    density: 7850.0,
    isFerromagnetic: true,
    description: "Típico en woks y sartenes tradicionales. Fuerte atracción magnética y rápida respuesta térmica."
  },
  stainless_304: {
    id: "stainless_304",
    name: "Acero Inoxidable Austenítico 304",
    mu_r: 1.02,
    sigma: 1.4e6,
    steinmetz_eta: 15.0,
    steinmetz_n: 1.6,
    density: 8000.0,
    isFerromagnetic: false,
    description: "Aleación no magnética de grado alimenticio. Al carecer de ferromagnetismo, la penetración es muy profunda (~2.7 mm) y la resistencia superficial es insuficiente para calentar bien."
  },
  aluminum_6061: {
    id: "aluminum_6061",
    name: "Aluminio 6061",
    mu_r: 1.0,
    sigma: 3.5e7,
    steinmetz_eta: 0.0,
    steinmetz_n: 1.6,
    density: 2700.0,
    isFerromagnetic: false,
    description: "No magnético y altamente conductor. La impedancia del bucle inducido es casi puramente reactiva (jωL) con resistencia casi nula; el inversor no puede transferir potencia útil."
  },
  copper: {
    id: "copper",
    name: "Cobre Puro (OFHC)",
    mu_r: 1.0,
    sigma: 5.8e7,
    steinmetz_eta: 0.0,
    steinmetz_n: 1.6,
    density: 8960.0,
    isFerromagnetic: false,
    description: "Conductor casi perfecto pero no magnético. La resistencia reflejada es microscópica, disipando calor casi nulo en la olla mientras sobrecalienta la bobina emisora."
  }
};
