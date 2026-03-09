"use client";

import React from 'react';
import { Camera, ScanBarcode, Sparkles, User } from 'lucide-react';

export type TabId = 'face-scan' | 'product-scan' | 'aura' | 'profile';

interface BottomNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'face-scan', label: 'Face Scan', icon: <Camera size={22} /> },
    { id: 'product-scan', label: 'Products', icon: <ScanBarcode size={22} /> },
    { id: 'aura', label: 'Derma', icon: <Sparkles size={22} /> },
    { id: 'profile', label: 'Profile', icon: <User size={22} /> },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pb-4">
            <div className="mx-auto flex bg-white/80 backdrop-blur-xl border border-black/10 rounded-3xl p-1.5 shadow-lg shadow-black/10">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 transition-all duration-300 rounded-2xl ${
                                isActive
                                    ? 'bg-black/5 text-[#FF2D55] scale-100'
                                    : 'text-black/40 hover:text-black/60 hover:bg-black/5 scale-95'
                            }`}
                        >
                            <div className={`transition-transform duration-300 ${isActive ? 'translate-y-0.5' : ''}`}>
                                {tab.icon}
                            </div>
                            <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'text-[#FF2D55]' : 'text-black/40'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
