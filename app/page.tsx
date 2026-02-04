
import Image from "next/image";

import RippleBackground from "@/components/RippleBackground/BackgroundWrapper";

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans text-black dark:text-white">
      <RippleBackground />
      <main className="flex min-h-screen flex-col items-center justify-center p-24 z-10 relative">
        <h1 className="text-5xl font-bold mb-8 text-white drop-shadow-md">My Portfolio</h1>
        {/* Placeholder content to demonstrate the background */}
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20 shadow-xl max-w-lg">
          <p className="text-lg text-white">
            Welcome to my portfolio. Move your mouse to see the ripple effect on the background.
          </p>
        </div>
      </main>
    </div>
  );
}
