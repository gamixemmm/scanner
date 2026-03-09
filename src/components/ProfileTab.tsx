"use client";

import React, { useState, useEffect } from 'react';
import { User, ChevronRight, Trash2, Droplets, ShieldAlert, AlertCircle, Target } from 'lucide-react';

interface OnboardingProfile {
    skinType: string;
    concerns: string[];
    allergies: string[];
    goals: string[];
}

export default function ProfileTab() {
    const [profile, setProfile] = useState<OnboardingProfile | null>(null);
    const [hasFaceAnalysis, setHasFaceAnalysis] = useState(false);
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('aura_onboarding_profile');
        if (data) {
            try { setProfile(JSON.parse(data)); } catch { /* ignore */ }
        }
        setHasFaceAnalysis(!!localStorage.getItem('aura_face_analysis'));
    }, []);

    const handleResetOnboarding = () => {
        localStorage.removeItem('aura_onboarding_profile');
        localStorage.removeItem('aura_face_analysis');
        window.location.reload();
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                No profile data found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ─── Header ─── */}
            <div className="text-center pt-6 pb-2">
                <div className="w-16 h-16 rounded-full bg-[#E6F5F3] flex items-center justify-center mx-auto mb-3">
                    <User className="text-[#2D9F93]" size={28} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Your Profile</h1>
                <p className="text-sm text-gray-400 mt-0.5">Your skin profile and preferences</p>
            </div>

            {/* ─── Skin Type ─── */}
            <div className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <Droplets className="text-[#2D9F93]" size={18} />
                    <h3 className="text-sm font-semibold text-gray-800">Skin Type</h3>
                </div>
                <p className="text-base font-medium text-gray-900 ml-[30px]">{profile.skinType}</p>
            </div>

            {/* ─── Concerns ─── */}
            <div className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <AlertCircle className="text-[#2D9F93]" size={18} />
                    <h3 className="text-sm font-semibold text-gray-800">Concerns</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-[30px]">
                    {profile.concerns.map((c) => (
                        <span key={c} className="pill text-xs">{c}</span>
                    ))}
                </div>
            </div>

            {/* ─── Allergies ─── */}
            <div className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <ShieldAlert className="text-[#2D9F93]" size={18} />
                    <h3 className="text-sm font-semibold text-gray-800">Allergies & Sensitivities</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-[30px]">
                    {profile.allergies.map((a) => (
                        <span key={a} className={`pill text-xs ${a === 'None' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 border-red-100 text-red-600'}`}>{a}</span>
                    ))}
                </div>
            </div>

            {/* ─── Goals ─── */}
            <div className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <Target className="text-[#2D9F93]" size={18} />
                    <h3 className="text-sm font-semibold text-gray-800">Goals</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-[30px]">
                    {profile.goals.map((g) => (
                        <span key={g} className="pill text-xs bg-[#E6F5F3] border-[#2D9F93]/15 text-[#247F75]">{g}</span>
                    ))}
                </div>
            </div>

            {/* ─── Analysis Status ─── */}
            <div className="card p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasFaceAnalysis ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Face Analysis</p>
                    <p className="text-xs text-gray-400">{hasFaceAnalysis ? 'Completed' : 'Not yet scanned'}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
            </div>

            {/* ─── Reset ─── */}
            <div className="pt-4">
                {!showConfirmReset ? (
                    <button
                        onClick={() => setShowConfirmReset(true)}
                        className="w-full py-3 text-sm text-red-400 hover:text-red-500 font-medium transition-colors"
                    >
                        Reset Profile & Start Over
                    </button>
                ) : (
                    <div className="card-flat p-4 bg-red-50 border-red-100 text-center space-y-3">
                        <p className="text-sm text-red-700 font-medium">This will erase all data and restart onboarding.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowConfirmReset(false)}
                                className="btn-secondary flex-1 text-sm py-2.5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetOnboarding}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Trash2 size={14} />
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
