import { useEffect, useState } from "react";
import {
  IVideoMaker,
  NumberProperty,
  Inspectable,
} from "~/videoMaker/interface";

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

  useEffect(() => {
    setNumber(numberProperty.value);
  }, [numberProperty.value]);

  return (
    <div>
      <label>{numberProperty.key}</label>
      <input
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
