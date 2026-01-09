
import React, { useState, useEffect } from 'react';
import { Project, ViewState, Chapter, AIMode, AIStyle } from './types';
import { InspirationWizard } from './components/InspirationWizard';
import { Editor } from './components/Editor';

const MOCK_PROJECTS: Project[] = [
  {
    id: 'mock-1',
    title: 'Kepler-186f的最后讯号',
    type: '科幻小说',
    description: '一个关于孤独、宇宙深处信号以及人类最后希望的故事。',
    wordCount: 1240,
    lastEdited: Date.now() - 3600000,
    chapters: [
      {
        id: 'm1-c1',
        title: '第一章：沉寂的频率',
        content: '监测站的显示器上，那条直线已经维持了三个世纪。直到今天，一个微弱的、不规则的波峰打破了死亡般的寂静。它不是已知的脉冲星，也不是任何自然现象。那是节奏，一种带着绝望呼吸感的节奏。'
      }
    ],
    currentChapterId: 'm1-c1',
    aiMode: AIMode.CYBERPUNK,
    style: AIStyle.CREATIVE
  },
  {
    id: 'mock-2',
    title: '丝路回响',
    type: '历史文学',
    description: '重走千年古道，探寻消失在风沙中的文明印记。',
    wordCount: 850,
    lastEdited: Date.now() - 86400000,
    chapters: [
      {
        id: 'm2-c1',
        title: '引言：风沙中的石碑',
        content: '大漠的风沙掩埋了无数秘密，但无法磨灭那些镌刻在石头上的意志。这些文字虽已模糊，但依然散发着大唐全盛时期的自信与辉煌。'
      }
    ],
    currentChapterId: 'm2-c1',
    aiMode: AIMode.CLASSIC,
    style: AIStyle.LITERARY
  },
  {
    id: 'mock-3',
    title: '赛博霓虹下的灰影',
    type: '侦探小说',
    description: '在义体化普及的2088年，一起无法被云端记录的谋杀案。',
    wordCount: 2100,
    lastEdited: Date.now() - 172800000,
    chapters: [
      {
        id: 'm3-c1',
        title: '断连的记忆',
        content: '“我的视觉插件出了问题，”委托人坐在昏暗的角落里，他的左眼闪烁着不稳定的红色电火花。'
      }
    ],
    currentChapterId: 'm3-c1',
    aiMode: AIMode.CYBERPUNK,
    style: AIStyle.JOURNALISTIC
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [sparkInput, setSparkInput] = useState('');
  const [initialSpark, setInitialSpark] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('genesis_projects');
    if (saved && JSON.parse(saved).length > 0) {
      setProjects(JSON.parse(saved));
    } else {
      setProjects(MOCK_PROJECTS);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('genesis_projects', JSON.stringify(projects));
    }
  }, [projects]);

  const handleSparkSubmit = () => {
    if (!sparkInput.trim()) return;
    setInitialSpark(sparkInput);
    setView('inspiration-wizard');
  };

  const createProjectFromInspiration = (data: any) => {
    const newId = Date.now().toString();
    const firstChapterId = 'ch1';
    const newProject: Project = {
      id: newId,
      title: data.title,
      type: '长篇小说',
      description: data.description,
      wordCount: 0,
      lastEdited: Date.now(),
      chapters: data.outline.map((ch: any, i: number) => ({
        id: i === 0 ? firstChapterId : `ch${i+1}`,
        title: ch.title,
        content: `【创作背景】: ${ch.description}\n\n---\n\n在这里开始你的创作...`
      })),
      currentChapterId: firstChapterId,
      aiMode: AIMode.DEFAULT,
      style: AIStyle.CREATIVE
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newId);
    setView('editor');
    setSparkInput('');
    setInitialSpark(null);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个创作项目吗？')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  if (view === 'inspiration-wizard' && initialSpark) {
    return <InspirationWizard 
      initialInput={initialSpark} 
      onCancel={() => { setView('dashboard'); setInitialSpark(null); }} 
      onComplete={createProjectFromInspiration} 
    />;
  }

  if (view === 'editor' && projects.find(p => p.id === activeProjectId)) {
    return <Editor 
      project={projects.find(p => p.id === activeProjectId)!} 
      onUpdate={(updated) => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))} 
      onBack={() => setView('dashboard')} 
    />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="h-20 bg-white border-b flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-serif text-2xl font-bold italic">G</div>
          <span className="text-xl font-serif font-bold tracking-tight">创世纪工作台 (Genesis Atelier)</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:text-indigo-600 font-medium text-sm">社区灵感</button>
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200" title="用户头像" />
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {/* Spark Hero Section - Directly on the Homepage */}
        <section className="py-24 px-10 bg-gradient-to-b from-white to-gray-50 flex flex-col items-center">
          <div className="max-w-3xl w-full text-center space-y-12">
            <h1 className="text-5xl font-serif font-bold text-gray-800 tracking-tight">今天的创作灵感是什么？</h1>
            <div className="relative group">
              <textarea
                value={sparkInput}
                onChange={(e) => setSparkInput(e.target.value)}
                placeholder="输入关键词、短语，或者一个转瞬即逝的想法..."
                className="w-full h-48 p-10 text-xl border border-gray-200 rounded-[2.5rem] focus:border-indigo-300 focus:ring-8 focus:ring-indigo-50 transition-all outline-none resize-none shadow-sm group-hover:shadow-lg bg-white text-gray-700 placeholder:text-gray-300 leading-relaxed"
              />
            </div>
            <button
              onClick={handleSparkSubmit}
              disabled={!sparkInput.trim()}
              className="px-16 py-5 bg-indigo-400 text-white rounded-full font-bold text-xl hover:bg-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              我有灵感了 (I Feel Lucky)
            </button>
          </div>
        </section>

        {/* Existing Projects Grid */}
        <section className="max-w-7xl w-full mx-auto px-10 py-20">
          <div className="flex items-center justify-between mb-12 border-b pb-6 border-gray-100">
            <h2 className="text-sm font-serif font-bold text-gray-400 uppercase tracking-[0.3em]">最近的创作 / Recent Works</h2>
            <div className="flex gap-2">
              <span className="text-xs text-gray-400 font-medium font-mono">共计: {projects.length} 个项目</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {projects.map(p => (
              <div 
                key={p.id}
                onClick={() => { setActiveProjectId(p.id); setView('editor'); }}
                className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-all cursor-pointer flex flex-col group relative"
              >
                <button 
                  onClick={(e) => deleteProject(p.id, e)}
                  className="absolute top-8 right-8 p-2 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2 mb-8">
                  <span className="px-4 py-1 bg-indigo-50 text-indigo-500 text-[10px] font-bold uppercase rounded-full tracking-wider">{p.type}</span>
                  <span className="text-[10px] text-gray-300 font-mono">{new Date(p.lastEdited).toLocaleDateString()}</span>
                </div>
                <h3 className="text-3xl font-serif font-bold text-gray-800 mb-4 group-hover:text-indigo-600 transition-colors leading-tight">{p.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-10 italic leading-loose">“{p.description}”</p>
                
                <div className="pt-8 border-t border-gray-50 flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">{p.wordCount.toLocaleString()} 字</span>
                    <span className="text-[9px] text-gray-300 uppercase tracking-widest mt-1">当前进度</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-12 transition-all shadow-sm">
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <footer className="h-24 border-t flex items-center justify-center bg-gray-50/50">
        <p className="text-gray-400 text-sm font-light tracking-widest uppercase">© 2025 Genesis Atelier. 由 Gemini 3 提供 AI 驱动支持.</p>
      </footer>
    </div>
  );
};

export default App;
