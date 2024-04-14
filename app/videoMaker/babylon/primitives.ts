import type {
  GizmoManager,
  Scene,
  Nullable,
  ShadowGenerator,
  AnimationGroup,
  AbstractMesh,
} from "@babylonjs/core";
import type { Inspectable, PrimitiveMeshType } from "~/videoMaker/interface";

import { Animation } from "@babylonjs/core/Animations/animation";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Tags } from "@babylonjs/core/Misc/tags";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

/**
 * Adds a new primitive mesh to the scene based on the newPrimitiveMeshType scene setting.
 */
export function addPrimitiveMesh(
  scene: Nullable<Scene>,
  gizmoManager: Nullable<GizmoManager>,
  sunShadowGenerator: Nullable<ShadowGenerator>,
  sceneInspectables: Inspectable[],
  keyframes: number[],
  storyBoardAnimationGroup: Nullable<AnimationGroup>,
  frameRate: number,
  primitiveMeshType: PrimitiveMeshType
): AbstractMesh {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  // Set base ambient color to white
  const material = new StandardMaterial("material", scene);
  material.ambientColor = new Color3(1, 1, 1);
  material.backFaceCulling = true;

  let mesh: AbstractMesh;

  switch (primitiveMeshType) {
    case "box":
      mesh = MeshBuilder.CreateBox("box", {}, scene);
      break;
    case "sphere":
      mesh = MeshBuilder.CreateSphere("sphere", {}, scene);
      break;
    case "cylinder":
      mesh = MeshBuilder.CreateCylinder("cylinder", {}, scene);
      break;
    case "torus":
      mesh = MeshBuilder.CreateTorus("torus", {}, scene);
      break;
    case "plane":
      mesh = MeshBuilder.CreatePlane("plane", {}, scene);
      break;
    case "ground":
      mesh = MeshBuilder.CreateGround("ground", {}, scene);
      break;
    default:
      throw new Error("Invalid mesh type");
  }

  // Set rotation to identity
  mesh.rotationQuaternion = Quaternion.Identity();

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

  // Add to animatedNodes

  // TODO: How do I handle this?
  // For now I'm adding keys for every keyframe and setting the value to the current value
  meshPositionAnim.setKeys(
    keyframes.map((keyframe) => ({
      frame: keyframe,
      value: mesh.position.clone(),
    }))
  );
  meshRotationAnim.setKeys(
    keyframes.map((keyframe) => ({
      frame: keyframe,
      value: mesh.rotationQuaternion?.clone(),
    }))
  );
  meshScalingAnim.setKeys(
    keyframes.map((keyframe) => ({
      frame: keyframe,
      value: mesh.scaling.clone(),
    }))
  );

  mesh.animations = [meshPositionAnim, meshRotationAnim, meshScalingAnim];
  storyBoardAnimationGroup.addTargetedAnimation(meshPositionAnim, mesh);
  storyBoardAnimationGroup.addTargetedAnimation(meshRotationAnim, mesh);
  storyBoardAnimationGroup.addTargetedAnimation(meshScalingAnim, mesh);

  mesh.isPickable = true;
  mesh.checkCollisions = true;
  mesh.receiveShadows = true;
  mesh.material = material;

  gizmoManager.attachableMeshes?.push(mesh);
  Tags.AddTagsTo(mesh, "gizmoAttachableMesh");
  mesh.id = scene.getUniqueId().toString() as string;
  if (mesh.material) {
    mesh.material.id = scene.getUniqueId().toString() as string;
  }

  sunShadowGenerator?.addShadowCaster(mesh);
  Tags.AddTagsTo(mesh, "shadowCaster");

  sceneInspectables.push(mesh);
  gizmoManager.attachToMesh(mesh);

  Tags.AddTagsTo(mesh, "meshWithoutAnimationGroups");

  return mesh;
}
