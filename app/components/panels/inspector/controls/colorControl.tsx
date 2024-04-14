import type {
  IVideoMaker,
  ColourProperty,
  Inspectable,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { Input } from "shadcn/components/ui/input";
import { Label } from "shadcn/components/ui/label";
import { capitalizeFirstLetter } from "~/utils";

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
  const [idSuffix] = useState(Math.random().toString(36).substring(7));
  const id = `boolean-${colorProperty.key}-${idSuffix}`;

  useEffect(() => {
    setColor(colorProperty.value);
  }, [colorProperty.value]);

  return (
    <div className="p-1.5 flex flex-col gap-1">
      <Label className="p-0.5" htmlFor={id}>
        {capitalizeFirstLetter(label)}
      </Label>
      <Input
        id={id}
        type="color"
        className="border-none p-0 bg-transparent"
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
