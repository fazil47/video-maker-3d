import type {
  GizmoManager,
  UtilityLayerRenderer,
  FreeCamera,
  Material,
} from "@babylonjs/core";
import type { SkyMaterial } from "@babylonjs/materials";
import type { Nullable } from "@babylonjs/core/types";
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { LightGizmo } from "@babylonjs/core/Gizmos/lightGizmo";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import type {
  BooleanProperty,
  ColourProperty,
  IVideoMaker,
  NumberProperty,
  Inspectable,
  TextureProperty,
  Vector3Property,
  SceneSettings,
} from "~/videoMaker/interface";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { VideoRecorder } from "@babylonjs/core/Misc/videoRecorder";
import "@babylonjs/core/Engines/WebGPU/webgpuShaderProcessorsGLSL";
import "@babylonjs/core/Engines/WebGPU/webgpuSnapshotRendering";
import "@babylonjs/core/Engines/WebGPU/Extensions";
import { Node } from "@babylonjs/core/node";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Tags } from "@babylonjs/core/Misc/tags";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import {
  isInspectableMesh,
  isVector3Property,
  isInspectableAnimation,
  isNumberProperty,
  isInspectableMeshMaterial,
  isColourProperty,
  isTextureProperty,
  isBooleanProperty,
} from "~/videoMaker/interface";
import { implInspectableMeshForAbstractMesh } from "./adapter";
import { AnimatableAnimationGroup } from "./animatableAnimationGroup";
import { MeshWithAnimationGroups } from "./meshWithAnimationGroups";
import {
  loadSettingsFromSessionStorage,
  resetSnapshot,
  saveSettingsToSessionStorage,
  setPerformancePriority,
  setSnapshotMode,
} from "./misc";
import { updateSkybox } from "./skybox";
import { createController } from "./controller";
import { saveScene } from "./saving";
import { createGizmoManager } from "./gizmoManager";
import {
  createEnvironment,
  createInvisibleMaterial,
  populateEnvironment,
} from "./environment";
import { addPrimitiveMesh } from "./primitives";
import { importGLBMesh, loadScene } from "./loading";
import { addKeyframe, matchBoardCurrentKeyframe } from "./storyBoardAnimation";

export default class BabylonVideoMaker implements IVideoMaker {
  public engine: WebGPUEngine | Engine | null = null;
  public scene: Scene | null = null;

  public get sceneInspectables(): Inspectable[] {
    return this._sceneInspectables;
  }

  /**
   * Get scene settings.
   * Note: This is an arrow function because it needs to be passed as a callback to other functions.
   * @returns The current scene settings.
   */
  public getSceneSettings: () => SceneSettings | null = () => {
    return this._sceneSettings;
  };

  /**
   * Sets scene settings.
   * Note: This is an arrow function because it needs to be passed as a callback to other functions.
   * @param settings New scene settings.
   */
  public setSceneSettings: (settings: Partial<SceneSettings>) => void = (
    settings: Partial<SceneSettings>
  ) => {
    if (!this._gizmoManager) {
      // TODO: Not throwing an error because gizmo manager is not initialized when loading a scene
      // when using WebGPU
      console.log("No gizmo manager");
      return;
    }

    let flag = false; // Flag to check if any settings have changed

    if (settings.currentBoardIndex !== undefined) {
      flag = true; // Assume the current board index has changed

      if (settings.currentBoardIndex > this._keyframes.length) {
        console.warn(
          "Somehow the current board index is greater than the number of keyframes"
        );
        return;
      } else if (settings.currentBoardIndex === this._keyframes.length) {
        addKeyframe(
          this._storyBoardAnimationGroup,
          this._keyframes,
          this._defaultKeyframeGap
        );
        this._sceneSettings!.currentBoardIndex = settings.currentBoardIndex;
      } else if (
        settings.currentBoardIndex !== this._sceneSettings!.currentBoardIndex
      ) {
        this._sceneSettings!.currentBoardIndex = settings.currentBoardIndex;
      } else {
        flag = false; // Don't set flag if the current board index hasn't changed
      }
    }

    if (
      settings.transformGizmoMode !== undefined &&
      settings.transformGizmoMode !== this._sceneSettings!.transformGizmoMode
    ) {
      flag = true;

      this._sceneSettings!.transformGizmoMode = settings.transformGizmoMode;
      switch (settings.transformGizmoMode) {
        case "position":
          this._gizmoManager.positionGizmoEnabled = true;
          this._gizmoManager.rotationGizmoEnabled = false;
          this._gizmoManager.scaleGizmoEnabled = false;
          break;
        case "rotation":
          this._gizmoManager.positionGizmoEnabled = false;
          this._gizmoManager.rotationGizmoEnabled = true;
          this._gizmoManager.scaleGizmoEnabled = false;
          break;
        case "scale":
          this._gizmoManager.positionGizmoEnabled = false;
          this._gizmoManager.rotationGizmoEnabled = false;
          this._gizmoManager.scaleGizmoEnabled = true;
          break;
      }
    }

    if (
      settings.newPrimitiveMeshType !== undefined &&
      settings.newPrimitiveMeshType !==
        this._sceneSettings!.newPrimitiveMeshType
    ) {
      flag = true;
      this._sceneSettings!.newPrimitiveMeshType = settings.newPrimitiveMeshType;
    }

    // Explicitly check for not undefined because null is a valid value
    if (
      settings.selectedItemID !== undefined &&
      settings.selectedItemID !== this._sceneSettings!.selectedItemID
    ) {
      flag = true;
      this._sceneSettings!.selectedItemID = settings.selectedItemID;
    }

    if (flag) {
      this._onSceneSettingsChanged(this._sceneSettings);
      matchBoardCurrentKeyframe(
        this._storyBoardAnimationGroup,
        this._keyframes,
        this.getSceneSettings,
        () => {
          if (!this._skySunGizmo?.light) {
            throw new Error("No sky sun light");
          }

          updateSkybox(
            this._skySunGizmo.light as DirectionalLight,
            this._skyboxMaterial
          );
        }
      );

      if (process.env.NODE_ENV === "development") {
        // This is a workaround for a bug in development mode
        saveSettingsToSessionStorage(this._sceneSettings);
      }
    }
  };

  private set sceneInspectables(sceneInspectables: Inspectable[]) {
    this._sceneInspectables = sceneInspectables;
  }

  private _invisibleMaterial: StandardMaterial | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _camera: FreeCamera | null = null;
  private _gizmoManager: GizmoManager | null = null;
  private _utilityLayerRenderer: UtilityLayerRenderer | null = null;
  private _skySunGizmo: LightGizmo | null = null;
  private _skyboxMaterial: SkyMaterial | null = null;
  private _sunShadowGenerator: ShadowGenerator | null = null;
  private _storyBoardAnimationGroup: AnimationGroup | null = null;
  private _storyBoardAnimationGroupPlayingInterval: number | null = null;
  private _skySunGizmoRotationInterval: number | null = null;
  private _keyframes: number[] = [0];
  private _frameRate: number = 60;
  private _defaultKeyframeGap: number = this._frameRate; // Equal to 1 second
  private _savedSceneURL: string | null = null;
  private _savedSceneFilename: string = "scene"; // TODO: This has to be changed for to support multi-scene projects
  private _sceneSettings: SceneSettings = {
    transformGizmoMode: "position",
    newPrimitiveMeshType: "box",
    currentBoardIndex: 0,
    selectedItemID: null,
  };
  private _sceneInspectables: Inspectable[] = [];
  private _onSceneSettingsChanged: (
    sceneSettings: SceneSettings | null
  ) => void = () => {};
  private _onKeyframesChanged: (keyframes: number[]) => void = () => {};
  private _meshesToAnimationGroupsMap: Map<string, string[]> = new Map<
    string,
    string[]
  >(); // Maps mesh names to animation group names. TODO: Maybe use IDs instead of names
  private _meshWithAnimationGroupsMap: Map<string, MeshWithAnimationGroups> =
    new Map<string, MeshWithAnimationGroups>();
  private _animatableAnimationsMap: Map<string, AnimatableAnimationGroup> =
    new Map<string, AnimatableAnimationGroup>();

  /**
   * Clears the scene.
   */
  private _clearScene = () => {
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
    this._meshWithAnimationGroupsMap.forEach((mesh) => {
      mesh.dispose();
    });
    this._animatableAnimationsMap.clear();
    this._meshWithAnimationGroupsMap.clear();
    this._sunShadowGenerator?.dispose();
    this._gizmoManager?.dispose();
    this._camera?.dispose();
    this.scene?.dispose();
    this._storyBoardAnimationGroup?.dispose();
  };

  /**
   * This function initializes the engine and scene asynchronously.
   * @param canvas The canvas element to render to.
   * @param onInitialized Callback function to call when the engine and scene are initialized.
   */
  constructor(
    useWebGPU: boolean,
    canvas: HTMLCanvasElement,
    onInitialized: () => void,
    onSceneSettingsChanged: (sceneSettings: SceneSettings | null) => void,
    onKeyframesChangedCallback: (keyframes: number[]) => void
  ) {
    implInspectableMeshForAbstractMesh();

    // Using a separate initialize function because the constructor cannot be async
    this._initialize(useWebGPU, canvas).then(() => {
      if (!this.engine || !this.scene) {
        throw new Error("No engine or scene");
      }

      this._onSceneSettingsChanged = onSceneSettingsChanged;
      this._onKeyframesChanged = onKeyframesChangedCallback;
      onInitialized();
    });
  }

  public addPrimitiveMesh() {
    addPrimitiveMesh(
      this.scene,
      this._gizmoManager,
      this._sunShadowGenerator,
      this.sceneInspectables,
      this._keyframes,
      this._storyBoardAnimationGroup,
      this._frameRate,
      this.getSceneSettings
    );
  }

  public importGLBModel() {
    importGLBMesh(
      this.scene,
      this._gizmoManager,
      this._sunShadowGenerator,
      this._invisibleMaterial,
      this._keyframes,
      this._frameRate,
      this._storyBoardAnimationGroup,
      this.sceneInspectables,
      this._meshesToAnimationGroupsMap,
      this._meshWithAnimationGroupsMap,
      this._animatableAnimationsMap,
      this._sceneSettings
    );
  }

  public getInspectableById(
    id: string
  ):
    | AbstractMesh
    | Node
    | MeshWithAnimationGroups
    | AnimatableAnimationGroup
    | null {
    return (
      this._meshWithAnimationGroupsMap.get(id) ??
      this._animatableAnimationsMap.get(id) ??
      this.scene?.getMeshById(id) ??
      this.scene?.getNodeById(id) ??
      null
    );
  }

  public PlayStoryBoardAnimation(onEndCallback?: () => void): void {
    if (onEndCallback) {
      this._storyBoardAnimationGroup?.onAnimationGroupEndObservable.addOnce(
        onEndCallback
      );
    }

    this._storyBoardAnimationGroup?.normalize(
      0,
      this._keyframes.at(-1) as number
    );
    this._storyBoardAnimationGroup?.play();
  }

  public RecordStoryBoardAnimation(): void {
    if (!this.engine) {
      console.log("No engine");
      return;
    }

    if (!this.scene) {
      console.log("No scene");
      return;
    }

    if (!this._keyframes || this._keyframes.length === 0) {
      console.log("No keyframes");
      return;
    }

    if (VideoRecorder.IsSupported(this.engine)) {
      const videoRecorder = new VideoRecorder(this.engine, {
        fps: this._frameRate,
        recordChunckSize: 300,
      });
      videoRecorder.startRecording("storyboard.webm", 0);

      setTimeout(() => {
        this.PlayStoryBoardAnimation(() => {
          setTimeout(() => {
            videoRecorder.stopRecording();
          }, 100);
        });
      }, 100);
    }
  }

  public setInspectableProperty(
    selectable: Inspectable,
    property:
      | BooleanProperty
      | NumberProperty
      | ColourProperty
      | TextureProperty
      | Vector3Property
  ) {
    const sceneSettings = this.getSceneSettings();
    if (!sceneSettings) {
      throw new Error("No scene settings");
    }

    if (
      isInspectableMesh(selectable) &&
      (selectable instanceof AbstractMesh ||
        selectable instanceof MeshWithAnimationGroups)
    ) {
      if (isVector3Property(property) && property.value !== null) {
        switch (property.key) {
          case "position":
            selectable.position = new Vector3(
              property.value[0],
              property.value[1],
              property.value[2]
            );
            Object.assign(
              selectable.animations[0].getKeys()[
                sceneSettings.currentBoardIndex
              ].value,
              selectable.position
            );
            break;
          case "rotation":
            selectable.rotationQuaternion = new Vector3(
              property.value[0],
              property.value[1],
              property.value[2]
            ).toQuaternion();
            Object.assign(
              selectable.animations[1].getKeys()[
                sceneSettings.currentBoardIndex
              ].value,
              selectable.rotationQuaternion
            );
            break;
          case "scaling":
            selectable.scaling = new Vector3(
              property.value[0],
              property.value[1],
              property.value[2]
            );
            Object.assign(
              selectable.animations[2].getKeys()[
                sceneSettings.currentBoardIndex
              ].value,
              selectable.scaling
            );
            break;
        }
      }
    } else if (
      isInspectableAnimation(selectable) &&
      selectable instanceof AnimatableAnimationGroup
    ) {
      if (isNumberProperty(property)) {
        switch (property.key) {
          case "currentFrame":
            selectable.currentFrame = property.value;
            if (selectable.animation) {
              selectable.animation.getKeys()[
                sceneSettings.currentBoardIndex
              ].value = selectable.currentFrame;
            }
            break;
          case "blendWeight":
            selectable.blendWeight = property.value;
            break;
        }
      }
    } else if (isInspectableMeshMaterial(selectable) && selectable.id) {
      const selectableMaterial = this.scene?.getMaterialById(selectable.id);
      if (!selectableMaterial) {
        return;
      }

      this._setMaterialProperty(selectableMaterial, property);
    }
  }

  /**
   * Attaches the gizmo manager to the given node.
   * @param selectable The Selectable to select. If possible the gizmo manager will be attached to it.
   */
  public selectInspectable(selectable: Inspectable) {
    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (selectable instanceof AbstractMesh) {
      if (Tags.MatchesQuery(selectable, "skySunGizmoAttachedMesh")) {
        this.setSceneSettings({ transformGizmoMode: "rotation" });
      }
      this._gizmoManager.attachToMesh(selectable);
    } else if (selectable instanceof MeshWithAnimationGroups) {
      this._gizmoManager.attachToMesh(selectable.mesh);
    } else if (selectable instanceof AnimatableAnimationGroup) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachToNode(null);
      this.setSceneSettings({ selectedItemID: selectable.id });
    } else if (selectable instanceof Node) {
      this._gizmoManager.attachToNode(selectable);
    } else {
      throw new Error("Invalid selectable type for BabylonVideoMaker");
    }
  }

  /**
   * Deletes the selected item.
   */
  public deleteInspectable() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    const selectedItemID = this.getSceneSettings()?.selectedItemID;
    if (!selectedItemID) {
      return;
    }

    const selectedItem = this.getInspectableById(selectedItemID);
    if (selectedItem instanceof AbstractMesh) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachableMeshes?.splice(
        this._gizmoManager.attachableMeshes.indexOf(selectedItem),
        1
      );
      this._sceneInspectables.splice(
        this._sceneInspectables.findIndex(
          (sceneInspectable: Inspectable) => sceneInspectable === selectedItem
        ),
        1
      );
      selectedItem.dispose();
    } else if (selectedItem instanceof MeshWithAnimationGroups) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachableMeshes?.splice(
        this._gizmoManager.attachableMeshes.indexOf(selectedItem.mesh),
        1
      );
      this._sceneInspectables.splice(
        this._sceneInspectables.findIndex(
          (sceneInspectable: Inspectable) => sceneInspectable === selectedItem
        ),
        1
      );
      selectedItem.mesh.dispose();
      selectedItem.animationGroups.forEach((animationGroup) => {
        animationGroup.dispose();
      });
    } else if (selectedItem instanceof AnimatableAnimationGroup) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachToNode(null);
      selectedItem.getAnimationGroup().dispose();
    } else if (selectedItem) {
      this._gizmoManager.attachToNode(null);
      this._gizmoManager.attachableNodes?.splice(
        this._gizmoManager.attachableNodes.indexOf(selectedItem),
        1
      );
      this._sceneInspectables.splice(
        this._sceneInspectables.findIndex(
          (sceneInspectable: Inspectable) => sceneInspectable === selectedItem
        ),
        1
      );
      selectedItem.dispose();
    }
  }

  /**
   * Serializes the scene and saves it to a file.
   */
  public saveScene() {
    if (!this._skySunGizmo) {
      throw new Error("No sky sun gizmo");
    }

    saveScene(
      this.scene,
      this._savedSceneURL,
      this._savedSceneFilename,
      this._keyframes,
      this._skySunGizmo.attachedMesh,
      this._meshesToAnimationGroupsMap,
      this._animatableAnimationsMap
    );
  }

  public loadScene() {
    loadScene(
      this._canvas,
      this.engine,
      this._frameRate,
      this._onKeyframesChanged,
      this.getSceneSettings,
      this.setSceneSettings,
      resetSnapshot,
      this._clearScene,
      updateSkybox,
      (
        scene: Scene,
        invisibleMaterial: StandardMaterial,
        camera: FreeCamera,
        gizmoManager: GizmoManager,
        utilityLayerRenderer: UtilityLayerRenderer,
        skySunGizmo: LightGizmo,
        skyboxMaterial: SkyMaterial,
        sunShadowGenerator: ShadowGenerator,
        storyBoardAnimationGroup: AnimationGroup,
        storyBoardAnimationGroupPlayingInterval: number | null,
        skySunGizmoRotationInterval: number | null,
        keyFrames: number[],
        sceneInspectables: Inspectable[],
        meshWithAnimationGroupsMap: Map<string, MeshWithAnimationGroups>,
        animatableAnimationsMap: Map<string, AnimatableAnimationGroup>
      ) => {
        this.scene = scene;
        this._invisibleMaterial = invisibleMaterial;
        this._camera = camera;
        this._gizmoManager = gizmoManager;
        this._utilityLayerRenderer = utilityLayerRenderer;
        this._skySunGizmo = skySunGizmo;
        this._skyboxMaterial = skyboxMaterial;
        this._sunShadowGenerator = sunShadowGenerator;
        this._storyBoardAnimationGroup = storyBoardAnimationGroup;
        this._storyBoardAnimationGroupPlayingInterval =
          storyBoardAnimationGroupPlayingInterval;
        this._skySunGizmoRotationInterval = skySunGizmoRotationInterval;
        this._keyframes = keyFrames;
        this._sceneInspectables = sceneInspectables;
        this._meshWithAnimationGroupsMap = meshWithAnimationGroupsMap;
        this._animatableAnimationsMap = animatableAnimationsMap;
      }
    );
  }

  /**
   * Sets a property of the material.
   * @param material The material to set the property of.
   * @param property The property to set.
   */
  private _setMaterialProperty(
    material: Material,
    property:
      | BooleanProperty
      | NumberProperty
      | ColourProperty
      | TextureProperty
      | Vector3Property
  ) {
    if (!(property.key in material)) {
      throw new Error(`Material does not have property ${property.key}`);
    }

    if (isColourProperty(property)) {
      // Standard material properties
      if (property.key === "diffuseColor" && "diffuseColor" in material) {
        material.diffuseColor = Color3.FromHexString(property.value);
      } else if (
        property.key === "specularColor" &&
        "specularColor" in material
      ) {
        material.specularColor = Color3.FromHexString(property.value);
      }

      // PBR material properties
      if (property.key === "albedoColor" && "albedoColor" in material) {
        material.albedoColor = Color3.FromHexString(property.value);
      } else if (
        property.key === "reflectivityColor" &&
        "reflectivityColor" in material
      ) {
        material.reflectivityColor = Color3.FromHexString(property.value);
      }

      // Common material properties
      if (property.key === "emissiveColor" && "emissiveColor" in material) {
        material.emissiveColor = Color3.FromHexString(property.value);
      } else if (
        property.key === "ambientColor" &&
        "ambientColor" in material
      ) {
        material.ambientColor = Color3.FromHexString(property.value);
      }
    } else if (isTextureProperty(property)) {
      // Standard material properties
      if (property.key === "diffuseTexture" && "diffuseTexture" in material) {
        material.diffuseTexture = property.value
          ? new Texture(property.value, this.scene)
          : null;
      }

      // PBR material properties
      if (property.key === "albedoTexture" && "albedoTexture" in material) {
        material.albedoTexture = property.value
          ? new Texture(property.value, this.scene)
          : null;
      }
    } else if (isNumberProperty(property)) {
      // PBR material properties
      if (property.key === "metallic" && "metallic" in material) {
        material.metallic = property.value;
      } else if (property.key === "roughness" && "roughness" in material) {
        material.roughness = property.value;
      }

      // Common material properties
      if (property.key === "alpha") {
        material.alpha = property.value;
      }
    } else if (isBooleanProperty(property)) {
      // Common material properties
      if (property.key === "backFaceCulling") {
        material.backFaceCulling = property.value;
      } else if (property.key === "wireframe") {
        material.wireframe = property.value;
      }
    }
  }

  /**
   * Initializes the babylon engine and scene asynchronously.
   * @param canvas The canvas to render to.
   */
  private async _initialize(
    useWebGPU: boolean,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    // create the canvas html element and attach it to the webpage
    this._canvas = canvas;

    // initialize babylon scene and engine
    if (useWebGPU) {
      this.engine = new WebGPUEngine(this._canvas);
      await (this.engine as WebGPUEngine).initAsync();
    } else {
      this.engine = new Engine(this._canvas);
    }

    this.scene = new Scene(this.engine);
    [this._gizmoManager, this._utilityLayerRenderer] = createGizmoManager(
      this.scene,
      this.getSceneSettings,
      (node: Nullable<Node>) => {
        if (process.env.NODE_ENV === "development") {
          // This is a workaround for a bug in development mode
          const sceneSettings = loadSettingsFromSessionStorage();
          if (sceneSettings) {
            this.setSceneSettings(sceneSettings);
          }
        }

        this.setSceneSettings({ selectedItemID: node?.id ? node.id : null });
      }
    );
    this._invisibleMaterial = createInvisibleMaterial(this.scene);

    this._camera = createController(
      this._canvas,
      this.engine,
      this.scene,
      this._gizmoManager
    );
    // Instantiate story board animation group
    // TODO: Move this to a separate function
    this._storyBoardAnimationGroup = new AnimationGroup(
      "storyBoardAnimationGroup"
    );
    this._storyBoardAnimationGroup.onAnimationGroupPlayObservable.add(() => {
      this.setSceneSettings({ currentBoardIndex: 0 });

      this._storyBoardAnimationGroupPlayingInterval = window.setInterval(() => {
        const sceneSettings = this.getSceneSettings();

        if (
          sceneSettings &&
          sceneSettings.currentBoardIndex < this._keyframes.length - 1
        ) {
          this.setSceneSettings({
            currentBoardIndex: sceneSettings.currentBoardIndex + 1,
          });
        }
      }, 1000);

      this._skySunGizmoRotationInterval = window.setInterval(() => {
        if (this._skySunGizmo?.light) {
          updateSkybox(
            this._skySunGizmo.light as DirectionalLight,
            this._skyboxMaterial
          );
        }
      }, 1);
    });
    this._storyBoardAnimationGroup.onAnimationGroupPauseObservable.add(() => {
      if (this._storyBoardAnimationGroupPlayingInterval) {
        window.clearInterval(this._storyBoardAnimationGroupPlayingInterval);
      }

      if (this._skySunGizmoRotationInterval) {
        window.clearInterval(this._skySunGizmoRotationInterval);
      }
    });
    this._storyBoardAnimationGroup.onAnimationGroupEndObservable.add(() => {
      if (this._storyBoardAnimationGroupPlayingInterval) {
        window.clearInterval(this._storyBoardAnimationGroupPlayingInterval);
      }

      if (this._skySunGizmoRotationInterval) {
        window.clearInterval(this._skySunGizmoRotationInterval);
      }

      this.setSceneSettings({
        currentBoardIndex: this._keyframes.length - 1,
      });
    });

    const [skySunGizmo, skyboxMaterial, skySunShadowGenerator] =
      await createEnvironment(
        this.engine,
        this.scene,
        this._camera,
        this._gizmoManager,
        this._utilityLayerRenderer,
        this._frameRate,
        this._keyframes,
        this.sceneInspectables,
        this._storyBoardAnimationGroup
      );
    this._skySunGizmo = skySunGizmo;
    this._skyboxMaterial = skyboxMaterial;
    this._sunShadowGenerator = skySunShadowGenerator;

    populateEnvironment(
      this.engine,
      this.scene,
      this._gizmoManager,
      this._sunShadowGenerator,
      this._frameRate,
      this._keyframes,
      this._storyBoardAnimationGroup,
      this.sceneInspectables,
      this._invisibleMaterial,
      this.getSceneSettings,
      this._meshesToAnimationGroupsMap,
      this._meshWithAnimationGroupsMap,
      this._animatableAnimationsMap
    );

    // Create inspector, this only runs in development mode
    this._createInspector(this.scene);

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

    setSnapshotMode(this.engine, this.scene, "disabled");
  }

  // TODO: Optimize scene by default on production builds
  // Unoptimize scene on pointerdown and optimize scene on pointerup

  /**
   * Optimizes the scene for performance.
   */
  private _optimizeScene() {
    setPerformancePriority(this.scene, "intermediate");
  }

  /**
   * Unoptimizes the scene for compatibility.
   */
  private _unoptimizeScene() {
    setPerformancePriority(this.scene, "compatible");
  }

  /**
   * Creates the inspector in development builds
   */
  private async _createInspector(scene: Nullable<Scene>) {
    if (!scene) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      const { Inspector } = await import("@babylonjs/inspector");
      let isVisible = false;

      // Show or hide Inspector visibility
      window.addEventListener("keydown", (ev) => {
        // Shift + Ctrl + Alt + I
        if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.code === "KeyI") {
          if (isVisible) {
            Inspector.Hide();
            isVisible = false;
          } else {
            Inspector.Show(scene, {});
            isVisible = true;
          }
        }
      });
    }
  }
}
