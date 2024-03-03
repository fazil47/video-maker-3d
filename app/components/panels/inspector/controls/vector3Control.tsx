import { useState } from "react";
import {
  IVideoMaker,
  Vector3Property,
  Inspectable,
} from "~/videoMaker/interface";

export default function Vector3Control({
  videoMaker,
  selectable,
  vector3Property,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  vector3Property: Vector3Property;
}) {
  const [vector, setVector] = useState<[number, number, number]>(
    vector3Property.value
  );

  return (
    <div>
      <label>{vector3Property.key}</label>
      <label>
        X:
        <input
          type="number"
          value={vector[0]}
          step={0.1}
          onChange={(ev) => {
            const newVector: [number, number, number] = [
              ev.target.valueAsNumber,
              vector[1],
              vector[2],
            ];
            videoMaker.setInspectableProperty(selectable, {
              key: vector3Property.key,
              value: newVector,
            });
            setVector(newVector);
          }}
        />
      </label>
      <label>
        Y:
        <input
          type="number"
          value={vector[1]}
          step={0.1}
          onChange={(ev) => {
            const newVector: [number, number, number] = [
              vector[0],
              ev.target.valueAsNumber,
              vector[2],
            ];
            videoMaker.setInspectableProperty(selectable, {
              key: vector3Property.key,
              value: newVector,
            });
            setVector(newVector);
          }}
        />
      </label>
      <label>
        Z:
        <input
          type="number"
          value={vector[2]}
          step={0.1}
          onChange={(ev) => {
            const newVector: [number, number, number] = [
              vector[0],
              vector[1],
              ev.target.valueAsNumber,
            ];
            videoMaker.setInspectableProperty(selectable, {
              key: vector3Property.key,
              value: newVector,
            });
            setVector(newVector);
          }}
        />
      </label>
    </div>
  );
}
