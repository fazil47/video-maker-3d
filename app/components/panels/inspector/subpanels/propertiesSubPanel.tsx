import type {
  IVideoMaker,
  SceneSettings,
  Inspectable,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { ScrollArea } from "shadcn/components/ui/scroll-area";
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
  }, [
    sceneSettings.selectedItemID,
    sceneSettings.currentBoardIndex,
    videoMaker,
  ]);

  let propertiesControls;
  if (selectedObject) {
    if (isInspectableAnimation(selectedObject)) {
      propertiesControls = (
        <div className="w-full p-2 bg-tertiary text-tertiary-foreground rounded-md">
          <div className="w-full rounded-md focus:outline-none font-semibold">
            Animation
          </div>
          <NumberControl
            videoMaker={videoMaker}
            selectable={selectedObject}
            numberProperty={selectedObject.getCurrentFrameProperty()}
          />
        </div>
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
                      booleanProperty={property}
                    />
                  );
                }
              });
      }

      propertiesControls = (
        <>
          <div className="w-full p-2 bg-tertiary text-tertiary-foreground rounded-md">
            <div className="w-full rounded-md focus:outline-none font-semibold">
              Transform
            </div>
            {transformControls}
          </div>
          {materialPropertyControls ? (
            <div className="w-full p-2 bg-tertiary text-tertiary-foreground rounded-md">
              <div className="w-full rounded-md focus:outline-none font-semibold">
                Material
              </div>
              {materialPropertyControls}
            </div>
          ) : null}
        </>
      );
    }
  }

  if (propertiesControls) {
    return (
      <ScrollArea className="h-full w-full py-1 bg-secondary text-secondary-foreground rounded-md">
        <div className="overflow-x-hidden p-1 w-full rounded-md flex flex-col items-center align-middle gap-2">
          {propertiesControls}
        </div>
      </ScrollArea>
    );
  } else {
    return null;
  }
}
