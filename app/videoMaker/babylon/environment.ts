import type {
  AnimationGroup,
  Camera,
  Engine,
  GizmoManager,
  Scene,
  UtilityLayerRenderer,
} from "@babylonjs/core";

import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { SkyMaterial } from "@babylonjs/materials";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { Tags } from "@babylonjs/core/Misc/tags";
import { Animation } from "@babylonjs/core/Animations/animation";
import "@babylonjs/core/Animations/animatable";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { LightGizmo } from "@babylonjs/core/Gizmos/lightGizmo";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/loaders/glTF/index.js";

import type { Inspectable, SceneSettings } from "~/videoMaker/interface";

import { AnimatableAnimationGroup } from "./animatableAnimationGroup";
import { MeshWithAnimationGroups } from "./meshWithAnimationGroups";
import { setupPostProcessEffects } from "./postProcessing";
import { createSkybox, updateSkybox } from "./skybox";
import { resetSnapshot } from "./misc";

/**
 * Creates the invisible material used for the bounding box meshes.
 */
export function createInvisibleMaterial(
  scene: Nullable<Scene>
): StandardMaterial {
  if (!scene) {
    throw new Error("No scene");
  }

  const invisibleMaterial = new StandardMaterial("invisibleMaterial", scene);
  invisibleMaterial.alpha = 0;

  return invisibleMaterial;
}

/**
 * Creates the environment. Setups up skybox, lighting, post-processes, and some meshes.
 */
export async function createEnvironment(
  engine: Nullable<Engine>,
  scene: Nullable<Scene>,
  camera: Nullable<Camera>,
  gizmoManager: Nullable<GizmoManager>,
  utilityLayerRenderer: Nullable<UtilityLayerRenderer>,
  frameRate: number = 60,
  keyFrames: number[],
  sceneInspectables: Inspectable[],
  storyBoardAnimationGroup: Nullable<AnimationGroup>,
  skySun?: DirectionalLight,
  skySunRotationAnimationValues?: Quaternion[]
): Promise<[LightGizmo, SkyMaterial, ShadowGenerator]> {
  if (!engine) {
    throw new Error("No engine");
  }

  if (!scene) {
    throw new Error("No scene");
  }

  if (!camera) {
    throw new Error("No camera");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  if (!utilityLayerRenderer) {
    throw new Error("No utility layer renderer");
  }

  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  scene.shadowsEnabled = true;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.clearColor = new Color4(1, 1, 1, 1);
  scene.ambientColor = new Color3(0.6, 0.6, 0.6);

  // POST-PROCESSING
  setupPostProcessEffects(scene, camera);

  // LIGHTING
  if (!skySun) {
    skySun = new DirectionalLight("skySun", new Vector3(0, 0, 0), scene);
  }
  skySun.direction = new Vector3(-0.95, -0.28, 0);
  skySun.intensity = 6;
  // Add gizmo to sun light and add that as attachable for gizmo manager
  const skySunGizmo = new LightGizmo(utilityLayerRenderer);

  // For some reason, this throws an exception but still works
  // TODO: something not loading in time?
  try {
    skySunGizmo.light = skySun;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.log(e);
    }
  }

  if (skySunGizmo.attachedMesh) {
    skySunGizmo.attachedMesh.name = skySun.name;
    gizmoManager.attachableMeshes?.push(skySunGizmo.attachedMesh);
    skySunGizmo.attachedMesh.id = scene.getUniqueId().toString() as string;
    scene.meshes.push(skySunGizmo.attachedMesh);
    sceneInspectables.push(skySunGizmo.attachedMesh);
    Tags.AddTagsTo(skySunGizmo.attachedMesh, "skySunGizmoAttachedMesh");
    skySunGizmo.attachedMesh.onRotationChanged = new Observable();
    skySunGizmo.attachedMesh.onRotationChanged.add(() => {
      if (skySun) {
        updateSkybox(skySun, skyboxMaterial);
      }
    });
    skySunGizmo.attachedMesh.rotationQuaternion =
      skySunGizmo.attachedMesh.rotation.toQuaternion();

    const skySunRotationAnim = new Animation(
      `${skySun.name}_rotation`,
      "rotationQuaternion",
      frameRate,
      Animation.ANIMATIONTYPE_QUATERNION
    );

    if (skySunRotationAnimationValues && keyFrames.length > 0) {
      skySunGizmo.attachedMesh.rotationQuaternion =
        skySunRotationAnimationValues[0].clone();

      skySunRotationAnim.setKeys(
        keyFrames.map((keyframe, i) => {
          return {
            frame: keyframe,
            value: skySunRotationAnimationValues[i].clone(),
          };
        })
      );
    } else {
      skySunRotationAnim.setKeys(
        keyFrames.map((keyframe) => {
          return {
            frame: keyframe,
            value: skySunGizmo?.attachedMesh?.rotationQuaternion?.clone(),
          };
        })
      );
    }

    // Only rotation animation is relevant
    // Adding position and scaling animations to
    // reuse the same animation logic as the other meshes
    skySunGizmo.attachedMesh.animations = [
      new Animation(
        `${skySun.name}_position`,
        "position",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      ),
      skySunRotationAnim,
      new Animation(
        `${skySun.name}_scaling`,
        "scaling",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      ),
    ];
    storyBoardAnimationGroup.addTargetedAnimation(
      skySunRotationAnim,
      skySunGizmo.attachedMesh
    );
  }

  // SKYBOX
  const skyboxMaterial = await createSkybox(scene, skySun);

  // SHADOWS
  const sunShadowGenerator = await setupSkySunShadows(scene, skySun);

  // TODO: This is a hack to update the skybox, shouldn't be necessary
  setTimeout(() => {
    if (skySun) {
      updateSkybox(skySun, skyboxMaterial);
    }
  }, 100);

  return [skySunGizmo, skyboxMaterial, sunShadowGenerator];
}

export async function populateEnvironment(
  engine: Nullable<Engine>,
  scene: Nullable<Scene>,
  gizmoManager: Nullable<GizmoManager>,
  sunShadowGenerator: Nullable<ShadowGenerator>,
  frameRate: number,
  keyframes: number[],
  storyBoardAnimationGroup: Nullable<AnimationGroup>,
  sceneInspectables: Inspectable[],
  invisibleMaterial: Nullable<StandardMaterial>,
  getSceneSettings: () => SceneSettings | null,
  meshesToAnimationGroupsMap: Map<string, string[]>,
  meshWithAnimationGroupsMap: Map<string, MeshWithAnimationGroups>,
  animatableAnimationsMap: Map<string, AnimatableAnimationGroup>
) {
  if (!engine) {
    throw new Error("No engine");
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

  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  if (!invisibleMaterial) {
    throw new Error("No invisible material");
  }

  // KENNEY PLAYGROUND
  SceneLoader.ImportMeshAsync(
    "",
    "./models/",
    "KenneyPlayground.glb",
    scene
  ).then(({ meshes: kenneyPlayground }) => {
    kenneyPlayground.forEach((mesh) => {
      Tags.AddTagsTo(mesh, "meshWithoutAnimationGroups");

      // Add to animatedNodes

      const meshPositionAnim = new Animation(
        `${mesh.name}_position`,
        "position",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );
      const meshRotationAnim = new Animation(
        `${mesh.name}_rotation`,
        "rotationQuaternion",
        frameRate,
        Animation.ANIMATIONTYPE_QUATERNION
      );
      const meshScalingAnim = new Animation(
        `${mesh.name}_scaling`,
        "scaling",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );

      meshPositionAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: mesh.position.clone(),
          };
        })
      );
      meshRotationAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: mesh.rotationQuaternion?.clone(),
          };
        })
      );
      meshScalingAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: mesh.scaling.clone(),
          };
        })
      );

      mesh.animations = [meshPositionAnim, meshRotationAnim, meshScalingAnim];
      storyBoardAnimationGroup.addTargetedAnimation(meshPositionAnim, mesh);
      storyBoardAnimationGroup.addTargetedAnimation(meshRotationAnim, mesh);
      storyBoardAnimationGroup.addTargetedAnimation(meshScalingAnim, mesh);

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

      sunShadowGenerator?.addShadowCaster(mesh);
      Tags.AddTagsTo(mesh, "shadowCaster");

      gizmoManager?.attachableMeshes?.push(...kenneyPlayground.slice(1));
      Tags.AddTagsTo(mesh, "gizmoAttachableMesh");
      mesh.id = scene?.getUniqueId().toString() as string;
      if (mesh.material) {
        mesh.material.id = scene?.getUniqueId().toString() as string;
      }
      sceneInspectables.push(mesh);
    });
  });

  // Car
  SceneLoader.ImportMeshAsync("", "./models/", "bmw_m4_2021.glb", scene).then(
    ({ meshes: car, animationGroups }) => {
      const carBoundingBox = new BoundingBox(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0)
      );

      car.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        sunShadowGenerator?.addShadowCaster(mesh);
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
        carBoundingBox.reConstruct(
          Vector3.Minimize(
            carBoundingBox.minimumWorld,
            mesh.getBoundingInfo().boundingBox.minimumWorld
          ),
          Vector3.Maximize(
            carBoundingBox.maximumWorld,
            mesh.getBoundingInfo().boundingBox.maximumWorld
          )
        );
      });

      // Make a transparent bounding box parent mesh for the vehicle
      const carBoundingBoxMesh = MeshBuilder.CreateBox(
        "car",
        {
          width: carBoundingBox.maximumWorld.x - carBoundingBox.minimumWorld.x,
          height: carBoundingBox.maximumWorld.y - carBoundingBox.minimumWorld.y,
          depth: carBoundingBox.maximumWorld.z - carBoundingBox.minimumWorld.z,
        },
        scene
      );
      carBoundingBoxMesh.position = carBoundingBox.centerWorld;
      carBoundingBoxMesh.rotationQuaternion = car[0].rotationQuaternion;

      // Set the parent of the vehicle to the bounding box mesh
      car[0].parent = carBoundingBoxMesh;
      car[0].position = Vector3.Zero();
      car[0].position.y -= carBoundingBox.centerWorld.y;
      car[0].rotationQuaternion = Quaternion.Identity();

      // Rotate and raise the car slightly
      carBoundingBoxMesh.position.y += 0.09;
      carBoundingBoxMesh.rotationQuaternion = Quaternion.RotationAxis(
        Vector3.Up(),
        Math.PI / 6
      );

      // Only the bounding box mesh is attachable for the gizmo manager
      gizmoManager.attachableMeshes?.push(carBoundingBoxMesh);
      Tags.AddTagsTo(carBoundingBoxMesh, "gizmoAttachableMesh");
      carBoundingBoxMesh.id = scene?.getUniqueId().toString() as string;
      carBoundingBoxMesh.isPickable = true;
      carBoundingBoxMesh.material = invisibleMaterial;

      // Add to animatedNodes

      const meshPositionAnim = new Animation(
        `car_position`,
        "position",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );
      const meshRotationAnim = new Animation(
        `car_rotation`,
        "rotationQuaternion",
        frameRate,
        Animation.ANIMATIONTYPE_QUATERNION
      );
      const meshScalingAnim = new Animation(
        `car_scaling`,
        "scaling",
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3
      );

      meshPositionAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: carBoundingBoxMesh.position.clone(),
          };
        })
      );
      meshRotationAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: carBoundingBoxMesh.rotationQuaternion?.clone(),
          };
        })
      );
      meshScalingAnim.setKeys(
        keyframes.map((keyframe) => {
          return {
            frame: keyframe,
            value: carBoundingBoxMesh.scaling.clone(),
          };
        })
      );

      carBoundingBoxMesh.animations = [
        meshPositionAnim,
        meshRotationAnim,
        meshScalingAnim,
      ];
      storyBoardAnimationGroup?.addTargetedAnimation(
        meshPositionAnim,
        carBoundingBoxMesh
      );
      storyBoardAnimationGroup?.addTargetedAnimation(
        meshRotationAnim,
        carBoundingBoxMesh
      );
      storyBoardAnimationGroup?.addTargetedAnimation(
        meshScalingAnim,
        carBoundingBoxMesh
      );

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
                  !animation.getKeys()[sceneSettings.currentBoardIndex]
                ) {
                  return;
                }

                animation.getKeys()[sceneSettings.currentBoardIndex].value =
                  currentFrame;
              }
            )
        );

      meshesToAnimationGroupsMap.set(
        carBoundingBoxMesh.name,
        animationGroups.map((animationGroup) => animationGroup.name)
      );

      meshWithAnimationGroupsMap.set(
        carBoundingBoxMesh.id,
        new MeshWithAnimationGroups(
          carBoundingBoxMesh,
          animatableAnimationGroups
        )
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
            `${carBoundingBoxMesh.name}_${animatableAnimationGroup.name}_currentFrame`,
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
        new MeshWithAnimationGroups(
          carBoundingBoxMesh,
          animatableAnimationGroups
        )
      );
    }
  );

  resetSnapshot(engine, scene);
}

/**
 * Sets up shadow casting for skySun.
 * @param skySun The directional light representing the sun.
 */
function setupSkySunShadows(
  scene: Nullable<Scene>,
  skySun: DirectionalLight
): ShadowGenerator {
  if (!scene) {
    throw new Error("No scene");
  }

  skySun.shadowEnabled = true;
  skySun.autoCalcShadowZBounds = true;
  const sunShadowGenerator = new ShadowGenerator(1024, skySun);
  sunShadowGenerator.setDarkness(0);
  sunShadowGenerator.filter =
    ShadowGenerator.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP;
  sunShadowGenerator.transparencyShadow = true;

  // Add shadow casters to sunShadowGenerator
  addTaggedMeshesAsShadowCasters(scene, sunShadowGenerator);

  return sunShadowGenerator;
}

/**
 * Adds meshes tagged with "shadowCaster" to the sun shadow generator.
 */
function addTaggedMeshesAsShadowCasters(
  scene: Nullable<Scene>,
  sunShadowGenerator: Nullable<ShadowGenerator>
) {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!sunShadowGenerator) {
    throw new Error("No sun shadow generator");
  }

  const shadowCasters = scene.getMeshesByTags("shadowCaster");
  shadowCasters.forEach((mesh) => {
    sunShadowGenerator?.addShadowCaster(mesh);
  });
}
