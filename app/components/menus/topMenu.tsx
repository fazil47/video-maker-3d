import { Button } from "shadcn/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "shadcn/components/ui/menubar";

import { IVideoMaker } from "~/videoMaker/interface";

export default function TopMenu({ videoMaker }: { videoMaker: IVideoMaker }) {
  return (
    <menu className="w-full h-[35px] mt-1 flex flex-row gap-4 px-1 justify-between items-center align-middle">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => {
                videoMaker.saveScene();
              }}
            >
              Save
            </MenubarItem>
            <MenubarItem
              onClick={() => {
                videoMaker.loadScene();
              }}
            >
              Load
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Import</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={() => {
                    videoMaker.importGLBModel();
                  }}
                >
                  GLB
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Add</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("box");
                  }}
                >
                  Box
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("sphere");
                  }}
                >
                  Sphere
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("cylinder");
                  }}
                >
                  Cylinder
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("torus");
                  }}
                >
                  Torus
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("plane");
                  }}
                >
                  Plane
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    videoMaker.addPrimitiveMesh("ground");
                  }}
                >
                  Ground
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem
              onClick={() => {
                videoMaker.deleteInspectable();
              }}
            >
              Delete
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="flex flex-row gap-1">
        <Button
          className="px-2 py-1"
          size="xs"
          variant="ghost"
          onClick={() => {
            videoMaker.PlayStoryBoardAnimation();
          }}
        >
          Play
        </Button>
        <Button
          className="px-2 py-1"
          size="xs"
          variant="ghost"
          onClick={() => {
            videoMaker.RecordStoryBoardAnimation();
          }}
        >
          Record
        </Button>
      </div>
    </menu>
  );
}
