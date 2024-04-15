import type { SceneSettings, TransformGizmoMode } from "~/videoMaker/interface";

import { Move3D, Rotate3D, Scale3D } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "shadcn/components/ui/toggle-group";
import { useEditorStore } from "~/components/videoMakerEditorShell";

export default function TransformSelectTool({
  className = "",
}: {
  className?: string;
}) {
  const sceneSettings = useEditorStore((state) => state.sceneSettings);

  return (
    <ToggleGroup
      type="single"
      className={"bg-background w-fit rounded-md p-1" + " " + className}
      onValueChange={(value) => {
        useEditorStore.setState((state: { sceneSettings: SceneSettings }) => ({
          sceneSettings: {
            ...state.sceneSettings,
            transformGizmoMode: value as TransformGizmoMode,
          },
        }));
      }}
      value={sceneSettings.transformGizmoMode}
    >
      <ToggleGroupItem
        className="p-2 h-6 data-[state=on]:bg-input data-[state=on]:text-tertiary-foreground"
        value="position"
        aria-label="Toggle translate"
      >
        <Move3D className="h-3 w-3" />
      </ToggleGroupItem>
      <ToggleGroupItem
        className="p-2 h-6 data-[state=on]:bg-input data-[state=on]:text-tertiary-foreground"
        value="rotation"
        aria-label="Toggle rotate"
      >
        <Rotate3D className="h-3 w-3" />
      </ToggleGroupItem>
      <ToggleGroupItem
        className="p-2 h-6 data-[state=on]:bg-input data-[state=on]:text-tertiary-foreground"
        value="scale"
        aria-label="Toggle scale"
      >
        <Scale3D className="h-3 w-3" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
