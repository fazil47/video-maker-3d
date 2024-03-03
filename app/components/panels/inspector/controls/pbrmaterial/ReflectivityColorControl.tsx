import type { PBRMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function ReflectivityColorControl({
  selectedMeshMaterial,
  app,
}: {
  selectedMeshMaterial: PBRMaterial;
  app: BabylonApp;
}) {
  const [reflectivityColor, setReflectivityColor] = useState<string>(
    selectedMeshMaterial.reflectivityColor.toHexString()
  );

  return (
    <div>
      <label>Reflectivity Color</label>
      <input
        type="color"
        value={reflectivityColor}
        onChange={(ev) => {
          selectedMeshMaterial.reflectivityColor = Color3.FromHexString(
            ev.target.value
          );
          setReflectivityColor(ev.target.value);
        }}
      />
    </div>
  );
}
