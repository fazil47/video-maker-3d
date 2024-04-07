import { Button } from "shadcn/components/ui/button";

import { IVideoMaker } from "~/videoMaker/interface";

export default function TopMenu({ videoMaker }: { videoMaker: IVideoMaker }) {
  return (
    <menu className="w-full h-[35px] mt-1 flex flex-row gap-4 px-1 justify-start items-center align-middle">
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          videoMaker.saveScene();
        }}
      >
        Save
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          videoMaker.loadScene();
        }}
      >
        Load
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          videoMaker.RecordStoryBoardAnimation();
        }}
      >
        Record
      </Button>
    </menu>
  );
}
