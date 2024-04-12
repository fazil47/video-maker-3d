import { ScrollArea } from "shadcn/components/ui/scroll-area";
import {
  StoryBoardSettings,
  useEditorStore,
} from "~/components/videoMakerEditorShell";
import { IVideoMaker, SceneSettings } from "~/videoMaker/interface";

export type StoryBoardPanelProps = {
  videoMaker: IVideoMaker;
};

export default function StoryBoardPanel({
  videoMaker: app,
}: StoryBoardPanelProps) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state) => state.sceneSettings
  );
  const storyBoardSettings = useEditorStore<StoryBoardSettings>(
    (state) => state.storyBoardSettings
  );

  return (
    <div className="h-full w-full flex flex-col items-center rounded-md bg-primary text-primary-foreground">
      <div className="p-1 w-full text-center text-xl font-bold rounded-md rounded-b-none">
        Story Board
      </div>
      <button
        className="p-1 w-full text-center font-bold rounded-md rounded-b-none"
        onClick={() => {
          app.PlayStoryBoardAnimation();
        }}
      >
        Play
      </button>
      <ScrollArea className="h-full w-full bg-secondary text-secondary-foreground rounded-md p-2">
        <div className="h-full w-full flex flex-col gap-2">
          {storyBoardSettings.boards.map((board, index) => (
            <button
              key={index}
              className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-tertiary text-tertiary-foreground rounded-md"
              onClick={() => {
                useEditorStore.setState((state) => ({
                  sceneSettings: {
                    ...state.sceneSettings,
                    currentBoardIndex: index,
                  },
                }));
              }}
              style={{
                fontWeight:
                  sceneSettings.currentBoardIndex === index ? "bold" : "normal",
              }}
            >
              {index}
            </button>
          ))}
          <button
            className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-tertiary text-tertiary-foreground rounded-md"
            onClick={() => {
              useEditorStore.setState((state) => ({
                storyBoardSettings: {
                  ...state.storyBoardSettings,
                  boards: [...state.storyBoardSettings.boards, {}],
                },
                sceneSettings: {
                  ...state.sceneSettings,
                  currentBoardIndex: state.storyBoardSettings.boards.length,
                },
              }));
            }}
          >
            +
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
