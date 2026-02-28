"use client";

import React, { useState } from 'react';
import CameraCapture from './CameraCapture';
import ChatInterface from './ChatInterface';
import { Camera, Sparkles, Loader2, AlertCircle, ShieldAlert, Sun, Moon, CheckCircle2, XCircle } from 'lucide-react';

interface AnalysisResult {
    issues: string[];
    routine_advice: {
        morning: string[];
        evening: string[];
    };
    recommendations: {
        ingredients_to_look_for: string[];
        ingredients_to_avoid: string[];
    };
    summary: string;
}

export default function CosmeticAdvisor() {
    const [image, setImage] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [skinType, setSkinType] = useState('Unknown');
    const [concerns, setConcerns] = useState('');
    const [ingredients, setIngredients] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Toggle between viewing the structured results and the chat interface
    const [viewMode, setViewMode] = useState<'results' | 'chat'>('results');

    const handleCapture = (base64Image: string) => {
        setImage(base64Image);
        setShowCamera(false);
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setViewMode('results');

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    skinType,
                    concerns,
                    ingredients
                }),
            });

            if (!response.ok) {
                throw new Error('Analysis request failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError('An error occurred during analysis. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const reset = () => {
        setImage(null);
        setResult(null);
        setError(null);
        setViewMode('results');
    };

    const getChatContextData = () => {
        return {
            userProfile: {
                skinType,
                concerns,
                currentIngredients: ingredients
            },
            analysisResult: result
        };
    };

    return (
        <div className="max-w-6xl mx-auto w-full">
            {/* Header section */}
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 gradient-text">
                    Aura Cosmetic Advisor
                </h1>
                <p className="text-lg text-white/60 mb-2 max-w-2xl mx-auto">
                    Advanced AI-powered cosmetic analysis. Get personalized product and ingredient compatibility insights.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Input Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <span className="bg-violet-500/20 text-violet-400 p-2 rounded-lg">1</span>
                            Face Capture
                        </h2>

                        {!image ? (
                            <div
                                onClick={() => setShowCamera(true)}
                                className="aspect-square w-full rounded-xl border-2 border-dashed border-white/20 hover:border-violet-500/50 bg-black/20 flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <div className="p-4 bg-white/5 group-hover:bg-violet-500/20 rounded-full mb-3 transition-colors">
                                    <Camera className="text-white/60 group-hover:text-violet-400" size={32} />
                                </div>
                                <p className="font-medium text-white/80">Click to open camera</p>
                                <p className="text-sm text-white/40 mt-1">Take a clear photo of your face</p>
                            </div>
                        ) : (
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image} alt="Captured face" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <button
                                        onClick={() => setShowCamera(true)}
                                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                                    >
                                        Retake Photo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <span className="bg-fuchsia-500/20 text-fuchsia-400 p-2 rounded-lg">2</span>
                            Skin Profile <span className="text-xs text-white/40 font-normal ml-2">(Optional)</span>
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Skin Type</label>
                                <select
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                    value={skinType}
                                    onChange={(e) => setSkinType(e.target.value)}
                                >
                                    <option value="Unknown">Select skin type...</option>
                                    <option value="Dry">Dry</option>
                                    <option value="Oily">Oily</option>
                                    <option value="Combination">Combination</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Sensitive">Sensitive</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Specific Concerns</label>
                                <input
                                    type="text"
                                    placeholder="e.g. anti-aging, dark spots..."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                    value={concerns}
                                    onChange={(e) => setConcerns(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Current Product Ingredients</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Niacinamide, Retinol..."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                    value={ingredients}
                                    onChange={(e) => setIngredients(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={!image || isAnalyzing}
                        className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all 
                     bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/20
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Analyzing Profile...
                            </>
                        ) : (
                            <>
                                <Sparkles size={24} />
                                Generate Cosmetic Advice
                            </>
                        )}
                    </button>

                    {/* Action buttons under input column if result exists */}
                    {result && (
                        <div className="pt-6 border-t border-white/10">
                            <button
                                onClick={reset}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium text-white/80"
                            >
                                Start New Analysis
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: Results Panel / Chat Panel */}
                <div className="lg:col-span-8 h-full min-h-[600px] flex flex-col">
                    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col relative overflow-hidden flex-1">
                        {/* Background decorative glow */}
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">3</span>
                                {viewMode === 'results' ? 'Analysis Results' : 'Personal Cosmetologist UI'}
                            </h2>

                            {/* Toggle rendering mode if we have a result */}
                            {result && (
                                <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setViewMode('results')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'results' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                                    >
                                        Structured View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('chat')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'chat' ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white/80'}`}
                                    >
                                        <Sparkles size={14} />
                                        Chat with Aura
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 mb-6 relative z-10">
                                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                <p>{error}</p>
                            </div>
                        )}

                        {!result && !isAnalyzing && !error && (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-center p-8 relative z-10">
                                <Sparkles size={48} className="mb-4 opacity-20" />
                                <p>Complete the steps on the left to view your personalized cosmetic guidance.</p>
                            </div>
                        )}

                        {isAnalyzing && (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 relative z-10">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles size={20} className="text-fuchsia-400 animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-lg font-medium text-white/90">Analyzing facial dynamics...</p>
                                    <p className="text-sm text-white/50">Structuring cosmetic routines & ingredient compatibility</p>
                                </div>
                            </div>
                        )}

                        {result && viewMode === 'results' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 relative z-10">

                                {/* Summary Quote */}
                                <div className="bg-gradient-to-r from-violet-500/10 to-transparent border-l-4 border-violet-500 pl-4 py-3 rounded-r-xl">
                                    <p className="text-white/90 font-medium italic">"{result.summary}"</p>
                                </div>

                                {/* Detected Traits */}
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-3">Detected Cosmetic Factors</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {result.issues && result.issues.length > 0 ? (
                                            result.issues.map((issue, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-white/90 shadow-sm"
                                                >
                                                    {issue}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-white/40 italic">No specific conditions visually prominent.</span>
                                        )}
                                    </div>
                                </div>

                                <hr className="border-white/5" />

                                {/* Routine Advice Grid */}
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-3">Cosmetic Routine Advice</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Morning */}
                                        <div className="bg-black/30 border border-white/5 rounded-xl p-5 relative overflow-hidden">
                                            <Sun className="absolute top-4 right-4 text-amber-500/20 h-24 w-24 -mr-6 -mt-6 pointer-events-none" />
                                            <h4 className="font-semibold text-amber-200 mb-4 flex items-center gap-2">
                                                <Sun size={18} /> Morning Routine
                                            </h4>
                                            <ul className="space-y-3 relative z-10 text-sm">
                                                {result.routine_advice?.morning?.map((step, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-white/80">
                                                        <span className="bg-amber-500/20 text-amber-300 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{idx + 1}</span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Evening */}
                                        <div className="bg-black/30 border border-white/5 rounded-xl p-5 relative overflow-hidden">
                                            <Moon className="absolute top-4 right-4 text-indigo-500/20 h-24 w-24 -mr-6 -mt-6 pointer-events-none" />
                                            <h4 className="font-semibold text-indigo-300 mb-4 flex items-center gap-2">
                                                <Moon size={18} /> Evening Routine
                                            </h4>
                                            <ul className="space-y-3 relative z-10 text-sm">
                                                {result.routine_advice?.evening?.map((step, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-white/80">
                                                        <span className="bg-indigo-500/20 text-indigo-300 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{idx + 1}</span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-white/5" />

                                {/* Ingredients Logic */}
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-3">Ingredient Recommendations</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Seek */}
                                        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                            <h4 className="font-medium text-emerald-400 mb-3 flex items-center gap-1.5">
                                                <CheckCircle2 size={16} /> Look For
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/80">
                                                {result.recommendations?.ingredients_to_look_for?.map((ing, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500/50">
                                                        {ing}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Avoid */}
                                        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                                            <h4 className="font-medium text-rose-400 mb-3 flex items-center gap-1.5">
                                                <XCircle size={16} /> Consider Avoiding
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/80">
                                                {result.recommendations?.ingredients_to_avoid?.map((ing, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500/50">
                                                        {ing}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        )}

                        {result && viewMode === 'chat' && (
                            <div className="flex-1 flex flex-col min-h-0 relative z-10 animate-in fade-in zoom-in-95 duration-300">
                                <ChatInterface contextData={getChatContextData()} />
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="mt-6 pt-4 border-t border-white/5 flex items-start gap-3 relative z-10">
                            <ShieldAlert className="text-amber-500/80 shrink-0 mt-0.5" size={18} />
                            <p className="text-xs text-white/40 font-light leading-snug">
                                <strong className="text-white/60 font-semibold">Disclaimer:</strong> This analysis is cosmetic only and NOT medical advice.
                                Aura does not diagnose, treat, or cure any medical conditions. Please consult a dermatologist for medical concerns.
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            {showCamera && (
                <CameraCapture
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}
