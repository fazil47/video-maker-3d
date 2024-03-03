import type {
  IVideoMaker,
  PrimitiveMeshType,
  SceneSettings,
  Inspectable,
  TransformGizmoMode,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { useEditorStore } from "~/components/videoMakerEditorShell";
import {
  isBooleanProperty,
  isColourProperty,
  isNumberProperty,
  isInspectableAnimation,
  isInspectableMesh,
  isTextureProperty,
} from "~/videoMaker/interface";
import TextureControl from "../controls/textureControl";
import ColorControl from "../controls/colorControl";
import NumberControl from "../controls/numberControl";
import BooleanControl from "../controls/booleanControl";
import Vector3Control from "../controls/vector3Control";

export default function PropertiesSubPanel({
  videoMaker,
}: {
  videoMaker: IVideoMaker;
}) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state: { sceneSettings: SceneSettings }) => state.sceneSettings
  );

  const [selectedObject, setSelectedObject] = useState<Inspectable | null>(
    null
  );

  useEffect(() => {
    if (sceneSettings.selectedItemID) {
      const selectable = videoMaker.getInspectableById(
        sceneSettings.selectedItemID
      );
      setSelectedObject(selectable);
    } else {
      setSelectedObject(null);
    }
  }, [sceneSettings.selectedItemID, videoMaker]);

  let PropertiesControls;
  if (selectedObject) {
    if (isInspectableAnimation(selectedObject)) {
      PropertiesControls = (
        <NumberControl
          videoMaker={videoMaker}
          selectable={selectedObject}
          numberProperty={selectedObject.getCurrentFrameProperty()}
        />
      );
    } else if (isInspectableMesh(selectedObject)) {
      const transformControls = [
        selectedObject.getPositionProperty(),
        selectedObject.getRotationProperty(),
        selectedObject.getScalingPropery(),
      ].map((property) => (
        <Vector3Control
          key={property.key}
          videoMaker={videoMaker}
          selectable={selectedObject}
          vector3Property={property}
        />
      ));

      let materialPropertyControls;
      if (selectedObject && selectedObject.getInspectableMeshMaterial) {
        const selectableMeshMaterial =
          selectedObject.getInspectableMeshMaterial();

        materialPropertyControls =
          selectableMeshMaterial === null
            ? null
            : selectableMeshMaterial.getMaterialProperties().map((property) => {
                if (isTextureProperty(property)) {
                  return (
                    <TextureControl
                      key={property.key}
                      videoMaker={videoMaker}
                      selectable={selectableMeshMaterial}
                      textureProperty={property}
                    />
                  );
                } else if (isColourProperty(property)) {
                  return (
                    <ColorControl
                      key={property.key}
                      videoMaker={videoMaker}
                      selectable={selectableMeshMaterial}
                      colorProperty={property}
                      label={property.key}
                    />
                  );
                } else if (isNumberProperty(property)) {
                  return (
                    <NumberControl
                      key={property.key}
                      videoMaker={videoMaker}
                      selectable={selectableMeshMaterial}
                      numberProperty={property}
                    />
                  );
                } else if (isBooleanProperty(property)) {
                  return (
                    <BooleanControl
                      key={property.key}
                      videoMaker={videoMaker}
                      selectable={selectableMeshMaterial}
                      booleanControl={property}
                    />
                  );
                }
              });
      }

      PropertiesControls = (
        <>
          <>
            <div className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none">
              Transform
            </div>
            {transformControls}
          </>
          {materialPropertyControls ? (
            <>
              <div className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none">
                Material Properties
              </div>
              {materialPropertyControls}
            </>
          ) : null}
        </>
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
      {PropertiesControls ? (
        <div className="overflow-x-hidden p-1 w-full rounded-md flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#303030]">
          {PropertiesControls}
        </div>
      ) : null}
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
            videoMaker.addPrimitiveMesh();
          }}
        >
          Add Mesh
        </button>
      </div>
      <button
        className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
        onClick={() => {
          videoMaker.importGLBModel();
        }}
      >
        Import GLB Mesh
      </button>
      <button
        className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
        onClick={() => {
          videoMaker.deleteInspectable();
        }}
      >
        Delete
      </button>
    </div>
  );
}
