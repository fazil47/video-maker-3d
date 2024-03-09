import { useEffect, useState } from "react";
import {
  IVideoMaker,
  BooleanProperty,
  Inspectable,
} from "~/videoMaker/interface";

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

  useEffect(() => {
    setBoolean(booleanProperty.value);
  }, [booleanProperty.value]);

  return (
    <div>
      <label>{booleanProperty.key}</label>
      <input
        type="checkbox"
        checked={boolean}
        onChange={(ev) => {
          videoMaker.setInspectableProperty(selectable, {
            key: booleanProperty.key,
            value: ev.target.checked,
          });
          setBoolean(ev.target.checked);
        }}
      />
    </div>
  );
}
