
import React, { useState } from 'react';
import { Project, AIMode } from '../types';
import { AIService } from '../services/geminiService';

interface Props {
    project: Project;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export const RightSidebar: React.FC<Props> = ({ project }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'assistant', content: `Hi! I'm your creative copilot. I have context from your project "${project.title}". How can I help?` }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages); // Optimistic update
        setInput('');
        setIsLoading(true);

        try {
            // Prepare messages for API (stripped of IDs)
            const apiMessages = newMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Call Real Backend RAG Chat
            const responseText = await AIService.chatWithProject(
                project.id,
                project.kbId,
                apiMessages
            );

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'Sorry, I encountered an error accessing the knowledge base.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <aside className="w-80 border-l bg-white flex flex-col shrink-0 h-full shadow-xl shadow-gray-100 z-10">
            {/* Header */}
            <div className="h-14 border-b flex items-center px-6 justify-between bg-white">
                <span className="font-serif font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Copilot
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">{project.aiMode}</span>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100'
                                : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Ask AI about your assets..."
                        className="w-full resize-none rounded-xl border border-gray-200 p-3 pr-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none max-h-32 min-h-[44px]"
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        ➤
                    </button>
                </div>
                <div className="text-[10px] text-center text-gray-300 mt-2">
                    Connected to WeKnora Knowledge Base
                </div>
            </div>
        </aside>
    );
};
