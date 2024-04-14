import type {
  IVideoMaker,
  Inspectable,
  SceneSettings,
} from "~/videoMaker/interface";

import { ScrollArea } from "shadcn/components/ui/scroll-area";
import { useEditorStore } from "~/components/videoMakerEditorShell";
import { isInspectableMesh } from "~/videoMaker/interface";
import { Toggle } from "shadcn/components/ui/toggle";
import { Badge } from "shadcn/components/ui/badge";

export default function HeirarchySubPanel({
  videoMaker,
}: {
  videoMaker: IVideoMaker;
}) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state: { sceneSettings: SceneSettings }) => state.sceneSettings
  );

  const getInspectableAnimations = (obj: Inspectable) => {
    if (!isInspectableMesh(obj)) {
      return null;
    }

    if (!obj.getInspectableAnimations) {
      return null;
    }

    const animations = obj.getInspectableAnimations();
    if (!animations) {
      return null;
    }

    return (
      <ul className="pl-2">
        {animations.map((animation, i) => {
          return (
            <li key={i} className="flex flex-col">
              <Toggle
                className="flex flex-row justify-start data-[state=on]:bg-background data-[state=on]:text-foreground"
                pressed={animation.id === sceneSettings.selectedItemID}
                onClick={() => {
                  videoMaker.selectInspectable(animation);
                }}
              >
                {animation.name}&nbsp;&nbsp;<Badge>anim</Badge>
              </Toggle>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <ScrollArea className="h-full w-full py-2 bg-secondary text-secondary-foreground rounded-md">
      <ul className="p-1 w-full h-full flex flex-col gap-2">
        {videoMaker.sceneInspectables.map((obj, i) => {
          return (
            <li key={i} className="flex flex-col">
              <Toggle
                className="flex flex-row justify-start data-[state=on]:bg-background data-[state=on]:text-foreground"
                pressed={obj.id === sceneSettings.selectedItemID}
                onClick={() => {
                  videoMaker.selectInspectable(obj);
                }}
              >
                {obj.name}
              </Toggle>
              {/* List of  animations if they exist */}
              {getInspectableAnimations(obj)}
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}
