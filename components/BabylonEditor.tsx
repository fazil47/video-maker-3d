"use client";

import { useEffect, useRef, useState } from "react";
import {
  Color3,
  Engine,
  Mesh,
  Node,
  PBRMaterial,
  Scene,
  StandardMaterial,
  Texture,
  WebGPUEngine,
} from "@babylonjs/core";
import { create } from "zustand";

import BabylonApp, {
  PrimitiveMeshType,
  SceneSettings,
  TransformGizmoMode,
} from "@/babylon/BabylonApp";

interface EditorState {
  panelVisibility: {
    storyBoard: boolean;
    inspector: boolean;
  };
  sceneSettings: SceneSettings;
  storyBoardSettings: {
    currentBoardIndex: number;
    boards: {}[];
  };
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
  storyBoardSettings: {
    currentBoardIndex: 0,
    boards: [],
  },
}));

export default function BabylonEditor() {
  const renderCanvas = useRef<HTMLCanvasElement>(null);

  const [app, setApp] = useState<BabylonApp | null>(null);
  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedObject, setSelectedObject] = useState<Node | Mesh | null>();

  const panelVisibility = useEditorStore((state) => state.panelVisibility);
  const sceneSettings = useEditorStore((state) => state.sceneSettings);
  const storyBoardSettings = useEditorStore(
    (state) => state.storyBoardSettings
  );

  const onSceneSettingsChangedCallback = (sceneSettings: SceneSettings) => {
    useEditorStore.setState((state) => ({
      sceneSettings: {
        ...state.sceneSettings,
        ...sceneSettings,
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
      const app = new BabylonApp(
        renderCanvas.current,
        (engine, scene) => {
          setEngine(engine);
          setScene(scene);
          setLoaded(true);
        },
        onSceneSettingsChangedCallback,
        (obj) => setSelectedObject(obj)
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
        {/* MENUBAR */}
        <menu className="w-full h-[35px] rounded-md rounded-t-none flex flex-row gap-4 p-1 justify-start items-center align-middle bg-gray-100 dark:bg-[#242424]">
          <button
            className="p-1"
            onClick={() => {
              alert("Not implemented yet");
            }}
          >
            File
          </button>
          <button
            className="p-1"
            onClick={() => {
              app?.saveScene();
            }}
          >
            Save
          </button>
          <button
            className="p-1"
            onClick={() => {
              app?.loadScene();
            }}
          >
            Load
          </button>
          <button
            className="p-1"
            onClick={() => {
              alert("Not implemented yet");
            }}
          >
            Edit
          </button>
          <button
            className="p-1"
            onClick={() => {
              alert("Not implemented yet");
            }}
          >
            View
          </button>
          <button
            className="p-1"
            onClick={() => {
              alert("Not implemented yet");
            }}
          >
            Help
          </button>
        </menu>
        {/* PANELS */}
        <div className="overflow-hidden w-full flex-grow flex flex-row gap-1 justify-center items-center align-middle">
          {panelVisibility.storyBoard ? (
            <div className="h-full overflow-hidden min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#242424]">
              <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
                Story Board
              </div>
              <div className="flex flex-col gap-3 overflow-y-scroll w-full h-full items-center p-1 pb-3">
                {storyBoardSettings.boards.map((board, index) => (
                  <div
                    key={index}
                    className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-gray-200 dark:bg-[#2c2c2c] rounded-md"
                    onClick={() => {
                      useEditorStore.setState((state) => ({
                        storyBoardSettings: {
                          ...state.storyBoardSettings,
                          currentBoardIndex: index,
                        },
                      }));
                    }}
                  >
                    {index}
                  </div>
                ))}
                <div
                  className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-gray-200 dark:bg-[#2c2c2c] rounded-md"
                  onClick={() => {
                    useEditorStore.setState((state) => ({
                      storyBoardSettings: {
                        ...state.storyBoardSettings,
                        boards: [...state.storyBoardSettings.boards, {}],
                      },
                    }));
                  }}
                >
                  +
                </div>
              </div>
            </div>
          ) : null}
          <div className="h-full flex-grow rounded-md">
            <canvas
              ref={renderCanvas}
              className="rounded-md focus:outline-none"
            />
          </div>
          {panelVisibility.inspector ? (
            <div className="h-full overflow-hidden min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#242424]">
              <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
                Inspector
              </div>
              <div className="overflow-hidden flex-grow w-full flex flex-col items-center gap-2">
                <div className="overflow-y-auto overflow-x-hidden h-[50%] p-1 w-full flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#2c2c2c]">
                  <ul>
                    {app?.scene?.rootNodes.map((node, i) => {
                      return (
                        <li
                          key={i}
                          onClick={() => {
                            app.selectNode(node);
                          }}
                          className="cursor-pointer hover:bg-gray-300 hover:dark:bg-[#3a3a3a] rounded-md p-1"
                        >
                          {node.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="overflow-y-auto overflow-x-hidden h-[50%] p-1 w-full rounded-md rounded-t-none flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#2c2c2c]">
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
                  <div className="overflow-x-hidden p-1 w-full rounded-md flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#303030]">
                    {selectedObject && selectedObject instanceof Mesh ? (
                      selectedObject.material instanceof PBRMaterial ? (
                        <>
                          {/* TODO: These controls need to be converted into components with state */}
                          <div>
                            <label>Albedo Texture</label>
                            {selectedObject.material.albedoTexture ? (
                              <button
                                className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
                                onClick={() => {
                                  if (
                                    selectedObject.material instanceof
                                    PBRMaterial
                                  ) {
                                    app?.unoptimizeScene();
                                    selectedObject.material.unfreeze();
                                    selectedObject.material.albedoTexture =
                                      null;
                                    window.setTimeout(() => {
                                      app?.optimizeScene();
                                    }, 0);
                                  }
                                }}
                              >
                                Remove Albedo Texture
                              </button>
                            ) : (
                              <button
                                className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
                                onClick={() => {
                                  const fileInput =
                                    document.createElement("input");
                                  fileInput.type = "file";
                                  fileInput.accept = "image/*";
                                  fileInput.onchange = (ev) => {
                                    if (
                                      ev.target &&
                                      ev.target instanceof HTMLInputElement &&
                                      ev.target.files
                                    ) {
                                      const file = ev.target.files[0];

                                      if (
                                        file &&
                                        selectedObject.material instanceof
                                          PBRMaterial
                                      ) {
                                        const fileURL =
                                          URL.createObjectURL(file);
                                        app?.unoptimizeScene();
                                        selectedObject.material.unfreeze();
                                        selectedObject.material.albedoTexture =
                                          new Texture(fileURL, scene);
                                        window.setTimeout(() => {
                                          app?.optimizeScene();
                                        }, 0);
                                      }
                                    }
                                  };
                                  fileInput.click();
                                }}
                              >
                                Add Albedo Texture
                              </button>
                            )}
                          </div>
                          <div>
                            <label>Albedo Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.albedoColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.albedoColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Ambient Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.ambientColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.ambientColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Reflection Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.reflectionColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.reflectionColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Reflectivity Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.reflectivityColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.reflectivityColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Metallic</label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={
                                selectedObject.material.metallic
                                  ? selectedObject.material.metallic
                                  : 0
                              }
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.metallic = parseFloat(
                                    ev.target.value
                                  );
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Roughness</label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={
                                selectedObject.material.roughness
                                  ? selectedObject.material.roughness
                                  : 0
                              }
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.roughness =
                                    parseFloat(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Specular Intensity</label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={
                                selectedObject.material.specularIntensity
                                  ? selectedObject.material.specularIntensity
                                  : 0
                              }
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof PBRMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.specularIntensity =
                                    parseFloat(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                        </>
                      ) : selectedObject.material instanceof
                        StandardMaterial ? (
                        <>
                          {/* TODO: These controls need to be converted into components with state */}
                          <div>
                            <label>Diffuse Texture</label>
                            {selectedObject.material.diffuseTexture ? (
                              <button
                                className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
                                onClick={() => {
                                  if (
                                    selectedObject.material instanceof
                                    StandardMaterial
                                  ) {
                                    app?.unoptimizeScene();
                                    selectedObject.material.unfreeze();
                                    selectedObject.material.diffuseTexture =
                                      null;
                                    window.setTimeout(() => {
                                      app?.optimizeScene();
                                    }, 0);
                                  }
                                }}
                              >
                                Remove Diffuse Texture
                              </button>
                            ) : (
                              <button
                                className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
                                onClick={() => {
                                  const fileInput =
                                    document.createElement("input");
                                  fileInput.type = "file";
                                  fileInput.accept = "image/*";
                                  fileInput.onchange = (ev) => {
                                    if (
                                      ev.target &&
                                      ev.target instanceof HTMLInputElement &&
                                      ev.target.files
                                    ) {
                                      const file = ev.target.files[0];

                                      if (
                                        file &&
                                        selectedObject.material instanceof
                                          StandardMaterial
                                      ) {
                                        const fileURL =
                                          URL.createObjectURL(file);
                                        app?.unoptimizeScene();
                                        selectedObject.material.unfreeze();
                                        selectedObject.material.diffuseTexture =
                                          new Texture(fileURL, scene);
                                        window.setTimeout(() => {
                                          app?.optimizeScene();
                                        }, 0);
                                      }
                                    }
                                  };
                                  fileInput.click();
                                }}
                              >
                                Add Diffuse Texture
                              </button>
                            )}
                          </div>
                          <div>
                            <label>Diffuse Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.diffuseColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof
                                  StandardMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.diffuseColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Ambient Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.ambientColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof
                                  StandardMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.ambientColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Specular Color</label>
                            <input
                              type="color"
                              value={selectedObject.material.specularColor.toHexString()}
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof
                                  StandardMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.specularColor =
                                    Color3.FromHexString(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label>Specular Power</label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={
                                selectedObject.material.specularPower
                                  ? selectedObject.material.specularPower
                                  : 0
                              }
                              onChange={(ev) => {
                                if (
                                  selectedObject.material instanceof
                                  StandardMaterial
                                ) {
                                  app?.unoptimizeScene();
                                  selectedObject.material.unfreeze();
                                  selectedObject.material.specularPower =
                                    parseFloat(ev.target.value);
                                  window.setTimeout(() => {
                                    app?.optimizeScene();
                                  }, 0);
                                }
                              }}
                            />
                          </div>
                        </>
                      ) : null
                    ) : null}
                  </div>
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
                      app?.deleteSelectedNode();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {/* BOTTOM BAR */}
        <div className="w-full h-[40px] rounded-md rounded-b-none flex flex-row gap-4 p-1 items-center align-middle bg-gray-100 dark:bg-[#242424]">
          <button
            onClick={(_ev) => {
              useEditorStore.setState((state) => ({
                panelVisibility: {
                  ...state.panelVisibility,
                  storyBoard: !state.panelVisibility.storyBoard,
                },
              }));
            }}
            className={`py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md ${
              panelVisibility.storyBoard ? "bg-gray-200 dark:bg-[#303030]" : ""
            }`}
          >
            Board
          </button>
          <button
            onClick={() => {
              alert("Not implemented yet");
            }}
            className="py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md"
          >
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
