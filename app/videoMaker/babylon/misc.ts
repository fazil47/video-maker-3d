import type { Nullable, Scene, Engine } from "@babylonjs/core";

import type { SceneSettings } from "~/videoMaker/interface";

import { ScenePerformancePriority } from "@babylonjs/core/scene";
import { Constants } from "@babylonjs/core/Engines/constants";

/**
 * Sets the performance priority for the scene.
 * @param priority The performance priority to set. The options are "compatible", "intermediate", and "aggressive".
 */
export function setPerformancePriority(
  scene: Nullable<Scene>,
  priority: "compatible" | "intermediate" | "aggressive"
) {
  if (!scene) {
    throw new Error("No scene");
  }

  switch (priority) {
    case "aggressive":
      scene.performancePriority = ScenePerformancePriority.Aggressive;
      break;
    case "intermediate":
      scene.performancePriority = ScenePerformancePriority.Intermediate;
      break;
    case "compatible":
    default:
      scene.performancePriority = ScenePerformancePriority.BackwardCompatible;
  }
}

/**
 * Sets the snapshot mode for WebGPU snapshot rendering.
 * @param mode The snapshot mode to set. The options are "disabled", "standard", and "fast".
 */
export function setSnapshotMode(
  engine: Nullable<Engine>,
  scene: Nullable<Scene>,
  mode: "disabled" | "standard" | "fast"
) {
  if (!engine) {
    throw new Error("No engine");
  }

  if (!scene) {
    throw new Error("No scene");
  }
  scene.executeWhenReady(() => {
    switch (mode) {
      case "disabled":
        engine.snapshotRendering = false;
        break;
      case "standard":
        engine.snapshotRenderingMode = Constants.SNAPSHOTRENDERING_STANDARD;
        engine.snapshotRendering = true;
        break;
      case "fast":
        engine.snapshotRenderingMode = Constants.SNAPSHOTRENDERING_FAST;
        engine.snapshotRendering = true;
        break;
    }
  });
}

/**
 * Resets the snapshot for WebGPU snapshot rendering.
 */
export function resetSnapshot(
  engine: Nullable<Engine>,
  scene: Nullable<Scene>
) {
  if (!engine) {
    throw new Error("No engine");
  }

  if (!scene) {
    throw new Error("No scene");
  }
  scene.executeWhenReady(() => {
    if (!engine) {
      throw new Error("No engine");
    }
    engine.snapshotRenderingReset();
  });
}

/**
 * Saves the scene settings to session storage.
 * Only needed for development mode because it's a workaround for a bug.
 */
export function saveSettingsToSessionStorage(settings: SceneSettings) {
  sessionStorage.setItem("sceneSettings", JSON.stringify(settings));
}

/**
 * Loads the scene settings from session storage.
 * Only needed for development mode because it's a workaround for a bug.
 */
export function loadSettingsFromSessionStorage(): SceneSettings | undefined {
  if (sessionStorage.getItem("sceneSettings")) {
    return JSON.parse(sessionStorage.getItem("sceneSettings") as string);
  }
}
