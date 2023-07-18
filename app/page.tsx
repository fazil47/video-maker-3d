import Link from "next/link";

export default function Home() {
  return (
    <main className="h-screen flex flex-col justify-center align-middle items-center">
      <Link href="/editor" className="font-bold text-3xl">
        Video Maker 3D
      </Link>
    </main>
  );
}
