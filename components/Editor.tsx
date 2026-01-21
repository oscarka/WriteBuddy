import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Project, AIMode, AIStyle, Suggestion, Chapter } from '../types';
import { AIService } from '../services/geminiService';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ActivityBar } from './ActivityBar';
import { InteractionDemo } from './InteractionDemo';
import { Sparkles, Download, PanelRightClose, PanelRightOpen, FileText } from 'lucide-react';

interface Props {
    project: Project;
    onUpdate: (project: Project) => void;
    onBack: () => void;
}

interface DiffSegment {
    type: 'added' | 'removed' | 'unchanged';
    text: string;
}

export const Editor: React.FC<Props> = ({ project, onUpdate, onBack }) => {
    const [content, setContent] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [diffPreview, setDiffPreview] = useState<DiffSegment[] | null>(null);
    const [originalContent, setOriginalContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'files' | 'search' | 'ai' | 'settings'>('files');
    const [showAiPanel, setShowAiPanel] = useState(true); // Independent AI Panel State - Default OPEN
    const [showDemo, setShowDemo] = useState(false);
    const [lastSelection, setLastSelection] = useState<{ text: string, range: Range } | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const currentChapter = project.chapters.find(c => c.id === project.currentChapterId) || project.chapters[0];

    // Safety check for empty project
    if (!currentChapter) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <p className="text-gray-500">项目数据正在加载中...</p>
                    <button onClick={onBack} className="text-indigo-600 hover:underline">返回首页</button>
                </div>
            </div>
        );
    }

    // Calculate Chinese/English word count
    const calculateWordCount = (text: string): number => {
        if (!text) return 0;
        return text.replace(/\s+/g, '').length;
    };

    // --- HIGHLIGHT API HELPER ---
    const updateHighlight = (range: Range | null) => {
        // @ts-ignore - CSS Highlight API is experimental but supported in modern browsers
        if (typeof CSS !== 'undefined' && CSS.highlights) {
            if (range) {
                // @ts-ignore
                const highlight = new Highlight(range);
                // @ts-ignore
                CSS.highlights.set('ai-context', highlight);
            } else {
                // @ts-ignore
                CSS.highlights.clear();
            }
        }
    };

    // --- DIFF LOGIC BEGIN ---
    const calculateDiff = (oldText: string, newText: string): DiffSegment[] => {
        let commonPrefixLen = 0;
        while (commonPrefixLen < oldText.length && commonPrefixLen < newText.length && oldText[commonPrefixLen] === newText[commonPrefixLen]) {
            commonPrefixLen++;
        }

        let commonSuffixLen = 0;
        while (commonSuffixLen < (oldText.length - commonPrefixLen) && commonSuffixLen < (newText.length - commonPrefixLen) &&
            oldText[oldText.length - 1 - commonSuffixLen] === newText[newText.length - 1 - commonSuffixLen]) {
            commonSuffixLen++;
        }

        const prefix = oldText.substring(0, commonPrefixLen);
        const suffix = oldText.substring(oldText.length - commonSuffixLen);

        const midOld = oldText.substring(commonPrefixLen, oldText.length - commonSuffixLen);
        const midNew = newText.substring(commonPrefixLen, newText.length - commonSuffixLen);

        const segments: DiffSegment[] = [];
        if (prefix) segments.push({ type: 'unchanged', text: prefix });
        if (midOld) segments.push({ type: 'removed', text: midOld });
        if (midNew) segments.push({ type: 'added', text: midNew });
        if (suffix) segments.push({ type: 'unchanged', text: suffix });

        return segments;
    };

    const renderDiffToEditor = useCallback((segments?: DiffSegment[]) => {
        const segmentsToRender = segments || diffPreview;
        if (!editorRef.current || !segmentsToRender) return;

        const editor = editorRef.current;
        editor.textContent = ''; // Clear content safely

        segmentsToRender.forEach((segment) => {
            const span = document.createElement('span');
            span.textContent = segment.text;

            if (segment.type === 'added') {
                span.className = 'bg-green-100 text-green-900 rounded py-0.5 transition-colors';
            } else if (segment.type === 'removed') {
                span.className = 'bg-red-100 text-red-900 line-through decoration-red-300 rounded py-0.5 opacity-70 transition-colors';
            } else {
                span.className = 'text-gray-700';
            }

            editor.appendChild(span);
        });
    }, [diffPreview]);
    // --- DIFF LOGIC END ---

    const getEditorText = (): string => {
        if (!editorRef.current) return '';
        return editorRef.current.innerText || editorRef.current.textContent || '';
    };

    const updateProjectContent = (newContent: string) => {
        const updatedChapters = project.chapters.map(c =>
            c.id === project.currentChapterId ? { ...c, content: newContent } : c
        );
        const totalWordCount = updatedChapters.reduce((sum, ch) => sum + calculateWordCount(ch.content), 0);
        onUpdate({
            ...project,
            chapters: updatedChapters,
            lastEdited: Date.now(),
            wordCount: totalWordCount
        });
    };

    const handleEditorInput = () => {
        setIsEditing(true);
        const newContent = getEditorText();
        setContent(newContent);
        if (diffPreview) {
            setDiffPreview(null);
            setOriginalContent('');
            updateHighlight(null);
        }
        updateProjectContent(newContent);
    };

    // --- MUSE & SCRIBE: Ghost Preview & Selection ---
    const handleSelectionChange = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) return;

        // Only capture if clicking inside the editor
        if (!editorRef.current.contains(selection.anchorNode)) return;

        if (selection.isCollapsed) {
            setLastSelection(null);
            updateHighlight(null); // Clear highlight on click-away inside editor (if collapsed)
            return;
        }

        const text = selection.toString();
        if (text.length > 0) {
            const range = selection.getRangeAt(0).cloneRange();
            setLastSelection({
                text,
                range
            });
            updateHighlight(range); // PERMANENT HIGHLIGHT
        }
    }, []);

    const handleGhostPreview = (draftText: string | null, targetText?: string) => {
        if (!draftText) {
            setDiffPreview(null);
            return;
        }
        const currentText = getEditorText();
        const textToReplace = targetText || lastSelection?.text;

        if (!textToReplace) return;

        const index = currentText.indexOf(textToReplace);
        if (index === -1) return;

        const prefix = currentText.substring(0, index);
        const suffix = currentText.substring(index + textToReplace.length);

        // CALCULATE LOCAL DIFF
        const localSegments = calculateDiff(textToReplace, draftText);

        const segments: DiffSegment[] = [];
        if (prefix) segments.push({ type: 'unchanged', text: prefix });
        segments.push(...localSegments);
        if (suffix) segments.push({ type: 'unchanged', text: suffix });

        setDiffPreview(segments);
    };

    const handleApplyDraft = (draftText: string, targetText?: string) => {
        const currentText = getEditorText();
        const textToReplace = targetText || lastSelection?.text;

        if (!textToReplace || !currentText.includes(textToReplace)) return;

        const newText = currentText.replace(textToReplace, draftText);

        setContent(newText);
        if (editorRef.current) editorRef.current.textContent = newText;
        setDiffPreview(null);
        setLastSelection(null);
        updateHighlight(null); // Clear highlight on apply
        updateProjectContent(newText);
    };

    const handleClearSelection = () => {
        setLastSelection(null);
        updateHighlight(null); // Clear highlight on X
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }
    };

    const runAiTool = async (tool: string) => {
        setIsAiLoading(true);
        try {
            const currentText = getEditorText() || content;
            let result = '';
            let newContent = '';

            if (tool === 'continue') {
                const localContext = currentText.slice(-2000);
                const globalOutline = project.chapters.map((ch, i) =>
                    `Chapter ${i + 1}: ${ch.title} (Length: ${ch.content.length})`
                ).join('\n');

                const messages = [
                    { role: 'system', content: `You are a skilled creative writing assistant.\nProject: ${project.title}\nStyle: ${project.style}\n\nTask: Continue writing.` },
                    { role: 'user', content: localContext }
                ];

                result = await AIService.chatWithProject(project.id, project.kbId, messages);
                newContent = currentText + result;

            } else if (tool === 'polish') {
                const selection = window.getSelection();
                const selectedText = selection?.toString();

                if (selectedText) {
                    const messages = [
                        { role: 'system', content: 'You are a professional editor. Improve the following text.' },
                        { role: 'user', content: selectedText }
                    ];
                    const polished = await AIService.chatWithProject(project.id, project.kbId, messages);
                    newContent = currentText.replace(selectedText, polished);
                } else {
                    newContent = currentText;
                }
            }

            if (newContent !== currentText) {
                setOriginalContent(currentText);
                const diff = calculateDiff(currentText, newContent);
                setDiffPreview(diff);
                setContent(newContent);
                setIsEditing(false);
            }
        } catch (e) {
            console.error("AI Tool Error:", e);
            alert("AI Service failed to respond.");
        } finally {
            setIsAiLoading(false);
        }
    };

    // Sync initial
    useEffect(() => {
        setContent(currentChapter.content);
        setDiffPreview(null);
        if (editorRef.current) editorRef.current.textContent = currentChapter.content;
        updateHighlight(null);
    }, [currentChapter.id]);

    // Trigger Diff Render
    useEffect(() => {
        if (diffPreview && editorRef.current && !isEditing) {
            renderDiffToEditor();
            updateHighlight(null);
        } else if (!diffPreview && editorRef.current && !isEditing) {
            if (editorRef.current.textContent !== content) {
                editorRef.current.textContent = content;
            }
        }
    }, [diffPreview, content, renderDiffToEditor, isEditing]);

    // Export Logic
    const exportToMarkdown = () => {
        let markdown = `# ${project.title}\n\n`;
        project.chapters.forEach(ch => { markdown += `## ${ch.title}\n\n${ch.content}\n\n`; });
        downloadFile(markdown, `${project.title}.md`, 'text/markdown');
    };
    const exportToWord = () => {
        const html = `<html><body><h1>${project.title}</h1>${project.chapters.map(ch => `<h2>${ch.title}</h2><p>${ch.content}</p>`).join('')}</body></html>`;
        downloadFile(html, `${project.title}.doc`, 'application/msword');
    };
    const exportToPDF = () => { window.print(); };
    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="h-screen flex flex-row bg-white overflow-hidden relative">
            <style>{`
        ::highlight(ai-context) {
          background-color: #c7d2fe;
          color: #1e1b4b;
          text-decoration: underline decoration-indigo-400;
        }
      `}</style>

            {/* Demo Overlay */}
            {showDemo && <InteractionDemo onClose={() => setShowDemo(false)} />}

            {/* 1. Activity Bar */}
            <ActivityBar
                activeTab={activeSidebarTab}
                onTabChange={(t) => {
                    if (t === 'ai') {
                        setShowAiPanel(!showAiPanel); // Toggle AI panel independent of Left Sidebar
                    } else {
                        setActiveSidebarTab(t); // Switch Left Sidebar Tab
                    }
                }}
                onLaunchDemo={() => setShowDemo(true)}
            />

            {/* 2. Left Sidebar (Files, Search, etc.) */}
            {(activeSidebarTab === 'files' || activeSidebarTab === 'search') && (
                <div className="w-64 border-r bg-gray-50 flex flex-col shrink-0 h-full">
                    <LeftSidebar
                        project={project}
                        onUpdate={onUpdate}
                        onSelectChapter={(id) => onUpdate({ ...project, currentChapterId: id })}
                    />
                </div>
            )}

            {/* 3. Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white h-screen">
                {/* Top Navbar */}
                <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 z-20 relative">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-gray-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">
                            <span>←</span> Back
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex flex-col">
                            <h1 className="font-serif font-bold text-gray-800 leading-none">{project.title}</h1>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{currentChapter.title}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400 font-mono">Words: {project.wordCount}</span>

                        {/* NEW AI PANEL TOGGLE */}
                        <button
                            onClick={() => setShowAiPanel(!showAiPanel)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${showAiPanel
                                ? 'bg-indigo-100 text-indigo-700 shadow-inner'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                                }`}
                        >
                            <Sparkles size={14} className={showAiPanel ? "fill-indigo-400 text-indigo-500" : ""} />
                            {showAiPanel ? 'Copilot On' : 'Copilot Off'}
                        </button>

                        <div className="h-4 w-px bg-gray-200" />

                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                <Download size={14} /> Export ▼
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[160px] z-50">
                                    <button onClick={exportToMarkdown} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-3">📝 Markdown</button>
                                    <button onClick={exportToWord} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-3">📄 Word</button>
                                    <button onClick={exportToPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-3">📑 PDF</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Editor Canvas */}
                <main className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col items-center relative" style={{ overflowX: 'visible' }}>
                    <div className="w-full max-w-3xl bg-white shadow-sm my-10 p-16 md:p-24 relative" style={{ overflowX: 'visible', minHeight: '800px' }}>
                        <input
                            className="w-full text-4xl font-serif font-bold mb-12 outline-none text-gray-800 placeholder:text-gray-200"
                            value={currentChapter.title}
                            onChange={(e) => onUpdate({
                                ...project,
                                chapters: project.chapters.map(c => c.id === project.currentChapterId ? { ...c, title: e.target.value } : c)
                            })}
                        />

                        {!isEditing && getEditorText() && !diffPreview && (
                            <div className="absolute right-8 top-8 flex flex-col gap-3 animate-in fade-in duration-500">
                                <button onClick={() => runAiTool('polish')} className="p-3 bg-white border border-gray-200 shadow-lg rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-600 transition-all transform hover:scale-110" title="Polish Text">
                                    ✨
                                </button>
                                <button onClick={() => runAiTool('continue')} className="p-3 bg-white border border-gray-200 shadow-lg rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-600 transition-all transform hover:scale-110" title="Continue Writing">
                                    ✍️
                                </button>
                            </div>
                        )}

                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            onBlur={() => setIsEditing(false)}
                            onMouseUp={handleSelectionChange}
                            onKeyUp={handleSelectionChange}
                            className="w-full text-base leading-loose outline-none text-gray-700 placeholder:text-gray-300 selection:bg-indigo-100 whitespace-pre-wrap break-words pb-4"
                            style={{ minHeight: '200px', caretColor: '#4f46e5' }}
                            data-placeholder={diffPreview ? '' : 'Start writing...'}
                        />

                        {isAiLoading && (
                            <div className="absolute inset-x-0 bottom-4 flex justify-center z-20">
                                <div className="bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm animate-pulse">
                                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                                    Synapse active...
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* 4. Right Sidebar (Copilot) - Now on RIGHT side */}
            {showAiPanel && (
                <RightSidebar
                    project={project}
                    selection={lastSelection ? { text: lastSelection.text } : null}
                    onPreview={handleGhostPreview}
                    onApply={handleApplyDraft}
                    onClearSelection={handleClearSelection}
                />
            )}
        </div>
    );
};
