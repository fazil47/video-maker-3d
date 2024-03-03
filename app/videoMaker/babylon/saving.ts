import type {
  Scene,
  IAnimationKey,
  Nullable,
  AbstractMesh,
} from "@babylonjs/core";

import type { AnimatableAnimationGroup } from "./animatableAnimationGroup";

import { SceneSerializer } from "@babylonjs/core/Misc/sceneSerializer";
import { BlobWriter, ZipWriter, TextReader } from "@zip.js/zip.js";

/**
 * Serializes the scene and saves it to a file.
 */
export async function saveScene(
  scene: Nullable<Scene>,
  savedSceneURL: string | null,
  savedSceneFilename: string,
  keyframes: number[],
  skySunGizmoMesh: Nullable<AbstractMesh>,
  meshesToAnimationGroupsMap: Map<string, string[]>,
  animatableAnimationsMap: Map<string, AnimatableAnimationGroup>
) {
  if (!scene) {
    throw new Error("No scene");
  }

  if (savedSceneURL) {
    window.URL.revokeObjectURL(savedSceneURL);
  }

  const serializedScene = SceneSerializer.Serialize(scene);
  delete serializedScene.environmentTexture;
  const strMesh = JSON.stringify(serializedScene);

  // Zip the scene and keyframes files
  const zipFileWriter = new BlobWriter();
  const zipWriter = new ZipWriter(zipFileWriter);
  await zipWriter.add(`${savedSceneFilename}.babylon`, new TextReader(strMesh));
  await zipWriter.add(
    `${savedSceneFilename}_keyframes.json`,
    new TextReader(JSON.stringify(keyframes))
  );

  if (skySunGizmoMesh) {
    await zipWriter.add(
      `${savedSceneFilename}_skySun_rotation_animation.json`,
      new TextReader(
        JSON.stringify(
          skySunGizmoMesh.animations[1].getKeys().map((key) => {
            return key.value;
          })
        )
      )
    );
  }

  await zipWriter.add(
    `${savedSceneFilename}_m2a.json`,
    new TextReader(
      JSON.stringify(Object.fromEntries(meshesToAnimationGroupsMap))
    )
  );
  const animationGroupNameToAnimatableAnimationGroupKeys = new Map<
    string,
    IAnimationKey[]
  >();
  Array.from(animatableAnimationsMap.values()).forEach(
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
    `${savedSceneFilename}_a2aa.json`,
    new TextReader(
      JSON.stringify(
        Object.fromEntries(animationGroupNameToAnimatableAnimationGroupKeys)
      )
    )
  );

  const zipBlob = await zipWriter.close();
  savedSceneURL = (window.webkitURL || window.URL).createObjectURL(zipBlob);

  const link = window.document.createElement("a");
  link.href = savedSceneURL;
  link.download = `${savedSceneFilename}.zip`;
  const clickEvent = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: false,
  });
  link.dispatchEvent(clickEvent);
}
