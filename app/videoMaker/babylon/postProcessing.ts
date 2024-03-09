import type { Nullable, Scene, Camera } from "@babylonjs/core";

import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { SSRRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline";
import { Constants } from "@babylonjs/core/Engines/constants";

/**
 * Sets up post-process effects.
 * @param scene The Babylon scene.
 * @param camera The active camera.
 */
export function setupPostProcessEffects(
  scene: Nullable<Scene>,
  camera: Camera
) {
  if (!scene) {
    throw new Error("No scene");
  }

  const defaultPipeline = new DefaultRenderingPipeline(
    "default",
    false,
    scene,
    [camera]
  );
  defaultPipeline.fxaaEnabled = true;
  defaultPipeline.glowLayerEnabled = true;
  if (defaultPipeline.glowLayer) {
    defaultPipeline.glowLayer.intensity = 0.5;
  }
  defaultPipeline.bloomEnabled = true;

  // Screen Space Ambient Occlusion for WebGL 2
  if (SSAO2RenderingPipeline.IsSupported) {
    const ssao = new SSAO2RenderingPipeline(
      "ssao", // The name of the pipeline
      scene, // The scene to which the pipeline belongs
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
      scene, // The scene to which the pipeline belongs
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

  const enableMSAA = false;
  if (enableMSAA && scene?.prePassRenderer) {
    defaultPipeline.samples = 16;
    scene.prePassRenderer.samples = 16;
  }
}
