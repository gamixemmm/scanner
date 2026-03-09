"use client";

import { useState, useEffect, Suspense } from "react";
import CosmeticAdvisor from "@/components/CosmeticAdvisor";
import OnboardingSurvey, { OnboardingProfile } from "@/components/OnboardingSurvey";
import BottomNav, { TabId } from "@/components/BottomNav";
import ProductScanTab from "@/components/ProductScanTab";
import AuraTab from "@/components/AuraTab";
import ProfileTab from "@/components/ProfileTab";

const ONBOARDING_KEY = "aura_onboarding_profile";

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('face-scan');
  const [isScannerActive, setIsScannerActive] = useState(false);

  return (
    <div className="h-screen h-dvh flex flex-col bg-[#F4F5F7]">
      <div className={`flex-1 min-h-0 overflow-hidden ${isScannerActive ? '' : 'pb-[72px]'}`}>
        {/* Tab Content */}
        <div className={activeTab === 'face-scan' ? 'h-full' : 'hidden'}>
          <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading App...</div>}>
            <CosmeticAdvisor />
          </Suspense>
        </div>

        <div className={activeTab === 'product-scan' ? 'h-full' : 'hidden'}>
          <ProductScanTab onNavigateToTab={setActiveTab} onScannerActiveChange={setIsScannerActive} />
        </div>

        <div className={activeTab === 'aura' ? 'h-full flex flex-col overflow-hidden' : 'hidden'}>
          <AuraTab />
        </div>

        <div className={activeTab === 'profile' ? 'h-full' : 'hidden'}>
          <ProfileTab />
        </div>
      </div>

      {!isScannerActive && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}

function AppContent() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    setHasOnboarded(!!saved);
  }, []);

  const handleOnboardingComplete = (profile: OnboardingProfile) => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(profile));
    setHasOnboarded(true);
  };

  if (hasOnboarded === null) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#F8F9FB]">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#2D9F93] rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasOnboarded) {
    return <OnboardingSurvey onComplete={handleOnboardingComplete} />;
  }

  return <AppShell />;
}

export default function Home() {
  return <AppContent />;
}
