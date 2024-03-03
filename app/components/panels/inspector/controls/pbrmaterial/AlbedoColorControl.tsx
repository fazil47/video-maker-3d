import type { PBRMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function AlbedoColorControl({
  selectedMeshMaterial,
  app,
}: {
  selectedMeshMaterial: PBRMaterial;
  app: BabylonApp;
}) {
  const [albedoColor, setAlbedoColor] = useState<string>(
    selectedMeshMaterial.albedoColor.toHexString()
  );

  return (
    <div>
      <label>Albedo Color</label>
      <input
        type="color"
        value={albedoColor}
        onChange={(ev) => {
          selectedMeshMaterial.albedoColor = Color3.FromHexString(
            ev.target.value
          );
          setAlbedoColor(ev.target.value);
        }}
      />
    </div>
  );
}
