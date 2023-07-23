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
          // Set canvas dimensions to parent container dimensions
          const parentContainer = renderCanvas.current.parentElement;
          if (!parentContainer) {
            return;
          }
          renderCanvas.current.height = parentContainer.clientHeight;
          renderCanvas.current.width = parentContainer.clientWidth;
        }

        if (engine) {
          engine.resize();
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
        className="h-screen w-screen m-0 p-1 flex-row justify-center items-center gap-1"
        style={{
          display: loaded ? "flex" : "none",
        }}
      >
        {/* <div ref={hierarchy} className="p-2 flex flex-col items-center rounded-md bg-gray-200 dark:bg-black">
          <p className="text-3xl font-bold">Story Board</p>
        </div> */}
        <div className="h-full flex-grow rounded-md">
          <canvas
            ref={renderCanvas}
            className="rounded-md focus:outline-none"
          />
        </div>
        {/* TODO: Move this to a separate component */}
        <div className="p-1 h-full min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#282828]">
          <div className="p-1 w-full text-center text-2xl font-bold border-b-1 border-[#242424] dark:border-gray-700">
            Inspector
          </div>
        </div>
      </div>
    </>
  );
}
