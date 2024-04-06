import { IVideoMaker } from "~/videoMaker/interface";
import HeirarchySubPanel from "./subpanels/heirarchySubPanel";
import PropertiesSubPanel from "./subpanels/propertiesSubPanel";

export default function InspectorPanel({
  videoMaker,
}: {
  videoMaker: IVideoMaker;
}) {
  return (
    <div className="h-full overflow-hidden flex flex-col items-center rounded-md bg-primary text-primary-foreground">
      <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
        Inspector
      </div>
      <div className="overflow-hidden flex-grow w-full flex flex-col items-center gap-2">
        <HeirarchySubPanel videoMaker={videoMaker} />
        <PropertiesSubPanel videoMaker={videoMaker} />
      </div>
    </div>
  );
}
