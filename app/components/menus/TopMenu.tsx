import BabylonApp from "~/babylon/BabylonApp.client";

export type TopMenuProps = {
  app: BabylonApp;
};

export default function TopMenu({ app }: TopMenuProps) {
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
          app.saveScene();
        }}
      >
        Save
      </button>
      <button
        className="p-1"
        onClick={() => {
          app.loadScene();
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
