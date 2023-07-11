"use client";

import { useEffect, useRef, useState } from "react";

import BabylonApp from "@/babylon/app";
import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";

export default function BabylonEditor() {
  const renderCanvas = useRef<HTMLCanvasElement>(null);
  const hierarchy = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLDivElement>(null);

  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window) {
      const resize = () => {
        if (renderCanvas.current) {
          // Calculate dimensions of parent container by subtracting padding from client dimensions
          const parentContainer = renderCanvas.current.parentElement;

          if (!parentContainer) {
            return;
          }

          const height =
            parentContainer.clientHeight -
            parseFloat(window.getComputedStyle(parentContainer).paddingTop) -
            parseFloat(window.getComputedStyle(parentContainer).paddingBottom);
          renderCanvas.current.height = height;

          const parentWidth =
            parentContainer.clientWidth -
            parseFloat(window.getComputedStyle(parentContainer).paddingLeft) -
            parseFloat(window.getComputedStyle(parentContainer).paddingRight);

          let siblingWidth = 0;
          if (hierarchy.current) {
            hierarchy.current.style.height = `${height}px`;
            siblingWidth += hierarchy.current.clientWidth;
          }

          if (inspector.current) {
            inspector.current.style.height = `${height}px`;
            siblingWidth += inspector.current.clientWidth;
          }

          renderCanvas.current.width = parentWidth - siblingWidth;
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
        <div className="fixed left-0 top-0 h-screen w-screen flex justify-center items-center p-2">
          <p className="text-3xl font-bold">Loading...</p>
        </div>
      )}
      <div
        className="h-screen w-screen m-0 p-2 flex-row justify-center items-center gap-1"
        style={{
          display: loaded ? "flex" : "none",
        }}
      >
        {/* <div ref={hierarchy} className="p-2 flex flex-col items-center rounded-md bg-gray-200 dark:bg-black">
          <p className="text-3xl font-bold">Scene Hierarchy</p>
        </div> */}
        <canvas
          ref={renderCanvas}
          className="h-full rounded-md focus:outline-none flex-grow"
        />
        {/* TODO: Move this to a separate component */}
        <div
          ref={inspector}
          className="p-2 h-full min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-black"
        >
          <div className="p-2 w-full text-center text-2xl font-bold border-b-2 border-[#242424] dark:border-gray-700">
            Inspector
          </div>
        </div>
      </div>
    </>
  );
}
