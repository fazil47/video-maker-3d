import { IVideoMaker } from "~/videoMaker/interface";

export default function TopMenu({ videoMaker }: { videoMaker: IVideoMaker }) {
  return (
    <menu className="w-full h-[35px] mt-1 flex flex-row gap-4 px-1 justify-start items-center align-middle">
      <button
        className="p-1"
        onClick={() => {
          alert("Not implemented yet");
        }}
      >
        File
      </button>
      <button
        className="p-1"
        onClick={() => {
          videoMaker.saveScene();
        }}
      >
        Save
      </button>
      <button
        className="p-1"
        onClick={() => {
          videoMaker.loadScene();
        }}
      >
        Load
      </button>
      <button
        className="p-1"
        onClick={() => {
          alert("Not implemented yet");
        }}
      >
        Edit
      </button>
      <button
        className="p-1"
        onClick={() => {
          alert("Not implemented yet");
        }}
      >
        View
      </button>
      <button
        className="p-1"
        onClick={() => {
          alert("Not implemented yet");
        }}
      >
        Help
      </button>
    </menu>
  );
}
