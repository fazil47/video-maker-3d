import type { Nullable, Scene, DirectionalLight } from "@babylonjs/core";

import { SkyMaterial } from "@babylonjs/materials/sky/skyMaterial";
import { GradientMaterial } from "@babylonjs/materials/gradient/gradientMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";

/**
 * Creates the skybox and environmental lighting.
 */
export function createSkybox(
  scene: Nullable<Scene>,
  skySun: Nullable<DirectionalLight>
): SkyMaterial {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!skySun) {
    throw new Error("No sky sun light");
  }

  // Create skybox material
  const skyboxMaterial = new SkyMaterial("skyboxMaterial", scene);
  skyboxMaterial.backFaceCulling = false;

  // Set sky material sun position based on skySun direction
  skyboxMaterial.useSunPosition = true;
  skyboxMaterial.sunPosition = skySun.direction.scale(-1);

  // Visualization of environment effect by updating skySun direction and skyMaterial sun position every frame
  const quaternionDelta = 0.02;
  window.addEventListener("keydown", (event) => {
    if (skySun.direction.y <= 0) {
      if (event.key === "1") {
        _rotateSun(scene, skySun, skyboxMaterial, quaternionDelta);
      } else if (event.key === "2") {
        _rotateSun(scene, skySun, skyboxMaterial, -quaternionDelta);
      }
    } else {
      skySun.direction.y = 0;
    }
  });

  skyboxMaterial.luminance = 0.4;
  skyboxMaterial.turbidity = 10;
  skyboxMaterial.rayleigh = 4;
  skyboxMaterial.mieCoefficient = 0.005;
  skyboxMaterial.mieDirectionalG = 0.98;
  skyboxMaterial.cameraOffset.y = 200;
  skyboxMaterial.disableDepthWrite = false;

  // Create skybox mesh
  const skybox = MeshBuilder.CreateSphere(
    "skyBox",
    { diameter: 1000.0 },
    scene
  );
  skybox.material = skyboxMaterial;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;
  skybox.alwaysSelectAsActiveMesh = true;

  // Create a "groundbox", a skybox with an invisible top part, used to render the ground
  const groundboxMaterial = new GradientMaterial("groundboxMaterial", scene);
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
    scene
  );
  groundbox.layerMask = 0x10000000; // FIXME: Had to do this make the sky visible
  groundbox.position.y = 0;
  groundbox.infiniteDistance = true;
  groundbox.material = groundboxMaterial;
  groundbox.isPickable = false;
  groundbox.alwaysSelectAsActiveMesh = true;

  // Create texture from skyMaterial using reflection probe
  const reflectionProbe = new ReflectionProbe("ref", 64, scene, false);
  reflectionProbe.renderList?.push(skybox);
  reflectionProbe.renderList?.push(groundbox);
  // TODO: Maybe only update manually when sun changes?
  reflectionProbe.refreshRate =
    RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;

  // Set environment texture to reflection probe cube texture
  scene.environmentTexture = reflectionProbe.cubeTexture;
  scene.environmentIntensity = 1;

  // return [skyboxMaterial, groundboxMaterial];
  return skyboxMaterial;
}

/**
 * Updates the skybox based on skySun
 */
export function updateSkybox(
  skySun: DirectionalLight | null,
  skyboxMaterial: SkyMaterial | null
) {
  if (!skySun) {
    throw new Error("No sky sun light");
  }

  if (!skyboxMaterial) {
    throw new Error("No skybox material");
  }

  skyboxMaterial.sunPosition = skySun.direction.scale(-1);

  // Set sun color based on sun position
  const sunColor = _getSunColor(-skySun.direction.y);
  skySun.diffuse = sunColor;
}

/**
 * Rotates the sun and updates the sky material and ambient light based on the new sun position.
 * @param angle The angle to rotate the sun by.
 */
function _rotateSun(
  scene: Nullable<Scene>,
  skySun: Nullable<DirectionalLight>,
  skyboxMaterial: Nullable<SkyMaterial>,
  angle: number
) {
  if (!scene) {
    throw new Error("No scene");
  }

  if (!skySun) {
    throw new Error("No sky sun light");
  }

  if (!skyboxMaterial) {
    throw new Error("No skybox material");
  }

  // skySun.direction.y goes from 0 at sunrise and sunset to -1 at noon

  // Rotate sun around the y axis and set sun position to the inverse of the direction
  skySun.direction.applyRotationQuaternionInPlace(
    Quaternion.RotationAxis(Vector3.Forward(), angle)
  );
  skyboxMaterial.sunPosition = skySun.direction.scale(-1);

  // Set sun color based on sun position
  const sunColor = _getSunColor(-skySun.direction.y);
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
function _getSunColor(sunElevation: number): Color3 {
  // Sun color is dim white when elevation is near 0, orange at sunrise and sunset and proper white for the rest of the day.
  const sunriseSunsetColor = new Color3(1, 0.65, 0); // Orange color
  const daySkyColor = new Color3(0.6, 0.6, 0.6); // White color
  const dimWhiteSkyColor = new Color3(0.4, 0.4, 0.4); // Dim white color

  const sunriseSunsetThreshold = 0.2; // Elevation angle threshold for sunrise/sunset

  if (sunElevation <= sunriseSunsetThreshold) {
    // Interpolate between dim white, orange, and white based on elevation angle
    const t = sunElevation / sunriseSunsetThreshold;
    const interpolatedColor = _interpolateColors(
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
function _interpolateColors(
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
