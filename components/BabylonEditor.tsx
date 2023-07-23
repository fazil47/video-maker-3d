"use client";

import { useEffect, useRef, useState } from "react";

import BabylonApp from "@/babylon/app";
import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";

export default function BabylonEditor() {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window) {
      const resize = () => {
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

      resize();
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }
  }, [engine]);

  useEffect(() => {
    if (renderCanvas.current && !(engine && scene)) {
      const app = new BabylonApp(renderCanvas.current, (engine, scene) => {
        setEngine(engine);
        setScene(scene);
        setLoaded(true);
      });
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
        <menu className="w-full h-[35px] rounded-md rounded-t-none flex flex-row gap-4 p-1 justify-start items-center align-middle bg-gray-100 dark:bg-[#262626]">
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
          {/* TODO: Move this to a separate component */}
          <div className="p-1 h-full min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#262626]">
            <div className="p-1 w-full text-center text-2xl font-bold border-b-1 border-[#242424] dark:border-gray-700">
              Inspector
            </div>
          </div>
        </div>
        {/* BOTTOM BAR */}
        <div className="w-full h-[40px] rounded-md rounded-b-none flex flex-row gap-4 p-1 items-center align-middle bg-gray-100 dark:bg-[#262626]">
          <button className="p-1 h-[25px] flex flex-col justify-center align-middle items-center">
            Board
          </button>
          <button className="p-1 h-[25px] flex flex-col justify-center align-middle items-center">
            Files
          </button>
          <input
            type="text"
            className="p-1 h-[25px] flex-grow rounded-md bg-gray-200 dark:bg-[#303030] focus:outline-none"
            placeholder="Chat..."
          />
          <button className="p-1 h-[25px] flex flex-col justify-center align-middle items-center">
            Inspector
          </button>
        </div>
      </div>
    </>
  );
}
