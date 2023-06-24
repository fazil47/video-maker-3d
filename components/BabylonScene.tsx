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
        if (engine) {
          engine.resize();
        }
      };
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }
  }, [engine]);

  useEffect(() => {
    if (renderCanvas.current) {
      const app = new BabylonApp(renderCanvas.current, (engine, scene) => {
        setEngine(engine);
        setScene(scene);
        setLoaded(true);
      });
    }
  }, [renderCanvas]);

  return (
    <>
      {loaded ? null : (
        <div className="flex flex-col w-full flex-grow items-center justify-center p-4">
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
