import type {
  IVideoMaker,
  NumberProperty,
  Inspectable,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { Input } from "shadcn/components/ui/input";
import { Label } from "shadcn/components/ui/label";
import { isNumberSliderProperty } from "~/videoMaker/interface";
import { capitalizeFirstLetter } from "~/utils";

export default function NumberControl({
  videoMaker,
  selectable,
  numberProperty,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  numberProperty: NumberProperty;
}) {
  const [number, setNumber] = useState<number | null>(numberProperty.value);
  const [idSuffix] = useState(Math.random().toString(36).substring(7));
  const id = `boolean-${numberProperty.key}-${idSuffix}`;

  useEffect(() => {
    setNumber(numberProperty.value);
  }, [numberProperty.value]);

  return isNumberSliderProperty(numberProperty) ? (
    <div className="p-2 flex flex-col gap-1">
      <Label htmlFor={id}>{capitalizeFirstLetter(numberProperty.key)}</Label>
      <Input
        id={id}
        type="range"
        min={numberProperty.from}
        max={numberProperty.to}
        value={number || 0}
        step={0.1}
        onChange={(ev) => {
          videoMaker.setInspectableProperty(selectable, {
            key: numberProperty.key,
            value: ev.target.valueAsNumber,
          });
          setNumber(ev.target.valueAsNumber);
        }}
      />
    </div>
  ) : (
    <div className="p-2 flex flex-col gap-1">
      <label>{capitalizeFirstLetter(numberProperty.key)}</label>
      <Input
        type="number"
        value={number || 0}
        step={0.1}
        onChange={(ev) => {
          videoMaker.setInspectableProperty(selectable, {
            key: numberProperty.key,
            value: ev.target.valueAsNumber,
          });
          setNumber(ev.target.valueAsNumber);
        }}
      />
    </div>
  );
}
