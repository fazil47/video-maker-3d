"use client";

import { useEffect, useRef, useState } from "react";

import BabylonApp from "@/babylon/app";
import { Engine, Scene, WebGPUEngine } from "@babylonjs/core";

export default function BabylonScene() {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

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
          const width =
            parentContainer.clientWidth -
            parseFloat(window.getComputedStyle(parentContainer).paddingLeft) -
            parseFloat(window.getComputedStyle(parentContainer).paddingRight);

          renderCanvas.current.width = width;
          renderCanvas.current.height = height;
        }

        if (engine) {
          engine.resize();
        }
      };

      window.addEventListener("resize", resize);
      window.addEventListener("orientationchange", resize);
      window.addEventListener("fullscreenchange", resize);

      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("orientationchange", resize);
        window.removeEventListener("fullscreenchange", resize);
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
        <div className="fixed left-0 top-0 h-screen w-screen flex justify-center items-center p-4">
          <p className="text-3xl font-bold">Loading...</p>
        </div>
      )}
      <canvas
        ref={renderCanvas}
        className="w-full flex-grow rounded-md focus:outline-none"
        style={{
          visibility: loaded ? "visible" : "hidden",
        }}
      />
    </>
  );
}
