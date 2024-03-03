import type BabylonApp from "~/babylon/BabylonApp.client";
import HeirarchySubPanel from "./subpanels/HeirarchySubPanel";
import PropertiesSubPanel from "./subpanels/PropertiesSubPanel";

export default function InspectorPanel({ app }: { app: BabylonApp }) {
  return (
    <div className="h-full overflow-hidden min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#242424]">
      <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
        Inspector
      </div>
      <div className="overflow-hidden flex-grow w-full flex flex-col items-center gap-2">
        <HeirarchySubPanel app={app} sceneObjects={app?.sceneObjects} />
        <PropertiesSubPanel app={app} />
      </div>
    </div>
  );
}
