import { Input } from "shadcn/components/ui/input";
import { Toggle } from "shadcn/components/ui/toggle";
import { useEditorStore } from "~/components/videoMakerEditorShell";

export default function BottomMenu() {
  return (
    <div className="w-full h-[40px] mb-1 flex flex-row gap-4 p-1 py-2 items-center align-middle">
      <Toggle
        size="xs"
        aria-label="Board"
        onClick={() => {
          useEditorStore.setState((state) => ({
            panelVisibility: {
              ...state.panelVisibility,
              storyBoard: !state.panelVisibility.storyBoard,
            },
          }));
        }}
      >
        Board
      </Toggle>
      <Input type="text" controlSize="sm" placeholder="Chat..." />
      <Toggle
        size="xs"
        aria-label="Inspector"
        onClick={() => {
          useEditorStore.setState((state) => ({
            panelVisibility: {
              ...state.panelVisibility,
              inspector: !state.panelVisibility.inspector,
            },
          }));
        }}
      >
        Inspector
      </Toggle>
    </div>
  );
}
