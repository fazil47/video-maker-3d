import {
  WebGPUEngine,
  Engine,
  Scene,
  Vector3,
  MeshBuilder,
  SceneLoader,
  FreeCamera,
  DirectionalLight,
  ShadowGenerator,
  Constants,
  FreeCameraVirtualJoystickInput,
  ScenePerformancePriority,
  BoundingBox,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control } from "@babylonjs/gui";
// import { Inspector } from "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// import Assets from "@babylonjs/assets";

import { isInPortrait, isTouchOnly } from "./utils";

import EntryGUI from "./ui/EntryGUI.json" assert { type: "json" };

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
    this.setPerformancePriority("aggressive");

    await this.createEnvironment();
    this.camera = this.createController();

    this.createGUI();

    // FIXME: Doesn't work with Next.js 13
    // this.createInspector();

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

    this.setSnapshotMode("fast");
  }

  setPerformancePriority(priority: string) {
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
      case "backwardCompatible":
      default:
        this.scene.performancePriority =
          ScenePerformancePriority.BackwardCompatible;
    }
  }

  setSnapshotMode(mode: string) {
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

    camera.applyGravity = true;
    camera.checkCollisions = true;
    camera.ellipsoid = new Vector3(1, 1, 1); // Camera collider

    camera.minZ = 0.45;
    camera.speed = 0.25;
    camera.angularSensibility = 4000;

    // Add keyboard controls
    camera.keysUp.push(87); // W
    camera.keysLeft.push(65); // A
    camera.keysDown.push(83); // S
    camera.keysRight.push(68); // D

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

  createGUI(): void {
    const adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    adt.parseSerializedObject(EntryGUI);
    const entryGUI = adt.getControlByName("EntryGUI") as Control;

    // Show landscape instruction only on touch only devices
    const landscapeInstructionText = adt.getControlByName(
      "LandscapeInstructionText"
    );
    if (landscapeInstructionText) {
      if (!isTouchOnly()) {
        landscapeInstructionText.isVisible = false;
      } else {
        window.addEventListener("resize", function () {
          landscapeInstructionText.isVisible = isInPortrait();
        });

        landscapeInstructionText.isVisible = isInPortrait();
      }
    }

    const enterButton = adt.getControlByName("EnterButton");
    if (enterButton) {
      enterButton.onPointerClickObservable.add(() => {
        if (!this.camera) {
          throw new Error("No camera");
        }

        // Add virtual joystick controls for touch only devices
        if (isTouchOnly()) {
          this.camera.inputs.add(new FreeCameraVirtualJoystickInput());
          const vJoystick = this.camera.inputs.attached["virtualJoystick"];
          if (vJoystick && vJoystick.camera) {
            vJoystick.camera.minZ = 0.45;
            vJoystick.camera.speed = 0.25;
            vJoystick.camera.angularSensibility = 12000;
          }
        }

        // Hide entry GUI
        entryGUI.isVisible = false;
      });
    }
  }

  async createEnvironment(): Promise<void> {
    if (!this.scene) {
      throw new Error("No scene");
    }

    this.scene.shadowsEnabled = true;

    // Light 1
    const light1 = new DirectionalLight(
      "light1",
      new Vector3(0, 0, 0),
      this.scene
    );
    light1.direction = new Vector3(-0.713, -0.328, 0.619);
    light1.intensity = 2;
    light1.shadowEnabled = true;
    const shadowGenerator1 = new ShadowGenerator(1024, light1);
    shadowGenerator1.filter = ShadowGenerator.FILTER_PCF;

    // Gravity and collision
    const framesPerSecond = 60;
    // const gravity = -9.81;
    // this.scene.gravity = new Vector3(0, gravity / framesPerSecond, 0);
    this.scene.collisionsEnabled = true;

    // Environment meshes
    const { meshes } = await SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "KenneyPlayground.glb",
      this.scene
    );
    meshes.forEach((mesh) => {
      if (mesh.name === "Ramp" || mesh.name === "Ramp1") {
        // Removc mesh
        mesh.dispose();
        return;
      }
      mesh.checkCollisions = true;
      mesh.receiveShadows = true;
      shadowGenerator1.addShadowCaster(mesh);
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
      // mesh.checkCollisions = true;
      mesh.receiveShadows = true;
      shadowGenerator1.addShadowCaster(mesh);

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

      // // Move up a bit
      // mesh.position.y += 0.09;
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

    this.scene.createDefaultEnvironment();

    // this.resetSnapshot();
  }

  // createInspector(): void {
  //   if (!this.scene) {
  //     throw new Error("No scene");
  //   }

  //   Inspector.Show(this.scene, {});
  //   Inspector.Hide();

  //   // Toggle Inspector visibility
  //   window.addEventListener("keydown", (ev) => {
  //     if (!this.scene) {
  //       throw new Error("No scene");
  //     }

  //     // Shift + Ctrl + Alt + I
  //     if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
  //       if (Inspector.IsVisible) {
  //         Inspector.Hide();
  //       } else {
  //         Inspector.Show(this.scene, {});
  //       }
  //     }
  //   });
  // }
}
