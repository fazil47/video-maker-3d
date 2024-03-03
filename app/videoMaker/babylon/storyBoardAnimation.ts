import type {
  AnimationGroup,
  TargetedAnimation,
} from "@babylonjs/core/Animations/animationGroup";

import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AnimatableAnimationGroup } from "./animatableAnimationGroup";
import { SceneSettings } from "../interface";

/**
 * Adds a new keyframe to all animated nodes.
 * @param timeAfterLastKeyframe The time after the last keyframe to add the new keyframe. Ignored if it's the first keyframe.
 */
export function addKeyframe(
  storyBoardAnimationGroup: AnimationGroup | null,
  keyframes: number[],
  timeAfterLastKeyframe: number
) {
  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  if (keyframes.length !== 0) {
    keyframes.push((keyframes.at(-1) as number) + timeAfterLastKeyframe);
  } else {
    throw new Error("No keyframes, this shouldn't have happened");
  }

  storyBoardAnimationGroup?.targetedAnimations.forEach(
    (targetedAnimation: TargetedAnimation) => {
      if (
        !(
          targetedAnimation.target instanceof AbstractMesh ||
          targetedAnimation.target instanceof AnimatableAnimationGroup
        ) ||
        !(
          targetedAnimation.animation.targetProperty === "position" ||
          targetedAnimation.animation.targetProperty === "rotationQuaternion" ||
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
                frame: keyframes.at(-1) as number,
                value: targetedAnimation.target.position.clone(),
              },
            ]);
            break;
          case "rotationQuaternion":
            targetedAnimation.target.animations[1].setKeys([
              ...targetedAnimation.target.animations[1].getKeys(),
              {
                frame: keyframes.at(-1) as number,
                value: targetedAnimation.target.rotationQuaternion?.clone(),
              },
            ]);
            break;
          case "scaling":
            targetedAnimation.target.animations[2].setKeys([
              ...targetedAnimation.target.animations[2].getKeys(),
              {
                frame: keyframes.at(-1) as number,
                value: targetedAnimation.target.scaling.clone(),
              },
            ]);
            break;
        }
      } else if (targetedAnimation.target instanceof AnimatableAnimationGroup) {
        targetedAnimation.animation.setKeys([
          ...targetedAnimation.animation.getKeys(),
          {
            frame: keyframes.at(-1) as number,
            value: targetedAnimation.target.currentFrame,
          },
        ]);
      }
    }
  );
}

/**
 * This sets animated properties to their values at the story board's current keyframe.
 */
export function matchBoardCurrentKeyframe(
  storyBoardAnimationGroup: AnimationGroup | null,
  keyframes: number[],
  getSceneSettings: () => SceneSettings | null,
  updateSkybox: () => void
) {
  if (!storyBoardAnimationGroup) {
    throw new Error("No story board animation group");
  }

  if (keyframes.length === 0) {
    throw new Error("No keyframes");
  }

  storyBoardAnimationGroup?.targetedAnimations.forEach(
    (targetedAnimation: TargetedAnimation) => {
      const sceneSettings = getSceneSettings();

      if (sceneSettings) {
        // TODO: Support more types of nodes
        if (targetedAnimation.target instanceof AbstractMesh) {
          switch (targetedAnimation.animation.targetProperty) {
            case "position":
              targetedAnimation.target.position =
                targetedAnimation.target.animations[0].getKeys()[
                  sceneSettings.currentBoardIndex
                ]?.value;
              break;
            case "rotationQuaternion":
              targetedAnimation.target.rotationQuaternion =
                targetedAnimation.target.animations[1].getKeys()[
                  sceneSettings.currentBoardIndex
                ]?.value;
              break;
            case "scaling":
              targetedAnimation.target.scaling =
                targetedAnimation.target.animations[2].getKeys()[
                  sceneSettings.currentBoardIndex
                ]?.value;
              break;
          }
        } else if (
          targetedAnimation.target instanceof AnimatableAnimationGroup
        ) {
          targetedAnimation.target.currentFrame =
            targetedAnimation.animation.getKeys()[
              sceneSettings.currentBoardIndex
            ]?.value;
        }
      }
    }
  );

  // TODO: This is a hack to update the skybox, shouldn't be necessary
  setTimeout(() => {
    updateSkybox();
  }, 100);
}
