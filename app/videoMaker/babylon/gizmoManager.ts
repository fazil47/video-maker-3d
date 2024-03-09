import type { Nullable, Scene, Node } from "@babylonjs/core";
import type { SceneSettings } from "~/videoMaker/interface";

import { GizmoManager } from "@babylonjs/core/Gizmos/gizmoManager";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

/**
 * Creates the gizmo manager and utilityLayerRenderer.
 * @param onAttachedToObjectCallback Callback to be called when the gizmo is attached to a node.
 */
export function createGizmoManager(
  scene: Nullable<Scene>,
  getSceneSettings: () => SceneSettings | null,
  onAttachedToObjectCallback?: (node: Node | null) => void
): [GizmoManager, UtilityLayerRenderer] {
  if (!scene) {
    throw new Error("No scene");
  }

  // TODO: Not sure about this, should I return this as well and set the property explicitly along with this.gizmoManager?
  const utilityLayerRenderer = new UtilityLayerRenderer(scene);

  // Create and setup GizmoManager
  const gizmoManager = new GizmoManager(scene, 1, utilityLayerRenderer);
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
    const sceneSettings = getSceneSettings();

    if (
      gizmoManager.gizmos.positionGizmo?.attachedMesh !== undefined &&
      gizmoManager.gizmos.positionGizmo?.attachedMesh !== null &&
      sceneSettings &&
      gizmoManager.gizmos.positionGizmo?.attachedMesh.animations[0].getKeys()[
        sceneSettings.currentBoardIndex
      ]
    ) {
      Object.assign(
        gizmoManager.gizmos.positionGizmo.attachedMesh.animations[0].getKeys()[
          sceneSettings.currentBoardIndex
        ].value,
        gizmoManager.gizmos.positionGizmo.attachedMesh.position
      );
    }
  });
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
    const sceneSettings = getSceneSettings();

    if (
      gizmoManager.gizmos.rotationGizmo?.attachedMesh !== undefined &&
      gizmoManager.gizmos.rotationGizmo?.attachedMesh !== null &&
      gizmoManager.gizmos.rotationGizmo.attachedMesh.animations[1] &&
      sceneSettings
    ) {
      Object.assign(
        gizmoManager.gizmos.rotationGizmo.attachedMesh.animations[1].getKeys()[
          sceneSettings.currentBoardIndex
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
    const sceneSettings = getSceneSettings();

    if (
      gizmoManager.gizmos.scaleGizmo?.attachedMesh !== undefined &&
      gizmoManager.gizmos.scaleGizmo?.attachedMesh !== null &&
      sceneSettings &&
      gizmoManager.gizmos.scaleGizmo.attachedMesh.animations[2].getKeys()[
        sceneSettings.currentBoardIndex
      ]
    ) {
      Object.assign(
        gizmoManager.gizmos.scaleGizmo.attachedMesh.animations[2].getKeys()[
          sceneSettings.currentBoardIndex
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
