import type BabylonApp from "~/babylon/BabylonApp.client";
import type { SceneSettings } from "~/babylon/BabylonApp.client";
import { StoryBoardSettings, useEditorStore } from "~/components/BabylonEditor";

export type StoryBoardPanelProps = {
  app: BabylonApp;
};

export default function StoryBoardPanel({ app }: StoryBoardPanelProps) {
  const sceneSettings = useEditorStore<SceneSettings>(
    (state) => state.sceneSettings
  );
  const storyBoardSettings = useEditorStore<StoryBoardSettings>(
    (state) => state.storyBoardSettings
  );

  return (
    <div className="h-full overflow-hidden min-w-[200px] flex flex-col items-center rounded-md bg-gray-100 dark:bg-[#242424]">
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
      <div className="flex flex-col gap-3 overflow-y-scroll w-full h-full items-center p-1 pb-3">
        {storyBoardSettings.boards.map((board, index) => (
          <div
            key={index}
            className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-gray-200 dark:bg-[#2c2c2c] rounded-md"
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
          </div>
        ))}
        <div
          className="cursor-pointer w-full min-h-[100px] flex flex-col justify-center items-center text-center bg-gray-200 dark:bg-[#2c2c2c] rounded-md"
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
        </div>
      </div>
    </div>
  );
}
