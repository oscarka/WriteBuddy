
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, AIMode, AIStyle, Suggestion, Chapter } from '../types';
import { AIService } from '../services/geminiService';

interface Props {
  project: Project;
  onUpdate: (project: Project) => void;
  onBack: () => void;
}

export const Editor: React.FC<Props> = ({ project, onUpdate, onBack }) => {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const idleTimer = useRef<number | null>(null);
  
  const currentChapter = project.chapters.find(c => c.id === project.currentChapterId) || project.chapters[0];

  useEffect(() => {
    setContent(currentChapter.content);
  }, [currentChapter.id]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Auto-save logic
    const updatedProject = {
      ...project,
      chapters: project.chapters.map(c => 
        c.id === project.currentChapterId ? { ...c, content: newContent } : c
      ),
      lastEdited: Date.now(),
      wordCount: newContent.split(/\s+/).filter(x => x.length > 0).length
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
      let result = '';
      if (tool === 'continue') {
        result = await AIService.continueWriting(content, project.aiMode as AIMode, project.style as AIStyle) || '';
        handleContentChange(content + '\n' + result);
      } else if (tool === 'polish') {
        const selected = window.getSelection()?.toString();
        if (selected) {
          result = await AIService.polishText(selected) || '';
          handleContentChange(content.replace(selected, result));
        } else {
          result = await AIService.polishText(content.slice(-500)) || '';
          handleContentChange(content.slice(0, -500) + result);
        }
      }
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
        <main className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col items-center">
          <div className="w-full max-w-3xl min-h-full bg-white shadow-sm my-10 p-16 md:p-24 focus-within:ring-2 ring-indigo-50 transition-all rounded-xl">
            <input 
              className="w-full text-4xl font-serif font-bold mb-12 outline-none text-gray-800 placeholder:text-gray-200"
              placeholder="请输入章节标题"
              value={currentChapter.title}
              onChange={(e) => onUpdate({
                ...project,
                chapters: project.chapters.map(c => c.id === project.currentChapterId ? { ...c, title: e.target.value } : c)
              })}
            />
            <textarea
              className="w-full h-[70vh] text-lg leading-loose outline-none resize-none text-gray-700 placeholder:text-gray-300 selection:bg-indigo-100"
              placeholder="空白页是世界诞生的地方..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
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
