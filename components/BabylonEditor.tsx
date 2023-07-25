"use client";

import { useEffect, useRef, useState } from "react";
import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";
import { create } from "zustand";

import BabylonApp, {
  PrimitiveMeshType,
  SceneSettings,
  TransformGizmoMode,
} from "@/babylon/app";

interface EditorState {
  panelVisibility: {
    storyBoard: boolean;
    inspector: boolean;
  };
  sceneSettings: SceneSettings;
}

const useEditorStore = create<EditorState>((set) => ({
  panelVisibility: {
    storyBoard: false,
    inspector: false,
  },
  sceneSettings: {
    transformGizmoMode: "position",
    newPrimitiveMeshType: "box",
  },
}));

export default function BabylonEditor() {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

  const [app, setApp] = useState<BabylonApp | null>(null);
  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);

  const panelVisibility = useEditorStore((state) => state.panelVisibility);
  const sceneSettings = useEditorStore((state) => state.sceneSettings);

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

    if (engine) {
      engine.resize(true);
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
    if (renderCanvas.current && !(engine && scene)) {
      const app = new BabylonApp(renderCanvas.current, (engine, scene) => {
        setEngine(engine);
        setScene(scene);
        setLoaded(true);
      });
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
        className="h-screen w-screen m-0 flex-col px-1 gap-1"
        style={{
          display: loaded ? "flex" : "none",
        }}
      >
        {/* MENUBAR */}
        <menu className="w-full h-[35px] rounded-md rounded-t-none flex flex-row gap-4 p-1 justify-start items-center align-middle bg-gray-100 dark:bg-[#242424]">
          <button className="p-1">File</button>
          <button className="p-1">Edit</button>
          <button className="p-1">View</button>
          <button className="p-1">Help</button>
        </menu>
        {/* PANELS */}
        <div className="w-full flex-grow flex flex-row gap-1 justify-center items-center align-middle">
          {/* <div className="p-2 flex flex-col items-center rounded-md bg-gray-200 dark:bg-black">
            <p className="text-3xl font-bold">Story Board</p>
          </div> */}
          <div className="h-full flex-grow rounded-md">
            <canvas
              ref={renderCanvas}
              className="rounded-md focus:outline-none"
            />
          </div>
          {panelVisibility.inspector ? (
            <div className="h-full min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#242424]">
              <div className="p-1 w-full text-center text-xl font-bold bg-gray-200 dark:bg-[#2c2c2c] rounded-md rounded-b-none">
                Inspector
              </div>
              <div className="p-1 w-full flex flex-col items-center align-middle gap-2">
                <select
                  value={sceneSettings.transformGizmoMode}
                  onChange={(ev) => {
                    useEditorStore.setState((state) => ({
                      sceneSettings: {
                        ...state.sceneSettings,
                        transformGizmoMode: ev.target
                          .value as TransformGizmoMode,
                      },
                    }));
                  }}
                  className="w-full rounded-md bg-gray-300 dark:bg-[#303030] focus:outline-none"
                >
                  <option value="position">Position</option>
                  <option value="rotation">Rotation</option>
                  <option value="scale">Scale</option>
                </select>
                <div className="p-1 w-full rounded-md flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#303030]">
                  <select
                    value={sceneSettings.newPrimitiveMeshType}
                    onChange={(ev) => {
                      useEditorStore.setState((state) => ({
                        sceneSettings: {
                          ...state.sceneSettings,
                          newPrimitiveMeshType: ev.target
                            .value as PrimitiveMeshType,
                        },
                      }));
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
                      app?.addPrimitiveMesh();
                    }}
                  >
                    Add Mesh
                  </button>
                </div>
                <button
                  className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
                  onClick={() => {
                    app?.importGLBMesh();
                  }}
                >
                  Import GLB Mesh
                </button>
                <button
                  className="w-full rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
                  onClick={() => {
                    app?.deleteSelectedMesh();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {/* BOTTOM BAR */}
        <div className="w-full h-[40px] rounded-md rounded-b-none flex flex-row gap-4 p-1 items-center align-middle bg-gray-100 dark:bg-[#242424]">
          <button className="py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md">
            Board
          </button>
          <button className="py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md">
            Files
          </button>
          <input
            type="text"
            className="p-1 h-[25px] flex-grow rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
            placeholder="Chat..."
          />
          <button
            onClick={(_ev) => {
              useEditorStore.setState((state) => ({
                panelVisibility: {
                  ...state.panelVisibility,
                  inspector: !state.panelVisibility.inspector,
                },
              }));
            }}
            className={`py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md ${
              panelVisibility.inspector ? "bg-gray-200 dark:bg-[#303030]" : ""
            }`}
          >
            Inspector
          </button>
        </div>
      </div>
    </>
  );
}
