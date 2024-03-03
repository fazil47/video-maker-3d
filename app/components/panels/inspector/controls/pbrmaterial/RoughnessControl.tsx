import type { PBRMaterial } from "@babylonjs/core";
import { useState } from "react";
import type BabylonApp from "~/babylon/BabylonApp.client";

export default function RoughnessControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: PBRMaterial;
}) {
  const [roughness, setRoughness] = useState<number>(
    selectedMeshMaterial.roughness ? selectedMeshMaterial.roughness : 0
  );

  return (
    <div>
      <label>Roughness</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={roughness}
        onChange={(ev) => {
          selectedMeshMaterial.roughness = parseFloat(ev.target.value);
          setRoughness(selectedMeshMaterial.roughness);
        }}
      />
    </div>
  );
}
