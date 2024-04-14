import { ScrollArea } from "shadcn/components/ui/scroll-area";
import {
  StoryBoardSettings,
  useEditorStore,
} from "~/components/videoMakerEditorShell";
import { SceneSettings } from "~/videoMaker/interface";

export default function StoryBoardPanel() {
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
      <ScrollArea className="h-full w-full rounded-md p-2">
        <div className="h-full w-full flex flex-col gap-2">
          {storyBoardSettings.boards.map((board, index) => (
            <button
              key={index}
              className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-secondary text-secondary-foreground rounded-md"
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
            className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-secondary text-secondary-foreground rounded-md"
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
