import type { PBRMaterial } from "@babylonjs/core";
import type BabylonApp from "~/babylon/BabylonApp.client";
import { Color3 } from "@babylonjs/core";
import { useState } from "react";

export default function ReflectionColorControl({
  selectedMeshMaterial,
  app,
}: {
  selectedMeshMaterial: PBRMaterial;
  app: BabylonApp;
}) {
  const [reflectionColor, setReflectionColor] = useState<string>(
    selectedMeshMaterial.reflectionColor.toHexString()
  );

  return (
    <div>
      <label>Reflection Color</label>
      <input
        type="color"
        value={reflectionColor}
        onChange={(ev) => {
          selectedMeshMaterial.reflectionColor = Color3.FromHexString(
            ev.target.value
          );
          setReflectionColor(ev.target.value);
        }}
      />
    </div>
  );
}
