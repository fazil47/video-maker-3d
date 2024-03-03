import type BabylonApp from "~/babylon/BabylonApp.client";
import { MeshWithAnimationGroups, SceneObject } from "~/babylon/BabylonApp.client";

export default function HeirarchySubPanel({
  app,
  sceneObjects,
}: {
  app: BabylonApp;
  sceneObjects: SceneObject[];
}) {
  return (
    <div className="overflow-y-auto overflow-x-hidden h-[50%] p-1 w-full flex flex-col items-center align-middle gap-2 bg-gray-200 dark:bg-[#2c2c2c]">
      <ul>
        {sceneObjects?.map((obj, i) => {
          if (obj instanceof MeshWithAnimationGroups) {
            return (
              <li key={i} className="flex flex-col">
                <span
                  className="w-full cursor-pointer hover:bg-gray-300 hover:dark:bg-[#3a3a3a] rounded-md p-1"
                  onClick={() => {
                    app?.selectSceneItem(obj);
                  }}
                >
                  {obj.name}
                </span>
                <div className="w-full pl-2">
                  <span className="w-full">Animations</span>
                  <ul className="w-full pl-2">
                    {obj.animationGroups.map((animGroup, i) => {
                      return (
                        <li
                          key={i}
                          onClick={() => {
                            app?.selectSceneItem(animGroup);
                          }}
                          className="cursor-pointer hover:bg-gray-300 hover:dark:bg-[#3a3a3a] rounded-md p-1"
                        >
                          {animGroup.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          }

          return (
            <li
              key={i}
              onClick={() => {
                app?.selectSceneItem(obj);
              }}
              className="cursor-pointer hover:bg-gray-300 hover:dark:bg-[#3a3a3a] rounded-md p-1"
            >
              {obj.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
