"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CameraCapture from './CameraCapture';
import ChatInterface from './ChatInterface';
import { Camera, Sparkles, Loader2, AlertCircle, ShieldAlert, Sun, Moon, CheckCircle2, XCircle } from 'lucide-react';

interface AnalysisResult {
    face_detected?: boolean;
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
    const searchParams = useSearchParams();
    const productParam = searchParams?.get('product');

    const [image, setImage] = useState<string | null>(null);
    const [skinType, setSkinType] = useState('Unknown');
    const [concerns, setConcerns] = useState('');
    const [ingredients, setIngredients] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [cameraAnalysisResult, setCameraAnalysisResult] = useState<AnalysisResult | null>(null);
    const [cameraAnalysisError, setCameraAnalysisError] = useState<string | null>(null);

    // Flow State: overview -> camera -> results <-> chat
    const [scanStep, setScanStep] = useState<'overview' | 'camera' | 'results' | 'chat'>('overview');
    const [showTips, setShowTips] = useState(false);

    useEffect(() => {
        // Load onboarding profile first
        const onboardingData = localStorage.getItem('aura_onboarding_profile');
        if (onboardingData) {
            try {
                const profile = JSON.parse(onboardingData);
                if (profile.skinType) setSkinType(profile.skinType);
                if (profile.concerns?.length) setConcerns(profile.concerns.join(', '));
                if (profile.allergies?.length) {
                    const nonNone = profile.allergies.filter((a: string) => a !== 'None');
                    if (nonNone.length) setIngredients('Allergies: ' + nonNone.join(', '));
                }
            } catch (e) {
                console.error('[CosmeticAdvisor] Error loading onboarding data:', e);
            }
        }

        // Then override with any saved face analysis (more specific)
        const savedData = localStorage.getItem('aura_face_analysis');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.skinType) setSkinType(parsed.skinType);
                if (parsed.concerns) setConcerns(parsed.concerns);
                if (parsed.ingredients) setIngredients(parsed.ingredients);
                if (parsed.image) setImage(parsed.image);
                if (parsed.result) {
                    setResult(parsed.result);
                    setScanStep('results'); // default to results if we have them saved
                }
            } catch (e) {
                console.error('[CosmeticAdvisor] Error loading saved data:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (productParam) {
            setScanStep('chat');
        }
    }, [productParam]);

    const handleCapture = (base64Image: string) => {
        setImage(base64Image);
        setCameraAnalysisResult(null);
        setCameraAnalysisError(null);
        handleAnalyzeDefault(base64Image); // Auto analyze on manual capture
    };

    const handleAnalyzeFromCamera = async (base64Image: string, localIssues?: string[]) => {
        setIsAnalyzing(true);
        setCameraAnalysisError(null);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, skinType, concerns, ingredients, localIssues }),
            });
            if (!response.ok) throw new Error('Analysis request failed');
            const data = await response.json();
            if (data.face_detected === false) {
                setCameraAnalysisError('No face detected. Position your face clearly and try again.');
                return;
            }
            setImage(base64Image);
            setResult(data);
            setScanStep('results');
            setCameraAnalysisResult(data);
            localStorage.setItem('aura_face_analysis', JSON.stringify({
                timestamp: Date.now(), skinType, concerns, ingredients,
                image: base64Image, result: data, hasAnalysis: true,
            }));
        } catch (err: any) {
            console.error(err);
            setCameraAnalysisError('Analysis failed. Try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyzeDefault = async (imageToAnalyze?: string) => {
        const targetImage = imageToAnalyze || image;
        if (!targetImage) return;
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setScanStep('results');
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: targetImage, skinType, concerns, ingredients }),
            });
            if (!response.ok) throw new Error('Analysis request failed');
            const data = await response.json();
            if (data.face_detected === false) {
                setError('No face detected. Please take a clearer photo with your face visible.');
                setResult(null);
                return;
            }
            setResult(data);
            localStorage.setItem('aura_face_analysis', JSON.stringify({
                timestamp: Date.now(), skinType, concerns, ingredients,
                image: targetImage, result: data, hasAnalysis: true,
            }));
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
        setScanStep('overview');
        localStorage.removeItem('aura_face_analysis');
    };

    const getChatContextData = () => {
        let savedAnalysis = null;
        try {
            const savedData = localStorage.getItem('aura_face_analysis');
            if (savedData) savedAnalysis = JSON.parse(savedData);
        } catch (e) { /* ignore */ }

        return {
            userProfile: {
                skinType: savedAnalysis?.skinType || skinType,
                concerns: savedAnalysis?.concerns || concerns,
                currentIngredients: savedAnalysis?.ingredients || ingredients
            },
            analysisResult: savedAnalysis?.result || result,
            hasFaceAnalysis: !!(savedAnalysis?.hasAnalysis || result)
        };
    };

    // Helper for generating the animated point markers on the hero image
    const overlayPins = (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Scanning line sweep */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#5A8F53]/60 to-transparent animate-scan-sweep" />

            {/* Forehead - Dry skin */}
            <div className="absolute top-[28%] left-[45%] flex items-center gap-2">
                <span className="text-white text-xs font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] right-full absolute mr-6 whitespace-nowrap animate-fade-in" style={{ animationDelay: '0.8s', opacity: 0 }}>Dry skin</span>
                <div className="w-12 h-px border-b border-dashed border-white/50 absolute right-[calc(100%+4px)] animate-fade-in" style={{ animationDelay: '0.6s', opacity: 0 }}></div>
                <div className="relative">
                    <div className="absolute inset-0 w-5 h-5 -m-0.5 rounded-full bg-[#FF9F0A]/30 animate-pin-ripple"></div>
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-lg animate-pin-glow">
                        <div className="w-2 h-2 rounded-full bg-[#FF9F0A]"></div>
                    </div>
                </div>
            </div>
            
            {/* Cheek - Uneven tone */}
            <div className="absolute top-[48%] left-[38%] flex items-center gap-2">
                <span className="text-white text-xs font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] right-full absolute mr-6 whitespace-nowrap animate-fade-in" style={{ animationDelay: '1.2s', opacity: 0 }}>Uneven tone</span>
                <div className="w-10 h-px border-b border-dashed border-white/50 absolute right-[calc(100%+4px)] animate-fade-in" style={{ animationDelay: '1s', opacity: 0 }}></div>
                <div className="relative">
                    <div className="absolute inset-0 w-5 h-5 -m-0.5 rounded-full bg-[#FF9F0A]/30 animate-pin-ripple" style={{ animationDelay: '0.7s' }}></div>
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-lg animate-pin-glow" style={{ animationDelay: '0.7s' }}>
                        <div className="w-2 h-2 rounded-full bg-[#FF9F0A]"></div>
                    </div>
                </div>
            </div>

            {/* Cheek - Enlarged pores */}
            <div className="absolute top-[45%] right-[32%] flex items-center gap-2">
                <div className="relative">
                    <div className="absolute inset-0 w-5 h-5 -m-0.5 rounded-full bg-[#FF2D55]/30 animate-pin-ripple" style={{ animationDelay: '1.4s' }}></div>
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-lg animate-pin-glow" style={{ animationDelay: '1.4s' }}>
                        <div className="w-2 h-2 rounded-full bg-[#FF2D55]"></div>
                    </div>
                </div>
                <div className="w-6 h-px border-b border-dashed border-white/50 absolute left-[calc(100%+4px)] animate-fade-in" style={{ animationDelay: '1.6s', opacity: 0 }}></div>
                <span className="text-white text-xs font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] left-full absolute ml-6 whitespace-nowrap animate-fade-in" style={{ animationDelay: '1.8s', opacity: 0 }}>Enlarged<br/>pores</span>
            </div>

            {/* T-zone highlight */}
            <div className="absolute top-[35%] left-[52%]">
                <div className="relative">
                    <div className="absolute inset-0 w-5 h-5 -m-0.5 rounded-full bg-[#5A8F53]/30 animate-pin-ripple" style={{ animationDelay: '2s' }}></div>
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 8px 2px rgba(90,143,83,0.4)' }}>
                        <div className="w-2 h-2 rounded-full bg-[#5A8F53]"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col relative bg-[#F4F5F7]">
            {/* ─── Header (hidden on overview) ─── */}
            {scanStep !== 'overview' && (
            <div className="pt-safe px-6 pb-2 flex justify-between items-center z-20 sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]">
                <div>
                    <h1 className="text-[22px] font-bold tracking-tight mb-0.5 text-[#1A1D26]">
                        Derma
                    </h1>
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-[#6B7280]">
                        Cosmetic Advisor
                    </p>
                </div>
                {scanStep === 'results' && result && (
                    <button
                        onClick={reset}
                        className="text-[#5A8F53] hover:text-[#477441] px-3 py-1.5 text-sm font-semibold transition-colors bg-[#E8F3E6] rounded-full"
                    >
                        Start Over
                    </button>
                )}
            </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar relative w-full pb-safe">

                {scanStep === 'overview' && (
                    <div className="flex flex-col h-full bg-[#F4F5F7] relative overflow-hidden">
                        {/* Hero Image Section — fills remaining space */}
                        <div className="relative w-full flex-1 min-h-0 bg-gray-200 overflow-hidden shadow-sm">
                            <img 
                                src="/sample-face.jpg" 
                                alt="Skin Profile Overview" 
                                className="w-full h-full object-cover animate-hero-zoom"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512496015851-a1c8f411ba10?auto=format&fit=crop&w=500&q=80";
                                }}
                            />
                            {overlayPins}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/20">
                            </div>
                        </div>

                        {/* Floating Action Card — overlapping hero */}
                        <div className="px-5 -mt-24 relative z-10 shrink-0 pb-4">
                            <div className="bg-white rounded-[32px] p-6 shadow-2xl shadow-black/10 flex flex-col items-center text-center border border-gray-100/80 animate-card-rise" style={{ animationDelay: '0.3s' }}>
                                <h3 className="text-[24px] font-bold text-[#1A1D26] mb-2 tracking-tight">Let&apos;s Analyze Your Skin!</h3>
                                <p className="text-[14px] text-[#6B7280] leading-relaxed mb-5">
                                    Scan your face to see what your skin really needs. We&apos;ll spot problem areas, give care tips, and save each scan for you to watch your skin improve over time.
                                </p>
                                
                                <button 
                                    onClick={() => setShowTips(!showTips)}
                                    className="flex flex-col items-center mb-5 animate-card-rise cursor-pointer group"
                                    style={{ animationDelay: '0.6s' }}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors duration-300 ${showTips ? 'bg-[#5A8F53] text-white' : 'bg-[#E8F3E6] text-[#5A8F53]'}`}>
                                        <Sparkles size={20} />
                                    </div>
                                    <span className="text-sm font-bold text-[#5A8F53] group-hover:underline">Tips for a great face scan</span>
                                </button>

                                {showTips && (
                                    <div className="w-full space-y-2.5 mb-5">
                                        {[
                                            { emoji: '💡', text: 'Use natural lighting — avoid harsh shadows or backlight' },
                                            { emoji: '🧹', text: 'Remove glasses, hats, and heavy makeup for best results' },
                                            { emoji: '📐', text: 'Hold the phone at arm\'s length, face centered' },
                                            { emoji: '😐', text: 'Keep a neutral expression and look straight ahead' },
                                        ].map((tip, idx) => (
                                            <div 
                                                key={idx} 
                                                className="flex items-start gap-3 bg-[#F9FAFB] rounded-2xl px-4 py-3 animate-card-rise"
                                                style={{ animationDelay: `${idx * 0.1}s` }}
                                            >
                                                <span className="text-[18px] shrink-0 mt-0.5">{tip.emoji}</span>
                                                <p className="text-[13px] text-[#374151] leading-snug font-medium">{tip.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button 
                                    onClick={() => setScanStep('camera')}
                                    className="w-full bg-[#5A8F53] hover:bg-[#477441] active:scale-95 text-white font-bold py-4 rounded-full transition-all duration-300 shadow-[0_8px_24px_rgba(90,143,83,0.35)] text-lg relative overflow-hidden animate-card-rise"
                                    style={{ animationDelay: '0.8s' }}
                                >
                                    {/* Shimmer sweep */}
                                    <div className="absolute inset-0 overflow-hidden rounded-full">
                                        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep"></div>
                                    </div>
                                    <span className="relative z-10">Let&apos;s Go!</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 4: Results (or Chat) ─── */}
                {(scanStep === 'results' || scanStep === 'chat') && result && !isAnalyzing && (
                    <div className={`animate-slide-up-fade flex flex-col w-full max-w-lg mx-auto ${scanStep === 'chat' ? 'h-full' : 'gap-6 pb-32'}`}>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-[#E5E7EB] p-1 rounded-full mx-4 mt-6 relative shadow-inner shrink-0">
                            <div 
                                className={`absolute inset-y-1 bg-white shadow-sm rounded-full transition-all duration-300 ease-out`}
                                style={{ 
                                    width: 'calc(50% - 4px)', 
                                    left: scanStep === 'results' ? '4px' : 'calc(50%)' 
                                }}
                            />
                            <button 
                                onClick={() => setScanStep('results')} 
                                className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${scanStep === 'results' ? 'text-[#1A1D26]' : 'text-[#6B7280] hover:text-[#4B5563]'}`}
                            >
                                Analysis
                            </button>
                            <button 
                                onClick={() => setScanStep('chat')} 
                                className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${scanStep === 'chat' ? 'text-[#1A1D26]' : 'text-[#6B7280] hover:text-[#4B5563]'}`}
                            >
                                AI Assistant
                            </button>
                        </div>

                        {/* Analysis Tab - Premium Redesign */}
                        {scanStep === 'results' && (
                            <div className="flex flex-col">
                                        {error && (
                                            <div className="mx-4 mb-4 bg-[#FF453A1A] border border-[#FF453A33] rounded-2xl p-4 flex items-start gap-3">
                                                <AlertCircle className="text-[#FF453A] shrink-0 mt-0.5" size={18} />
                                                <div className="flex-1">
                                                    <p className="text-sm text-[#FF453A] font-medium">{error}</p>
                                                    {error?.includes('No face detected') && (
                                                        <button
                                                            onClick={() => { setError(null); setImage(null); setResult(null); setScanStep('camera'); }}
                                                            className="mt-2 text-sm font-bold text-[#FF453A] flex items-center gap-1 hover:underline"
                                                        >
                                                            <Camera size={14} /> Try Again
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hero Section with Photo & Score */}
                                        <div className="relative mx-4 mb-6 rounded-[32px] overflow-hidden bg-gradient-to-br from-[#1A1D26] to-[#2D3748] shadow-2xl">
                                            {/* Background Pattern */}
                                            <div className="absolute inset-0 opacity-10">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5A8F53] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0A84FF] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                                            </div>
                                            
                                            <div className="relative p-6 flex items-center gap-5">
                                                {/* User Photo */}
                                                <div className="relative shrink-0">
                                                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-xl">
                                                        {image ? (
                                                            <img src={image} alt="Your scan" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#5A8F53] to-[#3D6B38] flex items-center justify-center">
                                                                <Sparkles className="text-white/80" size={32} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Pulse ring */}
                                                    <div className="absolute -inset-1 rounded-2xl border-2 border-[#5A8F53]/50 animate-pulse"></div>
                                                </div>
                                                
                                                {/* Score & Summary */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[#5A8F53] text-xs font-bold uppercase tracking-wider">Skin Analysis</span>
                                                        <div className="flex-1 h-px bg-white/10"></div>
                                                    </div>
                                                    <div className="flex items-baseline gap-2 mb-2">
                                                        <span className="text-5xl font-black text-white">{result?.issues?.length || 0}</span>
                                                        <span className="text-white/50 text-sm font-medium">concerns found</span>
                                                    </div>
                                                    <p className="text-white/70 text-sm leading-relaxed line-clamp-2">{result?.summary || 'Analysis complete'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detected Issues - Horizontal Scroll */}
                                        {result?.issues && result.issues.length > 0 && (
                                            <div className="mb-6 animate-slide-up-fade" style={{ animationDelay: '0.1s' }}>
                                                <h3 className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF] font-bold mb-3 px-4">Detected Concerns</h3>
                                                <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
                                                    {result.issues.map((issue, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="shrink-0 bg-gradient-to-br from-white to-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 shadow-sm min-w-[140px]"
                                                            style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9F0A]/20 to-[#FF9F0A]/5 flex items-center justify-center mb-3">
                                                                <ShieldAlert size={20} className="text-[#FF9F0A]" />
                                                            </div>
                                                            <p className="text-[#1A1D26] font-semibold text-sm leading-tight">{issue}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Routines - Side by Side Cards */}
                                        <div className="px-4 mb-6 animate-slide-up-fade" style={{ animationDelay: '0.2s' }}>
                                            <h3 className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF] font-bold mb-3">Your Routine</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Morning */}
                                                <div className="bg-gradient-to-br from-[#FFF8F0] to-[#FFFAF5] border border-[#FFE8CC] rounded-[20px] p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#FF9F0A]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                                    <div className="relative">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF9F0A] to-[#FF6B00] flex items-center justify-center shadow-lg shadow-[#FF9F0A]/30">
                                                                <Sun size={16} className="text-white" />
                                                            </div>
                                                            <span className="font-bold text-[#FF9F0A] text-xs uppercase tracking-wide">AM</span>
                                                        </div>
                                                        <ol className="space-y-2">
                                                            {result?.routine_advice?.morning?.slice(0, 4).map((step, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-[#1A1D26] text-[12px] font-medium leading-tight">
                                                                    <span className="text-[#FF9F0A] font-bold shrink-0">{idx + 1}.</span>
                                                                    <span className="line-clamp-2">{step}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </div>
                                                
                                                {/* Evening */}
                                                <div className="bg-gradient-to-br from-[#F0F7FF] to-[#F5F9FF] border border-[#CCE4FF] rounded-[20px] p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#0A84FF]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                                    <div className="relative">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A84FF] to-[#0066CC] flex items-center justify-center shadow-lg shadow-[#0A84FF]/30">
                                                                <Moon size={16} className="text-white" />
                                                            </div>
                                                            <span className="font-bold text-[#0A84FF] text-xs uppercase tracking-wide">PM</span>
                                                        </div>
                                                        <ol className="space-y-2">
                                                            {result?.routine_advice?.evening?.slice(0, 4).map((step, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-[#1A1D26] text-[12px] font-medium leading-tight">
                                                                    <span className="text-[#0A84FF] font-bold shrink-0">{idx + 1}.</span>
                                                                    <span className="line-clamp-2">{step}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ingredients - Modern Split Card */}
                                        <div className="px-4 mb-6 animate-slide-up-fade" style={{ animationDelay: '0.3s' }}>
                                            <h3 className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF] font-bold mb-3">Ingredient Guide</h3>
                                            <div className="bg-white border border-[#E5E7EB] rounded-[24px] overflow-hidden shadow-sm">
                                                {/* Look For */}
                                                <div className="p-5 border-b border-[#E5E7EB]">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5A8F53] to-[#3D6B38] flex items-center justify-center shadow-lg shadow-[#5A8F53]/20">
                                                            <CheckCircle2 size={16} className="text-white" />
                                                        </div>
                                                        <span className="font-bold text-[#5A8F53] text-sm">Look For</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result?.recommendations?.ingredients_to_look_for?.map((ing, idx) => (
                                                            <span key={idx} className="bg-[#E8F3E6] text-[#3D6B38] px-3 py-1.5 rounded-full text-xs font-semibold">
                                                                {ing}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Avoid */}
                                                <div className="p-5 bg-[#FAFAFA]">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF453A] to-[#CC362E] flex items-center justify-center shadow-lg shadow-[#FF453A]/20">
                                                            <XCircle size={16} className="text-white" />
                                                        </div>
                                                        <span className="font-bold text-[#FF453A] text-sm">Avoid</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result?.recommendations?.ingredients_to_avoid?.map((ing, idx) => (
                                                            <span key={idx} className="bg-[#FFEEEE] text-[#CC362E] px-3 py-1.5 rounded-full text-xs font-semibold">
                                                                {ing}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="px-4 pb-6">
                                            <button
                                                onClick={reset}
                                                className="w-full bg-gradient-to-r from-[#1A1D26] to-[#2D3748] hover:from-[#2D3748] hover:to-[#1A1D26] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-[#1A1D26]/20"
                                            >
                                                <Camera size={18} /> New Scan
                                            </button>
                                        </div>
                            </div>
                        )}

                        {/* Chat View */}
                        {scanStep === 'chat' && result && (
                            <div className="flex-1 min-h-0 flex flex-col animate-fade-in bg-white mt-2 overflow-hidden">
                                <ChatInterface
                                    contextData={getChatContextData()}
                                    initialMessage={productParam ? `I just scanned a product: "${productParam}". Can you tell me if this product is good for my skin and if it's compatible with my current routine?` : undefined}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Step 3: Analyzing Full-screen Overlay ─── */}
                {isAnalyzing && (
                    <div className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-[#E8F3E6] flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-[#5A8F53] border-t-transparent animate-spin opacity-50"></div>
                            <Loader2 className="animate-spin text-[#5A8F53]" size={40} />
                        </div>
                        <h2 className="text-3xl font-bold mb-3 font-serif text-[#1A1D26]">Analyzing Your Skin</h2>
                        <p className="text-[#6B7280] max-w-xs text-lg">Our AI is mapping your facial features and identifying skin concerns...</p>
                    </div>
                )}
            </div>
            {/* ─── Step 2: Camera Modal ─── */}
            {scanStep === 'camera' && (
                <div className="fixed inset-0 z-[60] bg-black animate-fade-in">
                    <CameraCapture
                        onCapture={handleCapture}
                        onClose={() => setScanStep('overview')}
                        onAnalyze={handleAnalyzeFromCamera}
                        isAnalyzing={isAnalyzing}
                        analysisError={cameraAnalysisError}
                    />
                </div>
            )}
        </div>
    );
}
