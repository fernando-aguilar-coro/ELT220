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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationResult } from '../types.ts';

export class ThreeSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;

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
  private explodedFactor = 0.0; // 0.0 = normal, 1.0 = fully exploded
  private fieldEnergy = 1;
  private fluxMaterial: THREE.LineDashedMaterial;
  private accentLight: THREE.PointLight | null = null;

  private animFrameId: number | null = null;
  private isVisible = true;
  private visibilityObserver: IntersectionObserver | null = null;
  private _currentResult: SimulationResult | null = null; // reservado para interacción futura (hover/probe)

  // Encuadre automático de cámara
  private readonly camOffset = new THREE.Vector3(0, 18, 46); // position - lookAt
  private readonly lookTarget = new THREE.Vector3(0, 8, 0);
  private zoomFactor = 1.0;
  private lastFitDist = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    // Fondo blanco suave (menos puro que #ffffff)
    this.scene.background = new THREE.Color(0x999999);

    // 2. Camera setup
    // Cámara: ajusta camOffset (x, y, z relativo a lookTarget) y lookTarget
    // para encuadre fino. La distancia final la calcula updateCameraFit().
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.copy(this.lookTarget).add(this.camOffset);
    this.camera.lookAt(this.lookTarget);
    this.updateCameraFit();

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    // En punteros táctiles el pixel ratio alto castiga el GPU; se limita
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.25 : 2));
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
      color: 0x0369a1,
      transparent: true,
      opacity: 0.85,
      dashSize: 0.55,
      gapSize: 0.32
    });

    // 7. Orbit Controls (mouse + touch: 1 dedo/puntero rota, 2 dedos zoom/pan)
    this.setupOrbitControls();

    // 8. Window resize listener
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 8b. Pausar el render cuando el canvas está fuera de pantalla
    if (typeof IntersectionObserver !== 'undefined') {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.isVisible = entries[0]?.isIntersecting ?? true;
      });
      this.visibilityObserver.observe(this.container);
    }

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

    // Suelo sutil: una línea/grid horizontal para dar profundidad
    this.addGroundPlane();
  }

  private addGroundPlane() {
    // Plano de suelo muy sutil - solo una línea horizontal fina
    const groundGeo = new THREE.RingGeometry(0.1, 18, 64, 1, 0, Math.PI * 2);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xe8eaed,  // Un tono más suave que combine con #f8f9fa
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -2.2; // Justo debajo de las barras de ferrita
    groundMesh.renderOrder = -1; // Renderizar primero
    this.scene.add(groundMesh);

    // Línea central horizontal (eje X) para referencia - más sutil
    const lineGeo = new THREE.BufferGeometry();
    const lineVertices = new Float32Array([
      -18, -2.2, 0,
      18, -2.2, 0
    ]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xd0d5dd,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const centerLine = new THREE.Line(lineGeo, lineMat);
    centerLine.renderOrder = -1;
    this.scene.add(centerLine);

    // Línea perpendicular (eje Z) para referencia - más sutil
    const lineGeo2 = new THREE.BufferGeometry();
    const lineVertices2 = new Float32Array([
      0, -2.2, -18,
      0, -2.2, 18
    ]);
    lineGeo2.setAttribute('position', new THREE.BufferAttribute(lineVertices2, 3));
    const centerLine2 = new THREE.Line(lineGeo2, lineMat);
    centerLine2.renderOrder = -1;
    this.scene.add(centerLine2);
  }

  public setFieldEnergy(value: number) {
    this.fieldEnergy = Math.max(0.4, Math.min(2.4, value));
  }

  public setExplodedFactor(val: number) {
    val = Math.max(0, Math.min(1, val));
    if (val === this.explodedFactor) return;
    this.explodedFactor = val;
    this.updateLayerPositions();
    this.updateCameraFit();
  }

  /**
   * Ajusta la distancia de cámara para que el modelo quepa en cualquier
   * proporción de pantalla. En pantallas angostas/verticales se aleja;
   * al explotar el conjunto se aleja un poco más (crece en altura).
   * La dirección (ángulo) se mantiene; solo cambia la distancia.
   */
  private updateCameraFit() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const aspect = w / h;

    // aspect ~1.78 (16:9) → factor 1. Portrait o cuadrado → se aleja.
    const aspectFit = Math.min(1.6, Math.max(1, 1.5 / aspect));
    // El modelo explotado es ~20% más alto
    const explodeFit = 1 + this.explodedFactor * 0.2;

    // Distancia base de encuadre (sin zoom del usuario)
    const baseDist = this.camOffset.length() * aspectFit * explodeFit;

    // Conserva el zoom del usuario entre cambios de encuadre:
    // zoomFactor = distancia actual / distancia base anterior
    if (this.lastFitDist > 0) {
      const currentDist = this.camera.position.distanceTo(this.lookTarget);
      this.zoomFactor = currentDist / this.lastFitDist;
      this.zoomFactor = Math.max(0.55, Math.min(2.4, this.zoomFactor));
    }
    this.lastFitDist = baseDist;

    const dist = baseDist * this.zoomFactor;
    if (this.controls) {
      this.controls.minDistance = baseDist * 0.45;
      this.controls.maxDistance = baseDist * 3.0;
    }

    const dir = this.camOffset.clone().normalize();
    this.camera.position.copy(this.lookTarget).addScaledVector(dir, dist);
    this.camera.lookAt(this.lookTarget);
    this.controls?.update();
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
    const metalColor = isMag ? 0xaab6c4 : 0xd9e1ea;

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
      color: isMag ? 0xdbe2ec : 0xe9eef5,
      metalness: 0.85,
      roughness: 0.28,
      side: THREE.DoubleSide
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = wallHeight / 2;
    this.panGroup.add(wallMesh);

    // 4. Pan handle
    const handleGeo = new THREE.CylinderGeometry(0.4, 0.4, 9.0, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8d99ab, metalness: 0.7, roughness: 0.35 });
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
    ctx.fillStyle = '#9aa7b5';
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

  private setupOrbitControls() {
    const dom = this.renderer.domElement;
    // Evita que el navegador capture gestos táctiles (scroll/zoom de página)
    dom.style.touchAction = 'none';

    this.controls = new OrbitControls(this.camera, dom);
    this.controls.target.copy(this.lookTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.9;
    // 2 dedos: pellizco para zoom (sin paneo)
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE
    };
    // Rotación lenta en idle; se pausa mientras el usuario arrastra
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = -1.2;

    this.controls.addEventListener('start', () => {
      this.isDragging = true;
    });
    this.controls.addEventListener('end', () => {
      this.isDragging = false;
    });

    this.updateCameraFit();
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.updateCameraFit();
    }
  }

  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    // No renderizar si el canvas está fuera de pantalla o la pestaña oculta
    if (!this.isVisible || document.hidden) return;

    // Rotación lenta en idle (autoRotate de OrbitControls se pausa al interactuar)
    this.controls.autoRotate = !this.isDragging;
    this.controls.update();

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
    this.visibilityObserver?.disconnect();
    this.controls?.dispose();
    this.renderer.dispose();
  }
}
