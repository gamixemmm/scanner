"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, ShieldAlert } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatInterfaceProps {
    contextData: any; // The initial analysis result and user profile
}

export default function ChatInterface({ contextData }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hello! I'm Aura, your personal cosmetologist. I've analyzed your profile and we have some great starting points. What specific questions do you have about your skincare routine or recommended ingredients?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: newMessages,
                    contextData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            setMessages([...newMessages, { role: 'assistant', content: data.content }]);
        } catch (error) {
            console.error(error);
            setMessages([
                ...newMessages,
                { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Basic markdown parser for bold text in chat
    const renderMessageContent = (text: string) => {
        // Split by **text** and return fragments
        // This handles basic bolding which the AI frequently uses for ingredients
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="flex flex-col h-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-inner relative">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-3 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <Sparkles size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white/90">Aura Personal Cosmetologist</h3>
                    <p className="text-xs text-white/50">Online and ready to advise</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>

                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center -mt-1
              ${msg.role === 'user' ? 'bg-white/10' : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'}
            `}>
                            {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                        </div>

                        <div className={`p-4 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user'
                                ? 'bg-white/10 text-white/90 rounded-tr-sm'
                                : 'bg-black/50 text-white/80 border border-white/5 rounded-tl-sm shadow-sm'
                            }
            `}>
                            {renderMessageContent(msg.content)}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center -mt-1 bg-gradient-to-br from-violet-600 to-fuchsia-600">
                            <Sparkles size={16} className="animate-pulse" />
                        </div>
                        <div className="p-4 rounded-2xl bg-black/50 text-white/80 border border-white/5 rounded-tl-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce"></span>
                            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce opacity-75" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce opacity-50" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-md">
                <div className="relative flex items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about ingredients, products, or steps..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                        rows={1}
                        style={{ minHeight: '46px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <div className="mt-2 text-center flex items-center justify-center gap-2 text-white/30 text-[10px]">
                    <ShieldAlert size={12} />
                    <span>Aura acts as a cosmetologist and never provides medical diagnoses or treatments.</span>
                </div>
            </div>
        </div>
    );
}
