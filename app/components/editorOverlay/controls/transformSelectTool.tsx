import type { SceneSettings, TransformGizmoMode } from "~/videoMaker/interface";

import { useEditorStore } from "~/components/videoMakerEditorShell";

export default function TransformSelectTool({
  className = "",
}: {
  className?: string;
}) {
  const sceneSettings = useEditorStore((state) => state.sceneSettings);

  return (
    <select
      value={sceneSettings.transformGizmoMode}
      onChange={(ev) => {
        useEditorStore.setState((state: { sceneSettings: SceneSettings }) => ({
          sceneSettings: {
            ...state.sceneSettings,
            transformGizmoMode: ev.target.value as TransformGizmoMode,
          },
        }));
      }}
      className={"w-full max-w-36 rounded-md focus:outline-none" + className}
    >
      <option value="position">Position</option>
      <option value="rotation">Rotation</option>
      <option value="scale">Scale</option>
    </select>
  );
}
