import { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Video Maker 3D | Home" },
    { name: "description", content: "Welcome to Video Maker 3D" },
  ];
};

export default function Index() {
  return (
    <main className="h-screen flex flex-col justify-center align-middle items-center">
      <Link to="/webgl">
        <h1 className="font-bold text-3xl">Video Maker 3D</h1>
      </Link>
      <div className="p-4 flex flex-row">
        <Link to="/webgpu">WebGPU (unstable)</Link>
      </div>
    </main>
  );
}
