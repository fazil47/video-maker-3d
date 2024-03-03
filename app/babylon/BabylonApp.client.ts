import type {
  Camera,
  IAnimationKey,
  Light,
  Nullable,
  TargetedAnimation,
} from "@babylonjs/core";
import {
  AnimationGroup,
  Node,
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
  Mesh,
  SceneSerializer,
  Tags,
  UtilityLayerRenderer,
  LightGizmo,
  Animation,
  Observable,
  AbstractMesh,
} from "@babylonjs/core";
import { GradientMaterial, SkyMaterial } from "@babylonjs/materials";
import "@babylonjs/loaders/glTF/index.js";
import {
  BlobReader,
  BlobWriter,
  TextReader,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

declare module "@babylonjs/core" {
  interface AbstractMesh {
    onRotationChanged: Nullable<Observable<void>>;
  }
}

export interface SceneSettings {
  transformGizmoMode: TransformGizmoMode;
  newPrimitiveMeshType: PrimitiveMeshType;
  currentBoardIndex: number; // Corresponds to the indices in the keyframes array
  selectedItemID: string | null;
}

export type TransformGizmoMode = "position" | "rotation" | "scale";
export type PrimitiveMeshType =
  | "box"
  | "sphere"
  | "cylinder"
  | "torus"
  | "plane"
  | "ground";

export type SceneObject = MeshWithAnimationGroups | Mesh | Node; // Standalone objects
type SceneItem = SceneObject | AnimatableAnimationGroup; // These are the items that are displayed in the inspector

// TODO: Add public functions for changing properties from the inspector

export class MeshWithAnimationGroups {
  public get name(): string {
    return this._mesh.name;
  }

  public get mesh(): AbstractMesh {
    return this._mesh;
  }

  public get animationGroups(): AnimatableAnimationGroup[] {
    return this._animationGroups;
  }

  public get id(): string {
    return this._mesh.id;
  }

  public set id(id: string) {
    this._mesh.id = id;
  }

  public dispose() {
    this._animationGroups.forEach((animationGroup) => animationGroup.dispose());
    this._mesh.dispose();
  }

  private _mesh: AbstractMesh;
  private _animationGroups: AnimatableAnimationGroup[];

  constructor(mesh: AbstractMesh, animationGroups: AnimatableAnimationGroup[]) {
    this._mesh = mesh;
    this._animationGroups = animationGroups;
  }
}

export class AnimatableAnimationGroup {
  public get currentFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].masterFrame;
  }

  public set currentFrame(frame: number) {
    this._animationGroup.goToFrame(frame);
  }

  public get name(): string {
    return this._animationGroup.name;
  }

  public get id(): string | null {
    return this._id;
  }

  public set id(id: string) {
    this._id = id;
  }

  public get firstFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].fromFrame;
  }

  public get lastFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].toFrame;
  }

  public get animation(): Animation | null {
    return this._animation;
  }

  public set animation(animation: Animation | null) {
    this._animation = animation;
  }

  public get keys(): IAnimationKey[] | undefined {
    return this._animation?.getKeys();
  }

  public get weight(): number {
    return this._animationGroup.weight;
  }

  public set weight(weight: number) {
    this._animationGroup.weight = weight;
  }

  public get loopAnimation(): boolean {
    return this._animationGroup.loopAnimation;
  }

  public set loopAnimation(loopAnimation: boolean) {
    this._animationGroup.loopAnimation = loopAnimation;
  }

  public setCurrentFrameAndWriteToAnimation(frame: number) {
    this._animationGroup.goToFrame(frame);
    this._onCurrentFrameChanged(frame, this.animation);
  }

  private _animationGroup: AnimationGroup;
  private _id: string | null = null;
  private _animation: Animation | null = null;
  private _onCurrentFrameChanged: (
    currentFrame: number,
    animation: Animation | null
  ) => void = () => {};

  constructor(
    animationGroup: AnimationGroup,
    onCurrentFrameChanged: (
      currentFrame: number,
      animation: Animation | null
    ) => void
  ) {
    this._animationGroup = animationGroup;
    this._onCurrentFrameChanged = onCurrentFrameChanged;
    // this._animationGroup.normalize(this.firstFrame, this.lastFrame);
  }

  public getAnimationGroup(): AnimationGroup {
    return this._animationGroup;
  }

  public setAnimationGroup(animationGroup: AnimationGroup): void {
    this._animationGroup = animationGroup;
  }

  public dispose(): void {
    this._animationGroup.dispose();
  }

  public play(): void {
    this._animationGroup.play();
  }

  public pause(): void {
    this._animationGroup.pause();
  }

  public reset(): void {
    this._animationGroup.reset();
  }

  public stop(): void {
    this._animationGroup.stop();
  }
}

export default class BabylonApp {
  public engine: WebGPUEngine | Engine | null = null;
  public scene: Scene | null = null;

  public get sceneObjects(): SceneObject[] {
    return this._sceneObjects;
  }

  private set sceneObjects(sceneObjects: SceneObject[]) {
    this._sceneObjects = sceneObjects;
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
  private _sceneObjects: SceneObject[] = [];
  private _onSceneSettingsChanged: (sceneSettings: SceneSettings) => void =
    () => {};
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
   * This function initializes the engine and scene asynchronously.
   * @param canvas The canvas element to render to.
   * @param onInitialized Callback function to call when the engine and scene are initialized.
   */
  constructor(
    useWebGPU: boolean,
    canvas: HTMLCanvasElement,
    onInitialized: () => void,
    onSceneSettingsChanged: (sceneSettings: SceneSettings) => void,
    onKeyframesChangedCallback: (keyframes: number[]) => void
  ) {
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

  public getObjectById(
    id: string
  ): Mesh | Node | MeshWithAnimationGroups | AnimatableAnimationGroup | null {
    return (
      this._meshWithAnimationGroupsMap.get(id) ??
      this._animatableAnimationsMap.get(id) ??
      this.scene?.getMeshById(id) ??
      this.scene?.getNodeById(id) ??
      null
    );
  }

  /**
   * Plays the story board animation group.
   */
  public PlayStoryBoardAnimation(): void {
    this._storyBoardAnimationGroup?.normalize(
      0,
      this._keyframes.at(-1) as number
    );

    this._storyBoardAnimationGroup?.play();
  }

  /**
   * Adds a new keyframe to all animated nodes.
   * @param timeAfterLastKeyframe The time after the last keyframe to add the new keyframe. Ignored if it's the first keyframe.
   */
  addKeyframe(timeAfterLastKeyframe: number = this._defaultKeyframeGap) {
    if (!this._storyBoardAnimationGroup) {
      throw new Error("No story board animation group");
    }

    if (this._keyframes.length !== 0) {
      this._keyframes.push(
        (this._keyframes.at(-1) as number) + timeAfterLastKeyframe
      );
    } else {
      throw new Error("No keyframes, this shouldn't have happened");
    }

    this._storyBoardAnimationGroup?.targetedAnimations.forEach(
      (targetedAnimation: TargetedAnimation) => {
        if (
          !(
            targetedAnimation.target instanceof AbstractMesh ||
            targetedAnimation.target instanceof AnimatableAnimationGroup
          ) ||
          !(
            targetedAnimation.animation.targetProperty === "position" ||
            targetedAnimation.animation.targetProperty ===
              "rotationQuaternion" ||
            targetedAnimation.animation.targetProperty === "scaling" ||
            targetedAnimation.animation.targetProperty === "currentFrame"
          )
        ) {
          throw new Error(
            "Unsupported animated node or animation target property"
          );
        }

        if (targetedAnimation.target instanceof AbstractMesh) {
          switch (targetedAnimation.animation.targetProperty) {
            case "position":
              targetedAnimation.target.animations[0].setKeys([
                ...targetedAnimation.target.animations[0].getKeys(),
                {
                  frame: this._keyframes.at(-1) as number,
                  value: targetedAnimation.target.position.clone(),
                },
              ]);
              break;
            case "rotationQuaternion":
              targetedAnimation.target.animations[1].setKeys([
                ...targetedAnimation.target.animations[1].getKeys(),
                {
                  frame: this._keyframes.at(-1) as number,
                  value: targetedAnimation.target.rotationQuaternion?.clone(),
                },
              ]);
              break;
            case "scaling":
              targetedAnimation.target.animations[2].setKeys([
                ...targetedAnimation.target.animations[2].getKeys(),
                {
                  frame: this._keyframes.at(-1) as number,
                  value: targetedAnimation.target.scaling.clone(),
                },
              ]);
              break;
          }
        } else if (
          targetedAnimation.target instanceof AnimatableAnimationGroup
        ) {
          targetedAnimation.animation.setKeys([
            ...targetedAnimation.animation.getKeys(),
            {
              frame: this._keyframes.at(-1) as number,
              value: targetedAnimation.target.currentFrame,
            },
          ]);
        }
      }
    );
  }

  /**
   * This sets the animated properties match the values at the current board's keyframe.
   */
  matchCurrentBoardKeyframe() {
    if (this._keyframes.length === 0) {
      throw new Error("No keyframes, this shouldn't have happened");
    }

    this._storyBoardAnimationGroup?.targetedAnimations.forEach(
      (targetedAnimation: TargetedAnimation) => {
        // TODO: Support more types of nodes
        if (targetedAnimation.target instanceof AbstractMesh) {
          switch (targetedAnimation.animation.targetProperty) {
            case "position":
              targetedAnimation.target.position =
                targetedAnimation.target.animations[0].getKeys()[
                  this.getSceneSettings().currentBoardIndex
                ]?.value;
              break;
            case "rotationQuaternion":
              targetedAnimation.target.rotationQuaternion =
                targetedAnimation.target.animations[1].getKeys()[
                  this.getSceneSettings().currentBoardIndex
                ]?.value;
              break;
            case "scaling":
              targetedAnimation.target.scaling =
                targetedAnimation.target.animations[2].getKeys()[
                  this.getSceneSettings().currentBoardIndex
                ]?.value;
              break;
          }
        } else if (
          targetedAnimation.target instanceof AnimatableAnimationGroup
        ) {
          targetedAnimation.target.currentFrame =
            targetedAnimation.animation.getKeys()[
              this.getSceneSettings().currentBoardIndex
            ]?.value;
        }
      }
    );

    // TODO: This is a hack to update the skybox, shouldn't be necessary
    setTimeout(() => {
      this._updateSkybox();
    }, 100);
  }

  // TODO: Optimize scene by default on production builds
  // Unoptimize scene on pointerdown and optimize scene on pointerup

  /**
   * Optimizes the scene for performance.
   */
  private _optimizeScene() {
    this._setPerformancePriority("intermediate");
  }

  /**
   * Unoptimizes the scene for compatibility.
   */
  private _unoptimizeScene() {
    this._setPerformancePriority("compatible");
  }

  /**
   * Get scene settings.
   * @returns The current scene settings.
   */
  public getSceneSettings(): SceneSettings {
    return this._sceneSettings;
  }

  /**
   * Sets scene settings.
   * @param settings New scene settings.
   */
  public setSceneSettings(settings: Partial<SceneSettings>) {
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
        throw new Error(
          "Somehow the current board index is greater than the number of keyframes"
        );
      } else if (settings.currentBoardIndex === this._keyframes.length) {
        this.addKeyframe();
        this._sceneSettings.currentBoardIndex = settings.currentBoardIndex;
      } else if (
        settings.currentBoardIndex !== this._sceneSettings.currentBoardIndex
      ) {
        this._sceneSettings.currentBoardIndex = settings.currentBoardIndex;
      } else {
        flag = false; // Don't set flag if the current board index hasn't changed
      }
    }

    if (
      settings.transformGizmoMode !== undefined &&
      settings.transformGizmoMode !== this._sceneSettings.transformGizmoMode
    ) {
      flag = true;

      this._sceneSettings.transformGizmoMode = settings.transformGizmoMode;
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
      settings.newPrimitiveMeshType !== this._sceneSettings.newPrimitiveMeshType
    ) {
      flag = true;
      this._sceneSettings.newPrimitiveMeshType = settings.newPrimitiveMeshType;
    }

    // Explicitly check for not undefined because null is a valid value
    if (
      settings.selectedItemID !== undefined &&
      settings.selectedItemID !== this._sceneSettings.selectedItemID
    ) {
      flag = true;
      this._sceneSettings.selectedItemID = settings.selectedItemID;
    }

    if (flag) {
      this._onSceneSettingsChanged(this._sceneSettings);

      // Call this.matchCurrentBoardKeyframe() after the scene settings have been updated
      this.matchCurrentBoardKeyframe();
    }
  }

  /**
   * Attaches the gizmo manager to the given node.
   * @param item The SceneItem to select. If possible the gizmo manager will be attached to.
   */
  public selectSceneItem(item: SceneItem) {
    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (item instanceof AbstractMesh) {
      if (Tags.MatchesQuery(item, "skySunGizmoAttachedMesh")) {
        this.setSceneSettings({ transformGizmoMode: "rotation" });
      }
      this._gizmoManager.attachToMesh(item);
    } else if (item instanceof Node) {
      this._gizmoManager.attachToNode(item);
    } else if (item instanceof MeshWithAnimationGroups) {
      this._gizmoManager.attachToMesh(item.mesh);
    } else if (item instanceof AnimatableAnimationGroup) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachToNode(null);
      this.setSceneSettings({ selectedItemID: item.id });
    }
  }

  /**
   * Deletes the selected item.
   */
  public deleteSelectedItem() {
    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }
    if (!this.scene) {
      throw new Error("No scene");
    }

    const selectedItemID = this.getSceneSettings().selectedItemID;
    if (!selectedItemID) {
      return;
    }

    const selectedItem = this.getObjectById(selectedItemID);
    if (selectedItem instanceof AbstractMesh) {
      this._gizmoManager.attachToMesh(null);
      this._gizmoManager.attachableMeshes?.splice(
        this._gizmoManager.attachableMeshes.indexOf(selectedItem),
        1
      );
      this._sceneObjects.splice(
        this._sceneObjects.findIndex(
          (sceneObject: SceneObject) =>
            sceneObject instanceof AbstractMesh && sceneObject === selectedItem
        ),
        1
      );
      selectedItem.dispose();
    } else if (selectedItem instanceof Node) {
      this._gizmoManager.attachToNode(null);
      this._gizmoManager.attachableNodes?.splice(
        this._gizmoManager.attachableNodes.indexOf(selectedItem),
        1
      );
      this._sceneObjects.splice(
        this._sceneObjects.findIndex(
          (sceneObject: SceneObject) =>
            sceneObject instanceof Node && sceneObject === selectedItem
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
      this._sceneObjects.splice(
        this._sceneObjects.findIndex(
          (sceneObject: SceneObject) =>
            sceneObject instanceof MeshWithAnimationGroups &&
            sceneObject === selectedItem
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
      this._sceneObjects.splice(
        this._sceneObjects.findIndex(
          (sceneObject: SceneObject) =>
            sceneObject instanceof AnimatableAnimationGroup &&
            sceneObject === selectedItem
        ),
        1
      );
      selectedItem.getAnimationGroup().dispose();
    }
  }

  /**
   * Serializes the scene and saves it to a file.
   */
  public async saveScene() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (this._savedSceneURL) {
      window.URL.revokeObjectURL(this._savedSceneURL);
    }

    const serializedScene = SceneSerializer.Serialize(this.scene);
    // TODO: Save skybox and environment texture
    delete serializedScene.environmentTexture;
    const strMesh = JSON.stringify(serializedScene);

    // Zip the scene and keyframes files
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);
    await zipWriter.add(
      `${this._savedSceneFilename}.babylon`,
      new TextReader(strMesh)
    );
    await zipWriter.add(
      `${this._savedSceneFilename}_keyframes.json`,
      new TextReader(JSON.stringify(this._keyframes))
    );
    await zipWriter.add(
      `${this._savedSceneFilename}_skySun_rotation_animation.json`,
      new TextReader(
        JSON.stringify(
          this._skySunGizmo?.attachedMesh?.animations[1]
            .getKeys()
            .map((key) => {
              return key.value;
            })
        )
      )
    );
    await zipWriter.add(
      `${this._savedSceneFilename}_m2a.json`,
      new TextReader(
        JSON.stringify(Object.fromEntries(this._meshesToAnimationGroupsMap))
      )
    );
    const animationGroupNameToAnimatableAnimationGroupKeys = new Map<
      string,
      IAnimationKey[]
    >();
    Array.from(this._animatableAnimationsMap.values()).forEach(
      (animatableAnimationGroup) => {
        if (animatableAnimationGroup.keys) {
          animationGroupNameToAnimatableAnimationGroupKeys.set(
            animatableAnimationGroup.name,
            animatableAnimationGroup.keys
          );
        }
      }
    );
    await zipWriter.add(
      `${this._savedSceneFilename}_a2aa.json`,
      new TextReader(
        JSON.stringify(
          Object.fromEntries(animationGroupNameToAnimatableAnimationGroupKeys)
        )
      )
    );

    const zipBlob = await zipWriter.close();
    this._savedSceneURL = (window.webkitURL || window.URL).createObjectURL(
      zipBlob
    );

    const link = window.document.createElement("a");
    link.href = this._savedSceneURL;
    link.download = `${this._savedSceneFilename}.zip`;
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
  public loadScene() {
    const fileInput: HTMLInputElement = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".zip";

    fileInput.onchange = async (event) => {
      const file: File | undefined = (event.target as HTMLInputElement)
        .files?.[0];

      if (file) {
        const zipReaderEntries = await new ZipReader(
          new BlobReader(file)
        ).getEntries();

        // Deserialize everything other than the scene first
        let animationGroupNameToAnimatableAnimationGroupKeys: Map<
          string,
          IAnimationKey[]
        >;
        let skySunRotationAnimationValues: Quaternion[];
        await Promise.all(
          zipReaderEntries.map(async (entry) => {
            // Check if file extension is .babylon
            if (entry.filename.endsWith("_keyframes.json") && entry.getData) {
              const keyframesBlobURL: string = URL.createObjectURL(
                await entry.getData(new BlobWriter())
              );

              const keyframesResponse: Response = await fetch(keyframesBlobURL);
              const keyframes: any = await keyframesResponse.json();
              this._keyframes = keyframes;
              this._onKeyframesChanged(this._keyframes);
            } else if (entry.filename.endsWith("_m2a.json") && entry.getData) {
              const m2aBlobURL: string = URL.createObjectURL(
                await entry.getData(new BlobWriter())
              );

              const m2aResponse: Response = await fetch(m2aBlobURL);
              const m2a: any = await m2aResponse.json();
              this._meshesToAnimationGroupsMap = new Map(Object.entries(m2a));
            } else if (entry.filename.endsWith("_a2aa.json") && entry.getData) {
              const a2aaBlobURL: string = URL.createObjectURL(
                await entry.getData(new BlobWriter())
              );

              const a2aaResponse: Response = await fetch(a2aaBlobURL);
              const a2aa: any = await a2aaResponse.json();
              animationGroupNameToAnimatableAnimationGroupKeys = new Map(
                Object.entries(a2aa)
              );
            } else if (
              entry.filename.endsWith("_skySun_rotation_animation.json") &&
              entry.getData
            ) {
              const skySunRotationAnimationBlobURL: string =
                URL.createObjectURL(await entry.getData(new BlobWriter()));

              const skySunRotationAnimationResponse: Response = await fetch(
                skySunRotationAnimationBlobURL
              );
              skySunRotationAnimationValues =
                await skySunRotationAnimationResponse.json();
            }
          })
        );

        zipReaderEntries.forEach(async (entry) => {
          if (entry.filename.endsWith(".babylon") && entry.getData) {
            const sceneBlobURL: string = URL.createObjectURL(
              await entry.getData(new BlobWriter())
            );

            const scene: Scene = await SceneLoader.LoadAsync(
              "",
              sceneBlobURL,
              this.engine,
              null,
              ".babylon"
            );

            this.sceneObjects.forEach((sceneObject) => {
              sceneObject.dispose();
            });
            this.sceneObjects = [];

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

              // Set the new scene
              this.scene = scene;
              this._createInvisibleMaterial();
              this._storyBoardAnimationGroup =
                this.scene.getAnimationGroupByName("storyBoardAnimationGroup");

              // Setup gizmo manager
              // TODO: Add callback to set selected object, causes a freeze when I try now
              [this._gizmoManager, this._utilityLayerRenderer] =
                this._createGizmoManager((node: Nullable<Node>) => {
                  this.setSceneSettings({
                    selectedItemID: node?.id ? node.id : null,
                  });
                });
              this._setTaggedNodesAsAttachableToGizmoManager();
              this._setTaggedMeshesAsAttachableToGizmoManager();

              // Setup camera controls
              // TODO: Save camera position and rotation
              this._camera = this._createController();
              this.scene.activeCamera = this._camera;

              // TODO: Save skybox and environment texture
              // For now, just recreate the environment
              const skySun: Nullable<Light> =
                this.scene.getLightByName("skySun");
              this._skySunGizmo = new LightGizmo(this._utilityLayerRenderer);
              // TODO: same as in _createEnvironment
              try {
                this._skySunGizmo.light = skySun;
              } catch (e) {
                if (process.env.NODE_ENV === "development") {
                  console.error(e);
                }
              }

              // TODO: Needs to refactored into a separate function
              if (skySun instanceof DirectionalLight) {
                if (this._skySunGizmo.attachedMesh) {
                  this._skySunGizmo.attachedMesh.name = skySun.name;
                  this._gizmoManager.attachableMeshes?.push(
                    this._skySunGizmo.attachedMesh
                  );
                  this._sceneObjects.push(this._skySunGizmo.attachedMesh);
                  Tags.AddTagsTo(
                    this._skySunGizmo.attachedMesh,
                    "skySunGizmoAttachedMesh"
                  );
                  this._skySunGizmo.attachedMesh.onRotationChanged =
                    new Observable();
                  this._skySunGizmo.attachedMesh.onRotationChanged.add(() => {
                    this._updateSkybox();
                  });
                  if (this._keyframes.length == 0) {
                    this._skySunGizmo.attachedMesh.rotationQuaternion =
                      this._skySunGizmo.attachedMesh.rotation.toQuaternion();
                  } else {
                    this._skySunGizmo.attachedMesh.rotationQuaternion =
                      new Quaternion(
                        skySunRotationAnimationValues[0]._x,
                        skySunRotationAnimationValues[0]._y,
                        skySunRotationAnimationValues[0]._z,
                        skySunRotationAnimationValues[0]._w
                      );
                  }

                  const skySunRotationAnim = new Animation(
                    `${skySun.name}_rotation`,
                    "rotationQuaternion",
                    this._frameRate,
                    Animation.ANIMATIONTYPE_QUATERNION
                  );
                  skySunRotationAnim.setKeys(
                    this._keyframes.map((keyframe, i) => {
                      return {
                        frame: keyframe,
                        value: new Quaternion(
                          skySunRotationAnimationValues[i]._x,
                          skySunRotationAnimationValues[i]._y,
                          skySunRotationAnimationValues[i]._z,
                          skySunRotationAnimationValues[i]._w
                        ),
                      };
                    })
                  );
                  // Only rotation animation is relevant
                  // Adding position and scaling animations to
                  // reuse the same animation logic as the other meshes
                  this._skySunGizmo.attachedMesh.animations = [
                    new Animation(
                      `${skySun.name}_position`,
                      "position",
                      this._frameRate,
                      Animation.ANIMATIONTYPE_VECTOR3
                    ),
                    skySunRotationAnim,
                    new Animation(
                      `${skySun.name}_scaling`,
                      "scaling",
                      this._frameRate,
                      Animation.ANIMATIONTYPE_VECTOR3
                    ),
                  ];
                  this._storyBoardAnimationGroup?.addTargetedAnimation(
                    skySunRotationAnim,
                    this._skySunGizmo.attachedMesh
                  );
                }

                this._setupSkybox();
                this._setupSkySunShadows(skySun);

                // TODO: This is a hack to update the skybox, shouldn't be necessary
                setTimeout(() => {
                  this._updateSkybox();
                }, 100);
              }

              // targetAnimation.animation needs to be synced with targetAnimation.target.animations
              this._storyBoardAnimationGroup?.targetedAnimations.forEach(
                (targetedAnimation: TargetedAnimation) => {
                  if (targetedAnimation.target instanceof AbstractMesh) {
                    switch (targetedAnimation.animation.targetProperty) {
                      case "position":
                        targetedAnimation.animation =
                          targetedAnimation.target.animations[0];
                        break;
                      case "rotationQuaternion":
                        targetedAnimation.animation =
                          targetedAnimation.target.animations[1];
                        break;
                      case "scaling":
                        targetedAnimation.animation =
                          targetedAnimation.target.animations[2];
                        break;
                    }
                  }
                }
              );
              this._storyBoardAnimationGroup?.reset();
              if (this._storyBoardAnimationGroup) {
                this._storyBoardAnimationGroup.loopAnimation = false;
              }
              this._storyBoardAnimationGroup?.onAnimationGroupPlayObservable.add(
                () => {
                  this.setSceneSettings({ currentBoardIndex: 0 });

                  this._storyBoardAnimationGroupPlayingInterval =
                    window.setInterval(() => {
                      if (
                        this.getSceneSettings().currentBoardIndex <
                        this._keyframes.length - 1
                      ) {
                        this.setSceneSettings({
                          currentBoardIndex:
                            this.getSceneSettings().currentBoardIndex + 1,
                        });
                      }
                    }, 1000);

                  this._skySunGizmoRotationInterval = window.setInterval(() => {
                    if (this._skySunGizmo) {
                      this._updateSkybox();
                    }
                  }, 1);
                }
              );
              this._storyBoardAnimationGroup?.onAnimationGroupPauseObservable.add(
                () => {
                  if (this._storyBoardAnimationGroupPlayingInterval) {
                    window.clearInterval(
                      this._storyBoardAnimationGroupPlayingInterval
                    );
                  }

                  if (this._skySunGizmoRotationInterval) {
                    window.clearInterval(this._skySunGizmoRotationInterval);
                  }
                }
              );
              this._storyBoardAnimationGroup?.onAnimationGroupEndObservable.add(
                () => {
                  if (this._storyBoardAnimationGroupPlayingInterval) {
                    window.clearInterval(
                      this._storyBoardAnimationGroupPlayingInterval
                    );
                  }

                  if (this._skySunGizmoRotationInterval) {
                    window.clearInterval(this._skySunGizmoRotationInterval);
                  }

                  this.setSceneSettings({
                    currentBoardIndex: this._keyframes.length - 1,
                  });
                }
              );

              // Deserialize animatable animation groups
              Array.from(this._meshesToAnimationGroupsMap.entries()).forEach(
                ([meshName, animationGroupNames]) => {
                  if (!this.scene) {
                    throw new Error("No scene");
                  }

                  const mesh = this.scene.getMeshByName(meshName);

                  if (!mesh || !(mesh instanceof AbstractMesh)) {
                    console.log(`Couldn't find mesh with ID: ${meshName}`);
                    return;
                  }

                  const animationGroups: AnimationGroup[] = animationGroupNames
                    .map((animationGroupName) =>
                      this.scene?.getAnimationGroupByName(animationGroupName)
                    )
                    .filter(notEmpty);

                  const animatableAnimationGroups: AnimatableAnimationGroup[] =
                    animationGroups.map(
                      (animationGroup) =>
                        new AnimatableAnimationGroup(
                          animationGroup,
                          (currentFrame, animation) => {
                            if (
                              !animation ||
                              !animation.getKeys()[
                                this.getSceneSettings().currentBoardIndex
                              ]
                            ) {
                              return;
                            }

                            animation.getKeys()[
                              this.getSceneSettings().currentBoardIndex
                            ].value = currentFrame;
                          }
                        )
                    );

                  this._meshWithAnimationGroupsMap.set(
                    mesh.id,
                    new MeshWithAnimationGroups(mesh, animatableAnimationGroups)
                  );

                  animatableAnimationGroups.forEach(
                    (animatableAnimationGroup: AnimatableAnimationGroup) => {
                      animatableAnimationGroup.play();
                      animatableAnimationGroup.reset();
                      animatableAnimationGroup.pause();
                      animatableAnimationGroup.weight = 1;
                      animatableAnimationGroup.loopAnimation = false;

                      if (!this.scene) {
                        throw new Error("No scene");
                      }

                      animatableAnimationGroup.id = this.scene
                        .getUniqueId()
                        .toString();
                      this._animatableAnimationsMap.set(
                        animatableAnimationGroup.id,
                        animatableAnimationGroup
                      );

                      const animationGroupFrameAnimation = new Animation(
                        `${mesh.name}_${animatableAnimationGroup.name}_currentFrame`,
                        "currentFrame",
                        this._frameRate,
                        Animation.ANIMATIONTYPE_FLOAT
                      );

                      animatableAnimationGroup.animation =
                        animationGroupFrameAnimation;

                      const deserializedKeys =
                        animationGroupNameToAnimatableAnimationGroupKeys.get(
                          animatableAnimationGroup.name
                        );

                      if (deserializedKeys) {
                        animationGroupFrameAnimation.setKeys(deserializedKeys);
                      }

                      this._storyBoardAnimationGroup?.addTargetedAnimation(
                        animationGroupFrameAnimation,
                        animatableAnimationGroup
                      );
                    }
                  );
                }
              );

              this.scene
                .getMeshesByTags("meshWithoutAnimationGroups")
                .forEach((mesh) => {
                  this.sceneObjects.push(mesh);
                });
              this._meshWithAnimationGroupsMap.forEach(
                (meshWithAnimationGroups) => {
                  this.sceneObjects.push(meshWithAnimationGroups);
                }
              );

              // TODO: Save post-process effects
              // For now, just recreate the post-process effects
              this._setupPostProcessEffects(this._camera);
            }

            this._resetSnapshot();
          }
        });
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

    switch (this.getSceneSettings().newPrimitiveMeshType) {
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

    // Set rotation to identity
    mesh.rotationQuaternion = Quaternion.Identity();

    const meshPositionAnim = new Animation(
      `${mesh.name}_position`,
      "position",
      this._frameRate,
      Animation.ANIMATIONTYPE_VECTOR3
    );
    const meshRotationAnim = new Animation(
      `${mesh.name}_rotation`,
      "rotationQuaternion",
      this._frameRate,
      Animation.ANIMATIONTYPE_QUATERNION
    );
    const meshScalingAnim = new Animation(
      `${mesh.name}_scaling`,
      "scaling",
      this._frameRate,
      Animation.ANIMATIONTYPE_VECTOR3
    );

    // Add to animatedNodes

    // TODO: How do I handle this?
    // For now I'm adding keys for every keyframe and setting the value to the current value
    meshPositionAnim.setKeys(
      this._keyframes.map((keyframe) => ({
        frame: keyframe,
        value: mesh.position.clone(),
      }))
    );
    meshRotationAnim.setKeys(
      this._keyframes.map((keyframe) => ({
        frame: keyframe,
        value: mesh.rotationQuaternion?.clone(),
      }))
    );
    meshScalingAnim.setKeys(
      this._keyframes.map((keyframe) => ({
        frame: keyframe,
        value: mesh.scaling.clone(),
      }))
    );

    mesh.animations = [meshPositionAnim, meshRotationAnim, meshScalingAnim];
    this._storyBoardAnimationGroup?.addTargetedAnimation(
      meshPositionAnim,
      mesh
    );
    this._storyBoardAnimationGroup?.addTargetedAnimation(
      meshRotationAnim,
      mesh
    );
    this._storyBoardAnimationGroup?.addTargetedAnimation(meshScalingAnim, mesh);

    mesh.isPickable = true;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;
    mesh.material = material;

    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }
    this._gizmoManager.attachableMeshes?.push(mesh);
    Tags.AddTagsTo(mesh, "gizmoAttachableMesh");
    mesh.id = this.scene?.getUniqueId().toString() as string;

    this._sunShadowGenerator?.addShadowCaster(mesh);
    Tags.AddTagsTo(mesh, "shadowCaster");

    this._sceneObjects.push(mesh);
    this._gizmoManager.attachToMesh(mesh);

    Tags.AddTagsTo(mesh, "meshWithoutAnimationGroups");
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

        SceneLoader.ImportMeshAsync(
          "",
          fileURL,
          "",
          this.scene,
          null,
          ".glb"
        ).then(({ meshes, animationGroups }): void => {
          const fileName = getFileNameWithoutExtension(file.name);

          if (!this._gizmoManager) {
            throw new Error("No gizmo manager");
          }

          if (!this._sunShadowGenerator) {
            throw new Error("No sun shadow generator");
          }

          if (!this._invisibleMaterial) {
            throw new Error("No invisible material");
          }

          const boundingBox = new BoundingBox(
            new Vector3(0, 0, 0),
            new Vector3(0, 0, 0)
          );

          meshes.forEach((mesh) => {
            mesh.isPickable = false;
            mesh.receiveShadows = true;
            this._sunShadowGenerator?.addShadowCaster(mesh);
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
            fileName,
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
          this._gizmoManager.attachableMeshes?.push(boundingBoxMesh);
          Tags.AddTagsTo(boundingBoxMesh, "gizmoAttachableMesh");
          boundingBoxMesh.id = this.scene?.getUniqueId().toString() as string;
          boundingBoxMesh.isPickable = true;
          boundingBoxMesh.material = this._invisibleMaterial;

          // Add to animatedNodes

          const meshPositionAnim = new Animation(
            `${fileName}_position`,
            "position",
            this._frameRate,
            Animation.ANIMATIONTYPE_VECTOR3
          );
          const meshRotationAnim = new Animation(
            `${fileName}_rotation`,
            "rotationQuaternion",
            this._frameRate,
            Animation.ANIMATIONTYPE_QUATERNION
          );
          const meshScalingAnim = new Animation(
            `${fileName}_scaling`,
            "scaling",
            this._frameRate,
            Animation.ANIMATIONTYPE_VECTOR3
          );

          // TODO: How do I handle this?
          // For now I'm adding keys for every keyframe and setting the value to the current value
          meshPositionAnim.setKeys(
            this._keyframes.map((keyframe) => {
              return {
                frame: keyframe,
                value: boundingBoxMesh.position.clone(),
              };
            })
          );
          meshRotationAnim.setKeys(
            this._keyframes.map((keyframe) => {
              return {
                frame: keyframe,
                value: boundingBoxMesh.rotationQuaternion?.clone(),
              };
            })
          );
          meshScalingAnim.setKeys(
            this._keyframes.map((keyframe) => {
              return {
                frame: keyframe,
                value: boundingBoxMesh.scaling.clone(),
              };
            })
          );

          boundingBoxMesh.animations = [
            meshPositionAnim,
            meshRotationAnim,
            meshScalingAnim,
          ];
          this._storyBoardAnimationGroup?.addTargetedAnimation(
            meshPositionAnim,
            boundingBoxMesh
          );
          this._storyBoardAnimationGroup?.addTargetedAnimation(
            meshRotationAnim,
            boundingBoxMesh
          );
          this._storyBoardAnimationGroup?.addTargetedAnimation(
            meshScalingAnim,
            boundingBoxMesh
          );

          const animatableAnimationGroups: AnimatableAnimationGroup[] =
            animationGroups.map(
              (animationGroup) =>
                new AnimatableAnimationGroup(
                  animationGroup,
                  (currentFrame, animation) => {
                    if (
                      !animation ||
                      !animation.getKeys()[
                        this.getSceneSettings().currentBoardIndex
                      ]
                    ) {
                      return;
                    }

                    animation.getKeys()[
                      this.getSceneSettings().currentBoardIndex
                    ].value = currentFrame;
                  }
                )
            );

          this._meshesToAnimationGroupsMap.set(
            boundingBoxMesh.name,
            animationGroups.map((animationGroup) => animationGroup.name)
          );

          this._meshWithAnimationGroupsMap.set(
            boundingBoxMesh.id,
            new MeshWithAnimationGroups(
              boundingBoxMesh,
              animatableAnimationGroups
            )
          );

          animatableAnimationGroups.forEach(
            (animatableAnimationGroup: AnimatableAnimationGroup) => {
              animatableAnimationGroup.pause();

              if (!this.scene) {
                throw new Error("No scene");
              }

              animatableAnimationGroup.id = this.scene.getUniqueId().toString();
              this._animatableAnimationsMap.set(
                animatableAnimationGroup.id,
                animatableAnimationGroup
              );

              const animationGroupFrameAnimation = new Animation(
                `${fileName}_${animatableAnimationGroup.name}_currentFrame`,
                "currentFrame",
                this._frameRate,
                Animation.ANIMATIONTYPE_FLOAT
              );

              animatableAnimationGroup.animation = animationGroupFrameAnimation;

              animationGroupFrameAnimation.setKeys(
                this._keyframes.map((keyframe) => {
                  return {
                    frame: keyframe,
                    value: animatableAnimationGroup.currentFrame,
                  };
                })
              );

              this._storyBoardAnimationGroup?.addTargetedAnimation(
                animationGroupFrameAnimation,
                animatableAnimationGroup
              );
            }
          );

          this._sceneObjects.push(
            new MeshWithAnimationGroups(
              boundingBoxMesh,
              animatableAnimationGroups
            )
          );
          this._gizmoManager.attachToMesh(boundingBoxMesh);
        });
      }
    };

    fileInput.click();
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
    [this._gizmoManager, this._utilityLayerRenderer] = this._createGizmoManager(
      (node: Nullable<Node>) => {
        this.setSceneSettings({ selectedItemID: node?.id ? node.id : null });
      }
    );
    this._createInvisibleMaterial();

    this._camera = this._createController();
    // Instantiate story board animation group
    // TODO: Move this to a separate function
    this._storyBoardAnimationGroup = new AnimationGroup(
      "storyBoardAnimationGroup"
    );
    this._storyBoardAnimationGroup.onAnimationGroupPlayObservable.add(() => {
      this.setSceneSettings({ currentBoardIndex: 0 });

      this._storyBoardAnimationGroupPlayingInterval = window.setInterval(() => {
        if (
          this.getSceneSettings().currentBoardIndex <
          this._keyframes.length - 1
        ) {
          this.setSceneSettings({
            currentBoardIndex: this.getSceneSettings().currentBoardIndex + 1,
          });
        }
      }, 1000);

      this._skySunGizmoRotationInterval = window.setInterval(() => {
        if (this._skySunGizmo) {
          this._updateSkybox();
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

    this._createEnvironment();

    // Create inspector, this only runs in development mode
    this._createInspector();

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

    this._setSnapshotMode("disabled");
  }

  /**
   * Creates the invisible material used for the bounding box meshes.
   */
  private _createInvisibleMaterial() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    this._invisibleMaterial = new StandardMaterial(
      "invisibleMaterial",
      this.scene
    );
    this._invisibleMaterial.alpha = 0;
  }

  /**
   * Creates the gizmo manager and utilityLayerRenderer.
   * @param onAttachedToObjectCallback Callback to be called when the gizmo is attached to a node.
   */
  private _createGizmoManager(
    onAttachedToObjectCallback?: (node: Nullable<Node>) => void
  ): [GizmoManager, UtilityLayerRenderer] {
    if (!this.scene) {
      throw new Error("No scene");
    }

    // TODO: Not sure about this, should I return this as well and set the property explicitly along with this.gizmoManager?
    const utilityLayerRenderer = new UtilityLayerRenderer(this.scene);

    // Create and setup GizmoManager
    const gizmoManager = new GizmoManager(this.scene, 1, utilityLayerRenderer);
    gizmoManager.clearGizmoOnEmptyPointerEvent = true;
    gizmoManager.attachableMeshes = [];
    gizmoManager.attachableNodes = [];

    if (onAttachedToObjectCallback) {
      gizmoManager.onAttachedToNodeObservable.add(onAttachedToObjectCallback);
      gizmoManager.onAttachedToMeshObservable.add(onAttachedToObjectCallback);
    }

    // Enabling all the gizmos first to subscribe to onDragEnd observables
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = true;
    gizmoManager.scaleGizmoEnabled = true;

    // TODO: Currently animations are in the an array in order of position, rotation, and scaling. Might need to change this later.
    gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(() => {
      if (
        gizmoManager.gizmos.positionGizmo?.attachedMesh !== undefined &&
        gizmoManager.gizmos.positionGizmo?.attachedMesh !== null &&
        gizmoManager.gizmos.positionGizmo?.attachedMesh.animations[0].getKeys()[
          this.getSceneSettings().currentBoardIndex
        ]
      ) {
        Object.assign(
          gizmoManager.gizmos.positionGizmo.attachedMesh.animations[0].getKeys()[
            this.getSceneSettings().currentBoardIndex
          ].value,
          gizmoManager.gizmos.positionGizmo.attachedMesh.position
        );
      }
    });
    gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
      if (
        gizmoManager.gizmos.rotationGizmo?.attachedMesh !== undefined &&
        gizmoManager.gizmos.rotationGizmo?.attachedMesh !== null &&
        gizmoManager.gizmos.rotationGizmo.attachedMesh.animations[1]
      ) {
        Object.assign(
          gizmoManager.gizmos.rotationGizmo.attachedMesh.animations[1].getKeys()[
            this.getSceneSettings().currentBoardIndex
          ].value,
          gizmoManager.gizmos.rotationGizmo.attachedMesh.rotationQuaternion
        );
      }
    });
    // This is for the sky sun gizmo
    gizmoManager.gizmos.rotationGizmo?.onDragObservable.add(() => {
      gizmoManager.gizmos.rotationGizmo?.attachedMesh?.onRotationChanged?.notifyObservers();
    });
    gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(() => {
      if (
        gizmoManager.gizmos.scaleGizmo?.attachedMesh !== undefined &&
        gizmoManager.gizmos.scaleGizmo?.attachedMesh !== null &&
        gizmoManager.gizmos.scaleGizmo.attachedMesh.animations[2].getKeys()[
          this.getSceneSettings().currentBoardIndex
        ]
      ) {
        Object.assign(
          gizmoManager.gizmos.scaleGizmo.attachedMesh.animations[2].getKeys()[
            this.getSceneSettings().currentBoardIndex
          ].value,
          gizmoManager.gizmos.scaleGizmo.attachedMesh.scaling
        );
      }
    });

    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = false;
    gizmoManager.scaleGizmoEnabled = false;

    return [gizmoManager, utilityLayerRenderer];
  }

  /**
   * Sets meshes tagged with "gizmoAttachableMesh" as the gizmo manager's attachable meshes.
   * WARNING: This will overwrite the attachable meshes array.
   */
  private _setTaggedMeshesAsAttachableToGizmoManager() {
    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (!this.scene) {
      throw new Error("No scene");
    }

    const taggedMeshes = this.scene.getMeshesByTags("gizmoAttachableMesh");
    taggedMeshes.forEach((mesh) => {
      mesh.id = this.scene?.getUniqueId().toString() as string;
    });

    // Set these meshes as attachable for gizmo manager
    this._gizmoManager.attachableMeshes = taggedMeshes;
  }

  /**
   * Sets nodes tagged with "gizmoAttachableNode" as the gizmo manager's attachable nodes.
   * WARNING: This will overwrite the attachable nodes array.
   */
  private _setTaggedNodesAsAttachableToGizmoManager() {
    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (!this.scene) {
      throw new Error("No scene");
    }

    const taggedNodes = this.scene.getMeshesByTags("gizmoAttachableNode");
    taggedNodes.forEach((node) => {
      node.id = this.scene?.getUniqueId().toString() as string;
    });

    // Set these meshes as attachable for gizmo manager
    this._gizmoManager.attachableNodes = taggedNodes;
  }

  /**
   * Creates a FreeCamera and sets up controls and the collider.
   * @returns The created FreeCamera.
   */
  private _createController(): FreeCamera {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    const camera = new FreeCamera(
      "Camera",
      new Vector3(1.5, 2.5, -15),
      this.scene
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this._canvas, true);

    // Set camera as attachable for gizmo manager
    this._gizmoManager.attachableNodes?.push(camera);
    Tags.AddTagsTo(camera, "gizmoAttachableNode");
    camera.id = this.scene?.getUniqueId().toString() as string;

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

      if (!this._gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (evt.button === 2) {
        this.engine.enterPointerlock();
        this._gizmoManager.usePointerToAttachGizmos = false;
      }
    };

    this.scene.onPointerUp = (evt) => {
      if (!this.engine) {
        throw new Error("No engine");
      }

      if (!this._gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (evt.button === 2) {
        this._gizmoManager.usePointerToAttachGizmos = true;
        this.engine.exitPointerlock();
      }
    };

    return camera;
  }

  /**
   * Creates the environment. Setups up skybox, lighting, post-processes, and some meshes.
   */
  private _createEnvironment(skySunGizmoAttachedMesh?: Mesh) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._camera) {
      throw new Error("No camera");
    }

    if (!this._gizmoManager) {
      throw new Error("No gizmo manager");
    }

    if (!this._utilityLayerRenderer) {
      throw new Error("No utility layer renderer");
    }

    this.scene.shadowsEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.clearColor = new Color4(1, 1, 1, 1);
    this.scene.ambientColor = new Color3(0.6, 0.6, 0.6);

    // POST-PROCESSING
    this._setupPostProcessEffects(this._camera);

    // LIGHTING
    const skySun = new DirectionalLight(
      "skySun",
      new Vector3(0, 0, 0),
      this.scene
    );
    skySun.direction = new Vector3(-0.95, -0.28, 0);
    skySun.intensity = 6;
    // Add gizmo to sun light and add that as attachable for gizmo manager
    this._skySunGizmo = new LightGizmo(this._utilityLayerRenderer);

    // For some reason, this throws an exception but still works
    // TODO: something not loading in time?
    try {
      this._skySunGizmo.light = skySun;
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.log(e);
      }
    }

    if (this._skySunGizmo.attachedMesh) {
      this._skySunGizmo.attachedMesh.name = skySun.name;
      this._gizmoManager.attachableMeshes?.push(this._skySunGizmo.attachedMesh);
      this._sceneObjects.push(this._skySunGizmo.attachedMesh);
      Tags.AddTagsTo(this._skySunGizmo.attachedMesh, "skySunGizmoAttachedMesh");
      this._skySunGizmo.attachedMesh.onRotationChanged = new Observable();
      this._skySunGizmo.attachedMesh.onRotationChanged.add(() => {
        this._updateSkybox();
      });
      this._skySunGizmo.attachedMesh.rotationQuaternion =
        this._skySunGizmo.attachedMesh.rotation.toQuaternion();

      const skySunRotationAnim = new Animation(
        `${skySun.name}_rotation`,
        "rotationQuaternion",
        this._frameRate,
        Animation.ANIMATIONTYPE_QUATERNION
      );
      skySunRotationAnim.setKeys(
        this._keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: this._skySunGizmo?.attachedMesh?.rotationQuaternion?.clone(),
          };
        })
      );
      // Only rotation animation is relevant
      // Adding position and scaling animations to
      // reuse the same animation logic as the other meshes
      this._skySunGizmo.attachedMesh.animations = [
        new Animation(
          `${skySun.name}_position`,
          "position",
          this._frameRate,
          Animation.ANIMATIONTYPE_VECTOR3
        ),
        skySunRotationAnim,
        new Animation(
          `${skySun.name}_scaling`,
          "scaling",
          this._frameRate,
          Animation.ANIMATIONTYPE_VECTOR3
        ),
      ];
      this._storyBoardAnimationGroup?.addTargetedAnimation(
        skySunRotationAnim,
        this._skySunGizmo.attachedMesh
      );
    }

    // SKYBOX
    this._setupSkybox();

    // SHADOWS
    this._setupSkySunShadows(skySun);

    // TODO: This is a hack to update the skybox, shouldn't be necessary
    setTimeout(() => {
      this._updateSkybox();
    }, 100);

    // KENNEY PLAYGROUND
    SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "KenneyPlayground.glb",
      this.scene
    ).then(({ meshes: kenneyPlayground }) => {
      if (!this._gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (!this._sunShadowGenerator) {
        throw new Error("No sun shadow generator");
      }

      kenneyPlayground.forEach((mesh) => {
        Tags.AddTagsTo(mesh, "meshWithoutAnimationGroups");

        // Add to animatedNodes

        const meshPositionAnim = new Animation(
          `${mesh.name}_position`,
          "position",
          this._frameRate,
          Animation.ANIMATIONTYPE_VECTOR3
        );
        const meshRotationAnim = new Animation(
          `${mesh.name}_rotation`,
          "rotationQuaternion",
          this._frameRate,
          Animation.ANIMATIONTYPE_QUATERNION
        );
        const meshScalingAnim = new Animation(
          `${mesh.name}_scaling`,
          "scaling",
          this._frameRate,
          Animation.ANIMATIONTYPE_VECTOR3
        );

        meshPositionAnim.setKeys(
          this._keyframes.map((keyframe) => {
            return {
              frame: keyframe,
              value: mesh.position.clone(),
            };
          })
        );
        meshRotationAnim.setKeys(
          this._keyframes.map((keyframe) => {
            return {
              frame: keyframe,
              value: mesh.rotationQuaternion?.clone(),
            };
          })
        );
        meshScalingAnim.setKeys(
          this._keyframes.map((keyframe) => {
            return {
              frame: keyframe,
              value: mesh.scaling.clone(),
            };
          })
        );

        mesh.animations = [meshPositionAnim, meshRotationAnim, meshScalingAnim];
        this._storyBoardAnimationGroup?.addTargetedAnimation(
          meshPositionAnim,
          mesh
        );
        this._storyBoardAnimationGroup?.addTargetedAnimation(
          meshRotationAnim,
          mesh
        );
        this._storyBoardAnimationGroup?.addTargetedAnimation(
          meshScalingAnim,
          mesh
        );

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

        this._sunShadowGenerator?.addShadowCaster(mesh);
        Tags.AddTagsTo(mesh, "shadowCaster");

        this._gizmoManager?.attachableMeshes?.push(
          ...kenneyPlayground.slice(1)
        );
        Tags.AddTagsTo(mesh, "gizmoAttachableMesh");
        mesh.id = this.scene?.getUniqueId().toString() as string;
        this._sceneObjects.push(mesh);
      });
    });

    // BMW M4
    SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "bmw_m4_2021.glb",
      this.scene
    ).then(({ meshes: bmw, animationGroups }) => {
      if (!this._gizmoManager) {
        throw new Error("No gizmo manager");
      }

      if (!this._sunShadowGenerator) {
        throw new Error("No sun shadow generator");
      }

      if (!this._invisibleMaterial) {
        throw new Error("No invisible material");
      }

      const bmwBoundingBox = new BoundingBox(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0)
      );

      bmw.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        this._sunShadowGenerator?.addShadowCaster(mesh);
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
        "bmw",
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
      this._gizmoManager.attachableMeshes?.push(bmwBoundingBoxMesh);
      Tags.AddTagsTo(bmwBoundingBoxMesh, "gizmoAttachableMesh");
      bmwBoundingBoxMesh.id = this.scene?.getUniqueId().toString() as string;
      bmwBoundingBoxMesh.isPickable = true;
      bmwBoundingBoxMesh.material = this._invisibleMaterial;

      // Add to animatedNodes

      const meshPositionAnim = new Animation(
        `bmw_position`,
        "position",
        this._frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );
      const meshRotationAnim = new Animation(
        `bmw_rotation`,
        "rotationQuaternion",
        this._frameRate,
        Animation.ANIMATIONTYPE_QUATERNION
      );
      const meshScalingAnim = new Animation(
        `bmw_scaling`,
        "scaling",
        this._frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );

      meshPositionAnim.setKeys(
        this._keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: bmwBoundingBoxMesh.position.clone(),
          };
        })
      );
      meshRotationAnim.setKeys(
        this._keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: bmwBoundingBoxMesh.rotationQuaternion?.clone(),
          };
        })
      );
      meshScalingAnim.setKeys(
        this._keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: bmwBoundingBoxMesh.scaling.clone(),
          };
        })
      );

      bmwBoundingBoxMesh.animations = [
        meshPositionAnim,
        meshRotationAnim,
        meshScalingAnim,
      ];
      this._storyBoardAnimationGroup?.addTargetedAnimation(
        meshPositionAnim,
        bmwBoundingBoxMesh
      );
      this._storyBoardAnimationGroup?.addTargetedAnimation(
        meshRotationAnim,
        bmwBoundingBoxMesh
      );
      this._storyBoardAnimationGroup?.addTargetedAnimation(
        meshScalingAnim,
        bmwBoundingBoxMesh
      );

      const animatableAnimationGroups: AnimatableAnimationGroup[] =
        animationGroups.map(
          (animationGroup) =>
            new AnimatableAnimationGroup(
              animationGroup,
              (currentFrame, animation) => {
                if (
                  !animation ||
                  !animation.getKeys()[
                    this.getSceneSettings().currentBoardIndex
                  ]
                ) {
                  return;
                }

                animation.getKeys()[
                  this.getSceneSettings().currentBoardIndex
                ].value = currentFrame;
              }
            )
        );

      this._meshesToAnimationGroupsMap.set(
        bmwBoundingBoxMesh.name,
        animationGroups.map((animationGroup) => animationGroup.name)
      );

      this._meshWithAnimationGroupsMap.set(
        bmwBoundingBoxMesh.id,
        new MeshWithAnimationGroups(
          bmwBoundingBoxMesh,
          animatableAnimationGroups
        )
      );

      animatableAnimationGroups.forEach(
        (animatableAnimationGroup: AnimatableAnimationGroup) => {
          animatableAnimationGroup.pause();

          if (!this.scene) {
            throw new Error("No scene");
          }

          animatableAnimationGroup.id = this.scene.getUniqueId().toString();
          this._animatableAnimationsMap.set(
            animatableAnimationGroup.id,
            animatableAnimationGroup
          );

          const animationGroupFrameAnimation = new Animation(
            `${bmwBoundingBoxMesh.name}_${animatableAnimationGroup.name}_currentFrame`,
            "currentFrame",
            this._frameRate,
            Animation.ANIMATIONTYPE_FLOAT
          );

          animatableAnimationGroup.animation = animationGroupFrameAnimation;

          animationGroupFrameAnimation.setKeys(
            this._keyframes.map((keyframe) => {
              return {
                frame: keyframe,
                value: animatableAnimationGroup.currentFrame,
              };
            })
          );

          this._storyBoardAnimationGroup?.addTargetedAnimation(
            animationGroupFrameAnimation,
            animatableAnimationGroup
          );
        }
      );

      this._sceneObjects.push(
        new MeshWithAnimationGroups(
          bmwBoundingBoxMesh,
          animatableAnimationGroups
        )
      );
    });

    this._resetSnapshot();
  }

  /**
   * Creates the inspector in development builds
   */
  private _createInspector() {
    if (true || process.env.NODE_ENV === "development") {
      import("@babylonjs/inspector").then(({ default: insp }) => {
        if (!this.scene) {
          throw new Error("No scene");
        }

        // Show or hide Inspector visibility
        // I'm not toggling the visibility of the Inspector because remix runs this code twice
        // so it would show and then immediately hide the Inspector
        window.addEventListener("keydown", (ev) => {
          if (!this.scene) {
            throw new Error("No scene");
          }

          // Shift + Ctrl + Alt + I
          if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.code === "KeyI") {
            insp.Inspector.Show(this.scene, {});
          } else if (
            ev.shiftKey &&
            ev.ctrlKey &&
            ev.altKey &&
            ev.code === "KeyO"
          ) {
            insp.Inspector.Hide();
          }
        });
      });
    }
  }

  /**
   * Updates the skybox based on skySun
   */
  private _updateSkybox() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._skySunGizmo?.light) {
      throw new Error("No sky sun light");
    }

    if (!this._skyboxMaterial) {
      throw new Error("No skybox material");
    }

    const skySun = this._skySunGizmo.light as DirectionalLight;

    this._skyboxMaterial.sunPosition = skySun.direction.scale(-1);

    // Set sun color based on sun position
    const sunColor = this._getSunColor(-skySun.direction.y);
    skySun.diffuse = sunColor;
  }

  /**
   * Sets up the skybox and environmental lighting.
   */
  private _setupSkybox() {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._skySunGizmo?.light) {
      throw new Error("No sky sun light");
    }

    const skySun = this._skySunGizmo.light as DirectionalLight;

    // Create skybox material
    this._skyboxMaterial = new SkyMaterial("skyboxMaterial", this.scene);
    this._skyboxMaterial.backFaceCulling = false;

    // Set sky material sun position based on skySun direction
    this._skyboxMaterial.useSunPosition = true;
    this._skyboxMaterial.sunPosition = skySun.direction.scale(-1);

    // Visualization of environment effect by updating skySun direction and skyMaterial sun position every frame
    let quaternionDelta = 0.02;
    window.addEventListener("keydown", (event) => {
      if (!this.scene) {
        throw new Error("No scene");
      }

      if (!this._skyboxMaterial) {
        throw new Error("No skybox material");
      }

      if (skySun.direction.y <= 0) {
        if (event.key === "1") {
          this._rotateSun(quaternionDelta);
        } else if (event.key === "2") {
          this._rotateSun(-quaternionDelta);
        }
      } else {
        skySun.direction.y = 0;
      }
    });

    this._skyboxMaterial.luminance = 0.4;
    this._skyboxMaterial.turbidity = 10;
    this._skyboxMaterial.rayleigh = 4;
    this._skyboxMaterial.mieCoefficient = 0.005;
    this._skyboxMaterial.mieDirectionalG = 0.98;
    this._skyboxMaterial.cameraOffset.y = 200;
    this._skyboxMaterial.disableDepthWrite = false;

    // Create skybox mesh
    const skybox = MeshBuilder.CreateSphere(
      "skyBox",
      { diameter: 1000.0 },
      this.scene
    );
    skybox.material = this._skyboxMaterial;
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
    skybox.alwaysSelectAsActiveMesh = true;

    // Create a "groundbox", a skybox with an invisible top part, used to render the ground
    const groundboxMaterial = new GradientMaterial(
      "groundboxMaterial",
      this.scene
    );
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
    // TODO: Maybe only update manually when sun changes?
    reflectionProbe.refreshRate =
      RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;

    // Set environment texture to reflection probe cube texture
    this.scene.environmentTexture = reflectionProbe.cubeTexture;
    this.scene.environmentIntensity = 1;
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
    // defaultPipeline.samples = 16;
    defaultPipeline.glowLayerEnabled = true;
    if (defaultPipeline.glowLayer) {
      defaultPipeline.glowLayer.intensity = 0.5;
    }
    defaultPipeline.bloomEnabled = true;

    // Screen Space Ambient Occlusion for WebGL 2
    if (SSAO2RenderingPipeline.IsSupported) {
      const ssao = new SSAO2RenderingPipeline(
        "ssao", // The name of the pipeline
        this.scene, // The scene to which the pipeline belongs
        0.5, // The size of the postprocess
        [camera] // The list of cameras to be attached to
      );

      ssao.totalStrength = 1.4;
      ssao.base = 0;
      ssao.radius = 1.0;
      ssao.epsilon = 0.02;
      ssao.samples = 16;
      ssao.maxZ = 250;
      ssao.minZAspect = 0.5;
      ssao.expensiveBlur = true;
      ssao.bilateralSamples = 12;
      ssao.bilateralSoften = 1;
      ssao.bilateralTolerance = 0.5;
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

      const ssrQuality: "fast" | "quality" = "fast";

      if (ssrQuality === "fast") {
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
      } else if (ssrQuality === "quality") {
        ssr.thickness = 0.1;
        ssr.selfCollisionNumSkip = 2;
        ssr.enableAutomaticThicknessComputation = true;
        ssr.blurDispersionStrength = 0.03;
        ssr.roughnessFactor = 0.1;
        ssr.enableSmoothReflections = true;
        ssr.step = 1;
        ssr.maxSteps = 2000;
        ssr.maxDistance = 1000;
        ssr.blurDownsample = 0;
        ssr.ssrDownsample = 0;
      }

      // Set ssr to false by default because of it's performance impact
      // TODO: Doesn't work when toggled with intermediate optimization
      ssr.isEnabled = false;
    }

    if (this.scene.prePassRenderer) {
      // this.scene.prePassRenderer.samples = 16;
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
    this._sunShadowGenerator = sunShadowGenerator;

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

    if (!this._sunShadowGenerator) {
      throw new Error("No sun shadow generator");
    }

    const shadowCasters = this.scene.getMeshesByTags("shadowCaster");
    shadowCasters.forEach((mesh) => {
      this._sunShadowGenerator?.addShadowCaster(mesh);
    });
  }

  /**
   * Rotates the sun and updates the sky material and ambient light based on the new sun position.
   * @param angle The angle to rotate the sun by.
   */
  private _rotateSun(angle: number) {
    if (!this.scene) {
      throw new Error("No scene");
    }

    if (!this._skySunGizmo?.light) {
      throw new Error("No sky sun light");
    }

    if (!this._skyboxMaterial) {
      throw new Error("No skybox material");
    }

    const skySun = this._skySunGizmo.light as DirectionalLight;

    // skySun.direction.y goes from 0 at sunrise and sunset to -1 at noon

    // Rotate sun around the y axis and set sun position to the inverse of the direction
    skySun.direction.applyRotationQuaternionInPlace(
      Quaternion.RotationAxis(Vector3.Forward(), angle)
    );
    this._skyboxMaterial.sunPosition = skySun.direction.scale(-1);

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

  // /**
  //  * Loads the scene settings from session storage.
  //  * Only needed for development mode because it's a workaround for a bug.
  //  */
  // private _loadSettingsFromSessionStorage() {
  //   if (sessionStorage.getItem("sceneSettings")) {
  //     this._sceneSettings = JSON.parse(
  //       sessionStorage.getItem("sceneSettings") as string
  //     );
  //   }
  // }
}

function getFileNameWithoutExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  const testDummy: TValue = value;
  return true;
}
