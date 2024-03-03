import type { PBRMaterial } from "@babylonjs/core";
import { useState } from "react";
import type BabylonApp from "~/babylon/BabylonApp.client";

export default function SpecularIntensityControl({
  app,
  selectedMeshMaterial,
}: {
  app: BabylonApp;
  selectedMeshMaterial: PBRMaterial;
}) {
  const [specularIntensity, setSpecularIntensity] = useState<number>(
    selectedMeshMaterial.specularIntensity
      ? selectedMeshMaterial.specularIntensity
      : 0
  );

  return (
    <div>
      <label>Specular Intensity</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={specularIntensity}
        onChange={(ev) => {
          selectedMeshMaterial.specularIntensity = parseFloat(ev.target.value);
          setSpecularIntensity(selectedMeshMaterial.specularIntensity);
        }}
      />
    </div>
  );
}
