import type {
  IVideoMaker,
  Vector3Property,
  Inspectable,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { Input } from "shadcn/components/ui/input";
import { Label } from "shadcn/components/ui/label";
import { capitalizeFirstLetter } from "~/utils";

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
  const [idSuffix] = useState(Math.random().toString(36).substring(7));
  const id = `boolean-${vector3Property.key}-${idSuffix}`;

  useEffect(() => {
    setVector(vector3Property.value);
  }, [vector3Property.value]);

  return (
    <div className="p-2 flex flex-col gap-2">
      <Label htmlFor={id}>{capitalizeFirstLetter(vector3Property.key)}</Label>
      <div id={id} className="w-full flex flex-col">
        <div className="w-full flex flex-row justify-center align-middle items-center">
          <Label
            className="h-10 flex flex-col justify-center align-middle items-center rounded-tl-md py-1 px-2 border border-input font-mono bg-background text-foreground"
            htmlFor={`${id}-x`}
          >
            X
          </Label>
          <Input
            id={`${id}-x`}
            type="number"
            className="rounded-b-none rounded-l-none"
            placeholder="X"
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
        </div>
        <div className="w-full flex flex-row justify-center align-middle items-center">
          <Label
            className="h-10 flex flex-col justify-center align-middle items-center py-1 px-2 border border-input font-mono bg-background text-foreground"
            htmlFor={`${id}-y`}
          >
            Y
          </Label>
          <Input
            id={`${id}-y`}
            type="number"
            className="rounded-none"
            placeholder="Y"
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
        </div>
        <div className="w-full flex flex-row justify-center align-middle items-center">
          <Label
            className="h-10 flex flex-col justify-center align-middle items-center rounded-bl-md py-1 px-2 border border-input font-mono bg-background text-foreground"
            htmlFor={`${id}-z`}
          >
            Z
          </Label>
          <Input
            id={`${id}-z`}
            type="number"
            className="rounded-t-none rounded-l-none"
            placeholder="Z"
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
        </div>
      </div>
    </div>
  );
}
