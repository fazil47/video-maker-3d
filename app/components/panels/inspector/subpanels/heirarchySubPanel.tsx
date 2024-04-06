import type { IVideoMaker, Inspectable } from "~/videoMaker/interface";

import { isInspectableMesh } from "~/videoMaker/interface";

export default function HeirarchySubPanel({
  videoMaker,
}: {
  videoMaker: IVideoMaker;
}) {
  const getInspectableAnimations = (obj: Inspectable) => {
    if (!isInspectableMesh(obj)) {
      return null;
    }

    if (!obj.getInspectableAnimations) {
      return null;
    }

    const animations = obj.getInspectableAnimations();
    if (!animations) {
      return null;
    }

    return (
      <div className="w-full pl-2">
        <span className="w-full">Animations</span>
        <ul className="w-full pl-2">
          {animations.map((animation, i) => {
            return (
              <li key={i}>
                <button
                  onClick={() => {
                    videoMaker.selectInspectable(animation);
                  }}
                >
                  {animation.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="overflow-y-auto overflow-x-hidden h-[50%] p-1 w-full flex flex-col items-center align-middle gap-2 bg-secondary text-secondary-foreground">
      <ul>
        {videoMaker.sceneInspectables.map((obj, i) => {
          return (
            <li key={i} className="flex flex-col">
              <button
                className="w-full cursor-pointer rounded-md p-1 text-left"
                onClick={() => {
                  videoMaker.selectInspectable(obj);
                }}
              >
                {obj.name}
              </button>
              {/* List of  animations if they exist */}
              {getInspectableAnimations(obj)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
