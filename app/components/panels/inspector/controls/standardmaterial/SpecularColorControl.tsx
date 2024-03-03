import type { StandardMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function SpecularColorControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: StandardMaterial;
}) {
  const [specularColor, setSpecularColor] = useState<string>(
    selectedMeshMaterial.specularColor.toHexString()
  );

  return (
    <div>
      <label>Specular Color</label>
      <input
        type="color"
        value={specularColor}
        onChange={(ev) => {
          setSpecularColor(ev.target.value);
          selectedMeshMaterial.specularColor = Color3.FromHexString(
            ev.target.value
          );
        }}
      />
    </div>
  );
}
