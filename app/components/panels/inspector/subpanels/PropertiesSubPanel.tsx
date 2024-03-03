import type BabylonApp from "~/babylon/BabylonApp.client";
import type {
  PrimitiveMeshType,
  SceneSettings,
  TransformGizmoMode,
} from "~/babylon/BabylonApp.client";
import {
  AnimatableAnimationGroup,
  MeshWithAnimationGroups,
} from "~/babylon/BabylonApp.client";
import { Mesh, PBRMaterial, StandardMaterial } from "@babylonjs/core";

import { useEditorStore } from "~/components/BabylonEditor";
import AlbedoColorControl from "../controls/pbrmaterial/AlbedoColorControl";
import AlbedoTextureControl from "../controls/pbrmaterial/AlbedoTextureControl";
import PBRAmbientColorControl from "../controls/pbrmaterial/AmbientColorControl";
import ReflectionColorControl from "../controls/pbrmaterial/ReflectionColorControl";
import ReflectivityColorControl from "../controls/pbrmaterial/ReflectivityColorControl";
import MetallicControl from "../controls/pbrmaterial/MetallicControl";
import RoughnessControl from "../controls/pbrmaterial/RoughnessControl";
import SpecularIntensityControl from "../controls/pbrmaterial/SpecularIntensityControl";
import DiffuseTextureControl from "../controls/standardmaterial/DiffuseTextureControl";
import DiffuseColorControl from "../controls/standardmaterial/DiffuseColorControl";
import StandardAmbientColorControl from "../controls/standardmaterial/AmbientColorControl";
import SpecularColorControl from "../controls/standardmaterial/SpecularColorControl";
import SpecularPowerControl from "../controls/standardmaterial/SpecularPowerControl";
import { useEffect, useState } from "react";

export default function PropertiesSubPanel({ app }: { app: BabylonApp }) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state: { sceneSettings: SceneSettings }) => state.sceneSettings
  );

  const [animationCurrentFrame, setAnimationCurrentFrame] = useState<number>(0);

  useEffect(() => {
    if (sceneSettings.selectedItemID) {
      const selectedObject = app.getObjectById(sceneSettings.selectedItemID);
      if (selectedObject instanceof AnimatableAnimationGroup) {
        setAnimationCurrentFrame(selectedObject.currentFrame);
      }
    }
  }, [sceneSettings.selectedItemID, sceneSettings.currentBoardIndex]);

  let selectedObject = sceneSettings.selectedItemID
    ? app.getObjectById(sceneSettings.selectedItemID)
    : null;
  if (selectedObject instanceof MeshWithAnimationGroups) {
    selectedObject = selectedObject.mesh;
  }

  // TODO: Instead of passing app as prop, pass required functions alone (is this worth it?)
  let PropertiesControls;
  if (selectedObject) {
    if (selectedObject instanceof Mesh) {
      if (selectedObject.material instanceof PBRMaterial) {
        PropertiesControls = (
          <>
            <AlbedoTextureControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <AlbedoColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <PBRAmbientColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <ReflectionColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <ReflectivityColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <MetallicControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <RoughnessControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <SpecularIntensityControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
          </>
        );
      } else if (selectedObject.material instanceof StandardMaterial) {
        PropertiesControls = (
          <>
            <DiffuseTextureControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <DiffuseColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <StandardAmbientColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <SpecularColorControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
            <SpecularPowerControl
              selectedMeshMaterial={selectedObject.material}
              app={app}
            />
          </>
        );
      }
    } else if (selectedObject instanceof AnimatableAnimationGroup) {
      PropertiesControls = (
        <div>
          <label>Animation Progress</label>
          <input
            type="range"
            min={selectedObject.firstFrame}
            max={selectedObject.lastFrame}
            step={0.01}
            value={animationCurrentFrame}
            onChange={(ev) => {
              (
                selectedObject as AnimatableAnimationGroup
              ).setCurrentFrameAndWriteToAnimation(parseFloat(ev.target.value));
              setAnimationCurrentFrame(
                (selectedObject as AnimatableAnimationGroup).currentFrame
              );
            }}
          />
        </div>
      );
    }
  }

  return (
    <div className="overflow-y-auto overflow-x-hidden h-[50%] p-1 w-full rounded-md rounded-t-none flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#2c2c2c]">
      <select
        value={sceneSettings.transformGizmoMode}
        onChange={(ev) => {
          useEditorStore.setState(
            (state: { sceneSettings: SceneSettings }) => ({
              sceneSettings: {
                ...state.sceneSettings,
                transformGizmoMode: ev.target.value as TransformGizmoMode,
              },
            })
          );
        }}
        className="w-full rounded-md bg-gray-300 dark:bg-[#303030] focus:outline-none"
      >
        <option value="position">Position</option>
        <option value="rotation">Rotation</option>
        <option value="scale">Scale</option>
      </select>
      <div className="overflow-x-hidden p-1 w-full rounded-md flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#303030]">
        {PropertiesControls}
      </div>
      <div className="p-1 w-full rounded-md flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#303030]">
        <select
          value={sceneSettings.newPrimitiveMeshType}
          onChange={(ev) => {
            useEditorStore.setState(
              (state: { sceneSettings: SceneSettings }) => ({
                sceneSettings: {
                  ...state.sceneSettings,
                  newPrimitiveMeshType: ev.target.value as PrimitiveMeshType,
                },
              })
            );
          }}
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
        >
          <option value="box">Box</option>
          <option value="sphere">Sphere</option>
          <option value="cylinder">Cylinder</option>
          <option value="torus">Torus</option>
          <option value="plane">Plane</option>
          <option value="ground">Ground</option>
        </select>
        <button
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
          onClick={() => {
            app.addPrimitiveMesh();
          }}
        >
          Add Mesh
        </button>
      </div>
      <button
        className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
        onClick={() => {
          app.importGLBMesh();
        }}
      >
        Import GLB Mesh
      </button>
      <button
        className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
        onClick={() => {
          app.deleteSelectedItem();
        }}
      >
        Delete
      </button>
    </div>
  );
}
