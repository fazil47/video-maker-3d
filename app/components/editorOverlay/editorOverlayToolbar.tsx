import TransformSelectTool from "./controls/transformSelectTool";

export default function EditorOverlayToolbar() {
  return (
    <div className="absolute flex flex-row justify-between p-2 z-10 bg-transparent left-0 right-0 top-0 h-8 w-full">
      <div className="w-[50%] h-full">
        <TransformSelectTool />
      </div>
      <div className="w-[50%] h-full"></div>
    </div>
  );
}
