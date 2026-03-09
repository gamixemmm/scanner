"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, ArrowUp, Plus, MessageSquareText, X } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatInterfaceProps {
    contextData: any;
    initialMessage?: string;
    onClose?: () => void;
}

const SUGGESTION_CHIPS = [
    "Should I wear sunscreen when indoors?",
    "How to take care of sensitive skin?",
    "What ingredients help with acne?",
    "Best nighttime skincare routine?",
];

export default function ChatInterface({ contextData, initialMessage, onClose }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi there! I'm your digital cosmetologist. Having concerns about skin or hair care? I'm always here to give you prompt advice and help you choose safe cosmetics.\nPlease note that I'm a skin-savvy robot, not a certified doctor. Consult a specialist before following my tips."
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [typingIndex, setTypingIndex] = useState(0);  // Start typing the first message
    const [typedLength, setTypedLength] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ id: string; preview: string; date: string; messages: Message[] }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load chat history from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('derma_chat_history');
            if (saved) setChatHistory(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const saveChatHistory = useCallback((history: typeof chatHistory) => {
        setChatHistory(history);
        localStorage.setItem('derma_chat_history', JSON.stringify(history));
    }, []);

    const defaultWelcome: Message = {
        role: 'assistant',
        content: "Hi there! I'm your digital cosmetologist. Having concerns about skin or hair care? I'm always here to give you prompt advice and help you choose safe cosmetics.\nPlease note that I'm a skin-savvy robot, not a certified doctor. Consult a specialist before following my tips."
    };

    const handleNewChat = useCallback(() => {
        // Save current chat if it has user messages
        const hasUserMessages = messages.some(m => m.role === 'user');
        if (hasUserMessages) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            const preview = firstUserMsg?.content.slice(0, 60) || 'Chat';
            const newEntry = {
                id: Date.now().toString(),
                preview,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                messages: [...messages],
            };
            saveChatHistory([newEntry, ...chatHistory].slice(0, 20)); // Keep last 20
        }
        setMessages([defaultWelcome]);
        setShowSuggestions(true);
        setShowHistory(false);
        setTypingIndex(0); // Type the welcome message
        setTypedLength(0);
    }, [messages, chatHistory, saveChatHistory]);

    const loadChat = useCallback((chat: typeof chatHistory[0]) => {
        setMessages(chat.messages);
        setShowSuggestions(false);
        setShowHistory(false);
        setTypingIndex(-1); // Don't type when loading history
        setTypedLength(0);
    }, []);

    const deleteChat = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = chatHistory.filter(c => c.id !== id);
        saveChatHistory(updated);
    }, [chatHistory, saveChatHistory]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typedLength]);

    // Typewriter effect
    useEffect(() => {
        if (typingIndex < 0 || typingIndex >= messages.length) return;
        const msg = messages[typingIndex];
        if (!msg || msg.role !== 'assistant') return;
        const fullLen = msg.content.length;
        if (typedLength >= fullLen) {
            setTypingIndex(-1);
            return;
        }
        const timer = setTimeout(() => {
            // Type faster for longer messages (batch more chars)
            const speed = fullLen > 300 ? 4 : fullLen > 100 ? 2 : 1;
            setTypedLength(prev => Math.min(prev + speed, fullLen));
        }, 12);
        return () => clearTimeout(timer);
    }, [typingIndex, typedLength, messages]);

    useEffect(() => {
        if (initialMessage && !initialMessageSent && initialMessage.includes('scanned')) {
            setInitialMessageSent(true);
            setShowSuggestions(false);
            const userMsg: Message = { role: 'user', content: initialMessage };
            setMessages([userMsg]);
            setIsLoading(true);

            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [userMsg], contextData }),
            })
                .then(async (response) => {
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to send message');
                    }
                    return response.json();
                })
                .then((data) => {
                    setMessages([userMsg, { role: 'assistant', content: data.content }]);
                    setTypingIndex(1);
                    setTypedLength(0);
                })
                .catch((error: any) => {
                    setMessages([
                        userMsg,
                        { role: 'assistant', content: `I'm sorry, I'm having trouble connecting right now. Error: ${error.message}. Please try again.` }
                    ]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [initialMessage, initialMessageSent, contextData]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        setShowSuggestions(false);
        const userMsg: Message = { role: 'user', content: text };
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, contextData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data = await response.json();
            const newAll = [...newMessages, { role: 'assistant' as const, content: data.content }];
            setMessages(newAll);
            setTypingIndex(newAll.length - 1);
            setTypedLength(0);
        } catch (error: any) {
            setMessages([
                ...newMessages,
                { role: 'assistant', content: `I'm sorry, I'm having trouble connecting right now. Error: ${error.message}. Please try again.` }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => sendMessage(input);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestionClick = (text: string) => {
        sendMessage(text);
    };

    const renderMessageContent = (text: string) => {
        const lines = text.split('\n');
        const elements: React.ReactElement[] = [];
        let currentList: string[] = [];
        let listKey = 0;

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2 ml-1">
                        {currentList.map((item, i) => (
                            <li key={i} className="text-[#374151] text-[14px] leading-relaxed">{parseBold(item)}</li>
                        ))}
                    </ul>
                );
                currentList = [];
            }
        };

        const parseBold = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-[#1A1D26] font-semibold">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            });
        };

        lines.forEach((line, idx) => {
            if (line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={`h3-${idx}`} className="text-[14px] font-bold text-[#5A8F53] mt-3 mb-1.5">
                        {line.slice(4)}
                    </h3>
                );
            } else if (line.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={`h2-${idx}`} className="text-[15px] font-bold text-[#1A1D26] mt-3 mb-1.5">
                        {line.slice(3)}
                    </h2>
                );
            } else if (line.match(/^[-*]\s+/)) {
                currentList.push(line.slice(2));
            } else if (line.trim() === '') {
                flushList();
                elements.push(<div key={`br-${idx}`} className="h-1.5" />);
            } else {
                flushList();
                elements.push(
                    <p key={`p-${idx}`} className="text-[#374151] leading-relaxed text-[14px]">
                        {parseBold(line)}
                    </p>
                );
            }
        });

        flushList();
        return elements;
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden relative">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#F0F0F0] shrink-0">
                <h2 className="text-[22px] font-bold text-[#1A1D26] tracking-tight">Skin Helper</h2>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            showHistory ? 'bg-[#5A8F53] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                        }`}
                        title="Past chats"
                    >
                        <MessageSquareText size={18} />
                    </button>
                    <button
                        onClick={handleNewChat}
                        className="w-9 h-9 rounded-xl bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors"
                        title="New chat"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Chat History Panel */}
            {showHistory && (
                <div className="absolute inset-x-0 top-[56px] bottom-0 z-30 bg-white flex flex-col">
                    <div className="px-5 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
                        <h3 className="text-[16px] font-bold text-[#1A1D26]">Past Chats</h3>
                        <button onClick={() => setShowHistory(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <MessageSquareText size={40} className="text-[#E5E7EB] mb-3" />
                                <p className="text-[#9CA3AF] text-sm font-medium">No past chats yet</p>
                                <p className="text-[#D1D5DB] text-xs mt-1">Your conversations will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#F3F4F6]">
                                {chatHistory.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => loadChat(chat)}
                                        className="w-full text-left px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors flex items-start gap-3 cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-[#E8F3E6] flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageSquareText size={14} className="text-[#5A8F53]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-medium text-[#1A1D26] truncate">{chat.preview}</p>
                                            <p className="text-[12px] text-[#9CA3AF] mt-0.5">{chat.date}</p>
                                        </div>
                                        <button
                                            onClick={(e) => deleteChat(chat.id, e)}
                                            className="text-[#D1D5DB] hover:text-[#EF4444] p-1 shrink-0 mt-0.5 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Area — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 bg-white">
                {messages.map((msg, idx) => {
                    const isTypingThis = idx === typingIndex;
                    const displayContent = isTypingThis ? msg.content.substring(0, typedLength) : msg.content;
                    
                    return (
                        <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {/* Avatar for assistant */}
                            {msg.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full shrink-0 mt-1 overflow-hidden bg-[#E8F3E6]">
                                    <img 
                                        src="/skin-helper-avatar.png" 
                                        alt="Skin Helper" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback to emoji if image fails
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.parentElement!.innerHTML = '<span style="font-size: 18px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🌿</span>';
                                        }}
                                    />
                                </div>
                            )}

                            <div className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed
                                ${msg.role === 'user'
                                    ? 'bg-[#5A8F53] text-white rounded-[20px] rounded-br-[6px]'
                                    : 'bg-[#F3F4F6] text-[#374151] rounded-[20px] rounded-tl-[6px]'
                                }`}
                            >
                                {msg.role === 'user'
                                    ? <p>{displayContent}</p>
                                    : (
                                        <>
                                            {renderMessageContent(displayContent)}
                                            {isTypingThis && (
                                                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#5A8F53] animate-pulse"></span>
                                            )}
                                        </>
                                    )
                                }
                            </div>
                        </div>
                    );
                })}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                        <div className="w-8 h-8 rounded-full shrink-0 mt-1 overflow-hidden bg-[#E8F3E6]">
                            <img 
                                src="/skin-helper-avatar.png" 
                                alt="Skin Helper" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="px-5 py-3.5 rounded-[20px] rounded-tl-[6px] bg-[#F3F4F6] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce"></span>
                            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions + Input Area */}
            <div className="border-t border-[#F0F0F0] bg-white">
                {/* Suggestion Chips */}
                {showSuggestions && messages.length <= 1 && (
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[15px] font-bold text-[#1A1D26] mb-3">
                            What would you like to know more about?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SUGGESTION_CHIPS.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSuggestionClick(chip)}
                                    className="text-left px-3.5 py-2.5 rounded-2xl border border-[#5A8F53]/30 text-[#5A8F53] text-[13px] font-medium 
                                               hover:bg-[#E8F3E6] active:scale-[0.98] transition-all duration-200 leading-snug"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Text Input */}
                <div className="px-4 py-3">
                    <div className="flex items-end gap-2 bg-[#F3F4F6] rounded-full px-4 py-1.5">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your question here"
                            className="flex-1 bg-transparent py-2 text-[14px] text-[#1A1D26] placeholder-[#9CA3AF] focus:outline-none resize-none leading-snug"
                            rows={1}
                            style={{ minHeight: '36px', maxHeight: '80px' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 mb-0.5
                                ${input.trim() && !isLoading
                                    ? 'bg-[#5A8F53] text-white shadow-sm active:scale-95'
                                    : 'bg-[#D1D5DB] text-white cursor-not-allowed'
                                }`}
                        >
                            {isLoading 
                                ? <Loader2 size={16} className="animate-spin" /> 
                                : <ArrowUp size={18} strokeWidth={2.5} />
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
