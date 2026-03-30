import Image from "next/image";
export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-6xl text-text-primary">Esportorium</h1>
      <p className="text-text-secondary text-lg">Tournament platform for SEA esports</p>
      <div className="flex gap-4">
        <button className="bg-terra text-white px-6 py-3 rounded-lg font-sans">
          Get Started
        </button>
        <button className="border border-terra text-terra px-6 py-3 rounded-lg font-sans">
          Learn More
        </button>
      </div>
    </main>
  )
}