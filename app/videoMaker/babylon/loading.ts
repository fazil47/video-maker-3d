import type {
  TargetedAnimation,
  GizmoManager,
  UtilityLayerRenderer,
  Engine,
  FreeCamera,
  Light,
  IAnimationKey,
  Scene,
  Node,
  ShadowGenerator,
  LightGizmo,
  AnimationGroup,
} from "@babylonjs/core";
import type { SkyMaterial } from "@babylonjs/materials";

// TODO: Find side-effect imports needed for tree shaking to work
// Until then I'm importing everything from @babylonjs/core
import { SceneLoader } from "@babylonjs/core";

// // eslint-disable-next-line import/no-duplicates
// import "@babylonjs/core/Materials/standardMaterial";
// // eslint-disable-next-line import/no-duplicates
// import "@babylonjs/core/Materials/PBR/pbrMaterial";
// import "@babylonjs/core/Loading/Plugins/babylonFileLoader";
// import "@babylonjs/core/Loading/loadingScreen";
// import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

// eslint-disable-next-line import/no-duplicates
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
// eslint-disable-next-line import/no-duplicates
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Animation } from "@babylonjs/core/Animations/animation";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Tags } from "@babylonjs/core/Misc/tags";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
// import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { GLTFFileLoader } from "@babylonjs/loaders/glTF";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import { ZipReader, BlobReader, BlobWriter } from "@zip.js/zip.js";

import { AnimatableAnimationGroup } from "./animatableAnimationGroup";
import { MeshWithAnimationGroups } from "./meshWithAnimationGroups";
import { Inspectable, SceneSettings } from "~/videoMaker/interface";
import { notEmpty } from "~/utils";
import { createController } from "./controller";
import { createEnvironment, createInvisibleMaterial } from "./environment";
import { createGizmoManager } from "./gizmoManager";

/**
 * Loads a scene from a file.
 */
export function loadScene(
  canvas: HTMLCanvasElement | null,
  engine: Engine | null,
  frameRate: number,
  onKeyframesChanged: (keyframes: number[]) => void,
  getSceneSettings: () => SceneSettings | null,
  setSceneSettings: (sceneSettings: Partial<SceneSettings>) => void,
  resetSnapshot: (engine: Engine | null, scene: Scene | null) => void,
  clearScene: () => void,
  updateSkybox: (
    skySun: DirectionalLight | null,
    skyboxMaterial: SkyMaterial | null
  ) => void,
  onSceneLoaded: (
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
  ) => void
) {
  if (!canvas) {
    throw new Error("No canvas");
  }

  if (!engine) {
    throw new Error("No engine");
  }

  if (SceneLoader) {
    SceneLoader.RegisterPlugin(new GLTFFileLoader());
  }

  let scene: Scene | null = null;
  let invisibleMaterial: StandardMaterial | null = null;
  let camera: FreeCamera | null = null;
  let gizmoManager: GizmoManager | null = null;
  let utilityLayerRenderer: UtilityLayerRenderer | null = null;
  let skySunGizmo: LightGizmo | null = null;
  let skyboxMaterial: SkyMaterial | null = null;
  let sunShadowGenerator: ShadowGenerator | null = null;
  let storyBoardAnimationGroup: AnimationGroup | null = null;
  let storyBoardAnimationGroupPlayingInterval: number | null = null;
  let skySunGizmoRotationInterval: number | null = null;
  let keyFrames: number[] = [0];

  const sceneInspectables: Inspectable[] = [];
  let meshesToAnimationGroupsMap: Map<string, string[]> = new Map<
    string,
    string[]
  >(); // Maps mesh names to animation group names. TODO: Maybe use IDs instead of names
  const meshWithAnimationGroupsMap: Map<string, MeshWithAnimationGroups> =
    new Map<string, MeshWithAnimationGroups>();
  const animatableAnimationsMap: Map<string, AnimatableAnimationGroup> =
    new Map<string, AnimatableAnimationGroup>();

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
            const keyframesJSON: unknown = await keyframesResponse.json();
            if (Array.isArray(keyframesJSON)) {
              keyFrames = keyframesJSON;
              onKeyframesChanged(keyFrames);
            }
          } else if (entry.filename.endsWith("_m2a.json") && entry.getData) {
            const m2aBlobURL: string = URL.createObjectURL(
              await entry.getData(new BlobWriter())
            );

            const m2aResponse: Response = await fetch(m2aBlobURL);
            const m2a: unknown = await m2aResponse.json();
            if (m2a) {
              meshesToAnimationGroupsMap = new Map(Object.entries(m2a));
            }
          } else if (entry.filename.endsWith("_a2aa.json") && entry.getData) {
            const a2aaBlobURL: string = URL.createObjectURL(
              await entry.getData(new BlobWriter())
            );

            const a2aaResponse: Response = await fetch(a2aaBlobURL);
            const a2aa: unknown = await a2aaResponse.json();
            if (a2aa) {
              animationGroupNameToAnimatableAnimationGroupKeys = new Map(
                Object.entries(a2aa)
              );
            }
          } else if (
            entry.filename.endsWith("_skySun_rotation_animation.json") &&
            entry.getData
          ) {
            const skySunRotationAnimationBlobURL: string = URL.createObjectURL(
              await entry.getData(new BlobWriter())
            );

            const skySunRotationAnimationResponse: Response = await fetch(
              skySunRotationAnimationBlobURL
            );
            const serializedSkySunRotationAnimationValues: {
              _x: number;
              _y: number;
              _z: number;
              _w: number;
            }[] = await skySunRotationAnimationResponse.json();
            skySunRotationAnimationValues =
              serializedSkySunRotationAnimationValues.map(
                (serializedQuaternion) => {
                  return new Quaternion(
                    serializedQuaternion._x,
                    serializedQuaternion._y,
                    serializedQuaternion._z,
                    serializedQuaternion._w
                  );
                }
              );
          }
        })
      );

      zipReaderEntries.forEach(async (entry) => {
        if (entry.filename.endsWith(".babylon") && entry.getData) {
          const sceneBlobURL: string = URL.createObjectURL(
            await entry.getData(new BlobWriter())
          );

          scene = await SceneLoader.LoadAsync(
            "",
            sceneBlobURL,
            engine,
            null,
            ".babylon"
          );

          if (scene) {
            // Dispose of everything in the current scene
            clearScene();

            invisibleMaterial = await createInvisibleMaterial(scene);
            storyBoardAnimationGroup = scene.getAnimationGroupByName(
              "storyBoardAnimationGroup"
            );

            if (!storyBoardAnimationGroup) {
              throw new Error("No story board animation group");
            }

            // Setup gizmo manager
            // TODO: Add callback to set selected object, causes a freeze when I try now
            [gizmoManager, utilityLayerRenderer] = await createGizmoManager(
              scene,
              getSceneSettings,
              (node: Node | null) => {
                setSceneSettings({
                  selectedItemID: node?.id ? node.id : null,
                });
              }
            );
            setTaggedNodesAsAttachableToGizmoManager(scene, gizmoManager);
            setTaggedMeshesAsAttachableToGizmoManager(scene, gizmoManager);

            // Setup camera controls
            // TODO: Save camera position and rotation
            camera = await createController(
              canvas,
              engine,
              scene,
              gizmoManager
            );
            scene.activeCamera = camera;

            // TODO: Save skybox and environment texture
            // For now, just recreate the environment
            const skySun: Light | null = scene.getLightByName("skySun");

            // TODO: Needs to refactored into a separate function
            if (!(skySun instanceof DirectionalLight)) {
              throw new Error("No directional light");
            }

            [skySunGizmo, skyboxMaterial, sunShadowGenerator] =
              await createEnvironment(
                engine,
                scene,
                camera,
                gizmoManager,
                utilityLayerRenderer,
                frameRate,
                keyFrames,
                sceneInspectables,
                storyBoardAnimationGroup,
                skySun,
                skySunRotationAnimationValues
              );

            if (!skySunGizmo) {
              throw new Error("No sky sun gizmo");
            }

            if (!skyboxMaterial) {
              throw new Error("No skybox material");
            }

            if (!sunShadowGenerator) {
              throw new Error("No sun shadow generator");
            }

            // targetAnimation.animation needs to be synced with targetAnimation.target.animations
            storyBoardAnimationGroup.targetedAnimations.forEach(
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
            storyBoardAnimationGroup?.reset();
            if (storyBoardAnimationGroup) {
              storyBoardAnimationGroup.loopAnimation = false;
            }
            storyBoardAnimationGroup?.onAnimationGroupPlayObservable.add(() => {
              setSceneSettings({ currentBoardIndex: 0 });

              storyBoardAnimationGroupPlayingInterval = window.setInterval(
                () => {
                  const sceneSettings = getSceneSettings();

                  if (
                    sceneSettings &&
                    sceneSettings.currentBoardIndex < keyFrames.length - 1
                  ) {
                    setSceneSettings({
                      currentBoardIndex: sceneSettings.currentBoardIndex + 1,
                    });
                  }
                },
                1000
              );

              skySunGizmoRotationInterval = window.setInterval(() => {
                if (skyboxMaterial) {
                  updateSkybox(skySun, skyboxMaterial);
                }
              }, 1);
            });
            storyBoardAnimationGroup?.onAnimationGroupPauseObservable.add(
              () => {
                if (storyBoardAnimationGroupPlayingInterval) {
                  window.clearInterval(storyBoardAnimationGroupPlayingInterval);
                }

                if (skySunGizmoRotationInterval) {
                  window.clearInterval(skySunGizmoRotationInterval);
                }
              }
            );
            storyBoardAnimationGroup?.onAnimationGroupEndObservable.add(() => {
              if (storyBoardAnimationGroupPlayingInterval) {
                window.clearInterval(storyBoardAnimationGroupPlayingInterval);
              }

              if (skySunGizmoRotationInterval) {
                window.clearInterval(skySunGizmoRotationInterval);
              }

              setSceneSettings({
                currentBoardIndex: keyFrames.length - 1,
              });
            });

            // Deserialize animatable animation groups
            Array.from(meshesToAnimationGroupsMap.entries()).forEach(
              ([meshName, animationGroupNames]) => {
                if (!scene) {
                  throw new Error("No scene");
                }

                const mesh = scene.getMeshByName(meshName);

                if (!mesh || !(mesh instanceof AbstractMesh)) {
                  console.log(`Couldn't find mesh with ID: ${meshName}`);
                  return;
                }

                const animationGroups: AnimationGroup[] = animationGroupNames
                  .map((animationGroupName) =>
                    scene?.getAnimationGroupByName(animationGroupName)
                  )
                  .filter(notEmpty);

                const animatableAnimationGroups: AnimatableAnimationGroup[] =
                  animationGroups.map(
                    (animationGroup) =>
                      new AnimatableAnimationGroup(
                        animationGroup,
                        (currentFrame, animation) => {
                          const sceneSettings = getSceneSettings();
                          if (
                            !animation ||
                            !sceneSettings ||
                            !animation.getKeys()[
                              sceneSettings?.currentBoardIndex
                            ]
                          ) {
                            return;
                          }

                          animation.getKeys()[
                            sceneSettings.currentBoardIndex
                          ].value = currentFrame;
                        }
                      )
                  );

                meshWithAnimationGroupsMap.set(
                  mesh.id,
                  new MeshWithAnimationGroups(mesh, animatableAnimationGroups)
                );

                animatableAnimationGroups.forEach(
                  (animatableAnimationGroup: AnimatableAnimationGroup) => {
                    if (!scene) {
                      throw new Error("No scene");
                    }

                    animatableAnimationGroup.play();
                    animatableAnimationGroup.reset();
                    animatableAnimationGroup.pause();
                    animatableAnimationGroup.weight = 1;
                    animatableAnimationGroup.loopAnimation = false;

                    animatableAnimationGroup.id = scene
                      .getUniqueId()
                      .toString();
                    animatableAnimationsMap.set(
                      animatableAnimationGroup.id,
                      animatableAnimationGroup
                    );

                    const animationGroupFrameAnimation = new Animation(
                      `${mesh.name}_${animatableAnimationGroup.name}_currentFrame`,
                      "currentFrame",
                      frameRate,
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

                    storyBoardAnimationGroup?.addTargetedAnimation(
                      animationGroupFrameAnimation,
                      animatableAnimationGroup
                    );
                  }
                );
              }
            );

            scene
              .getMeshesByTags("meshWithoutAnimationGroups")
              .forEach((mesh) => {
                sceneInspectables.push(mesh);
              });
            meshWithAnimationGroupsMap.forEach((meshWithAnimationGroups) => {
              sceneInspectables.push(meshWithAnimationGroups);
            });

            resetSnapshot(engine, scene);

            onSceneLoaded(
              scene,
              invisibleMaterial,
              camera,
              gizmoManager,
              utilityLayerRenderer,
              skySunGizmo,
              skyboxMaterial,
              sunShadowGenerator,
              storyBoardAnimationGroup,
              storyBoardAnimationGroupPlayingInterval,
              skySunGizmoRotationInterval,
              keyFrames,
              sceneInspectables,
              meshWithAnimationGroupsMap,
              animatableAnimationsMap
            );
          }
        }
      });
    }
  };

  fileInput.click();
}

/**
 * Prompt user to upload a new glTF mesh and adds it to the scene.
 */
export function importGLBMesh(
  scene: Scene | null,
  gizmoManager: GizmoManager | null,
  sunShadowGenerator: ShadowGenerator | null,
  invisibleMaterial: StandardMaterial | null,
  keyframes: number[],
  frameRate: number,
  storyBoardAnimationGroup: AnimationGroup | null,
  sceneInspectables: Inspectable[],
  meshesToAnimationGroupsMap: Map<string, string[]>,
  meshWithAnimationGroupsMap: Map<string, MeshWithAnimationGroups>,
  animatableAnimationsMap: Map<string, AnimatableAnimationGroup>,
  sceneSettings: SceneSettings | null
) {
  if (SceneLoader) {
    SceneLoader.RegisterPlugin(new GLTFFileLoader());
  }

  if (!scene) {
    throw new Error("No scene");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  if (!sunShadowGenerator) {
    throw new Error("No sun shadow generator");
  }

  if (!invisibleMaterial) {
    throw new Error("No invisible material");
  }

  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  if (!animatableAnimationsMap) {
    throw new Error("No animatable animations map");
  }

  if (!sceneSettings) {
    throw new Error("No scene settings");
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".glb";

  fileInput.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      const fileURL = URL.createObjectURL(file);
      const { meshes, animationGroups } = await SceneLoader.ImportMeshAsync(
        "",
        fileURL,
        "",
        scene,
        null,
        ".glb"
      );

      const fileName = getFileNameWithoutExtension(file.name);

      const boundingBox = new BoundingBox(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0)
      );

      meshes.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        sunShadowGenerator.addShadowCaster(mesh);
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
        scene
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
      gizmoManager.attachableMeshes?.push(boundingBoxMesh);
      Tags.AddTagsTo(boundingBoxMesh, "gizmoAttachableMesh");
      boundingBoxMesh.id = scene?.getUniqueId().toString() as string;
      boundingBoxMesh.isPickable = true;
      boundingBoxMesh.material = invisibleMaterial;

      // Add to animatedNodes

      const meshPositionAnim = new Animation(
        `${fileName}_position`,
        "position",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );
      const meshRotationAnim = new Animation(
        `${fileName}_rotation`,
        "rotationQuaternion",
        frameRate,
        Animation.ANIMATIONTYPE_QUATERNION
      );
      const meshScalingAnim = new Animation(
        `${fileName}_scaling`,
        "scaling",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );

      // TODO: How do I handle this?
      // For now I'm adding keys for every keyframe and setting the value to the current value
      meshPositionAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: boundingBoxMesh.position.clone(),
          };
        })
      );
      meshRotationAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: boundingBoxMesh.rotationQuaternion?.clone(),
          };
        })
      );
      meshScalingAnim.setKeys(
        keyframes.map((keyframe) => {
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
      storyBoardAnimationGroup.addTargetedAnimation(
        meshPositionAnim,
        boundingBoxMesh
      );
      storyBoardAnimationGroup.addTargetedAnimation(
        meshRotationAnim,
        boundingBoxMesh
      );
      storyBoardAnimationGroup.addTargetedAnimation(
        meshScalingAnim,
        boundingBoxMesh
      );

      const animatableAnimationGroups: AnimatableAnimationGroup[] =
        animationGroups
          .map((animationGroup) => {
            return new AnimatableAnimationGroup(
              animationGroup,
              (currentFrame, animation) => {
                if (
                  !animation ||
                  !animation.getKeys()[sceneSettings.currentBoardIndex]
                ) {
                  return;
                }

                animation.getKeys()[sceneSettings.currentBoardIndex].value =
                  currentFrame;
              }
            );
          })
          .filter(notEmpty);

      meshesToAnimationGroupsMap.set(
        boundingBoxMesh.name,
        animationGroups.map((animationGroup) => animationGroup.name)
      );

      meshWithAnimationGroupsMap.set(
        boundingBoxMesh.id,
        new MeshWithAnimationGroups(boundingBoxMesh, animatableAnimationGroups)
      );

      animatableAnimationGroups.forEach(
        (animatableAnimationGroup: AnimatableAnimationGroup) => {
          animatableAnimationGroup.pause();

          animatableAnimationGroup.id = scene.getUniqueId().toString();
          animatableAnimationsMap.set(
            animatableAnimationGroup.id,
            animatableAnimationGroup
          );

          const animationGroupFrameAnimation = new Animation(
            `${fileName}_${animatableAnimationGroup.name}_currentFrame`,
            "currentFrame",
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT
          );

          animatableAnimationGroup.animation = animationGroupFrameAnimation;

          animationGroupFrameAnimation.setKeys(
            keyframes.map((keyframe) => {
              return {
                frame: keyframe,
                value: animatableAnimationGroup.currentFrame,
              };
            })
          );

          storyBoardAnimationGroup?.addTargetedAnimation(
            animationGroupFrameAnimation,
            animatableAnimationGroup
          );
        }
      );

      sceneInspectables.push(
        new MeshWithAnimationGroups(boundingBoxMesh, animatableAnimationGroups)
      );
      gizmoManager.attachToMesh(boundingBoxMesh);
    }
  };

  fileInput.click();
}

function getFileNameWithoutExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

/**
 * Sets meshes tagged with "gizmoAttachableMesh" as the gizmo manager's attachable meshes.
 * WARNING: This will overwrite the attachable meshes array.
 */
function setTaggedMeshesAsAttachableToGizmoManager(
  scene: Scene | null,
  gizmoManager: GizmoManager | null
) {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  const taggedMeshes = scene.getMeshesByTags("gizmoAttachableMesh");
  taggedMeshes.forEach((mesh) => {
    mesh.id = scene.getUniqueId().toString() as string;
    if (mesh.material) {
      mesh.material.id = scene.getUniqueId().toString() as string;
    }
  });

  // Set these meshes as attachable for gizmo manager
  gizmoManager.attachableMeshes = taggedMeshes;
}

/**
 * Sets nodes tagged with "gizmoAttachableNode" as the gizmo manager's attachable nodes.
 * WARNING: This will overwrite the attachable nodes array.
 */
function setTaggedNodesAsAttachableToGizmoManager(
  scene: Scene | null,
  gizmoManager: GizmoManager | null
) {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  const taggedNodes = scene.getMeshesByTags("gizmoAttachableNode");
  taggedNodes.forEach((node) => {
    node.id = scene.getUniqueId().toString() as string;
  });

  // Set these meshes as attachable for gizmo manager
  gizmoManager.attachableNodes = taggedNodes;
}
