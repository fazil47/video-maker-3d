import { useState } from "react";
import {
  IVideoMaker,
  ColourProperty,
  Inspectable,
} from "~/videoMaker/interface";

export default function ColorControl({
  label,
  videoMaker,
  selectable,
  colorProperty,
}: {
  label: string;
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  colorProperty: ColourProperty;
}) {
  const [color, setColor] = useState<string | null>(colorProperty.value);

  return (
    <div>
      <label>{label}</label>
      <input
        type="color"
        value={color || "#000000"}
        onChange={(ev) => {
          videoMaker.setInspectableProperty(selectable, {
            key: colorProperty.key,
            value: ev.target.value,
            isColorProperty: true,
          });
          setColor(ev.target.value);
        }}
      />
    </div>
  );
}
