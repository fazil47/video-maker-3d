import { ScrollArea } from "shadcn/components/ui/scroll-area";
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
    <ScrollArea className="h-full w-full bg-secondary text-secondary-foreground rounded-md">
      <div className="p-1 w-full h-full flex flex-col items-center align-middle gap-2">
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
    </ScrollArea>
  );
}
