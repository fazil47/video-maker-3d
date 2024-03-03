import type { Nullable, Engine, Scene, GizmoManager } from "@babylonjs/core";

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Tags } from "@babylonjs/core/Misc/tags";

/**
 * Creates a FreeCamera and sets up controls and the collider.
 * @returns The created FreeCamera.
 */
export function createController(
  canvas: Nullable<HTMLCanvasElement>,
  engine: Nullable<Engine>,
  scene: Nullable<Scene>,
  gizmoManager: Nullable<GizmoManager>
): FreeCamera {
  if (!canvas) {
    throw new Error("No canvas");
  }

  if (!engine) {
    throw new Error("No engine");
  }

  if (!scene) {
    throw new Error("No scene");
  }

  if (!gizmoManager) {
    throw new Error("No gizmo manager");
  }

  const camera = new FreeCamera("Camera", new Vector3(1.5, 2.5, -15), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);

  // Set camera as attachable for gizmo manager
  gizmoManager.attachableNodes?.push(camera);
  Tags.AddTagsTo(camera, "gizmoAttachableNode");
  camera.id = scene.getUniqueId().toString() as string;

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

  scene.onPointerDown = (evt) => {
    if (evt.button === 2) {
      engine.enterPointerlock();
      gizmoManager.usePointerToAttachGizmos = false;
    }
  };

  scene.onPointerUp = (evt) => {
    if (evt.button === 2) {
      gizmoManager.usePointerToAttachGizmos = true;
      engine.exitPointerlock();
    }
  };

  return camera;
}
