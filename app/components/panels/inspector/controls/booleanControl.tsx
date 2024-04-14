import type {
  IVideoMaker,
  BooleanProperty,
  Inspectable,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { Checkbox } from "shadcn/components/ui/checkbox";
import { Label } from "shadcn/components/ui/label";
import { capitalizeFirstLetter } from "~/utils";

export default function BooleanControl({
  videoMaker,
  selectable,
  booleanProperty,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  booleanProperty: BooleanProperty;
}) {
  const [boolean, setBoolean] = useState<boolean>(booleanProperty.value);
  const [idSuffix] = useState(Math.random().toString(36).substring(7));
  const id = `boolean-${booleanProperty.key}-${idSuffix}`;

  useEffect(() => {
    setBoolean(booleanProperty.value);
  }, [booleanProperty.value]);

  return (
    <div className="p-2 flex flex-row justify-between items-center">
      <Label htmlFor={id}>{capitalizeFirstLetter(booleanProperty.key)}</Label>
      <Checkbox
        id={id}
        checked={boolean}
        onCheckedChange={(checkedState) => {
          if (checkedState === "indeterminate") {
            console.warn(`${booleanProperty.key} is indeterminate`);
            return;
          }
          videoMaker.setInspectableProperty(selectable, {
            key: booleanProperty.key,
            value: checkedState,
          });
          setBoolean(checkedState);
        }}
      />
    </div>
  );
}
