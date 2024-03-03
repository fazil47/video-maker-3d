import type { StandardMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function DiffuseColorControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: StandardMaterial;
}) {
  const [diffuseColor, setDiffuseColor] = useState<string>(
    selectedMeshMaterial.diffuseColor.toHexString()
  );

  return (
    <div>
      <label>Diffuse Color</label>
      <input
        type="color"
        value={diffuseColor}
        onChange={(ev) => {
          setDiffuseColor(ev.target.value);
          selectedMeshMaterial.diffuseColor = Color3.FromHexString(
            ev.target.value
          );
        }}
      />
    </div>
  );
}
