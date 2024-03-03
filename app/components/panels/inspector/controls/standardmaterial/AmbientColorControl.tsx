import type { StandardMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function AmbientColorControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: StandardMaterial;
}) {
  const [ambientColor, setAmbientColor] = useState<string>(
    selectedMeshMaterial.ambientColor.toHexString()
  );

  return (
    <div>
      <label>Ambient Color</label>
      <input
        type="color"
        value={ambientColor}
        onChange={(ev) => {
          selectedMeshMaterial.ambientColor = Color3.FromHexString(
            ev.target.value
          );
          setAmbientColor(ev.target.value);
        }}
      />
    </div>
  );
}
