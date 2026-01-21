import React, { useState } from 'react';
import { Sparkles, X, ChevronLeft, ChevronRight, Check, CornerDownLeft, FileText, Bot } from 'lucide-react';

export const InteractionDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // Demo State
    const [hasSelection, setHasSelection] = useState(false);
    const [showDraftCard, setShowDraftCard] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [cardVersion, setCardVersion] = useState(1);

    // Simulated Content
    const originalText = "监测站的显示器上，那条直线已经维持了三个世纪。直到今天，一个微弱的、不规则的波峰打破了死亡般的寂静。";
    const newTextV1 = "监测站的监控屏上，死寂了三百年的水平线突然颤抖。今日，一道微弱却不容忽视的波峰，如利刃般划破了恒久的沉默。";
    const newTextV2 = "三个世纪以来，监测站的屏幕如死水般平静。然而今天，那条代表静默的直线由于未知的力量产生了一丝震颤，随后是一个剧烈的波峰，彻底粉碎了千年的孤寂。";

    const currentNewText = cardVersion === 1 ? newTextV1 : newTextV2;

    return (
        <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col font-sans">
            {/* Header */}
            <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Concept Demo</div>
                    <h1 className="font-semibold text-gray-800">Muse & Scribe 交互演示</h1>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
                    <X size={16} /> 退出演示
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Editor Simulator */}
                <div className="flex-1 bg-[#fafafa] p-12 flex justify-center overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white shadow-sm min-h-[600px] p-16 relative transition-all duration-300">
                        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8">第一章：沉寂的频率</h2>

                        <div className="text-lg leading-loose text-gray-700 font-serif relative">
                            {/* Step 1: Clickable Paragraph */}
                            <p
                                className={`cursor-pointer transition-all duration-200 p-1 rounded ${hasSelection ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                                onClick={() => {
                                    setHasSelection(!hasSelection);
                                    setShowDraftCard(false);
                                }}
                            >
                                {!previewMode ? (
                                    // Normal State
                                    <>
                                        <span className={hasSelection ? "bg-indigo-200 text-indigo-900" : ""}>
                                            {originalText}
                                        </span>
                                        <span>它不是已知的脉冲星，也不是任何自然现象。那是节奏，一种带着绝望呼吸感的等待节奏。</span>
                                    </>
                                ) : (
                                    // Ghost Preview State
                                    <>
                                        <span className="text-indigo-600 bg-indigo-50 font-medium animate-in fade-in duration-300">
                                            {currentNewText}
                                        </span>
                                        <span className="opacity-50">它不是已知的脉冲星，也不是任何自然现象。那是节奏，一种带着绝望呼吸感的等待节奏。</span>
                                    </>
                                )}
                            </p>

                            {/* Interaction Hints */}
                            {!hasSelection && !previewMode && (
                                <div className="absolute -left-32 top-0 text-gray-400 text-xs w-24 text-right animate-pulse">
                                    👈 点击文字<br />模拟选中效果
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar Simulator */}
                <div className="w-[400px] bg-white border-l flex flex-col shadow-xl">
                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-6">
                        {/* User Message */}
                        {showDraftCard && (
                            <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
                                    把这段改写得更有张力一点，突出那种“死寂被打破”的震撼感。
                                </div>
                            </div>
                        )}

                        {/* AI Draft Card */}
                        {showDraftCard && (
                            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
                                <div className="flex items-center gap-2 mb-2 ml-1">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                                        <Sparkles size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Muse Copilot</span>
                                </div>

                                {/* DRAFT CARD UI */}
                                <div className="bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden ring-1 ring-indigo-50 group hover:ring-indigo-200 transition-all">
                                    {/* Card Header: Versions */}
                                    <div className="bg-indigo-50/50 border-b border-indigo-50 px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs font-medium text-indigo-700">
                                            <FileText size={12} />
                                            草稿建议
                                        </div>
                                        <div className="flex items-center gap-1 bg-white rounded-md border border-indigo-100 p-0.5">
                                            <button
                                                onClick={() => setCardVersion(1)}
                                                disabled={cardVersion === 1}
                                                className={`p-1 rounded hover:bg-gray-50 disabled:opacity-30 ${cardVersion === 1 ? 'text-indigo-600' : 'text-gray-400'}`}
                                            >
                                                <ChevronLeft size={12} />
                                            </button>
                                            <span className="text-[10px] w-8 text-center text-gray-500 font-mono">v{cardVersion}/2</span>
                                            <button
                                                onClick={() => setCardVersion(2)}
                                                disabled={cardVersion === 2}
                                                className={`p-1 rounded hover:bg-gray-50 disabled:opacity-30 ${cardVersion === 2 ? 'text-indigo-600' : 'text-gray-400'}`}
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4 bg-white">
                                        <p className="text-gray-800 text-sm leading-relaxed font-serif">
                                            {currentNewText}
                                        </p>
                                    </div>

                                    {/* Card Footer: Actions */}
                                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-2">
                                        <button
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95"
                                            onMouseEnter={() => setPreviewMode(true)}
                                            onMouseLeave={() => setPreviewMode(false)}
                                            onClick={() => alert("Demo: 内容将写入编辑器")}
                                        >
                                            <Check size={14} />
                                            替换选区
                                        </button>
                                        <button className="px-2 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors" title="插入到光标处">
                                            <CornerDownLeft size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tooltip hint */}
                                <div className="ml-2 mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                                    试着把鼠标悬停在“替换选区”按钮上
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t relative">
                        {/* Context Badge */}
                        {hasSelection && !showDraftCard && (
                            <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md animate-in slide-in-from-bottom-2 fade-in flex items-center gap-1 z-10">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                已选中 52 字
                                <button onClick={() => setHasSelection(false)} className="ml-1 hover:text-indigo-200"><X size={10} /></button>
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                placeholder={hasSelection ? "告诉 AI 如何修改这段文字..." : "输入指令..."}
                                className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                disabled={showDraftCard}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setShowDraftCard(true);
                                }}
                            />
                            <button
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${hasSelection ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                                onClick={() => setShowDraftCard(true)}
                            >
                                <CornerDownLeft size={14} />
                            </button>
                        </div>

                        {hasSelection && !showDraftCard && (
                            <div className="absolute -left-32 top-6 text-indigo-500 text-xs w-24 text-right animate-bounce">
                                ✨ 上下文徽章<br />自动出现
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
