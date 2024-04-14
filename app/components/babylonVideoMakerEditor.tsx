import type { Engine, Scene, WebGPUEngine } from "@babylonjs/core";

import type { SceneSettings } from "~/videoMaker/interface";
import type { StoryBoardSettings } from "./videoMakerEditorShell";

import { useEffect, useRef, useState } from "react";

import BabylonVideoMaker from "~/videoMaker/babylon/babylonVideoMaker.client";
import VideoMakerEditorShell, { useEditorStore } from "./videoMakerEditorShell";

export default function BabylonVideoMakerEditor({
  useWebGPU = false,
}: {
  useWebGPU: boolean;
}) {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

  const [babylonVideoMaker, setApp] = useState<BabylonVideoMaker | null>(null);
  const [engine, setEngine] = useState<WebGPUEngine | Engine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);

  const setSceneSettings = useEditorStore<
    (sceneSettings: SceneSettings) => void
  >((state) => state.setSceneSettings);
  const setStoryBoardSettings = useEditorStore<
    (storyBoardSettings: StoryBoardSettings) => void
  >((state) => state.setStoryBoardSettings);

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

    if (babylonVideoMaker?.engine) {
      babylonVideoMaker.engine.resize(true);
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

  // Resize on RMB click because Safari shows a banner when RMB is held
  useEffect(() => {
    const resizeRenderCanvasOnRMB = (evt: PointerEvent) => {
      if (evt.button === 2) {
        resizeRenderCanvas();
      }
    };
    if (window) {
      window.addEventListener("pointerdown", resizeRenderCanvasOnRMB);
      window.addEventListener("pointerup", resizeRenderCanvasOnRMB);
      return () => {
        window.removeEventListener("pointerdown", resizeRenderCanvasOnRMB);
        window.removeEventListener("pointerup", resizeRenderCanvasOnRMB);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Babylon app
  useEffect(() => {
    if (renderCanvas.current && !engine && !scene) {
      const app = new BabylonVideoMaker(
        useWebGPU,
        renderCanvas.current,
        () => {
          setLoaded(true);
          // For some reason when I directly use app.engine and app.scene in the
          // dependency array of this useEffect, it doesn't work
          setEngine(app.engine);
          setScene(app.scene);
        },
        (sceneSettings: SceneSettings | null) => {
          if (sceneSettings) {
            setSceneSettings(sceneSettings);
          }
        },
        (keyframes: number[]) => {
          setStoryBoardSettings({ boards: Array(keyframes.length).fill({}) });
        }
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
  }, [
    renderCanvas,
    engine,
    scene,
    useWebGPU,
    setSceneSettings,
    setStoryBoardSettings,
  ]);

  return (
    <VideoMakerEditorShell
      videoMaker={babylonVideoMaker}
      resizeRenderCanvas={resizeRenderCanvas}
      loaded={loaded}
    >
      <canvas ref={renderCanvas} className="rounded-md focus:outline-none" />
    </VideoMakerEditorShell>
  );
}
