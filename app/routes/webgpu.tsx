import type { MetaFunction } from "@netlify/remix-runtime";

import BabylonEditor from "~/components/BabylonEditor";

export const meta: MetaFunction = () => {
  return [
    { title: "Video Maker 3D | Editor" },
    { name: "description", content: "The Video Maker 3D Editor" },
  ];
};

export default function Editor() {
  return <BabylonEditor useWebGPU={true} />;
}
