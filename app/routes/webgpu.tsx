import type { MetaFunction } from "@remix-run/cloudflare";

import BabylonVideoMakerEditor from "~/components/babylonVideoMakerEditor";

export const meta: MetaFunction = () => {
  return [
    { title: "Video Maker 3D | WebGPU Editor" },
    { name: "description", content: "The Video Maker 3D Editor" },
  ];
};

export default function Editor() {
  return <BabylonVideoMakerEditor useWebGPU={true} />;
}
