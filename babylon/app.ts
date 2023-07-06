import {
  WebGPUEngine,
  Engine,
  Scene,
  Vector3,
  MeshBuilder,
  SceneLoader,
  FreeCamera,
  DirectionalLight,
  Constants,
  ScenePerformancePriority,
  BoundingBox,
  Color3,
  ReflectionProbe,
  PBRMaterial,
  Color4,
  ImageProcessingConfiguration,
  StandardMaterial,
  Quaternion,
  ShadowGenerator,
  RenderTargetTexture,
} from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials";
import { Inspector } from "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

export default class App {
  engine: WebGPUEngine | Engine | null = null;
  scene: Scene | null = null;
  canvas: HTMLCanvasElement | null = null;
  camera: FreeCamera | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onInitialized: (engine: Engine | WebGPUEngine, scene: Scene) => void
  ) {
    // Using a separate initialize function because the constructor cannot be async
    this.initialize(canvas).then(() => {
      if (!this.engine || !this.scene) {
        throw new Error("No engine or scene");
      }
      onInitialized(this.engine, this.scene);
    });
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // create the canvas html element and attach it to the webpage
    this.canvas = canvas;

    // initialize babylon scene and engine
    this.engine = new Engine(this.canvas);
    if (this.engine instanceof WebGPUEngine) {
      await this.engine.initAsync();
    }

    this.scene = new Scene(this.engine);
    this.setPerformancePriority("intermediate");

    this.camera = this.createController();
    await this.createEnvironment();

    // Create inspector if in development mode
    if (process.env.NODE_ENV === "development") {
      this.createInspector();
    }

    // Event listener to resize the babylon engine when the window is resized
    window.addEventListener("resize", () => {
      if (!this.engine) {
        throw new Error("No engine");
      }
      this.engine.resize();
    });

    // run the main render loop
    this.engine.runRenderLoop(() => {
      if (!this.scene) {
        throw new Error("No scene");
      }
      this.scene.render();
    });

    this.setSnapshotMode("standard");
  }

  setPerformancePriority(
    priority: "aggressive" | "intermediate" | "compatible"
  ) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    switch (priority) {
      case "aggressive":
        this.scene.performancePriority = ScenePerformancePriority.Aggressive;
        break;
      case "intermediate":
        this.scene.performancePriority = ScenePerformancePriority.Intermediate;
        break;
      case "compatible":
      default:
        this.scene.performancePriority =
          ScenePerformancePriority.BackwardCompatible;
    }
  }

  setSnapshotMode(mode: "disabled" | "standard" | "fast") {
    if (!this.scene) {
      throw new Error("No scene");
    }
    this.scene.executeWhenReady(() => {
      if (!this.engine) {
        throw new Error("No engine");
      }
      switch (mode) {
        case "disabled":
          this.engine.snapshotRendering = false;
          break;
        case "standard":
          this.engine.snapshotRenderingMode =
            Constants.SNAPSHOTRENDERING_STANDARD;
          this.engine.snapshotRendering = true;
          break;
        case "fast":
          this.engine.snapshotRenderingMode = Constants.SNAPSHOTRENDERING_FAST;
          this.engine.snapshotRendering = true;
          break;
      }
    });
  }

  resetSnapshot() {
    if (!this.scene) {
      throw new Error("No scene");
    }
    this.scene.executeWhenReady(() => {
      if (!this.engine) {
        throw new Error("No engine");
      }
      this.engine.snapshotRenderingReset();
    });
  }

  createController(): FreeCamera {
    if (!this.scene) {
      throw new Error("No scene");
    }

    const camera = new FreeCamera(
      "Camera",
      new Vector3(1.5, 2.5, -15),
      this.scene
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.canvas, true);

    camera.applyGravity = false;
    camera.checkCollisions = false;
    camera.ellipsoid = new Vector3(1, 1, 1); // Camera collider

    camera.minZ = 0.45;
    camera.angularSensibility = 4000;

    camera.speed = 0.25;
    addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        camera.speed = 0.5;
      }
    });
    addEventListener("keyup", (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        camera.speed = 0.25;
      }
    });

    // Add keyboard controls
    camera.keysUp.push(87); // W
    camera.keysLeft.push(65); // A
    camera.keysDown.push(83); // S
    camera.keysRight.push(68); // D
    camera.keysUpward.push(69); // E
    camera.keysDownward.push(81); // Q

    this.scene.onPointerDown = (evt) => {
      if (!this.engine) {
        throw new Error("No engine");
      }

      if (evt.button === 2) {
        this.engine.enterPointerlock();
      }
    };

    this.scene.onPointerUp = (evt) => {
      if (!this.engine) {
        throw new Error("No engine");
      }

      if (evt.button === 2) {
        this.engine.exitPointerlock();
      }
    };

    return camera;
  }

  rotateSun(skySun: DirectionalLight, skyMaterial: SkyMaterial, angle: number) {
    skySun.direction.applyRotationQuaternionInPlace(
      Quaternion.RotationAxis(Vector3.Forward(), angle)
    );
    skyMaterial.sunPosition = skySun.direction.scale(-1);
  }

  async createEnvironment(): Promise<void> {
    if (!this.scene) {
      throw new Error("No scene");
    }

    this.scene.shadowsEnabled = true;
    this.scene.collisionsEnabled = false;

    // Setup directional light based on sun position in skyMaterial
    const skySun = new DirectionalLight(
      "skySun",
      new Vector3(0, 0, 0),
      this.scene
    );
    skySun.direction = new Vector3(-0.95, -0.28, 0);
    skySun.intensity = 2;
    skySun.shadowEnabled = true;
    skySun.autoCalcShadowZBounds = true;
    const sunShadowGenerator = new ShadowGenerator(1024, skySun);
    sunShadowGenerator.setDarkness(0);
    sunShadowGenerator.filter =
      ShadowGenerator.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP;
    sunShadowGenerator.transparencyShadow = true;

    // Create skybox material
    const skyMaterial = new SkyMaterial("skyMaterial", this.scene);
    skyMaterial.backFaceCulling = false;

    // Set sky material sun position based on skySun direction
    skyMaterial.useSunPosition = true;
    skyMaterial.sunPosition = skySun.direction.scale(-1);

    // TODO: Replace with night sky when sun is below horizon
    // Visualization of environment effect by updating skySun direction and skyMaterial sun position every frame
    let quaternionDelta = 0.001;
    let isEnabled = true;
    addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === " ") {
        isEnabled = !isEnabled;
      }
    });
    this.scene.registerBeforeRender(() => {
      if (!isEnabled) {
        return;
      }
      this.rotateSun(skySun, skyMaterial, quaternionDelta);

      // If sun is below horizon, rotate in opposite direction
      if (skySun.direction.y > 0) {
        quaternionDelta *= -1;
      }
    });

    // TODO: Adjust parameters to make the sky look better
    skyMaterial.luminance = 0.4;
    skyMaterial.turbidity = 2;
    skyMaterial.rayleigh = 4;
    skyMaterial.mieCoefficient = 0.005;
    skyMaterial.mieDirectionalG = 0.98;
    skyMaterial.cameraOffset.y = 50;
    skyMaterial.distance = 100;

    // Setup event listener to modify skyMaterial
    addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        skyMaterial.cameraOffset.y += 1;
      } else if (event.key === "ArrowDown") {
        skyMaterial.cameraOffset.y -= 1;
      } else if (event.key === "ArrowLeft") {
        skyMaterial.distance -= 1;
      } else if (event.key === "ArrowRight") {
        skyMaterial.distance += 1;
      } else if (event.key === "PageUp") {
        skyMaterial.luminance += 0.1;
      } else if (event.key === "PageDown") {
        skyMaterial.luminance -= 0.1;
      } else if (event.key === "Home") {
        skyMaterial.turbidity += 0.1;
      } else if (event.key === "End") {
        skyMaterial.turbidity -= 0.1;
      } else if (event.key === "Insert") {
        skyMaterial.rayleigh += 0.1;
      } else if (event.key === "Delete") {
        skyMaterial.rayleigh -= 0.1;
      } else if (event.key === "1") {
        skyMaterial.mieCoefficient += 0.001;
      } else if (event.key === "2") {
        skyMaterial.mieCoefficient -= 0.001;
      } else if (event.key === "3") {
        skyMaterial.mieDirectionalG += 0.01;
      } else if (event.key === "4") {
        skyMaterial.mieDirectionalG -= 0.01;
      }
    });

    // Create skybox mesh
    const skybox = MeshBuilder.CreateBox(
      "skyBox",
      { size: 1000.0 },
      this.scene
    );
    skybox.material = skyMaterial;
    skybox.infiniteDistance = true;

    // Create texture from skyMaterial using reflection probe
    const reflectionProbe = new ReflectionProbe("ref", 512, this.scene);
    reflectionProbe.renderList?.push(skybox);
    // TODO: Set to refresh once and then update only when sun position changes
    reflectionProbe.refreshRate =
      RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;

    // Set environment texture to reflection probe cube texture
    this.scene.environmentTexture = reflectionProbe.cubeTexture;
    this.scene.environmentIntensity = 2;

    // Set scene ambient color to a bright color
    const skyAmbientColor = new Color3(0.8, 0.8, 0.8);

    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.clearColor = new Color4(1, 1, 1, 1);
    this.scene.ambientColor = skyAmbientColor;

    // Environment meshes
    const { meshes } = await SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "KenneyPlayground.glb",
      this.scene
    );
    meshes.forEach((mesh) => {
      if (mesh.name === "Ramp" || mesh.name === "Ramp1") {
        // Remove the ramps
        mesh.dispose();
        return;
      }
      mesh.checkCollisions = true;
      mesh.receiveShadows = true;

      // Set base ambient color to white
      if (mesh.material) {
        if (
          mesh.material instanceof PBRMaterial ||
          mesh.material instanceof StandardMaterial
        ) {
          mesh.material.ambientColor = new Color3(1, 1, 1);
        }
      }

      sunShadowGenerator.addShadowCaster(mesh);
    });

    // Porsche
    const { meshes: porsche } = await SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "porsche.glb",
      this.scene
    );

    const porscheBoundingBox = new BoundingBox(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0)
    );

    porsche.forEach((mesh) => {
      mesh.receiveShadows = true;
      sunShadowGenerator.addShadowCaster(mesh);

      // Set base ambient color to white
      if (mesh.material) {
        if (
          mesh.material instanceof PBRMaterial ||
          mesh.material instanceof StandardMaterial
        ) {
          mesh.material.ambientColor = new Color3(1, 1, 1);
        }
      }

      // Expand the bounding box
      porscheBoundingBox.reConstruct(
        Vector3.Minimize(
          porscheBoundingBox.minimumWorld,
          mesh.getBoundingInfo().boundingBox.minimumWorld
        ),
        Vector3.Maximize(
          porscheBoundingBox.maximumWorld,
          mesh.getBoundingInfo().boundingBox.maximumWorld
        )
      );
    });

    // Make a transparent bounding box parent mesh for the porsche
    const porscheBoundingBoxMesh = MeshBuilder.CreateBox(
      "porscheBoundingBox",
      {
        width:
          porscheBoundingBox.maximumWorld.x - porscheBoundingBox.minimumWorld.x,
        height:
          porscheBoundingBox.maximumWorld.y - porscheBoundingBox.minimumWorld.y,
        depth:
          porscheBoundingBox.maximumWorld.z - porscheBoundingBox.minimumWorld.z,
      },
      this.scene
    );
    // Set the parent of the porsche to the bounding box mesh
    porsche[0].parent = porscheBoundingBoxMesh;

    porscheBoundingBoxMesh.isVisible = false;
    porscheBoundingBoxMesh.isPickable = true;
    // porscheBoundingBoxMesh.checkCollisions = true;
    porscheBoundingBoxMesh.position.y += 0.09;

    // this.resetSnapshot();
  }

  createInspector(): void {
    if (!this.scene) {
      throw new Error("No scene");
    }

    Inspector.Show(this.scene, {});
    Inspector.Hide();

    // Toggle Inspector visibility
    window.addEventListener("keydown", (ev) => {
      if (!this.scene) {
        throw new Error("No scene");
      }

      // Shift + Ctrl + Alt + I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (Inspector.IsVisible) {
          Inspector.Hide();
        } else {
          Inspector.Show(this.scene, {});
        }
      }
    });
  }
}
