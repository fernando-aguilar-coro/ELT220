/**
 * 3D Interactive Electromagnetic Induction Model using Three.js
 * Visualizes:
 * - 3D Archimedean pancake spiral coil (copper tube)
 * - 3D Cookware base plate with annular eddy current heat pattern
 * - 3D Translucent ceramic glass plate
 * - 3D Radial ferrite concentrator bars
 * - 3D Toroidal magnetic flux lines
 * - Interactive Exploded View (Vista explosionada)
 */

import * as THREE from 'three';
import { SimulationResult } from '../types.ts';

export class ThreeSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // 3D Model Groups
  private rootGroup: THREE.Group;
  private coilGroup: THREE.Group;
  private panGroup: THREE.Group;
  private glassGroup: THREE.Group;
  private ferriteGroup: THREE.Group;
  private fluxGroup: THREE.Group;

  // Meshes that need dynamic updates
  private panBaseMesh: THREE.Mesh | null = null;
  private panHeatCanvas: HTMLCanvasElement;
  private panHeatTexture: THREE.CanvasTexture;

  // Interactivity
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private explodedFactor = 0.0; // 0.0 = normal, 1.0 = fully exploded
  private fieldEnergy = 1;
  private fluxMaterial: THREE.LineDashedMaterial;
  private accentLight: THREE.PointLight | null = null;

  private animFrameId: number | null = null;
  private _currentResult: SimulationResult | null = null; // reservado para interacción futura (hover/probe)

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060b17);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 22, 34);
    this.camera.lookAt(0, 2, 0);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Model Groups hierarchy
    this.rootGroup = new THREE.Group();
    this.coilGroup = new THREE.Group();
    this.panGroup = new THREE.Group();
    this.glassGroup = new THREE.Group();
    this.ferriteGroup = new THREE.Group();
    this.fluxGroup = new THREE.Group();

    this.rootGroup.add(this.ferriteGroup);
    this.rootGroup.add(this.coilGroup);
    this.rootGroup.add(this.glassGroup);
    this.rootGroup.add(this.panGroup);
    this.rootGroup.add(this.fluxGroup);
    this.scene.add(this.rootGroup);

    // 6. Dynamic Heatmap Canvas for Pan Base
    this.panHeatCanvas = document.createElement('canvas');
    this.panHeatCanvas.width = 512;
    this.panHeatCanvas.height = 512;
    this.panHeatTexture = new THREE.CanvasTexture(this.panHeatCanvas);
    this.fluxMaterial = new THREE.LineDashedMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
      dashSize: 0.55,
      gapSize: 0.32
    });

    // 7. Mouse Orbit Controls
    this.setupMouseControls();

    // 8. Window resize listener
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 9. Start render loop
    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.0);
    dirLight1.position.set(20, 40, 25);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-25, -10, -20);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xf59e0b, 1.5, 30);
    pointLight.position.set(0, 3, 0);
    this.accentLight = pointLight;
    this.scene.add(pointLight);
  }

  public setFieldEnergy(value: number) {
    this.fieldEnergy = Math.max(0.4, Math.min(2.4, value));
  }

  public setExplodedFactor(val: number) {
    this.explodedFactor = Math.max(0, Math.min(1, val));
    this.updateLayerPositions();
  }

  private updateLayerPositions() {
    // Height units: 1 unit ~ 5 mm in real scale
    const sep = this.explodedFactor * 14.0; // Explosion separation in Three.js units

    // Ferrite bars stay at z = -2.0
    this.ferriteGroup.position.y = -2.0 - sep * 0.4;
    // Coil stays at z = 0.0
    this.coilGroup.position.y = 0.0;
    // Glass rises
    this.glassGroup.position.y = 1.5 + sep * 0.5;
    // Pan rises the most
    this.panGroup.position.y = 3.5 + sep * 1.0;
    // Flux lines expand
    this.fluxGroup.position.y = 1.0 + sep * 0.3;
  }

  public updateModel(res: SimulationResult) {
    this._currentResult = res;

    // Scale factors: Real 100 mm outer radius -> 10 Three.js units
    const scale = 100.0; // 1 m = 100 units => 1 mm = 0.1 units

    // 1. Rebuild Pancake Coil Mesh
    this.rebuildCoil(res.coil.r_in * scale, res.coil.r_out * scale, res.coil.num_turns);

    // 2. Rebuild Ferrite Bars underneath
    this.rebuildFerriteBars(res.coil.r_in * scale, res.coil.r_out * scale);

    // 3. Rebuild Ceramic Glass Plate
    this.rebuildGlassPlate(res.coil.r_out * scale * 1.35);

    // 4. Rebuild Cookware Pan
    this.rebuildCookware(res.operating.pan_radius * scale, res);

    // 5. Rebuild 3D Magnetic Flux Lines
    this.rebuildFluxLines(res.coil.r_in * scale, res.coil.r_out * scale, res.operating.pan_radius * scale);

    // Apply exploded positioning
    this.updateLayerPositions();
  }

  private rebuildCoil(rIn: number, rOut: number, turns: number) {
    // Clear previous coil meshes
    while (this.coilGroup.children.length > 0) {
      const obj = this.coilGroup.children[0];
      this.coilGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const points: THREE.Vector3[] = [];
    const totalAngle = 2 * Math.PI * turns;
    const steps = turns * 80;
    const dr = (rOut - rIn) / totalAngle;

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * totalAngle;
      const r = rIn + dr * theta;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      points.push(new THREE.Vector3(x, 0, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, steps, 0.22, 8, false);

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.15
    });

    const coilMesh = new THREE.Mesh(tubeGeo, copperMat);
    this.coilGroup.add(coilMesh);
  }

  private rebuildFerriteBars(rIn: number, rOut: number) {
    while (this.ferriteGroup.children.length > 0) {
      const obj = this.ferriteGroup.children[0];
      this.ferriteGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const numBars = 8;
    const barLength = rOut - rIn + 2.0;
    const barWidth = 1.4;
    const barHeight = 0.8;

    const ferriteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.3,
      roughness: 0.8
    });

    for (let i = 0; i < numBars; i++) {
      const angle = (i * 2 * Math.PI) / numBars;
      const barGeo = new THREE.BoxGeometry(barLength, barHeight, barWidth);
      const mesh = new THREE.Mesh(barGeo, ferriteMat);

      const centerRadius = (rIn + rOut) / 2;
      mesh.position.set(centerRadius * Math.cos(angle), 0, centerRadius * Math.sin(angle));
      mesh.rotation.y = -angle;
      this.ferriteGroup.add(mesh);
    }
  }

  private rebuildGlassPlate(radius: number) {
    while (this.glassGroup.children.length > 0) {
      const obj = this.glassGroup.children[0];
      this.glassGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const glassGeo = new THREE.CylinderGeometry(radius, radius, 0.35, 48);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.75, // Translucent glass effect
      transparent: true,
      opacity: 0.45
    });

    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    this.glassGroup.add(glassMesh);

    // Add decorative white burner ring on the glass
    const ringGeo = new THREE.RingGeometry(radius * 0.7, radius * 0.73, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.18;
    this.glassGroup.add(ringMesh);
  }

  private rebuildCookware(panRadius: number, res: SimulationResult) {
    while (this.panGroup.children.length > 0) {
      const obj = this.panGroup.children[0];
      this.panGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    // 1. Draw circular heatmap texture on 2D canvas
    this.drawPanHeatmapTexture(res);

    // 2. Pan base disk with dynamic heatmap texture
    const baseGeo = new THREE.CylinderGeometry(panRadius, panRadius, 0.4, 48);

    const isMag = res.material.isFerromagnetic;
    const metalColor = isMag ? 0x94a3b8 : 0xd1d5db;

    const materials = [
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.85, roughness: 0.3 }), // Side
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.85, roughness: 0.3 }), // Top interior
      new THREE.MeshStandardMaterial({
        map: this.panHeatTexture,
        metalness: 0.8,
        roughness: 0.35,
        emissive: isMag ? 0xef4444 : 0x000000,
        emissiveIntensity: isMag ? 0.35 : 0.0
      }) // Bottom facing coil
    ];

    this.panBaseMesh = new THREE.Mesh(baseGeo, materials);
    this.panGroup.add(this.panBaseMesh);

    // 3. Pan sidewalls
    const wallHeight = 5.0;
    const wallGeo = new THREE.CylinderGeometry(panRadius * 1.08, panRadius, wallHeight, 48, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: isMag ? 0x334155 : 0x64748b,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = wallHeight / 2;
    this.panGroup.add(wallMesh);

    // 4. Pan handle
    const handleGeo = new THREE.CylinderGeometry(0.4, 0.4, 9.0, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.rotation.z = Math.PI / 2.3;
    handleMesh.position.set(panRadius + 4.0, wallHeight * 0.7, 0);
    this.panGroup.add(handleMesh);
  }

  private drawPanHeatmapTexture(res: SimulationResult) {
    const ctx = this.panHeatCanvas.getContext('2d')!;
    const w = this.panHeatCanvas.width;
    const h = this.panHeatCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Base metal background
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, w, h);

    // Draw annular eddy current heating ring
    const meanNorm = res.coil.meanRadius / res.operating.pan_radius;
    const depthNorm = res.coil.radialDepth / res.operating.pan_radius;

    const rCenter = cx * Math.min(0.9, meanNorm);
    const rWidth = cx * depthNorm * 0.65;

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, rCenter - rWidth), cx, cy, rCenter + rWidth);

    if (res.material.isFerromagnetic && res.powers.total_pan_power_w > 100) {
      gradient.addColorStop(0.0, 'rgba(71, 85, 105, 1)');
      gradient.addColorStop(0.35, 'rgba(239, 68, 68, 0.85)'); // Glowing hot red ring
      gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.95)');  // Core hot amber
      gradient.addColorStop(0.7, 'rgba(239, 68, 68, 0.85)');
      gradient.addColorStop(1.0, 'rgba(71, 85, 105, 1)');
    } else {
      // Incompatible / low heating
      gradient.addColorStop(0.0, 'rgba(71, 85, 105, 1)');
      gradient.addColorStop(0.5, 'rgba(100, 116, 139, 1)');
      gradient.addColorStop(1.0, 'rgba(71, 85, 105, 1)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.98, 0, 2 * Math.PI);
    ctx.fill();

    this.panHeatTexture.needsUpdate = true;
  }

  private rebuildFluxLines(rIn: number, rOut: number, _panRadius: number) {
    while (this.fluxGroup.children.length > 0) {
      const obj = this.fluxGroup.children[0];
      this.fluxGroup.remove(obj);
      if ((obj as THREE.Line).geometry) (obj as THREE.Line).geometry.dispose();
    }

    // Generate 3D Toroidal magnetic field loops emerging from coil center and closing into pan
    const numLoops = 12;
    const rMean = (rIn + rOut) / 2;

    for (let i = 0; i < numLoops; i++) {
      const phi = (i * 2 * Math.PI) / numLoops;
      const points: THREE.Vector3[] = [];

      // Create an elliptic loop in the vertical radial plane (r, y)
      const numSegments = 36;
      for (let j = 0; j <= numSegments; j++) {
        const t = (j / numSegments) * 2 * Math.PI;
        // Toroid center around rMean
        const localR = rMean + (rOut - rIn) * 0.55 * Math.cos(t);
        const y = 3.2 * Math.sin(t);

        const x = localR * Math.cos(phi);
        const z = localR * Math.sin(phi);
        points.push(new THREE.Vector3(x, y, z));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, this.fluxMaterial);
      line.computeLineDistances();
      this.fluxGroup.add(line);
    }
  }

  private setupMouseControls() {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.rootGroup.rotation.y += deltaX * 0.008;
      this.rootGroup.rotation.x += deltaY * 0.005;

      // Clamp vertical tilt
      this.rootGroup.rotation.x = Math.max(-0.4, Math.min(1.2, this.rootGroup.rotation.x));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z += e.deltaY * 0.03;
      this.camera.position.z = Math.max(15, Math.min(65, this.camera.position.z));
    });
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    // Gentle slow idle rotation when not dragging
    if (!this.isDragging) {
      this.rootGroup.rotation.y += 0.002;
    }

    const time = performance.now() * 0.002;
    const energy = this.fieldEnergy;
    // Animate flux lines by cycling dashSize/gapSize (dashOffset not in LineDashedMaterial types)
    this.fluxMaterial.gapSize = 0.28 + 0.22 * Math.abs(Math.sin(time * energy * 0.9));
    this.fluxMaterial.opacity = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(time * energy));
    this.fluxGroup.rotation.y = Math.sin(time * 0.6) * 0.04;
    if (this.accentLight) {
      this.accentLight.intensity = 0.8 + 1.4 * energy * (0.5 + 0.5 * Math.sin(time * 2.2));
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
