import { useEffect, useState } from "react";
import {
  IVideoMaker,
  NumberProperty,
  Inspectable,
} from "~/videoMaker/interface";

export default function NumberSliderControl({
  videoMaker,
  selectable,
  numberProperty,
  from,
  to,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  numberProperty: NumberProperty;
  from: number;
  to: number;
}) {
  const [number, setNumber] = useState<number | null>(numberProperty.value);

  useEffect(() => {
    setNumber(numberProperty.value);
  }, [numberProperty.value]);

  return (
    <div>
      <label>{numberProperty.key}</label>
      <input
        type="range"
        min={from}
        max={to}
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
