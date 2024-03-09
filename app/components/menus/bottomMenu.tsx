import {
  PanelVisibility,
  useEditorStore,
} from "~/components/videoMakerEditorShell";

export default function BottomMenu() {
  const panelVisibility = useEditorStore<PanelVisibility>(
    (state) => state.panelVisibility
  );

  return (
    <div className="w-full h-[40px] mb-1 flex flex-row gap-4 px-1 items-center align-middle">
      <button
        onClick={() => {
          useEditorStore.setState((state) => ({
            panelVisibility: {
              ...state.panelVisibility,
              storyBoard: !state.panelVisibility.storyBoard,
            },
          }));
        }}
        className={`py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md ${
          panelVisibility.storyBoard ? "bg-gray-100 dark:bg-[#242424]" : ""
        }`}
      >
        Board
      </button>
      <button
        onClick={() => {
          alert("Not implemented yet");
        }}
        className="py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md"
      >
        Files
      </button>
      <input
        type="text"
        className="p-1 h-[25px] flex-grow rounded-md bg-gray-100 dark:bg-[#242424] focus:outline-none"
        placeholder="Chat..."
      />
      <button
        onClick={() => {
          useEditorStore.setState((state) => ({
            panelVisibility: {
              ...state.panelVisibility,
              inspector: !state.panelVisibility.inspector,
            },
          }));
        }}
        className={`py-1 px-2 h-[25px] flex flex-col justify-center align-middle items-center rounded-md ${
          panelVisibility.inspector ? "bg-gray-100 dark:bg-[#242424]" : ""
        }`}
      >
        Inspector
      </button>
    </div>
  );
}
