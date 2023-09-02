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
  SSAO2RenderingPipeline,
  SSRRenderingPipeline,
  DefaultRenderingPipeline,
  GizmoManager,
  Camera,
  Mesh,
  Node,
  Nullable,
  SceneSerializer,
  Tags,
} from "@babylonjs/core";
import { GradientMaterial, SkyMaterial } from "@babylonjs/materials";
import { Inspector } from "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

export interface SceneSettings {
  transformGizmoMode: TransformGizmoMode;
  newPrimitiveMeshType: PrimitiveMeshType;
}

export type TransformGizmoMode = "position" | "rotation" | "scale";
export type PrimitiveMeshType =
  | "box"
  | "sphere"
  | "cylinder"
  | "torus"
  | "plane"
  | "ground";

export default class App {
  engine: WebGPUEngine | Engine | null = null;
  scene: Scene | null = null;
  invisibleMaterial: StandardMaterial | null = null;
  canvas: HTMLCanvasElement | null = null;
  camera: FreeCamera | null = null;
  gizmoManager: GizmoManager | null = null;
  sunShadowGenerator: ShadowGenerator | null = null;
  sceneSettings: SceneSettings = {
    transformGizmoMode: "position",
    newPrimitiveMeshType: "box",
  };
  savedSceneURL: string | null = null;
  savedSceneFilename: string = "scene"; // TODO: This has to be changed for to support multi-scene projects

  /**
   * This function initializes the engine and scene asynchronously.
   * @param canvas The canvas element to render to.
   * @param onInitialized Callback function to call when the engine and scene are initialized.
   * @param onAttachedToObjectCallback Callback function to call when the gizmo manager is attached to a node.
   */
  constructor(
    canvas: HTMLCanvasElement,
    onInitialized: (engine: Engine | WebGPUEngine, scene: Scene) => void,
    onAttachedToObjectCallback?: (node: Nullable<Node>) => void
  ) {
    // Using a separate initialize function because the constructor cannot be async
    this._initialize(canvas, onAttachedToObjectCallback).then(() => {
      if (!this.engine || !this.scene) {
        throw new Error("No engine or scene");
      }
      onInitialized(this.engine, this.scene);
    });
  }

  /**
   * Optimizes the scene for performance.
   */
  public optimizeScene() {
    this._setPerformancePriority("intermediate");
  }

  /**
   * Unoptimizes the scene for compatibility.
   */
  public unoptimizeScene() {
    this._setPerformancePriority("compatible");
  }

  /**
   * Sets scene settings.
   * @param settings New scene settings.
   */
  public setSceneSettings(settings: SceneSettings) {
    if (!this.gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (settings.transformGizmoMode !== this.sceneSettings.transformGizmoMode) {
      this.sceneSettings.transformGizmoMode = settings.transformGizmoMode;
      switch (settings.transformGizmoMode) {
        case "position":
          this.gizmoManager.positionGizmoEnabled = true;
          this.gizmoManager.rotationGizmoEnabled = false;
          this.gizmoManager.scaleGizmoEnabled = false;
          break;
        case "rotation":
          this.gizmoManager.positionGizmoEnabled = false;
          this.gizmoManager.rotationGizmoEnabled = true;
          this.gizmoManager.scaleGizmoEnabled = false;
          break;
        case "scale":
          this.gizmoManager.positionGizmoEnabled = false;
          this.gizmoManager.rotationGizmoEnabled = false;
          this.gizmoManager.scaleGizmoEnabled = true;
          break;
      }
    }

    if (
      settings.newPrimitiveMeshType !== this.sceneSettings.newPrimitiveMeshType
    ) {
      this.sceneSettings.newPrimitiveMeshType = settings.newPrimitiveMeshType;
    }
  }

  /**
   * Serializes the scene and saves it to a file.
   */
  saveScene() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (this.savedSceneURL) {
      window.URL.revokeObjectURL(this.savedSceneURL);
    }

    const serializedScene = SceneSerializer.Serialize(this.scene);
    // TODO: Save skybox and environment texture
    delete serializedScene.environmentTexture;

    const strMesh = JSON.stringify(serializedScene);

    if (
      this.savedSceneFilename.toLowerCase().lastIndexOf(".babylon") !==
        this.savedSceneFilename.length - 8 ||
      this.savedSceneFilename.length < 9
    ) {
      this.savedSceneFilename += ".babylon";
    }

    const blob = new Blob([strMesh], { type: "octet/stream" });

    // turn blob into an object URL; saved as a member, so can be cleaned out later
    this.savedSceneURL = (window.webkitURL || window.URL).createObjectURL(blob);

    const link = window.document.createElement("a");
    link.href = this.savedSceneURL;
    link.download = this.savedSceneFilename;
    const clickEvent = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: false,
    });
    link.dispatchEvent(clickEvent);
  }

  /**
   * Loads a scene from a file.
   */
  loadScene() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".babylon";

    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        const fileURL = URL.createObjectURL(file);
        console.log(fileURL);
        SceneLoader.LoadAsync("", fileURL, this.engine, null, ".babylon").then(
          (scene: Scene) => {
            if (scene) {
              // Dispose of everything in the current scene
              this.scene?.meshes.forEach((mesh) => {
                mesh.dispose();
              });
              this.scene?.materials.forEach((material) => {
                material.dispose();
              });
              this.scene?.textures.forEach((texture) => {
                texture.dispose();
              });
              this.scene?.effectLayers.forEach((effectLayer) => {
                effectLayer.dispose();
              });
              this.sunShadowGenerator?.dispose();
              this.gizmoManager?.dispose();
              this.camera?.dispose();
              this.scene?.dispose();

              // Set the new scene
              this.scene = scene;
              this._createInvisibleMaterial();
              this.optimizeScene();

              // Setup camera controls
              // TODO: Save camera position and rotation
              this.camera = this._createController();
              this.scene.activeCamera = this.camera;

              // TODO: Save skybox and environment texture
              // For now, just recreate the environment
              const skySun = this.scene.getLightByName("skySun");
              if (skySun instanceof DirectionalLight) {
                this._setupSkybox(skySun);
                this._setupSkySunShadows(skySun);
              }

              // TODO: Save post-process effects
              // For now, just recreate the post-process effects
              this._setupPostProcessEffects(this.camera);

              // Setup gizmo manager
              this.gizmoManager = this._createGizmoManager();
              this._setTaggedMeshesAsAttachableToGizmoManager();
            }
          }
        );
      }
    };

    fileInput.click();
  }

  /**
   * Adds a new primitive mesh to the scene based on the newPrimitiveMeshType scene setting.
   */
  public addPrimitiveMesh() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    // Set base ambient color to white
    const material = new StandardMaterial("material", this.scene);
    material.ambientColor = new Color3(1, 1, 1);
    material.backFaceCulling = true;

    let mesh: Mesh;

    switch (this.sceneSettings.newPrimitiveMeshType) {
      case "box":
        mesh = MeshBuilder.CreateBox("box", {}, this.scene);
        break;
      case "sphere":
        mesh = MeshBuilder.CreateSphere("sphere", {}, this.scene);
        break;
      case "cylinder":
        mesh = MeshBuilder.CreateCylinder("cylinder", {}, this.scene);
        break;
      case "torus":
        mesh = MeshBuilder.CreateTorus("torus", {}, this.scene);
        break;
      case "plane":
        mesh = MeshBuilder.CreatePlane("plane", {}, this.scene);
        break;
      case "ground":
        mesh = MeshBuilder.CreateGround("ground", {}, this.scene);
        break;
      default:
        throw new Error("Invalid mesh type");
    }

    mesh.isPickable = true;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;
    mesh.material = material;

    if (!this.gizmoManager) {
      throw new Error("No gizmo manager");
    }
    this.gizmoManager.attachToMesh(mesh);
    this.gizmoManager.attachableMeshes?.push(mesh);
    Tags.AddTagsTo(mesh, "gizmoAttachableMesh");

    this.sunShadowGenerator?.addShadowCaster(mesh);
    Tags.AddTagsTo(mesh, "shadowCaster");
  }

  /**
   * Prompt user to upload a new glTF mesh and adds it to the scene.
   */
  public importGLBMesh() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".glb";

    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        const fileURL = URL.createObjectURL(file);
        console.log(fileURL);
        SceneLoader.ImportMeshAsync(
          "",
          fileURL,
          "",
          this.scene,
          null,
          ".glb"
        ).then(({ meshes }) => {
          if (!this.gizmoManager) {
            throw new Error("No gizmo manager");
          }

          if (!this.sunShadowGenerator) {
            throw new Error("No sun shadow generator");
          }

          if (!this.invisibleMaterial) {
            throw new Error("No invisible material");
          }

          const boundingBox = new BoundingBox(
            new Vector3(0, 0, 0),
            new Vector3(0, 0, 0)
          );

          meshes.forEach((mesh) => {
            mesh.isPickable = false;
            mesh.receiveShadows = true;
            this.sunShadowGenerator?.addShadowCaster(mesh);
            Tags.AddTagsTo(mesh, "shadowCaster");

            // Set base ambient color to white
            if (mesh.material) {
              if (
                mesh.material instanceof PBRMaterial ||
                mesh.material instanceof StandardMaterial
              ) {
                mesh.material.ambientColor = new Color3(1, 1, 1);
                mesh.material.backFaceCulling = true;
              }
            }

            // Expand the bounding box
            boundingBox.reConstruct(
              Vector3.Minimize(
                boundingBox.minimumWorld,
                mesh.getBoundingInfo().boundingBox.minimumWorld
              ),
              Vector3.Maximize(
                boundingBox.maximumWorld,
                mesh.getBoundingInfo().boundingBox.maximumWorld
              )
            );
          });

          // Make a transparent bounding box parent mesh for the vehicle
          const boundingBoxMesh = MeshBuilder.CreateBox(
            `boundingBox_${file.name}`,
            {
              width: boundingBox.maximumWorld.x - boundingBox.minimumWorld.x,
              height: boundingBox.maximumWorld.y - boundingBox.minimumWorld.y,
              depth: boundingBox.maximumWorld.z - boundingBox.minimumWorld.z,
            },
            this.scene
          );
          boundingBoxMesh.position = boundingBox.centerWorld;
          boundingBoxMesh.rotationQuaternion = meshes[0].rotationQuaternion;

          // Set the parent of the vehicle to the bounding box mesh
          // TODO: This doesn't work for every imported mesh
          meshes[0].parent = boundingBoxMesh;
          meshes[0].position = Vector3.Zero();
          meshes[0].position.y -= boundingBox.centerWorld.y;
          meshes[0].rotationQuaternion = Quaternion.Identity();

          // Only the bounding box mesh is attachable for the gizmo manager
          this.gizmoManager.attachableMeshes?.push(boundingBoxMesh);
          Tags.AddTagsTo(boundingBoxMesh, "gizmoAttachableMesh");
          boundingBoxMesh.isPickable = true;
          boundingBoxMesh.material = this.invisibleMaterial;
        });
      }
    };

    fileInput.click();
  }

  /**
   * Deletes the selected node.
   */
  public deleteSelectedNode() {
    if (!this.gizmoManager) {
      throw new Error("No gizmo manager");
    }
    if (!this.scene) {
      throw new Error("No scene");
    }

    let selectedMesh = this.gizmoManager.gizmos.positionGizmo?.attachedMesh;
    if (selectedMesh) {
      this.gizmoManager.attachToMesh(null);
      this.gizmoManager.attachableMeshes?.splice(
        this.gizmoManager.attachableMeshes.indexOf(selectedMesh),
        1
      );
      selectedMesh.dispose();
    }
  }

  /**
   * Initializes the babylon engine and scene asynchronously.
   * @param canvas The canvas to render to.
   * @param onAttachedToObjectCallback Callback to be called when a mesh is selected.
   */
  private async _initialize(
    canvas: HTMLCanvasElement,
    onAttachedToObjectCallback?: (node: Nullable<Node>) => void
  ): Promise<void> {
    // create the canvas html element and attach it to the webpage
    this.canvas = canvas;

    // initialize babylon scene and engine
    this.engine = new Engine(this.canvas);
    if (this.engine instanceof WebGPUEngine) {
      await this.engine.initAsync();
    }

    this.scene = new Scene(this.engine);
    this._createInvisibleMaterial();
    this.optimizeScene();

    this.gizmoManager = this._createGizmoManager(onAttachedToObjectCallback);
    this.camera = this._createController();
    this._createEnvironment();

    // Create inspector if in development mode
    if (process.env.NODE_ENV === "development") {
      this._createInspector();
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

    this._setSnapshotMode("standard");
  }

  /**
   * Creates the invisible material used for the bounding box meshes.
   */
  private _createInvisibleMaterial() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    this.invisibleMaterial = new StandardMaterial(
      "invisibleMaterial",
      this.scene
    );
    this.invisibleMaterial.alpha = 0;
  }

  /**
   * Creates the gizmo manager.
   * @param onAttachedToObjectCallback Callback to be called when the gizmo is attached to a node.
   */
  private _createGizmoManager(
    onAttachedToObjectCallback?: (node: Nullable<Node>) => void
  ): GizmoManager {
    if (!this.scene) {
      throw new Error("No scene");
    }

    // Create and setup GizmoManager
    const gizmoManager = new GizmoManager(this.scene);
    gizmoManager.clearGizmoOnEmptyPointerEvent = true;
    gizmoManager.attachableMeshes = [];
    gizmoManager.attachableNodes = [];

    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = false;
    gizmoManager.scaleGizmoEnabled = false;

    if (onAttachedToObjectCallback) {
      gizmoManager.onAttachedToNodeObservable.add(onAttachedToObjectCallback);
      gizmoManager.onAttachedToMeshObservable.add(onAttachedToObjectCallback);
    }

    return gizmoManager;
  }

  /**
   * Sets meshes tagged with "gizmoAttachableMesh" as the gizmo manager's attachable meshes.
   * WARNING: This will overwrite the attachable meshes array.
   */
  private _setTaggedMeshesAsAttachableToGizmoManager() {
    if (!this.gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (!this.scene) {
      throw new Error("No scene");
    }

    const taggedMeshes = this.scene.getMeshesByTags("gizmoAttachableMesh");

    // Set these meshes as attachable for gizmo manager
    this.gizmoManager.attachableMeshes = taggedMeshes;
  }

  /**
   * Creates a FreeCamera and sets up controls and the collider.
   * @returns The created FreeCamera.
   */
  private _createController(): FreeCamera {
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

      if (!this.gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (evt.button === 2) {
        this.engine.enterPointerlock();
        this.gizmoManager.usePointerToAttachGizmos = false;
      }
    };

    this.scene.onPointerUp = (evt) => {
      if (!this.engine) {
        throw new Error("No engine");
      }

      if (!this.gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (evt.button === 2) {
        this.gizmoManager.usePointerToAttachGizmos = true;
        this.engine.exitPointerlock();
      }
    };

    return camera;
  }

  /**
   * Creates the environment. Setups up skybox, lighting, post-processes, and some meshes.
   */
  private _createEnvironment() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this.camera) {
      throw new Error("No camera");
    }

    this.scene.shadowsEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.clearColor = new Color4(1, 1, 1, 1);
    this.scene.ambientColor = new Color3(0.6, 0.6, 0.6);

    // POST-PROCESSING
    this._setupPostProcessEffects(this.camera);

    // LIGHTING
    const skySun = new DirectionalLight(
      "skySun",
      new Vector3(0, 0, 0),
      this.scene
    );
    skySun.direction = new Vector3(-0.95, -0.28, 0);
    skySun.intensity = 2;

    // SKYBOX
    this._setupSkybox(skySun);

    // SHADOWS
    this._setupSkySunShadows(skySun);

    // KENNEY PLAYGROUND
    SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "KenneyPlayground.glb",
      this.scene
    ).then(({ meshes: kenneyPlayground }) => {
      if (!this.gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (!this.sunShadowGenerator) {
        throw new Error("No sun shadow generator");
      }

      kenneyPlayground.forEach((mesh) => {
        mesh.isPickable = true;
        mesh.checkCollisions = true;
        mesh.receiveShadows = true;

        // Set base ambient color to white
        if (mesh.material) {
          if (
            mesh.material instanceof PBRMaterial ||
            mesh.material instanceof StandardMaterial
          ) {
            mesh.material.ambientColor = new Color3(1, 1, 1);
            mesh.material.backFaceCulling = true;
          }
        }

        this.sunShadowGenerator?.addShadowCaster(mesh);
        Tags.AddTagsTo(mesh, "shadowCaster");

        this.gizmoManager?.attachableMeshes?.push(...kenneyPlayground.slice(1));
        Tags.AddTagsTo(mesh, "gizmoAttachableMesh");
      });
    });

    // BMW M4
    SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "bmw_m4_2021.glb",
      this.scene
    ).then(({ meshes: bmw }) => {
      if (!this.gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (!this.sunShadowGenerator) {
        throw new Error("No sun shadow generator");
      }

      if (!this.invisibleMaterial) {
        throw new Error("No invisible material");
      }

      const bmwBoundingBox = new BoundingBox(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0)
      );

      bmw.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        this.sunShadowGenerator?.addShadowCaster(mesh);
        Tags.AddTagsTo(mesh, "shadowCaster");

        // Set base ambient color to white
        if (mesh.material) {
          if (
            mesh.material instanceof PBRMaterial ||
            mesh.material instanceof StandardMaterial
          ) {
            mesh.material.ambientColor = new Color3(1, 1, 1);
            mesh.material.backFaceCulling = true;
          }
        }

        // Expand the bounding box
        bmwBoundingBox.reConstruct(
          Vector3.Minimize(
            bmwBoundingBox.minimumWorld,
            mesh.getBoundingInfo().boundingBox.minimumWorld
          ),
          Vector3.Maximize(
            bmwBoundingBox.maximumWorld,
            mesh.getBoundingInfo().boundingBox.maximumWorld
          )
        );
      });

      // Make a transparent bounding box parent mesh for the vehicle
      const bmwBoundingBoxMesh = MeshBuilder.CreateBox(
        "bmwBoundingBox",
        {
          width: bmwBoundingBox.maximumWorld.x - bmwBoundingBox.minimumWorld.x,
          height: bmwBoundingBox.maximumWorld.y - bmwBoundingBox.minimumWorld.y,
          depth: bmwBoundingBox.maximumWorld.z - bmwBoundingBox.minimumWorld.z,
        },
        this.scene
      );
      bmwBoundingBoxMesh.position = bmwBoundingBox.centerWorld;
      bmwBoundingBoxMesh.rotationQuaternion = bmw[0].rotationQuaternion;

      // Set the parent of the vehicle to the bounding box mesh
      bmw[0].parent = bmwBoundingBoxMesh;
      bmw[0].position = Vector3.Zero();
      bmw[0].position.y -= bmwBoundingBox.centerWorld.y;
      bmw[0].rotationQuaternion = Quaternion.Identity();

      // Rotate and raise the BMW slightly
      bmwBoundingBoxMesh.position.y += 0.09;
      bmwBoundingBoxMesh.rotationQuaternion = Quaternion.RotationAxis(
        Vector3.Up(),
        Math.PI / 6
      );

      // Only the bounding box mesh is attachable for the gizmo manager
      this.gizmoManager.attachableMeshes?.push(bmwBoundingBoxMesh);
      Tags.AddTagsTo(bmwBoundingBoxMesh, "gizmoAttachableMesh");
      bmwBoundingBoxMesh.isPickable = true;
      bmwBoundingBoxMesh.material = this.invisibleMaterial;
    });

    this._resetSnapshot();
  }

  /**
   * Creates the inspector in development builds
   */
  private _createInspector(): void {
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
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.code === "KeyI") {
        if (Inspector.IsVisible) {
          Inspector.Hide();
        } else {
          Inspector.Show(this.scene, {});
        }
      }
    });
  }

  /**
   * Sets up the skybox and environmental lighting.
   * @param scene The Babylon scene.
   * @param skySun The directional light representing the sun.
   */
  private _setupSkybox(skySun: DirectionalLight) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    // Create skybox material
    const skyboxMaterial = new SkyMaterial("skyboxMaterial", this.scene);
    skyboxMaterial.backFaceCulling = false;

    // Set sky material sun position based on skySun direction
    skyboxMaterial.useSunPosition = true;
    skyboxMaterial.sunPosition = skySun.direction.scale(-1);

    // Visualization of environment effect by updating skySun direction and skyMaterial sun position every frame
    let quaternionDelta = 0.02;
    window.addEventListener("keydown", (event) => {
      if (!this.scene) {
        throw new Error("No scene");
      }

      if (skySun.direction.y <= 0) {
        if (event.key === "1") {
          this._rotateSun(skySun, skyboxMaterial, quaternionDelta);
        } else if (event.key === "2") {
          this._rotateSun(skySun, skyboxMaterial, -quaternionDelta);
        }
      } else {
        skySun.direction.y = 0;
      }
    });

    skyboxMaterial.luminance = 0.4;
    skyboxMaterial.turbidity = 10;
    skyboxMaterial.rayleigh = 4;
    skyboxMaterial.mieCoefficient = 0.005;
    skyboxMaterial.mieDirectionalG = 0.98;
    skyboxMaterial.cameraOffset.y = 200;
    skyboxMaterial.disableDepthWrite = false;

    // Create skybox mesh
    const skybox = MeshBuilder.CreateSphere(
      "skyBox",
      { diameter: 1000.0 },
      this.scene
    );
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
    skybox.alwaysSelectAsActiveMesh = true;

    // Create a "groundbox", a skybox with an invisible top part, used to render the ground
    const groundboxMaterial = new GradientMaterial("groundboxMaterial", this.scene);
    groundboxMaterial.topColor = new Color3(1, 1, 1);
    groundboxMaterial.topColorAlpha = 0;
    groundboxMaterial.bottomColor = new Color3(0.67, 0.56, 0.45);
    groundboxMaterial.offset = 0.5;
    groundboxMaterial.smoothness = 1;
    groundboxMaterial.scale = 0.1;
    groundboxMaterial.backFaceCulling = false;
    groundboxMaterial.disableDepthWrite = true;
    groundboxMaterial.freeze();

    const groundbox = MeshBuilder.CreateSphere(
      "groundbox",
      { diameter: 500 },
      this.scene
    );
    groundbox.layerMask = 0x10000000; // FIXME: Had to do this make the sky visible
    groundbox.position.y = 0;
    groundbox.infiniteDistance = true;
    groundbox.material = groundboxMaterial;
    groundbox.isPickable = false;
    groundbox.alwaysSelectAsActiveMesh = true;

    // Create texture from skyMaterial using reflection probe
    const reflectionProbe = new ReflectionProbe("ref", 64, this.scene, false);
    reflectionProbe.renderList?.push(skybox);
    reflectionProbe.renderList?.push(groundbox);
    reflectionProbe.refreshRate =
      RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;

    // Set environment texture to reflection probe cube texture
    this.scene.environmentTexture = reflectionProbe.cubeTexture;
    this.scene.environmentIntensity = 2;
  }

  /**
   * Sets up post-process effects.
   * @param scene The Babylon scene.
   * @param camera The active camera.
   */
  private _setupPostProcessEffects(camera: Camera) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    const defaultPipeline = new DefaultRenderingPipeline(
      "default",
      false,
      this.scene,
      [camera]
    );
    defaultPipeline.fxaaEnabled = true;
    defaultPipeline.glowLayerEnabled = true;

    // Screen Space Ambient Occlusion for WebGL 2
    if (SSAO2RenderingPipeline.IsSupported) {
      const ssao = new SSAO2RenderingPipeline(
        "ssao", // The name of the pipeline
        this.scene, // The scene to which the pipeline belongs
        0.5, // The size of the postprocess
        [camera] // The list of cameras to be attached to
      );

      ssao.totalStrength = 1.2;
      ssao.base = 0;
      ssao.radius = 1.0;
      ssao.epsilon = 0.02;
      ssao.samples = 16;
      ssao.maxZ = 250;
      ssao.minZAspect = 0.5;
      ssao.expensiveBlur = true;
      ssao.bilateralSamples = 16;
      ssao.bilateralSoften = 1;
      ssao.bilateralTolerance = 1;
    }

    // Screen Space Reflections
    {
      const ssr = new SSRRenderingPipeline(
        "ssr", // The name of the pipeline
        this.scene, // The scene to which the pipeline belongs
        [camera], // The list of cameras to attach the pipeline to
        false, // Whether or not to use the geometry buffer renderer (default: false, use the pre-pass renderer)
        Constants.TEXTURETYPE_UNSIGNED_BYTE // The texture type used by the SSR effect (default: TEXTURETYPE_UNSIGNED_BYTE)
      );

      ssr.thickness = 0.1;
      ssr.selfCollisionNumSkip = 2;
      ssr.enableAutomaticThicknessComputation = false;
      ssr.blurDispersionStrength = 0.02;
      ssr.roughnessFactor = 0.05;
      ssr.enableSmoothReflections = true;
      ssr.step = 20;
      ssr.maxSteps = 100;
      ssr.maxDistance = 1000;
      ssr.blurDownsample = 1;
      ssr.ssrDownsample = 1;

      // Set ssr to false by default because of it's performance impact
      // TODO: Doesn't work when toggled with intermediate optimization
      ssr.isEnabled = false;
    }
  }

  /**
   * Sets up shadow casting for skySun.
   * @param skySun The directional light representing the sun.
   */
  private _setupSkySunShadows(skySun: DirectionalLight) {
    skySun.shadowEnabled = true;
    skySun.autoCalcShadowZBounds = true;
    const sunShadowGenerator = new ShadowGenerator(1024, skySun);
    sunShadowGenerator.setDarkness(0);
    sunShadowGenerator.filter =
      ShadowGenerator.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP;
    sunShadowGenerator.transparencyShadow = true;
    this.sunShadowGenerator = sunShadowGenerator;

    if (!this.scene) {
      throw new Error("No scene");
    }

    // Add shadow casters to sunShadowGenerator
    this._addTaggedMeshesAsShadowCasters();
  }

  /**
   * Adds meshes tagged with "shadowCaster" to the sun shadow generator.
   */
  private _addTaggedMeshesAsShadowCasters() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this.sunShadowGenerator) {
      throw new Error("No sun shadow generator");
    }

    const shadowCasters = this.scene.getMeshesByTags("shadowCaster");
    shadowCasters.forEach((mesh) => {
      this.sunShadowGenerator?.addShadowCaster(mesh);
    });
  }

  /**
   * Rotates the sun and updates the sky material and ambient light based on the new sun position.
   * @param skySun The directional light representing the sun.
   * @param skyMaterial The sky material.
   * @param angle The angle to rotate the sun by.
   */
  private _rotateSun(
    skySun: DirectionalLight,
    skyMaterial: SkyMaterial,
    angle: number
  ) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    // skySun.direction.y goes from 0 at sunrise and sunset to -1 at noon

    // Unfreeze materials and enable autoClear to modify sky material and ambient light
    this.scene.unfreezeMaterials();
    this.scene.autoClear = true;

    // Rotate sun around the y axis and set sun position to the inverse of the direction
    skySun.direction.applyRotationQuaternionInPlace(
      Quaternion.RotationAxis(Vector3.Forward(), angle)
    );
    skyMaterial.sunPosition = skySun.direction.scale(-1);

    // Set sun color based on sun position
    const sunColor = this._getSunColor(-skySun.direction.y);
    skySun.diffuse = sunColor;

    // TODO: This doesn't work that well, should I just remove it?
    // // Set ambient light to sunColor when sun is near horizon, otherwise set it to a dim white
    // if (-skySun.direction.y <= 0.5) {
    //   this.scene.ambientColor = sunColor;
    // } else {
    //   this.scene.ambientColor = new Color3(0.5, 0.5, 0.5);
    // }

    // Freeze materials and disable autoClear if scene performance priority is not set to compatibility mode
    if (
      this.scene.performancePriority !==
      ScenePerformancePriority.BackwardCompatible
    ) {
      this.scene.freezeMaterials();
      this.scene.autoClear = false;
    }
  }

  /**
   * Returns the sun color based on the elevation.
   * @param sunElevation The sun's elevation, 0 at sunrise and sunset, 1 at noon.
   * @returns The calculated sun color.
   */
  private _getSunColor(sunElevation: number): Color3 {
    // Sun color is dim white when elevation is near 0, orange at sunrise and sunset and proper white for the rest of the day.
    const sunriseSunsetColor = new Color3(1, 0.65, 0); // Orange color
    const daySkyColor = new Color3(0.6, 0.6, 0.6); // White color
    const dimWhiteSkyColor = new Color3(0.4, 0.4, 0.4); // Dim white color

    const sunriseSunsetThreshold = 0.2; // Elevation angle threshold for sunrise/sunset

    if (sunElevation <= sunriseSunsetThreshold) {
      // Interpolate between dim white, orange, and white based on elevation angle
      const t = sunElevation / sunriseSunsetThreshold;
      const interpolatedColor = this._interpolateColors(
        dimWhiteSkyColor,
        sunriseSunsetColor,
        daySkyColor,
        t
      );
      return interpolatedColor;
    } else {
      // Return the white color for the rest of the time
      return daySkyColor;
    }
  }

  /**
   * Interpolate between 3 colors
   * @param color1 The first color
   * @param color2 The second color
   * @param color3 The third color
   * @param t The interpolation value
   * @returns The interpolated color
   */
  private _interpolateColors(
    color1: Color3,
    color2: Color3,
    color3: Color3,
    t: number
  ) {
    // Perform linear interpolation between color1 and color2
    const interpolatedColor12 = Color3.Lerp(color1, color2, t);

    // Perform linear interpolation between color2 and color3
    const interpolatedColor23 = Color3.Lerp(color2, color3, t);

    // Perform linear interpolation between interpolatedColor12 and interpolatedColor23
    const finalInterpolatedColor = Color3.Lerp(
      interpolatedColor12,
      interpolatedColor23,
      t
    );

    return finalInterpolatedColor;
  }

  /**
   * Sets the performance priority for the scene.
   * @param priority The performance priority to set. The options are "compatible", "intermediate", and "aggressive".
   */
  private _setPerformancePriority(
    priority: "compatible" | "intermediate" | "aggressive"
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

  /**
   * Sets the snapshot mode for WebGPU snapshot rendering.
   * @param mode The snapshot mode to set. The options are "disabled", "standard", and "fast".
   */
  private _setSnapshotMode(mode: "disabled" | "standard" | "fast") {
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

  /**
   * Resets the snapshot for WebGPU snapshot rendering.
   */
  private _resetSnapshot() {
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
}
