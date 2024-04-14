import type { IVideoMaker, SceneSettings } from "~/videoMaker/interface";
import HeirarchySubPanel from "./subpanels/heirarchySubPanel";
import PropertiesSubPanel from "./subpanels/propertiesSubPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "shadcn/components/ui/resizable";

import { useEditorStore } from "~/components/videoMakerEditorShell";

export default function InspectorPanel({
  videoMaker,
}: {
  videoMaker: IVideoMaker;
}) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state: { sceneSettings: SceneSettings }) => state.sceneSettings
  );

  return (
    <div className="h-full overflow-hidden flex flex-col items-center rounded-md bg-primary text-primary-foreground">
      <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
        Inspector
      </div>
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50} id="heirarchy" order={0}>
          <HeirarchySubPanel videoMaker={videoMaker} />
        </ResizablePanel>
        {sceneSettings.selectedItemID ? (
          <>
            <ResizableHandle
              className="bg-primary text-primary-foreground"
              withHandle
            />
            <ResizablePanel defaultSize={50} id="properties" order={1}>
              <PropertiesSubPanel videoMaker={videoMaker} />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
