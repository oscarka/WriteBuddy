
import React, { useState, useEffect } from 'react';
import { AIService } from '../services/geminiService';
import { InspirationDirection, ResearchData, ResearchSource } from '../types';

interface Props {
  initialInput?: string;
  onComplete: (data: { title: string, description: string, outline: any[], research: ResearchData }) => void;
  onCancel: () => void;
}

export const InspirationWizard: React.FC<Props> = ({ initialInput, onComplete, onCancel }) => {
  const [step, setStep] = useState<'input' | 'direction' | 'research' | 'outline' | 'custom'>(initialInput ? 'direction' : 'input');
  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [directions, setDirections] = useState<InspirationDirection[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<InspirationDirection | null>(null);
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [outline, setOutline] = useState<any[]>([]);
  
  // 编辑状态
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  // 研究数据编辑状态
  const [editingCharacterIdx, setEditingCharacterIdx] = useState<number | null>(null);
  const [editingTermIdx, setEditingTermIdx] = useState<number | null>(null);
  const [newCharacter, setNewCharacter] = useState('');
  const [newTerm, setNewTerm] = useState('');
  
  // 研究素材搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  
  // 大纲编辑状态
  const [editingOutlineIdx, setEditingOutlineIdx] = useState<number | null>(null);
  const [editingOutlineTitle, setEditingOutlineTitle] = useState('');
  const [editingOutlineDesc, setEditingOutlineDesc] = useState('');

  useEffect(() => {
    if (initialInput && directions.length === 0) {
      handleFeelLucky(initialInput);
    }
  }, [initialInput]);

  const handleFeelLucky = async (textToProcess: string = input) => {
    if (!textToProcess.trim()) return;
    setIsLoading(true);
    try {
      const result = await AIService.analyzeInspiration(textToProcess);
      setDirections(result);
      setStep('direction');
    } catch (e) {
      console.error(e);
      alert("AI 暂时无法解析灵感，请稍后重试。");
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDirection = async (dir: InspirationDirection) => {
    setSelectedDirection(dir);
    setIsLoading(true);
    try {
      const resData = await AIService.researchDirection(dir.title + ": " + dir.description);
      setResearch(resData);
      setStep('research');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmResearch = async () => {
    setIsLoading(true);
    try {
      const out = await AIService.generateOutline(selectedDirection!.title, research);
      setOutline(out);
      setStep('outline');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCreate = () => {
    setStep('custom');
    setEditTitle('');
    setEditDesc('');
  };

  const startEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIdx(idx);
    setEditTitle(directions[idx].title);
    setEditDesc(directions[idx].description);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDirs = [...directions];
    newDirs[editingIdx!] = { title: editTitle, description: editDesc };
    setDirections(newDirs);
    setEditingIdx(null);
  };

  // 大纲编辑函数
  const startEditOutline = (idx: number) => {
    setEditingOutlineIdx(idx);
    setEditingOutlineTitle(outline[idx].title);
    setEditingOutlineDesc(outline[idx].description);
  };

  const saveEditOutline = (idx: number) => {
    const updated = [...outline];
    updated[idx] = {
      title: editingOutlineTitle.trim(),
      description: editingOutlineDesc.trim()
    };
    setOutline(updated);
    setEditingOutlineIdx(null);
    setEditingOutlineTitle('');
    setEditingOutlineDesc('');
  };

  const cancelEditOutline = () => {
    setEditingOutlineIdx(null);
    setEditingOutlineTitle('');
    setEditingOutlineDesc('');
  };

  const finish = () => {
    onComplete({
      title: selectedDirection!.title,
      description: selectedDirection!.description,
      outline,
      research: research!
    });
  };

  const submitCustom = () => {
    if (!editTitle.trim()) return;
    setSelectedDirection({ title: editTitle, description: editDesc });
    handleSelectDirection({ title: editTitle, description: editDesc });
  };

  // 研究数据编辑函数
  const updateResearchBackground = (newBackground: string) => {
    if (research) {
      setResearch({ ...research, background: newBackground });
    }
  };

  const updateCharacter = (index: number, newValue: string) => {
    if (research && newValue.trim()) {
      const updated = [...research.characters];
      updated[index] = newValue.trim();
      setResearch({ ...research, characters: updated });
    }
  };

  const deleteCharacter = (index: number) => {
    if (research) {
      const updated = research.characters.filter((_, i) => i !== index);
      setResearch({ ...research, characters: updated });
    }
  };

  const addCharacter = () => {
    if (research && newCharacter.trim()) {
      setResearch({ ...research, characters: [...research.characters, newCharacter.trim()] });
      setNewCharacter('');
    }
  };

  const updateTerm = (index: number, newValue: string) => {
    if (research && newValue.trim()) {
      const updated = [...research.terms];
      updated[index] = newValue.trim();
      setResearch({ ...research, terms: updated });
    }
  };

  const deleteTerm = (index: number) => {
    if (research) {
      const updated = research.terms.filter((_, i) => i !== index);
      setResearch({ ...research, terms: updated });
    }
  };

  const addTerm = () => {
    if (research && newTerm.trim()) {
      setResearch({ ...research, terms: [...research.terms, newTerm.trim()] });
      setNewTerm('');
    }
  };

  // 搜索研究素材
  const handleSearchMaterials = async (query?: string) => {
    const searchText = query || searchQuery;
    if (!searchText.trim() || !selectedDirection) return;
    setIsSearching(true);
    try {
      const results = await AIService.searchResearchMaterials(searchText, selectedDirection.title);
      setResearchSources(prev => [...results, ...prev]);
      if (!query) setSearchQuery('');
    } catch (e) {
      console.error('搜索失败', e);
      alert('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 自动搜索（当进入研究步骤时）
  useEffect(() => {
    if (step === 'research' && selectedDirection && researchSources.length === 0) {
      // 自动进行一次初始搜索
      handleSearchMaterials(selectedDirection.title);
    }
  }, [step, selectedDirection]);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col items-center">
      <div className="w-full max-w-6xl flex items-center justify-between p-8">
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-black font-medium flex items-center gap-2 transition-colors"
        >
          ← 返回首页
        </button>
        <div className="flex gap-3">
          {['direction', 'research', 'outline'].map((s, idx) => (
            <div 
              key={s} 
              className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                ['direction', 'research', 'outline', 'custom'].indexOf(step) >= idx ? 'bg-indigo-600' : 'bg-gray-100'
              }`} 
            />
          ))}
        </div>
      </div>

      {isLoading && directions.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 border-[6px] border-indigo-50 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-2xl font-serif text-gray-500 animate-pulse italic">正在提炼创意维度...</p>
        </div>
      )}

      {step === 'direction' && directions.length > 0 && (
        <div className="max-w-6xl w-full px-8 pb-20 space-y-12 animate-in slide-in-from-bottom-6 duration-700">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-serif font-bold text-gray-800 tracking-tight">选择您的创作路径</h2>
            <p className="text-gray-400 text-lg">AI 为您的灵感规划了四条不同的创作维度：</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {directions.map((dir, i) => (
              <div
                key={i}
                onClick={() => editingIdx === null && handleSelectDirection(dir)}
                className={`text-left p-10 border border-gray-100 rounded-[2.5rem] transition-all group relative overflow-hidden bg-white ${editingIdx === null ? 'hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50/50 cursor-pointer' : ''}`}
              >
                {editingIdx === i ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <input 
                      autoFocus
                      className="w-full text-2xl font-bold text-gray-800 border-b border-indigo-200 outline-none pb-2"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea 
                      className="w-full h-32 text-gray-500 leading-relaxed outline-none resize-none bg-gray-50 p-4 rounded-2xl"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600">取消</button>
                      <button onClick={saveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-md shadow-indigo-100">保存修改</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={(e) => startEdit(i, e)}
                      className="absolute top-8 right-8 p-2 text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="修改文案"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">修改内容</span>
                    </button>
                    <h3 className="font-bold text-2xl text-gray-800 group-hover:text-indigo-600 mb-4 transition-colors pr-20">{dir.title}</h3>
                    <p className="text-gray-500 leading-relaxed text-lg line-clamp-4">{dir.description}</p>
                    <div className="mt-8 flex items-center text-indigo-500 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      探索该路径 →
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="flex gap-4">
              <button
                onClick={() => handleFeelLucky(input)}
                disabled={isLoading}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-indigo-200 transition-all active:scale-95"
              >
                <span>{isLoading ? '...' : '🔄'}</span> 换一批灵感
              </button>
              <button
                onClick={handleManualCreate}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-indigo-200 transition-all active:scale-95"
              >
                <span>✍️</span> 自己新建一个
              </button>
            </div>
            {isLoading && <p className="text-indigo-500 font-medium animate-pulse">正在重新规划创作版图...</p>}
          </div>
        </div>
      )}

      {step === 'custom' && (
        <div className="max-w-3xl w-full px-8 space-y-12 animate-in slide-in-from-bottom-6 duration-500">
           <div className="text-center space-y-4">
            <h2 className="text-4xl font-serif font-bold text-gray-800">自定义创作方向</h2>
            <p className="text-gray-400">输入您脑海中已经成型的故事蓝图：</p>
          </div>
          <div className="bg-white p-10 border border-gray-100 rounded-[2.5rem] shadow-xl shadow-gray-100/50 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">作品标题</label>
              <input 
                autoFocus
                placeholder="例如：遗忘之城的记忆碎片"
                className="w-full text-3xl font-serif font-bold text-gray-800 border-b border-gray-100 focus:border-indigo-500 outline-none pb-4 transition-colors"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">核心简介</label>
              <textarea 
                placeholder="在这里描述故事的起源、世界观或主要矛盾..."
                className="w-full h-48 text-lg text-gray-600 leading-relaxed outline-none resize-none bg-gray-50 p-6 rounded-3xl border border-transparent focus:border-indigo-100 transition-all"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-center gap-4">
             <button
              onClick={() => setStep('direction')}
              className="px-10 py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
            >
              返回推荐
            </button>
            <button
              onClick={submitCustom}
              disabled={!editTitle.trim()}
              className="px-14 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              开始研究
            </button>
          </div>
        </div>
      )}

      {step === 'research' && research && (
        <div className="max-w-6xl w-full px-8 space-y-12 animate-in slide-in-from-bottom-6 duration-500 pb-20">
          <div className="text-center">
            <h2 className="text-4xl font-serif font-bold text-gray-800">研究摘要</h2>
            <p className="text-gray-500 mt-4 text-lg">已为您规划的路径 "{selectedDirection?.title}" 准备好背景资料（可编辑）：</p>
          </div>
          
          {/* 研究素材搜索框 */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim() && !isSearching) {
                    handleSearchMaterials();
                  }
                }}
                placeholder="搜索相关研究素材、参考资料、案例..."
                className="flex-1 px-6 py-4 text-base border border-gray-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              />
              <button
                onClick={handleSearchMaterials}
                disabled={!searchQuery.trim() || isSearching}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>搜索中...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>搜索</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* 核心背景 - 可编辑 */}
            <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 group flex flex-col">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">A</span> 
                核心背景
              </h3>
              <textarea
                value={research.background}
                onChange={(e) => updateResearchBackground(e.target.value)}
                className="w-full flex-1 min-h-[500px] p-4 text-gray-600 leading-loose text-lg bg-white border border-gray-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 resize-y transition-all"
                placeholder="输入核心背景信息..."
              />
            </div>
            
            <div className="space-y-8">
              {/* 角色原型 - 可编辑 */}
              <div>
                <h3 className="font-bold text-lg mb-4 text-gray-700 uppercase tracking-widest">角色原型</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {research.characters.map((c, i) => (
                    <div key={i} className="group relative">
                      {editingCharacterIdx === i ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={c}
                            onChange={(e) => updateCharacter(i, e.target.value)}
                            onBlur={() => setEditingCharacterIdx(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="px-5 py-2 bg-white border-2 border-indigo-400 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span 
                            onClick={() => setEditingCharacterIdx(i)}
                            className="px-5 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-sm hover:border-indigo-400 transition-colors cursor-pointer"
                          >
                            {c}
                          </span>
                          <button
                            onClick={() => deleteCharacter(i)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-bold transition-opacity"
                            title="删除"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCharacter}
                    onChange={(e) => setNewCharacter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCharacter.trim()) {
                        addCharacter();
                      }
                    }}
                    placeholder="添加新角色..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-full outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  />
                  <button
                    onClick={addCharacter}
                    disabled={!newCharacter.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    + 添加
                  </button>
                </div>
              </div>
              
              {/* 关键术语与意象 - 可编辑 */}
              <div className="p-8 border border-dashed border-gray-200 rounded-3xl">
                <h3 className="font-bold text-lg mb-4 text-gray-700 uppercase tracking-widest">关键术语与意象</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {research.terms.map((t, i) => (
                    <div key={i} className="group relative">
                      {editingTermIdx === i ? (
                        <input
                          autoFocus
                          value={t}
                          onChange={(e) => updateTerm(i, e.target.value)}
                          onBlur={() => setEditingTermIdx(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="px-3 py-1 bg-white border-2 border-indigo-400 rounded-lg text-indigo-500 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span
                            onClick={() => setEditingTermIdx(i)}
                            className="text-indigo-500 font-mono text-sm cursor-pointer hover:text-indigo-700 transition-colors"
                          >
                            #{t}
                          </span>
                          <button
                            onClick={() => deleteTerm(i)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-bold transition-opacity"
                            title="删除"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTerm.trim()) {
                        addTerm();
                      }
                    }}
                    placeholder="添加新术语..."
                    className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 font-mono"
                  />
                  <button
                    onClick={addTerm}
                    disabled={!newTerm.trim()}
                    className="px-4 py-1 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    + 添加
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 研究素材列表 */}
          {researchSources.length > 0 && (
            <div className="space-y-6 mt-12">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h3 className="text-2xl font-serif font-bold text-gray-800">研究素材</h3>
                <span className="text-sm text-gray-500">共 {researchSources.length} 条结果</span>
              </div>
              <div className="space-y-4">
                {researchSources.map((source) => (
                  <div
                    key={source.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div
                      className="p-6 cursor-pointer"
                      onClick={() => setExpandedSourceId(expandedSourceId === source.id ? null : source.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-gray-800">{source.title}</h4>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                              >
                                查看原文 →
                              </a>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed mb-3">{source.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>相关度: {source.relevance}%</span>
                            <span>•</span>
                            <span>{new Date(source.timestamp).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0">
                          {expandedSourceId === source.id ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>
                    {expandedSourceId === source.id && (
                      <div className="px-6 pb-6 pt-0 border-t border-gray-100 animate-in slide-in-from-top-2">
                        <div className="pt-6">
                          <h5 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">详细内容</h5>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{source.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-center pt-10">
            <button
              onClick={handleConfirmResearch}
              disabled={isLoading}
              className="px-12 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
            >
              {isLoading ? '正在构思章节框架...' : '确认并生成大纲'}
            </button>
          </div>
        </div>
      )}

      {step === 'outline' && (
        <div className="max-w-4xl w-full px-8 space-y-10 animate-in slide-in-from-bottom-6 duration-500 pb-20">
          <div className="text-center">
            <h2 className="text-4xl font-serif font-bold text-gray-800">故事架构</h2>
            <p className="text-gray-500 mt-4 text-lg">初步章节结构建议：</p>
          </div>
          <div className="space-y-6">
            {outline.map((ch, i) => (
              <div key={i} className="p-8 border border-gray-100 rounded-3xl bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all group relative">
                {editingOutlineIdx === i ? (
                  <div className="space-y-4">
                    <div className="flex gap-6 items-start">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-serif text-xl font-bold text-indigo-600 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">章节标题</label>
                          <input
                            autoFocus
                            value={editingOutlineTitle}
                            onChange={(e) => setEditingOutlineTitle(e.target.value)}
                            className="w-full text-xl font-bold text-gray-800 border-b-2 border-indigo-400 outline-none pb-2 focus:border-indigo-600 transition-colors"
                            placeholder="输入章节标题..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">章节内容</label>
                          <textarea
                            value={editingOutlineDesc}
                            onChange={(e) => setEditingOutlineDesc(e.target.value)}
                            className="w-full min-h-[120px] p-4 text-gray-600 leading-relaxed text-base border-2 border-indigo-400 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 resize-y transition-all"
                            placeholder="输入章节内容描述..."
                          />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                          <button
                            onClick={cancelEditOutline}
                            className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => saveEditOutline(i)}
                            disabled={!editingOutlineTitle.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-6 items-start">
                    <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-serif text-xl font-bold text-indigo-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-bold text-xl text-gray-800">{ch.title}</h4>
                      <p className="text-gray-600 leading-relaxed text-base mt-2">{ch.description}</p>
                    </div>
                    <button
                      onClick={() => startEditOutline(i)}
                      className="opacity-0 group-hover:opacity-100 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all shrink-0"
                    >
                      修改
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <button
              onClick={finish}
              className="px-14 py-5 bg-black text-white rounded-full font-bold text-xl hover:bg-gray-800 transition-all shadow-2xl active:scale-95"
            >
              进入创作工房
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
