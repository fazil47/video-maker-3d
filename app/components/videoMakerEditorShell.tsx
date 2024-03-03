import type { IVideoMaker, SceneSettings } from "~/videoMaker/interface";

import { ReactNode, useEffect } from "react";
import { create } from "zustand";

import TopMenu from "./menus/topMenu";
import StoryBoardPanel from "./panels/storyboard/storyBoardPanel";
import InspectorPanel from "./panels/inspector/inspectorPanel";
import BottomMenu from "./menus/bottomMenu";

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
    resizeRenderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelVisibility]);

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
        <div className="overflow-hidden w-full flex-grow flex flex-row gap-1 justify-center items-center align-middle">
          {videoMaker && panelVisibility.storyBoard ? (
            <StoryBoardPanel videoMaker={videoMaker} />
          ) : null}
          <div className="h-full flex-grow rounded-md">{children}</div>
          {videoMaker && panelVisibility.inspector ? (
            <InspectorPanel videoMaker={videoMaker} />
          ) : null}
        </div>
        <BottomMenu />
      </div>
    </>
  );
}
