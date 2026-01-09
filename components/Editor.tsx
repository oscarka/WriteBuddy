
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Project, AIMode, AIStyle, Suggestion, Chapter } from '../types';
import { AIService } from '../services/geminiService';

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [diffPreview, setDiffPreview] = useState<DiffSegment[] | null>(null);
  const [originalContent, setOriginalContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  
  const currentChapter = project.chapters.find(c => c.id === project.currentChapterId) || project.chapters[0];

  // 计算中文字数（排除空白字符）
  const calculateWordCount = (text: string): number => {
    if (!text) return 0;
    // 移除所有空白字符（空格、换行符、制表符等），然后统计字符数
    return text.replace(/\s+/g, '').length;
  };

  // 接受单个 diff 片段
  const acceptDiffSegment = (segmentIndex: number) => {
    if (!diffPreview) return;
    
    const segment = diffPreview[segmentIndex];
    let newSegments: DiffSegment[] = [];
    
    if (segment.type === 'added') {
      // 接受 added：将其转换为 unchanged，保留内容
      newSegments = diffPreview.map((s, idx) => 
        idx === segmentIndex ? { type: 'unchanged' as const, text: s.text } : s
      );
    } else if (segment.type === 'removed') {
      // 接受 removed：确认删除，保持 removed 类型（在构建内容时会被过滤）
      newSegments = diffPreview.map((s, idx) => 
        idx === segmentIndex ? { type: 'removed' as const, text: s.text } : s
      );
    } else {
      newSegments = diffPreview;
    }
    
    // 构建新内容：包含所有 unchanged 和 added，排除 removed
    const newContent = newSegments
      .filter(s => s.type !== 'removed')
      .map(s => s.text)
      .join('');
    
    setContent(newContent);
    
    // 检查是否还有 diff 片段（added 或 removed）
    if (newSegments.some(s => s.type === 'added' || s.type === 'removed')) {
      setDiffPreview(newSegments);
      // 重新渲染编辑器
      setTimeout(() => {
        renderDiffToEditor(newSegments);
      }, 0);
    } else {
      // 所有 diff 都已处理，清除预览
      setDiffPreview(null);
      setOriginalContent('');
      if (editorRef.current) {
        editorRef.current.textContent = newContent;
      }
    }
    
    // 更新项目
    const updatedChapters = project.chapters.map(c => 
      c.id === project.currentChapterId ? { ...c, content: newContent } : c
    );
    // 计算所有章节的总字数
    const totalWordCount = updatedChapters.reduce((sum, ch) => sum + calculateWordCount(ch.content), 0);
    
    const updatedProject = {
      ...project,
      chapters: updatedChapters,
      lastEdited: Date.now(),
      wordCount: totalWordCount
    };
    onUpdate(updatedProject);
  };

  // 拒绝单个 diff 片段
  const rejectDiffSegment = (segmentIndex: number) => {
    if (!diffPreview) return;
    
    const segment = diffPreview[segmentIndex];
    
    // 构建新内容
    let newSegments: DiffSegment[] = [];
    
    if (segment.type === 'added') {
      // 拒绝 added：移除它
      newSegments = diffPreview.filter((_, idx) => idx !== segmentIndex);
    } else if (segment.type === 'removed') {
      // 拒绝 removed：恢复原文本（将 removed 改为 unchanged）
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
    
    // 检查是否还有 diff
    if (newSegments.some(s => s.type === 'added' || s.type === 'removed')) {
      setDiffPreview(newSegments);
      // 重新渲染编辑器
      setTimeout(() => {
        renderDiffToEditor(newSegments);
      }, 0);
    } else {
      setDiffPreview(null);
      setOriginalContent('');
      if (editorRef.current) {
        editorRef.current.textContent = newContent;
      }
    }
  };

  // 将 diff 渲染到编辑器（可以传入自定义 segments）
  const renderDiffToEditor = useCallback((segments?: DiffSegment[]) => {
    const segmentsToRender = segments || diffPreview;
    if (!editorRef.current || !segmentsToRender) return;
    
    const editor = editorRef.current;
    // 清空编辑器
    while (editor.firstChild) {
      editor.removeChild(editor.firstChild);
    }
    
    segmentsToRender.forEach((segment, idx) => {
      // 按行分割文本
      const lines = segment.text.split('\n');
      
      lines.forEach((line, lineIdx) => {
        // 跳过空行（除了最后一行）
        if (!line && lineIdx < lines.length - 1) {
          const br = document.createElement('br');
          editor.appendChild(br);
          return;
        }
        
        const container = document.createElement('div');
        container.className = 'group relative flex items-start min-h-[1.5rem]';
        container.style.overflowX = 'visible';
        
        // 左侧装饰线
        const gutter = document.createElement('div');
        gutter.className = 'w-1 shrink-0 mr-3 mt-0.5';
        if (segment.type === 'added') {
          gutter.className += ' bg-green-500';
        } else if (segment.type === 'removed') {
          gutter.className += ' bg-red-500';
        } else {
          gutter.className += ' bg-transparent';
        }
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'flex-1 relative';
        contentWrapper.style.overflowX = 'visible';
        
        const span = document.createElement('span');
        span.textContent = line;
        
        if (segment.type === 'added') {
          span.className = 'bg-green-100 text-green-900 px-1 py-0.5 rounded inline-block';
          // 右侧按钮容器 - 固定在右侧，不占用文本空间
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'absolute flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10';
          buttonContainer.style.top = '0';
          buttonContainer.style.left = '100%';
          buttonContainer.style.marginLeft = '12px';
          buttonContainer.style.width = 'auto';
          buttonContainer.style.whiteSpace = 'nowrap';
          
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓';
          acceptBtn.className = 'w-6 h-6 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm';
          acceptBtn.title = '接受';
          acceptBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            acceptDiffSegment(idx);
          };
          
          const rejectBtn = document.createElement('button');
          rejectBtn.textContent = '×';
          rejectBtn.className = 'w-6 h-6 bg-gray-400 text-white rounded text-xs font-bold hover:bg-gray-500 transition-colors flex items-center justify-center shadow-sm';
          rejectBtn.title = '拒绝';
          rejectBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            rejectDiffSegment(idx);
          };
          
          buttonContainer.appendChild(acceptBtn);
          buttonContainer.appendChild(rejectBtn);
          contentWrapper.appendChild(span);
          contentWrapper.appendChild(buttonContainer);
        } else if (segment.type === 'removed') {
          span.className = 'bg-red-100 text-red-900 px-1 py-0.5 rounded line-through inline-block';
          // 右侧按钮容器 - 固定在右侧，不占用文本空间
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'absolute flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10';
          buttonContainer.style.top = '0';
          buttonContainer.style.left = '100%';
          buttonContainer.style.marginLeft = '12px';
          buttonContainer.style.width = 'auto';
          buttonContainer.style.whiteSpace = 'nowrap';
          
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓';
          acceptBtn.className = 'w-6 h-6 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center shadow-sm';
          acceptBtn.title = '接受删除';
          acceptBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            acceptDiffSegment(idx);
          };
          
          const rejectBtn = document.createElement('button');
          rejectBtn.textContent = '×';
          rejectBtn.className = 'w-6 h-6 bg-gray-400 text-white rounded text-xs font-bold hover:bg-gray-500 transition-colors flex items-center justify-center shadow-sm';
          rejectBtn.title = '恢复';
          rejectBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            rejectDiffSegment(idx);
          };
          
          buttonContainer.appendChild(acceptBtn);
          buttonContainer.appendChild(rejectBtn);
          contentWrapper.appendChild(span);
          contentWrapper.appendChild(buttonContainer);
        } else {
          span.className = 'text-gray-700';
          contentWrapper.appendChild(span);
        }
        
        container.appendChild(gutter);
        container.appendChild(contentWrapper);
        editor.appendChild(container);
        
        // 如果不是最后一行，添加换行
        if (lineIdx < lines.length - 1) {
          const br = document.createElement('br');
          editor.appendChild(br);
        }
      });
    });
  }, [diffPreview]);

  useEffect(() => {
    setContent(currentChapter.content);
    setDiffPreview(null);
    setOriginalContent('');
    setIsEditing(false);
    if (editorRef.current) {
      editorRef.current.textContent = currentChapter.content;
    }
  }, [currentChapter.id]);

  // 计算当前项目的总字数
  const calculatedWordCount = useMemo(() => {
    return project.chapters.reduce((sum, ch) => sum + calculateWordCount(ch.content), 0);
  }, [project.chapters]);

  // 当计算出的字数与项目中的字数不一致时，更新项目
  useEffect(() => {
    if (project.wordCount !== calculatedWordCount) {
      const updatedProject = {
        ...project,
        wordCount: calculatedWordCount
      };
      onUpdate(updatedProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedWordCount]);

  // 当 diff 预览更新时，更新编辑器内容
  useEffect(() => {
    if (diffPreview && editorRef.current && !isEditing) {
      renderDiffToEditor();
    } else if (!diffPreview && editorRef.current) {
      const currentText = editorRef.current.textContent || '';
      if (currentText !== content) {
        editorRef.current.textContent = content;
      }
    }
  }, [diffPreview, content, renderDiffToEditor, isEditing]);

  // 计算文本差异（改进的算法）
  const calculateDiff = (oldText: string, newText: string): DiffSegment[] => {
    const segments: DiffSegment[] = [];
    
    // 如果新文本是旧文本的扩展（续写场景）
    if (newText.startsWith(oldText.trimEnd())) {
      const added = newText.slice(oldText.trimEnd().length);
      if (oldText.trim()) {
        segments.push({ type: 'unchanged', text: oldText });
      }
      if (added.trim()) {
        // 确保换行符正确显示
        const prefix = oldText && !oldText.endsWith('\n') ? '\n' : '';
        segments.push({ type: 'added', text: prefix + added });
      }
      return segments;
    }
    
    // 如果新文本是旧文本的替换（润色场景）
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    // 找到共同前缀
    let prefixEnd = 0;
    while (prefixEnd < oldLines.length && prefixEnd < newLines.length && oldLines[prefixEnd] === newLines[prefixEnd]) {
      prefixEnd++;
    }
    
    // 找到共同后缀
    let suffixStart = 0;
    while (
      suffixStart < oldLines.length - prefixEnd &&
      suffixStart < newLines.length - prefixEnd &&
      oldLines[oldLines.length - 1 - suffixStart] === newLines[newLines.length - 1 - suffixStart]
    ) {
      suffixStart++;
    }
    
    // 添加共同前缀
    if (prefixEnd > 0) {
      for (let i = 0; i < prefixEnd; i++) {
        segments.push({ type: 'unchanged', text: oldLines[i] + (i < prefixEnd - 1 ? '\n' : '') });
      }
      if (prefixEnd < oldLines.length || prefixEnd < newLines.length) {
        segments.push({ type: 'unchanged', text: '\n' });
      }
    }
    
    // 删除的部分
    const removedLines = oldLines.slice(prefixEnd, oldLines.length - suffixStart);
    if (removedLines.length > 0) {
      removedLines.forEach((line, idx) => {
        segments.push({ type: 'removed', text: line + (idx < removedLines.length - 1 ? '\n' : '') });
      });
      if (newLines.length - suffixStart - prefixEnd > 0) {
        segments.push({ type: 'removed', text: '\n' });
      }
    }
    
    // 新增的部分
    const addedLines = newLines.slice(prefixEnd, newLines.length - suffixStart);
    if (addedLines.length > 0) {
      addedLines.forEach((line, idx) => {
        segments.push({ type: 'added', text: line + (idx < addedLines.length - 1 ? '\n' : '') });
      });
      if (suffixStart > 0) {
        segments.push({ type: 'added', text: '\n' });
      }
    }
    
    // 添加共同后缀
    if (suffixStart > 0) {
      for (let i = suffixStart; i > 0; i--) {
        const idx = oldLines.length - i;
        segments.push({ type: 'unchanged', text: oldLines[idx] + (i > 1 ? '\n' : '') });
      }
    }
    
    return segments;
  };

  // 从编辑器获取纯文本内容
  const getEditorText = (): string => {
    if (!editorRef.current) return '';
    return editorRef.current.innerText || editorRef.current.textContent || '';
  };

  const handleEditorInput = () => {
    setIsEditing(true);
    const newContent = getEditorText();
    setContent(newContent);
    
    // 如果用户开始编辑，清除 diff 预览
    if (diffPreview) {
      setDiffPreview(null);
      setOriginalContent('');
    }
    
    // 自动保存
    const updatedChapters = project.chapters.map(c => 
      c.id === project.currentChapterId ? { ...c, content: newContent } : c
    );
    // 计算所有章节的总字数
    const totalWordCount = updatedChapters.reduce((sum, ch) => sum + calculateWordCount(ch.content), 0);
    
    const updatedProject = {
      ...project,
      chapters: updatedChapters,
      lastEdited: Date.now(),
      wordCount: totalWordCount
    };
    onUpdate(updatedProject);
  };

  const handleContentChange = (newContent: string) => {
    // 如果有 diff 预览，先清除
    if (diffPreview) {
      setDiffPreview(null);
      setOriginalContent('');
    }
    
    setContent(newContent);
    
    // Auto-save logic
    const updatedProject = {
      ...project,
      chapters: project.chapters.map(c => 
        c.id === project.currentChapterId ? { ...c, content: newContent } : c
      ),
      lastEdited: Date.now(),
      wordCount: calculateWordCount(newContent)
    };
    onUpdate(updatedProject);

    // Proactive AI "Listening" Trigger
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(async () => {
      if (newContent.length > 50) {
        try {
          const advice = await AIService.getProactiveAdvice(newContent.slice(-1000), project.aiMode);
          const newSuggestions = advice.map((a: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            ...a,
            timestamp: Date.now()
          }));
          setSuggestions(prev => [...newSuggestions, ...prev].slice(0, 5));
        } catch (e) {
          console.error("Proactive AI error", e);
        }
      }
    }, 8000);
  };

  const runAiTool = async (tool: string) => {
    setIsAiLoading(true);
    try {
      const currentText = getEditorText() || content;
      let result = '';
      let newContent = '';
      
      if (tool === 'continue') {
        result = await AIService.continueWriting(currentText, project.aiMode as AIMode, project.style as AIStyle) || '';
        newContent = currentText + (currentText && !currentText.endsWith('\n') ? '\n' : '') + result;
      } else if (tool === 'polish') {
        const selected = window.getSelection()?.toString();
        if (selected) {
          result = await AIService.polishText(selected) || '';
          newContent = currentText.replace(selected, result);
        } else {
          result = await AIService.polishText(currentText.slice(-500)) || '';
          newContent = currentText.slice(0, -500) + result;
        }
      }
      
      // 保存原始内容并计算 diff
      setOriginalContent(currentText);
      const diff = calculateDiff(currentText, newContent);
      setDiffPreview(diff);
      setContent(newContent);
      setIsEditing(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  const addChapter = () => {
    const newId = Date.now().toString();
    const newChapter: Chapter = { id: newId, title: `第 ${project.chapters.length + 1} 章`, content: '' };
    onUpdate({
      ...project,
      chapters: [...project.chapters, newChapter],
      currentChapterId: newId
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">
            <span>←</span> 返回仓库
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="font-serif font-bold text-xl text-gray-800">{project.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 font-medium">字数统计: {project.wordCount}</span>
          <button className="px-5 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors">导出</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Navigation & Stats */}
        <aside className="w-64 border-r bg-gray-50 flex flex-col shrink-0">
          <div className="p-5 border-b">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">目录导航</h3>
            <button 
              onClick={addChapter}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 bg-white border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
            >
              <span>+</span> 新建章节
            </button>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {project.chapters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => onUpdate({ ...project, currentChapterId: ch.id })}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all ${ch.id === project.currentChapterId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5 mt-auto border-t bg-white/50">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">数据概览</h3>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between"><span>章节总数</span> <span className="font-mono font-bold">{project.chapters.length}</span></div>
              <div className="flex justify-between"><span>预计阅读时间</span> <span className="font-mono font-bold">~{Math.ceil(project.wordCount / 400)} 分钟</span></div>
            </div>
          </div>
        </aside>

        {/* Center: Main Editor */}
        <main className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col items-center" style={{ overflowX: 'visible' }}>
          <div className="w-full max-w-3xl bg-white shadow-sm my-10 p-16 md:p-24 focus-within:ring-2 ring-indigo-50 transition-all rounded-xl relative" style={{ overflowX: 'visible' }}>
            <input 
              className="w-full text-4xl font-serif font-bold mb-12 outline-none text-gray-800 placeholder:text-gray-200"
              placeholder="请输入章节标题"
              value={currentChapter.title}
              onChange={(e) => onUpdate({
                ...project,
                chapters: project.chapters.map(c => c.id === project.currentChapterId ? { ...c, title: e.target.value } : c)
              })}
            />
            
            {/* 可编辑的编辑器 - 支持内联 diff 显示 */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              className="w-full text-lg leading-loose outline-none text-gray-700 placeholder:text-gray-300 selection:bg-indigo-100 whitespace-pre-wrap break-words pb-4"
              style={{ 
                caretColor: '#4f46e5',
                minHeight: '400px',
                ...(diffPreview ? { overflowX: 'visible' } : {})
              }}
              data-placeholder={diffPreview ? '' : '空白页是世界诞生的地方...'}
            />
            
            {/* 占位符样式 */}
            {!diffPreview && (!content || content.trim() === '') && (
              <div className="absolute top-[120px] left-16 md:left-24 text-lg text-gray-300 pointer-events-none select-none">
                空白页是世界诞生的地方...
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: AI Assistant */}
        <aside className="w-80 border-l bg-white flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 border-b space-y-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 设定</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">助手模式</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 ring-indigo-50 outline-none cursor-pointer"
                  value={project.aiMode}
                  onChange={(e) => onUpdate({ ...project, aiMode: e.target.value })}
                >
                  {Object.values(AIMode).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">写作风格</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 ring-indigo-50 outline-none cursor-pointer"
                  value={project.style}
                  onChange={(e) => onUpdate({ ...project, style: e.target.value })}
                >
                  {Object.values(AIStyle).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 gap-3 border-b">
            <button 
              onClick={() => runAiTool('continue')}
              disabled={isAiLoading}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-indigo-600 disabled:opacity-50 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">🪄</span>
              <span className="text-[11px] font-bold mt-2">AI 续写</span>
            </button>
            <button 
              onClick={() => runAiTool('polish')}
              disabled={isAiLoading}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:bg-green-50 hover:border-green-200 transition-all text-green-600 disabled:opacity-50 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
              <span className="text-[11px] font-bold mt-2">精美润色</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-500 opacity-40 cursor-not-allowed">
              <span className="text-2xl">🎭</span>
              <span className="text-[11px] font-bold mt-2">角色对谈</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-500 opacity-40 cursor-not-allowed">
              <span className="text-2xl">🎨</span>
              <span className="text-[11px] font-bold mt-2">场景构思</span>
            </button>
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 观察建议</h3>
              {isAiLoading && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-sm shadow-indigo-400" />}
            </div>
            <div className="space-y-5">
              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                   <span className="text-3xl mb-2">👁️</span>
                   <p className="text-xs text-gray-400 italic px-4">AI 正在安静地观察您的创作流...</p>
                </div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.id} className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 group animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        s.type === 'plot' ? 'bg-orange-100 text-orange-600' : 
                        s.type === 'character' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {s.type === 'plot' ? '情节' : s.type === 'character' ? '角色' : '逻辑'}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto">刚刚</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{s.text}</p>
                    <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[11px] font-bold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-all">采纳</button>
                      <button 
                        onClick={() => setSuggestions(prev => prev.filter(x => x.id !== s.id))}
                        className="text-[11px] font-bold text-gray-400 hover:text-gray-600 px-3 py-1"
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
