import dynamic from "next/dynamic";

const BabylonEditor = dynamic(() => import("@/components/BabylonEditor"), {
  ssr: false,
});

export default function Editor() {
  return (
    <main className="h-screen w-screen">
      <BabylonEditor />
    </main>
  );
}
