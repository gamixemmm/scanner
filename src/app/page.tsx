import CosmeticAdvisor from "@/components/CosmeticAdvisor";
import { Suspense } from "react";

function CosmeticAdvisorWrapper() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <CosmeticAdvisor />
    </Suspense>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-24 flex flex-col items-center justify-center">
      <CosmeticAdvisorWrapper />
    </main>
  );
}
