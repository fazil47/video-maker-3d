import type { BaseTexture, Nullable, PBRMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Texture } from "@babylonjs/core";
import { useState } from "react";

export default function AlbedoTextureControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: PBRMaterial;
}) {
  const [albedoTexture, setAlbedoTexture] = useState<Nullable<BaseTexture>>(
    selectedMeshMaterial.albedoTexture
  );

  return (
    <div>
      <label>Albedo Texture</label>
      {albedoTexture ? (
        <button
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
          onClick={() => {
            selectedMeshMaterial.albedoTexture = null;
            setAlbedoTexture(null);
          }}
        >
          Remove Albedo Texture
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

                if (file && app?.scene) {
                  const fileURL = URL.createObjectURL(file);
                  selectedMeshMaterial.albedoTexture = new Texture(
                    fileURL,
                    app.scene
                  );
                  setAlbedoTexture(selectedMeshMaterial.albedoTexture);
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
  );
}
