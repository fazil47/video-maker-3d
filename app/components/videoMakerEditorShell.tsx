import type { IVideoMaker, SceneSettings } from "~/videoMaker/interface";

import { ReactNode, useEffect } from "react";
import { create } from "zustand";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "shadcn/components/ui/resizable";

import TopMenu from "./menus/topMenu";
import StoryBoardPanel from "./panels/storyboard/storyBoardPanel";
import InspectorPanel from "./panels/inspector/inspectorPanel";
import BottomMenu from "./menus/bottomMenu";
import EditorOverlayToolbar from "./editorOverlay/editorOverlayToolbar";

export type PanelVisibility = {
  storyBoard: boolean;
  inspector: boolean;
};
export type StoryBoardSettings = {
  boards: object[];
};

interface EditorState {
  panelVisibility: PanelVisibility;
  setPanelVisibility: (panelVisibility: PanelVisibility) => void;
  sceneSettings: SceneSettings;
  setSceneSettings: (sceneSettings: SceneSettings) => void;
  storyBoardSettings: StoryBoardSettings;
  setStoryBoardSettings: (storyBoardSettings: StoryBoardSettings) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  panelVisibility: {
    storyBoard: false,
    inspector: false,
  },
  setPanelVisibility: (panelVisibility: PanelVisibility) =>
    set((state) => ({
      panelVisibility: {
        ...state.panelVisibility,
        ...panelVisibility,
      },
    })),
  sceneSettings: {
    transformGizmoMode: "position",
    newPrimitiveMeshType: "box",
    currentBoardIndex: 0,
    selectedItemID: null,
  },
  setSceneSettings: (sceneSettings: SceneSettings) =>
    set((state) => ({
      sceneSettings: {
        ...state.sceneSettings,
        ...sceneSettings,
      },
    })),
  storyBoardSettings: {
    // Each board corresponds to a keyframe
    boards: [{}],
  },
  setStoryBoardSettings: (storyBoardSettings: StoryBoardSettings) =>
    set((state) => ({
      storyBoardSettings: {
        ...state.storyBoardSettings,
        ...storyBoardSettings,
      },
    })),
}));

export default function VideoMakerEditorShell({
  children,
  videoMaker,
  resizeRenderCanvas,
  loaded,
}: {
  children: ReactNode;
  videoMaker: IVideoMaker | null;
  resizeRenderCanvas: () => void;
  loaded: boolean;
}) {
  const panelVisibility = useEditorStore<PanelVisibility>(
    (state) => state.panelVisibility
  );
  const sceneSettings = useEditorStore<SceneSettings>(
    (state) => state.sceneSettings
  );

  // Call app's scene settings setter when scene settings change
  useEffect(() => {
    if (videoMaker) {
      videoMaker.setSceneSettings(sceneSettings);
    }
  }, [videoMaker, sceneSettings]);

  // Resize render canvas when panel visibility changes
  useEffect(() => {
    setTimeout(resizeRenderCanvas, 100); // Delay to allow DOM to update
  }, [panelVisibility, resizeRenderCanvas]);

  return (
    <>
      {loaded ? null : (
        <div className="fixed left-0 top-0 h-screen w-screen flex justify-center items-center p-1">
          <p className="text-3xl font-bold">Loading...</p>
        </div>
      )}
      <div
        className="overflow-hidden h-screen w-screen m-0 flex-col px-1 gap-1"
        style={{
          display: loaded ? "flex" : "none",
        }}
      >
        {videoMaker ? <TopMenu videoMaker={videoMaker} /> : null}
        {/* PANELS */}
        <ResizablePanelGroup direction="horizontal">
          {videoMaker && panelVisibility.storyBoard ? (
            <>
              <ResizablePanel defaultSize={16} id="storyBoard" order={0}>
                <div className="h-full">
                  <StoryBoardPanel />
                </div>
              </ResizablePanel>
              <ResizableHandle
                className="w-1.5 bg-background"
                onDragging={resizeRenderCanvas}
              />
            </>
          ) : null}
          <ResizablePanel defaultSize={64} id="renderCanvas" order={1}>
            <div className="h-full relative">
              <EditorOverlayToolbar />
              {children}
            </div>
          </ResizablePanel>
          {videoMaker && panelVisibility.inspector ? (
            <>
              <ResizableHandle
                className="w-1.5 bg-background"
                onDragging={resizeRenderCanvas}
              />
              <ResizablePanel defaultSize={20} id="inspector" order={2}>
                <div className="h-full">
                  <InspectorPanel videoMaker={videoMaker} />
                </div>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
        <BottomMenu />
      </div>
    </>
  );
}
