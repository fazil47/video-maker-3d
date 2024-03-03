import type { StandardMaterial } from "@babylonjs/core";
import { useState } from "react";
import type BabylonApp from "~/babylon/BabylonApp.client";

export default function SpecularPowerControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: StandardMaterial;
}) {
  const [specularPower, setSpecularPower] = useState<number>(
    selectedMeshMaterial.specularPower ? selectedMeshMaterial.specularPower : 0
  );

  return (
    <div>
      <label>Specular Power</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={specularPower}
        onChange={(ev) => {
          selectedMeshMaterial.specularPower = parseFloat(ev.target.value);
          setSpecularPower(selectedMeshMaterial.specularPower);
        }}
      />
    </div>
  );
}
