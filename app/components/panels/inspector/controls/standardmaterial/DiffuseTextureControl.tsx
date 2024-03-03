import type { BaseTexture, Nullable, StandardMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Texture } from "@babylonjs/core";
import { useState } from "react";

export default function DiffuseTextureControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: StandardMaterial;
}) {
  const [diffuseTexture, setDiffuseTexture] = useState<Nullable<BaseTexture>>(
    selectedMeshMaterial.diffuseTexture
  );

  return (
    <div>
      <label>Diffuse Texture</label>
      {diffuseTexture ? (
        <button
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
          onClick={() => {
            selectedMeshMaterial.diffuseTexture = null;
            setDiffuseTexture(null);
          }}
        >
          Remove Diffuse Texture
        </button>
      ) : (
        <button
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
          onClick={() => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.onchange = (ev) => {
              if (
                ev.target &&
                ev.target instanceof HTMLInputElement &&
                ev.target.files
              ) {
                const file = ev.target.files[0];

                if (file && app.scene) {
                  const fileURL = URL.createObjectURL(file);
                  selectedMeshMaterial.diffuseTexture = new Texture(
                    fileURL,
                    app.scene
                  );
                  setDiffuseTexture(selectedMeshMaterial.diffuseTexture);
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
  );
}
