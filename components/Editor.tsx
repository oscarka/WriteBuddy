import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Project, AIMode, AIStyle, Suggestion, Chapter } from '../types';
import { AIService } from '../services/geminiService';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ActivityBar } from './ActivityBar';

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

  const editorRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const currentChapter = project.chapters.find(c => c.id === project.currentChapterId) || project.chapters[0];

  // Calculate Chinese/English word count
  const calculateWordCount = (text: string): number => {
    if (!text) return 0;
    return text.replace(/\s+/g, '').length;
  };

  // --- RESTORED DIFF LOGIC BEGIN ---
  // Accept single diff segment
  const acceptDiffSegment = (segmentIndex: number) => {
    if (!diffPreview) return;

    const segment = diffPreview[segmentIndex];
    let newSegments: DiffSegment[] = [];

    if (segment.type === 'added') {
      newSegments = diffPreview.map((s, idx) =>
        idx === segmentIndex ? { type: 'unchanged' as const, text: s.text } : s
      );
    } else if (segment.type === 'removed') {
      newSegments = diffPreview.map((s, idx) =>
        idx === segmentIndex ? { type: 'removed' as const, text: s.text } : s
      );
    } else {
      newSegments = diffPreview;
    }

    // Build new content
    const newContent = newSegments
      .filter(s => s.type !== 'removed')
      .map(s => s.text)
      .join('');

    setContent(newContent);

    // Check if any diffs remain
    if (newSegments.some(s => s.type === 'added' || s.type === 'removed')) {
      setDiffPreview(newSegments);
      setTimeout(() => renderDiffToEditor(newSegments), 0);
    } else {
      setDiffPreview(null);
      setOriginalContent('');
      if (editorRef.current) editorRef.current.textContent = newContent;
    }

    // Update Project
    updateProjectContent(newContent);
  };

  const rejectDiffSegment = (segmentIndex: number) => {
    if (!diffPreview) return;
    const segment = diffPreview[segmentIndex];
    let newSegments: DiffSegment[] = [];

    if (segment.type === 'added') {
      newSegments = diffPreview.filter((_, idx) => idx !== segmentIndex);
    } else if (segment.type === 'removed') {
      newSegments = diffPreview.map((s, idx) =>
        idx === segmentIndex ? { type: 'unchanged' as const, text: s.text } : s
      );
    } else {
      newSegments = diffPreview;
    }

    const newContent = newSegments
      .filter(s => s.type !== 'removed')
      .map(s => s.text)
      .join('');

    setContent(newContent);

    if (newSegments.some(s => s.type === 'added' || s.type === 'removed')) {
      setDiffPreview(newSegments);
      setTimeout(() => renderDiffToEditor(newSegments), 0);
    } else {
      setDiffPreview(null);
      setOriginalContent('');
      if (editorRef.current) editorRef.current.textContent = newContent;
    }

    updateProjectContent(newContent); // Optional to sync rejection? No, just sync current state
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
  }

  // Render Diff to DOM directly (since contentEditable is messy with React)
  const renderDiffToEditor = useCallback((segments?: DiffSegment[]) => {
    const segmentsToRender = segments || diffPreview;
    if (!editorRef.current || !segmentsToRender) return;

    const editor = editorRef.current;
    while (editor.firstChild) editor.removeChild(editor.firstChild);

    segmentsToRender.forEach((segment, idx) => {
      const lines = segment.text.split('\n');
      lines.forEach((line, lineIdx) => {
        if (!line && lineIdx < lines.length - 1) {
          editor.appendChild(document.createElement('br'));
          return;
        }

        const container = document.createElement('div');
        container.className = 'group relative flex items-start min-h-[1.5rem]';

        // Gutter
        const gutter = document.createElement('div');
        gutter.className = 'w-1 shrink-0 mr-3 mt-0.5 ' + (
          segment.type === 'added' ? 'bg-green-500' :
            segment.type === 'removed' ? 'bg-red-500' : 'bg-transparent'
        );

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'flex-1 relative';

        const span = document.createElement('span');
        span.textContent = line;

        if (segment.type === 'added') {
          span.className = 'bg-green-100 text-green-900 px-1 py-0.5 rounded';
          // Buttons
          const btns = createDiffButtons(idx, 'Accept', 'Reject');
          contentWrapper.appendChild(span);
          contentWrapper.appendChild(btns);
        } else if (segment.type === 'removed') {
          span.className = 'bg-red-100 text-red-900 px-1 py-0.5 rounded line-through';
          const btns = createDiffButtons(idx, 'Confirm Del', 'Undo');
          contentWrapper.appendChild(span);
          contentWrapper.appendChild(btns);
        } else {
          span.className = 'text-gray-700';
          contentWrapper.appendChild(span);
        }

        container.appendChild(gutter);
        container.appendChild(contentWrapper);
        editor.appendChild(container);

        if (lineIdx < lines.length - 1) editor.appendChild(document.createElement('br'));
      });
    });
  }, [diffPreview]);

  const createDiffButtons = (idx: number, okText: string, cancelText: string) => {
    const div = document.createElement('div');
    div.className = 'absolute left-full top-0 ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white shadow-sm border p-1 rounded-lg';

    const okBtn = document.createElement('button');
    okBtn.textContent = '✓';
    okBtn.className = 'w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center';
    okBtn.title = okText;
    okBtn.onclick = (e) => { e.preventDefault(); acceptDiffSegment(idx); };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '×';
    cancelBtn.className = 'w-6 h-6 bg-gray-400 text-white rounded hover:bg-gray-500 flex items-center justify-center';
    cancelBtn.title = cancelText;
    cancelBtn.onclick = (e) => { e.preventDefault(); rejectDiffSegment(idx); };

    div.appendChild(okBtn);
    div.appendChild(cancelBtn);
    return div;
  };

  const calculateDiff = (oldText: string, newText: string): DiffSegment[] => {
    // Basic prefix/suffix matching diff algorithm
    if (newText.startsWith(oldText.trimEnd())) {
      // Append case
      const added = newText.slice(oldText.trimEnd().length);
      const segments: DiffSegment[] = [];
      if (oldText.trim()) segments.push({ type: 'unchanged', text: oldText });
      if (added.trim()) {
        const prefix = oldText && !oldText.endsWith('\n') ? '\n' : '';
        segments.push({ type: 'added', text: prefix + added });
      }
      return segments;
    }
    // Simple fallback: all changed (improve this later if needed)
    if (oldText !== newText) {
      return [
        { type: 'unchanged', text: oldText },
        { type: 'added', text: '\n' + newText.replace(oldText, '') } // simplified assumption
      ];
    }
    return [{ type: 'unchanged', text: oldText }];
  };
  // --- RESTORED DIFF LOGIC END ---

  const getEditorText = (): string => {
    if (!editorRef.current) return '';
    return editorRef.current.innerText || editorRef.current.textContent || '';
  };

  const handleEditorInput = () => {
    setIsEditing(true);
    const newContent = getEditorText();
    setContent(newContent);
    // Clear diff loop
    if (diffPreview) {
      setDiffPreview(null);
      setOriginalContent('');
    }
    updateProjectContent(newContent);
  };

  const runAiTool = async (tool: string) => {
    setIsAiLoading(true);
    try {
      const currentText = getEditorText() || content;
      let result = '';
      let newContent = '';

      if (tool === 'continue') {
        // --- 1. L1 Context: Local Window (Last 2000 chars) ---
        const localContext = currentText.slice(-2000);

        // --- 2. L2 Context: Global Outline ---
        const globalOutline = project.chapters.map((ch, i) =>
          `Chapter ${i + 1}: ${ch.title} (Length: ${ch.content.length})`
        ).join('\n');

        // --- 3. Construct Prompt for DeepSeek ---
        const messages = [
          {
            role: 'system',
            content: `You are a skilled creative writing assistant.
Current Project: "${project.title}"
Style: ${project.style}
Mode: ${project.aiMode}

Global Outline:
${globalOutline}

Task: Continue writing the story based on the context provided. Maintain the tone and characters.
Important: Output ONLY the continued text. Do not output explanations.`
          },
          {
            role: 'user',
            content: localContext
          }
        ];

        // --- 4. Call WeKnora with KB ID (L3 RAG handled by backend) ---
        result = await AIService.chatWithProject(project.id, project.kbId, messages);

        // Append result (Naive implementation, improved cursor handling can be done later)
        newContent = currentText + result;

      } else if (tool === 'polish') {
        const selection = window.getSelection();
        const selectedText = selection?.toString();

        if (selectedText) {
          // Specialized Polish Prompt
          const messages = [
            { role: 'system', content: 'You are a professional editor. Improve the following text.' },
            { role: 'user', content: selectedText }
          ];
          const polished = await AIService.chatWithProject(project.id, project.kbId, messages);

          // Replace only selected text (Simulated by replacing last occurrence for now or appending)
          // Ideally we use range replacement, but for reliability in MVVP:
          newContent = currentText.replace(selectedText, polished);
        } else {
          newContent = currentText; // No selection, do nothing
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
      alert("AI Service failed to respond. Please check connection.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger Diff Render
  useEffect(() => {
    if (diffPreview && editorRef.current && !isEditing) {
      renderDiffToEditor();
    } else if (!diffPreview && editorRef.current && !isEditing) { // Prevent cursor jumping when typing
      // Normal Sync
      if (editorRef.current.textContent !== content) {
        editorRef.current.textContent = content;
      }
    }
  }, [diffPreview, content, renderDiffToEditor, isEditing]);

  // Sync initial
  useEffect(() => {
    setContent(currentChapter.content);
    setDiffPreview(null);
    if (editorRef.current) editorRef.current.textContent = currentChapter.content;
  }, [currentChapter.id]);


  // Export... (keeping existing)
  const exportToMarkdown = () => {
    let markdown = `# ${project.title}\n\n`;
    project.chapters.forEach(ch => {
      markdown += `## ${ch.title}\n\n${ch.content}\n\n`;
    });
    downloadFile(markdown, `${project.title}.md`, 'text/markdown');
  };

  const exportToWord = () => {
    const html = `<html><body><h1>${project.title}</h1>${project.chapters.map(ch => `<h2>${ch.title}</h2><p>${ch.content}</p>`).join('')}</body></html>`;
    downloadFile(html, `${project.title}.doc`, 'application/msword');
  };

  const exportToPDF = () => {
    window.print();
  };

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
    <div className="min-h-screen flex flex-row bg-white overflow-auto">

      {/* 1. Activity Bar (New) */}
      <ActivityBar activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} />

      {/* 2. Left Sidebar (Conditionally shown or integrated) */}
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
      <div className="flex-1 flex flex-col min-w-0 bg-white">
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
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                Export ▼
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

            {/* AI Tools Floating Bubble - Visible when idle */}
            {!isEditing && getEditorText() && !diffPreview && (
              <div className="absolute right-8 top-8 flex flex-col gap-3 animate-in fade-in duration-500">
                <div className="group relative flex items-center justify-end">
                  <span className="absolute right-12 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Auto Polish</span>
                  <button onClick={() => runAiTool('polish')} className="p-3 bg-white border border-gray-200 shadow-lg rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-600 transition-all transform hover:scale-110" title="Polish Text">
                    ✨
                  </button>
                </div>
                <div className="group relative flex items-center justify-end">
                  <span className="absolute right-12 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Continue Writing</span>
                  <button onClick={() => runAiTool('continue')} className="p-3 bg-white border border-gray-200 shadow-lg rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-600 transition-all transform hover:scale-110" title="Continue Writing">
                    ✍️
                  </button>
                </div>
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onBlur={() => setIsEditing(false)}
              className="w-full text-lg leading-loose outline-none text-gray-700 placeholder:text-gray-300 selection:bg-indigo-100 whitespace-pre-wrap break-words pb-4"
              style={{ minHeight: '200px', caretColor: '#4f46e5' }}
              data-placeholder={diffPreview ? '' : 'Start writing...'}
            />
            {/* AI Loading State Overlay */}
            {isAiLoading && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center z-20">
                <div className="bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm animate-pulse">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Parameters synchronizing...
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. Right Sidebar (Copilot) */}
      {(activeSidebarTab === 'ai') && (
        <RightSidebar project={project} />
      )}
    </div>
  );
};
