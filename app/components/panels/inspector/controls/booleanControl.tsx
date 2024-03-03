import { useState } from "react";
import {
  IVideoMaker,
  BooleanProperty,
  Inspectable,
} from "~/videoMaker/interface";

export default function BooleanControl({
  videoMaker,
  selectable,
  booleanControl: booleanControl,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  booleanControl: BooleanProperty;
}) {
  const [boolean, setBoolean] = useState<boolean>(booleanControl.value);

  return (
    <div>
      <label>{booleanControl.key}</label>
      <input
        type="checkbox"
        checked={boolean}
        onChange={(ev) => {
          videoMaker.setInspectableProperty(selectable, {
            key: booleanControl.key,
            value: ev.target.checked,
          });
          setBoolean(ev.target.checked);
        }}
      />
    </div>
  );
}
