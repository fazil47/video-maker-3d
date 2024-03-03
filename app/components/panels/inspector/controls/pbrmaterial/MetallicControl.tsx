import type { PBRMaterial } from "@babylonjs/core";
import { useState } from "react";
import type BabylonApp from "~/babylon/BabylonApp.client";

export default function MetallicControl({
  selectedMeshMaterial,
  app,
}: {
  selectedMeshMaterial: PBRMaterial;
  app: BabylonApp;
}) {
  const [metallic, setMetallic] = useState<number>(
    selectedMeshMaterial.metallic ? selectedMeshMaterial.metallic : 0
  );

  return (
    <div>
      <label>Metallic</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={metallic}
        onChange={(ev) => {
          selectedMeshMaterial.metallic = parseFloat(ev.target.value);
          setMetallic(selectedMeshMaterial.metallic);
        }}
      />
    </div>
  );
}
