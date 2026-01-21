import React, { useState, useEffect, useRef } from 'react';
import { Project, AIMode } from '../types';
import { AIService } from '../services/geminiService';
import { Sparkles, Check, CornerDownLeft, FileText, ChevronLeft, ChevronRight, X, BrainCircuit, Maximize2, Minimize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
    project: Project;
    selection: { text: string } | null;
    onPreview: (draft: string | null, targetText?: string) => void;
    onApply: (draft: string, targetText?: string) => void;
    onClearSelection?: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: 'chat' | 'draft';
    targetText?: string;
}

// --- SUB-COMPONENTS ---

const ExpandedModal: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                        <Sparkles size={18} />
                        <span>AI Full Response</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    <p className="text-gray-800 text-lg leading-relaxed font-serif whitespace-pre-wrap max-w-3xl mx-auto">
                        {content}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ExpandableMessage: React.FC<{ content: string }> = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const THRESHOLD = 100; // Character limit for preview
    const shouldCollapse = content.length > THRESHOLD;
    const [showModal, setShowModal] = useState(false);

    if (!shouldCollapse) {
        return <div className="leading-relaxed whitespace-pre-wrap">{content}</div>;
    }

    return (
        <div className="relative">
            <div
                className={`leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'overflow-hidden mask-bottom' : ''}`}
                style={!isExpanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' } : {}}
            >
                {content}
            </div>
            <div className="mt-2">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                >
                    <Maximize2 size={12} />
                    展开全文 (Read Full)
                </button>
            </div>
            {showModal && <ExpandedModal content={content} onClose={() => setShowModal(false)} />}
        </div>
    );
};

const DraftCard: React.FC<{
    content: string;
    targetText?: string;
    onPreview: (text: string | null, target?: string) => void;
    onApply: (text: string, target?: string) => void;
}> = ({ content, targetText, onPreview, onApply }) => {
    return (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 my-2">
            <div className="bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden ring-1 ring-indigo-50 group hover:ring-indigo-200 transition-all">
                <div className="bg-indigo-50/50 border-b border-indigo-50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-700">
                        <Sparkles size={12} />
                        Draft Suggestion
                    </div>
                </div>

                <div className="p-4 bg-white">
                    <p className="text-gray-800 text-sm leading-relaxed font-serif whitespace-pre-wrap line-clamp-4">
                        {content}
                    </p>
                </div>

                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <button
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                        onMouseEnter={() => onPreview(content, targetText)}
                        onMouseLeave={() => onPreview(null)}
                        onClick={() => onApply(content, targetText)}
                    >
                        <Check size={14} />
                        Apply
                    </button>
                    <button className="px-2 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors" title="Insert">
                        <CornerDownLeft size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RightSidebar: React.FC<Props> = ({ project, selection, onPreview, onApply, onClearSelection }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]); // Empty initially to show watermark
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const isContextual = !!selection;
        const currentSelectionText = selection?.text;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Dynamic Status
        if (project.kbId) {
            setLoadingStatus('Searching Knowledge Base...');
        } else {
            setLoadingStatus('Thinking...');
        }

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            let prompt = input;
            if (isContextual && currentSelectionText) {
                prompt = `[Context: "${currentSelectionText}"]\nUser Instruction: ${input}\n\nPlease generate a revised version or continuation based on the context and instruction. Direct output only.`;
            }

            const apiMessages = [...history, { role: 'user', content: prompt }];

            // Call API
            const responseText = await AIService.chatWithProject(
                project.id,
                project.kbId,
                apiMessages
            );

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                type: isContextual ? 'draft' : 'chat',
                targetText: isContextual ? currentSelectionText : undefined
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    return (
        <aside className="w-80 border-l bg-white flex flex-col shrink-0 h-full shadow-xl shadow-gray-100 z-10 relative">
            {/* Header */}
            <div className="h-14 border-b flex items-center px-6 justify-between bg-white shrink-0 z-20">
                <span className="font-serif font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Copilot
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">{project.aiMode}</span>
            </div>

            {/* Chat Area - STANDARD FLOW with Bottom Anchor */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30 relative">
                <div className="min-h-full flex flex-col justify-end p-4">
                    {messages.length === 0 && (
                        /* Welcome Watermark - Only visible when empty */
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 select-none pb-20">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-300">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-lg font-serif font-bold text-gray-400">Creative Copilot</h3>
                            <p className="text-sm text-gray-300 mt-2 text-center max-w-[200px]">
                                I'm ready to help you write, edit, and brainstorm.
                            </p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className="mb-4 animate-in slide-in-from-bottom-2 duration-300">
                            {msg.type === 'draft' ? (
                                <DraftCard
                                    content={msg.content}
                                    targetText={msg.targetText}
                                    onPreview={onPreview}
                                    onApply={onApply}
                                />
                            ) : (
                                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[90%] rounded-2xl p-3.5 text-sm shadow-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                                            }`}
                                    >
                                        <ExpandableMessage content={msg.content} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-2 items-start">
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-indigo-500 px-2">
                                <BrainCircuit size={12} className="animate-pulse" />
                                {loadingStatus}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area Group */}
            <div className="bg-white border-t z-20">
                {/* Context Badge */}
                {selection && (
                    <div className="px-4 pt-3 pb-1 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Targeting: "{(selection.text.length > 25 ? selection.text.slice(0, 25) + '...' : selection.text)}"
                            <button
                                onClick={() => onClearSelection ? onClearSelection() : onApply('')}
                                className="ml-1 hover:text-indigo-200 p-0.5 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-4 pt-2 relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={selection ? "Ask AI to edit this..." : "Ask me anything..."}
                        className="w-full resize-none rounded-xl border border-gray-200 p-3 pr-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none max-h-32 min-h-[44px]"
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-6 bottom-4 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        {isLoading ? <span className="animate-spin">↻</span> : '➤'}
                    </button>
                </div>
            </div>
        </aside>
    );
};
