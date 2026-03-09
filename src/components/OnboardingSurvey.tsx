"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Droplets, Sparkles, ShieldAlert, Target } from 'lucide-react';

export interface OnboardingProfile {
    skinType: string;
    concerns: string[];
    allergies: string[];
    goals: string[];
}

const SKIN_TYPES = [
    { value: 'Oily', label: 'Oily', desc: 'Shiny, enlarged pores' },
    { value: 'Dry', label: 'Dry', desc: 'Tight, flaky patches' },
    { value: 'Combination', label: 'Combo', desc: 'Oily T-zone, dry cheeks' },
    { value: 'Sensitive', label: 'Sensitive', desc: 'Easily irritated' },
    { value: 'Normal', label: 'Normal', desc: 'Balanced, few issues' },
];

const CONCERNS = [
    'Acne', 'Hyperpigmentation', 'Redness', 'Aging / Fine Lines',
    'Dark Spots', 'Texture', 'Scarring', 'Dullness', 'Large Pores',
    'Dark Circles', 'Dryness', 'Oiliness',
];

const ALLERGIES = [
    'Fragrance', 'Parabens', 'Sulfates', 'Alcohol',
    'Essential Oils', 'Retinol', 'AHA / BHA', 'Nuts',
    'Latex', 'None',
];

const GOALS = [
    'Clear Skin', 'Glow / Radiance', 'Anti-Aging',
    'Even Skin Tone', 'Hydration', 'Reduce Redness',
    'Minimize Pores', 'Acne Control', 'Sun Protection',
    'Gentle Routine',
];

interface Props {
    onComplete: (profile: OnboardingProfile) => void;
}

export default function OnboardingSurvey({ onComplete }: Props) {
    const [step, setStep] = useState(0);
    const [skinType, setSkinType] = useState('');
    const [concerns, setConcerns] = useState<string[]>([]);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [goals, setGoals] = useState<string[]>([]);

    const totalSteps = 4;

    const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (item === 'None') {
            setList(list.includes('None') ? [] : ['None']);
            return;
        }
        const filtered = list.filter(i => i !== 'None');
        if (filtered.includes(item)) {
            setList(filtered.filter(i => i !== item));
        } else {
            setList([...filtered, item]);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 0: return !!skinType;
            case 1: return concerns.length > 0;
            case 2: return allergies.length > 0;
            case 3: return goals.length > 0;
            default: return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            onComplete({ skinType, concerns, allergies, goals });
        }
    };

    const stepIcons = [
        <Droplets key="d" size={20} />,
        <ShieldAlert key="s" size={20} />,
        <ShieldAlert key="a" size={20} />,
        <Target key="t" size={20} />,
    ];

    const stepTitles = [
        'What\'s your skin type?',
        'Any specific concerns?',
        'Allergies or sensitivities?',
        'What are your goals?',
    ];

    const stepSubtitles = [
        'Select the one that best describes your skin',
        'Select all that apply',
        'Select all that apply',
        'Select all that apply',
    ];

    return (
        <div className="min-h-screen min-h-dvh bg-[#F8F9FB] flex flex-col">
            <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-8 flex flex-col flex-1">

                {/* ─── Header ─── */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E6F5F3] mb-4">
                        <Sparkles className="text-[#2D9F93]" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Derma</h1>
                    <p className="text-sm text-gray-500">Let&apos;s set up your skin profile</p>
                </div>

                {/* ─── Progress ─── */}
                <div className="flex gap-1.5 mb-8">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-[#2D9F93]' : 'bg-gray-200'}`}
                        />
                    ))}
                </div>

                {/* ─── Step Content ─── */}
                <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="text-[#2D9F93]">{stepIcons[step]}</div>
                        <h2 className="text-lg font-semibold text-gray-900">{stepTitles[step]}</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-5 ml-[30px]">{stepSubtitles[step]}</p>

                    {/* Step 0: Skin Type */}
                    {step === 0 && (
                        <div className="space-y-2.5">
                            {SKIN_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setSkinType(type.value)}
                                    className={`w-full flex items-center gap-3.5 p-4 rounded-xl border transition-all text-left ${skinType === type.value
                                        ? 'border-[#2D9F93] bg-[#E6F5F3] shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${skinType === type.value
                                        ? 'border-[#2D9F93]'
                                        : 'border-gray-300'
                                        }`}>
                                        {skinType === type.value && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#2D9F93]" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{type.label}</p>
                                        <p className="text-xs text-gray-400">{type.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 1: Concerns */}
                    {step === 1 && (
                        <div className="flex flex-wrap gap-2">
                            {CONCERNS.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => toggleItem(concerns, setConcerns, item)}
                                    className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${concerns.includes(item)
                                        ? 'bg-[#2D9F93] border-[#2D9F93] text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Allergies */}
                    {step === 2 && (
                        <div className="flex flex-wrap gap-2">
                            {ALLERGIES.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => toggleItem(allergies, setAllergies, item)}
                                    className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${allergies.includes(item)
                                        ? item === 'None'
                                            ? 'bg-gray-700 border-gray-700 text-white'
                                            : 'bg-[#2D9F93] border-[#2D9F93] text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Goals */}
                    {step === 3 && (
                        <div className="flex flex-wrap gap-2">
                            {GOALS.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => toggleItem(goals, setGoals, item)}
                                    className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${goals.includes(item)
                                        ? 'bg-[#2D9F93] border-[#2D9F93] text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Navigation Buttons ─── */}
                <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="btn-secondary flex items-center gap-1.5 px-5"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                    >
                        {step === totalSteps - 1 ? 'Get Started' : 'Continue'}
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* ─── Step indicator ─── */}
                <p className="text-center text-xs text-gray-300 mt-4">
                    Step {step + 1} of {totalSteps}
                </p>
            </div>
        </div>
    );
}
