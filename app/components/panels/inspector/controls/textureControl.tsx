import type {
  IVideoMaker,
  Inspectable,
  TextureProperty,
} from "~/videoMaker/interface";

import { useEffect, useState } from "react";

import { Button } from "shadcn/components/ui/button";
import { Label } from "shadcn/components/ui/label";
import { capitalizeFirstLetter } from "~/utils";

export default function TextureControl({
  videoMaker,
  selectable,
  textureProperty,
}: {
  videoMaker: IVideoMaker;
  selectable: Inspectable;
  textureProperty: TextureProperty;
}) {
  const [texture, setTexture] = useState<string | null>(textureProperty.value);
  const [idSuffix] = useState(Math.random().toString(36).substring(7));
  const id = `boolean-${textureProperty.key}-${idSuffix}`;

  useEffect(() => {
    setTexture(textureProperty.value);
  }, [textureProperty.value]);

  const isTextureBlobURL = texture?.startsWith("blob:http");

  return (
    <div className="p-2 flex flex-col gap-1">
      <Label htmlFor={id}>{capitalizeFirstLetter(textureProperty.key)}</Label>
      {texture ? (
        <div id={id}>
          {isTextureBlobURL ? (
            <img
              src={texture}
              alt={textureProperty.key}
              className="w-full rounded-t-md"
            />
          ) : null}
          <Button
            variant="destructive"
            className={`w-full rounded-md ${
              isTextureBlobURL ? "rounded-t-none" : ""
            }`}
            onClick={() => {
              videoMaker.setInspectableProperty(selectable, {
                key: textureProperty.key,
                value: null,
                isTextureProperty: true,
              });
              setTexture(null);
            }}
          >
            Remove {capitalizeFirstLetter(textureProperty.key)}
          </Button>
        </div>
      ) : (
        <Button
          id={id}
          variant="secondary"
          className="w-full"
          onClick={() => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.onchange = (ev) => {
              if (
                ev.target &&
                ev.target instanceof HTMLInputElement &&
                ev.target.files
              ) {
                const file = ev.target.files[0];

                if (file) {
                  const fileURL = URL.createObjectURL(file);
                  videoMaker.setInspectableProperty(selectable, {
                    key: textureProperty.key,
                    value: fileURL,
                    isTextureProperty: true,
                  });
                  setTexture(fileURL);
                }
              }
            };
            fileInput.click();
          }}
        >
          Add {capitalizeFirstLetter(textureProperty.key)}
        </Button>
      )}
    </div>
  );
}
