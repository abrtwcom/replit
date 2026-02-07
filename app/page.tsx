import RippleBackground from "@components/RippleBackground";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* 1. The Background */}
      <RippleBackground />

      {/* 2. Your Portfolio Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white">
        <h1 className="text-6xl font-bold drop-shadow-lg">My Portfolio</h1>
        <p className="mt-4 text-xl drop-shadow-md">Hover over the background to see the ripple effect.</p>
      </div>
    </main>
  );
}