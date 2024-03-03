import type { MetaFunction } from "@netlify/remix-runtime";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Video Maker 3D | Home" },
    { name: "description", content: "Welcome to Video Maker 3D" },
  ];
};

export default function Home() {
  return (
    <main className="h-screen flex flex-col justify-center align-middle items-center">
      <h1 className="font-bold text-3xl">Video Maker 3D</h1>
      <div className="p-4 flex flex-row">
        <Link to="/webgl">WebGL</Link>&nbsp;|&nbsp;
        <Link to="/webgpu">WebGPU</Link>
      </div>
    </main>
  );
}
