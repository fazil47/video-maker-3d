import { useEffect, useState } from "react";
import {
  IVideoMaker,
  Inspectable,
  TextureProperty,
} from "~/videoMaker/interface";

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

  useEffect(() => {
    setTexture(textureProperty.value);
  }, [textureProperty.value]);

  return (
    <div>
      <label>{textureProperty.key}</label>
      {texture ? (
        <>
          {texture.startsWith("blob:http") ? (
            <img src={texture} alt={textureProperty.key} className="w-full" />
          ) : null}
          <button
            className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
            onClick={() => {
              videoMaker.setInspectableProperty(selectable, {
                key: textureProperty.key,
                value: null,
                isTextureProperty: true,
              });
              setTexture(null);
            }}
          >
            Remove {textureProperty.key}
          </button>
        </>
      ) : (
        <button
          className="w-full rounded-md bg-gray-300 dark:bg-[#3a3a3a] focus:outline-none"
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
          Add {textureProperty.key}
        </button>
      )}
    </div>
  );
}
