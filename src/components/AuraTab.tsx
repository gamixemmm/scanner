"use client";

import React, { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';

export default function AuraTab() {
    const [contextData, setContextData] = useState<any>(null);

    useEffect(() => {
        let savedAnalysis = null;
        try {
            const savedData = localStorage.getItem('aura_face_analysis');
            if (savedData) savedAnalysis = JSON.parse(savedData);
        } catch { /* ignore */ }

        let onboarding = null;
        try {
            const data = localStorage.getItem('aura_onboarding_profile');
            if (data) onboarding = JSON.parse(data);
        } catch { /* ignore */ }

        setContextData({
            userProfile: {
                skinType: savedAnalysis?.skinType || onboarding?.skinType || 'Unknown',
                concerns: savedAnalysis?.concerns || onboarding?.concerns?.join(', ') || '',
                currentIngredients: savedAnalysis?.ingredients || '',
                allergies: onboarding?.allergies || [],
                goals: onboarding?.goals || [],
            },
            analysisResult: savedAnalysis?.result || null,
            hasFaceAnalysis: !!savedAnalysis?.hasAnalysis,
        });
    }, []);

    if (!contextData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#5A8F53] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <ChatInterface contextData={contextData} />
        </div>
    );
}
