import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

import type { SceneSettings } from "~/babylon/BabylonApp.client";
import BabylonApp from "~/babylon/BabylonApp.client";
import BottomMenu from "~/components/menus/BottomMenu";
import InspectorPanel from "~/components/panels/inspector/InspectorPanel";
import StoryBoardPanel from "~/components/panels/storyboard/StoryBoardPanel";
import TopMenu from "~/components/menus/TopMenu";
import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";

export type PanelVisibility = {
  storyBoard: boolean;
  inspector: boolean;
};
export type StoryBoardSettings = {
  boards: {}[];
};

interface EditorState {
  panelVisibility: PanelVisibility;
  sceneSettings: SceneSettings;
  storyBoardSettings: StoryBoardSettings;
}

export const useEditorStore = create<EditorState>((_) => ({
  panelVisibility: {
    storyBoard: false,
    inspector: false,
  },
  sceneSettings: {
    transformGizmoMode: "position",
    newPrimitiveMeshType: "box",
    currentBoardIndex: 0,
    selectedItemID: null,
  },
  storyBoardSettings: {
    // Each board corresponds to a keyframe
    boards: [{}],
  },
}));

export default function BabylonEditor({ useWebGPU = false }) {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

  const [app, setApp] = useState<BabylonApp | null>(null);
  const [engine, setEngine] = useState<WebGPUEngine | Engine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);

  const panelVisibility = useEditorStore<PanelVisibility>(
    (state) => state.panelVisibility
  );
  const sceneSettings = useEditorStore<SceneSettings>(
    (state) => state.sceneSettings
  );

  const onSceneSettingsChangedCallback = (sceneSettings: SceneSettings) => {
    useEditorStore.setState((state) => ({
      sceneSettings: {
        ...state.sceneSettings,
        ...sceneSettings,
      },
    }));
  };

  const onKeyframesChangedCallback = (keyframes: {}[]) => {
    useEditorStore.setState((state) => ({
      storyBoardSettings: {
        ...state.storyBoardSettings,
        boards: keyframes,
      },
    }));
  };

  // Resize render canvas to fit parent container
  const resizeRenderCanvas = () => {
    if (renderCanvas.current) {
      // Set canvas dimensions to the dimensions of the parent container
      const parentContainer = renderCanvas.current.parentElement;
      // Set renderCanvas position to fixed so it doesn't affect the parent container's dimensions
      renderCanvas.current.style.position = "fixed";
      if (parentContainer) {
        renderCanvas.current.height = parentContainer.clientHeight;
        renderCanvas.current.width = parentContainer.clientWidth;
      }
      // Set renderCanvas position back to relative so it can be positioned correctly
      renderCanvas.current.style.position = "relative";
    }

    if (app?.engine) {
      app.engine.resize(true);
    }
  };

  // Resize render canvas when window is resized
  useEffect(() => {
    if (window) {
      resizeRenderCanvas();
      window.addEventListener("resize", resizeRenderCanvas);

      return () => {
        window.removeEventListener("resize", resizeRenderCanvas);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // Call app's scene settings setter when scene settings change
  useEffect(() => {
    if (app) {
      app.setSceneSettings(sceneSettings);
    }
  }, [app, sceneSettings]);

  // Resize render canvas when panel visibility changes
  useEffect(() => {
    resizeRenderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelVisibility]);

  // Initialize Babylon app
  useEffect(() => {
    // renderCanvas.current && (!engine && !scene) or
    // renderCanvas.current && (!engine || !scene) ?
    if (renderCanvas.current && !engine && !scene) {
      const app = new BabylonApp(
        useWebGPU,
        renderCanvas.current,
        () => {
          setLoaded(true);
          // For some reason when I directly use app.engine and app.scene in the
          // dependency array of this useEffect, it doesn't work
          setEngine(app.engine);
          setScene(app.scene);
        },
        onSceneSettingsChangedCallback,
        onKeyframesChangedCallback
      );
      setApp(app);
    }

    return () => {
      if (scene) {
        scene.dispose();
      }
      if (engine) {
        engine.dispose();
      }
    };
  }, [renderCanvas, engine, scene]);

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
        {app ? <TopMenu app={app} /> : null}
        {/* PANELS */}
        <div className="overflow-hidden w-full flex-grow flex flex-row gap-1 justify-center items-center align-middle">
          {app && panelVisibility.storyBoard ? (
            <StoryBoardPanel app={app} />
          ) : null}
          <div className="h-full flex-grow rounded-md">
            <canvas
              ref={renderCanvas}
              className="rounded-md focus:outline-none"
            />
          </div>
          {app && panelVisibility.inspector ? (
            <InspectorPanel app={app} />
          ) : null}
        </div>
        <BottomMenu />
      </div>
    </>
  );
}
