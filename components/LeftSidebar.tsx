
import React, { useState, useRef, useEffect } from 'react';
import { Project, Chapter } from '../types';
import { WeKnoraService } from '../services/weknoraService';

interface Props {
    project: Project;
    onUpdate: (project: Project) => void;
    onSelectChapter: (chapterId: string) => void;
}

type Tab = 'drafts' | 'knowledge';

export const LeftSidebar: React.FC<Props> = ({ project, onUpdate, onSelectChapter }) => {
    const [activeTab, setActiveTab] = useState<Tab>('drafts');
    const [assets, setAssets] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use project.kbId (Persisted)
    const kbId = project.kbId;

    // Initialize KB and fetch assets when tab switches to knowledge
    useEffect(() => {
        console.log('[LeftSidebar] Tab/Project State:', { activeTab, projectId: project.id, kbId: project.kbId });
        if (activeTab === 'knowledge') {
            initializeKB();
        }
    }, [activeTab, project.id, project.kbId]);

    const initializeKB = async () => {
        if (kbId) {
            loadAssets(kbId);
            return;
        }

        setStatusMessage('Connecting to Knowledge Base...');
        // Create or Retrieve KB
        const result = await WeKnoraService.createKnowledgeBase(project.id);

        // Handle nested result structure from api/server.js (result can be the KB object or contain data)
        // api/server.js returns `result` directly from WeKnora. 
        // WeKnora create usually returns { kb_id: "...", ... } or { data: { id: "..." } } depending on version.
        // Let's safe parse.
        const id = result.kb_id || result.id || (result.data && result.data.id);

        if (id) {
            // Persist kbId to project configuration
            console.log('[LeftSidebar] Persisting kbId to project:', id);
            onUpdate({ ...project, kbId: id });
            loadAssets(id);
        } else {
            setStatusMessage('Failed to connect to Knowledge Base.');
            console.error('KB Creation result invalid:', result);
        }
    };

    const loadAssets = async (id: string, isSilent = false) => {
        if (!isSilent) setStatusMessage('Loading assets...');
        const result = await WeKnoraService.listAssets(project.id, id);
        if (!result.error) {
            setAssets(result.assets);
            if (!isSilent) setStatusMessage('');
        } else {
            if (!isSilent) setStatusMessage('Failed to load assets.');
        }
    };

    // Polling for asset status updates
    useEffect(() => {
        if (!kbId || assets.length === 0) return;

        // Check if any asset is in a non-final state
        const needsUpdate = assets.some(a =>
            !a.parse_status ||
            ['pending', 'processing', 'parsing'].includes(a.parse_status.toLowerCase())
        );

        if (needsUpdate) {
            const timer = setInterval(() => {
                loadAssets(kbId, true);
            }, 3000);
            return () => clearInterval(timer);
        }
    }, [kbId, assets]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !kbId) {
            if (!kbId) setStatusMessage('Knowledge Base not ready.');
            return;
        }

        setIsUploading(true);
        setStatusMessage(`Uploading ${file.name}...`);

        // 2. Upload using existing kbId
        const result = await WeKnoraService.uploadAsset(project.id, kbId, file);

        setIsUploading(false);
        if (result.success) {
            setStatusMessage('Upload successful!');
            loadAssets(kbId); // Refresh list
        } else {
            setStatusMessage(`Error: ${result.error}`);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addChapter = () => {
        // Logic from Editor.tsx
        const newId = Date.now().toString();
        const newChapter: Chapter = { id: newId, title: `第 ${project.chapters.length + 1} 章`, content: '' };
        onUpdate({
            ...project,
            chapters: [...project.chapters, newChapter],
            currentChapterId: newId
        });
    };

    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

    // ... (existing helper functions)

    return (
        <aside className="w-64 border-r bg-gray-50 flex flex-col shrink-0 h-full relative">
            {/* Tab Header */}
            <div className="flex border-b bg-white">
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'drafts' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Drafts
                </button>
                <button
                    onClick={() => setActiveTab('knowledge')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'knowledge' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Knowledge
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'drafts' && (
                    <div className="space-y-4">
                        <button
                            onClick={addChapter}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <span>+</span> New Chapter
                        </button>
                        <div className="space-y-1.5">
                            {project.chapters.map(ch => (
                                <button
                                    key={ch.id}
                                    onClick={() => onSelectChapter(ch.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all ${ch.id === project.currentChapterId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold' : 'hover:bg-gray-100 text-gray-600 bg-white border border-transparent'}`}
                                >
                                    <div className="truncate">{ch.title}</div>
                                    <div className="text-[9px] opacity-60 font-mono mt-0.5">{ch.content.length} chars</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'knowledge' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <p className="text-[10px] text-blue-800 leading-relaxed">
                                Upload documents (PDF, Doc, TXT) to build your project's specialized Knowledge Base.
                            </p>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.txt,.md,.doc,.docx"
                            onChange={handleFileUpload}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><span>↑</span> Upload Asset</>
                            )}
                        </button>

                        {statusMessage && (
                            <div className="text-[10px] text-center text-gray-400 italic">{statusMessage}</div>
                        )}

                        {kbId && (
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to reset the Knowledge Base connection? This will start a fresh index.')) {
                                        onUpdate({ ...project, kbId: undefined });
                                        setAssets([]);
                                        setStatusMessage('Resetting connection...');
                                    }
                                }}
                                className="w-full py-2 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                🗑️ Reset / Disconnect Knowledge Base
                            </button>
                        )}

                        <div className="space-y-2 mt-4">
                            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Library ({assets.length})</h4>
                            {assets.length === 0 ? (
                                <div className="text-center py-8 text-gray-300 text-xs">No assets yet</div>
                            ) : (
                                assets.map((asset: any) => (
                                    <div
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className="bg-white p-3 rounded-xl border border-gray-100 flex items-start gap-3 hover:shadow-sm transition-shadow group cursor-pointer hover:border-indigo-200"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-lg shrink-0">
                                            📄
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-gray-700 truncate" title={decodeURIComponent(asset.title || asset.name)}>{decodeURIComponent(asset.title || asset.name || 'Untitled')}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${['success', 'completed'].includes((asset.parse_status || '').toLowerCase()) || !asset.parse_status ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                                                <span className="text-[9px] text-gray-400 capitalize">{asset.parse_status || 'Ready'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-4 border-t bg-white/50 text-[10px] text-gray-400 flex justify-between">
                <span>Project ID: {project.id.slice(0, 6)}...</span>
            </div>

            {/* Preview Modal (Wide & Premium) */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-gray-900/5">

                        {/* Header */}
                        <div className="px-8 py-6 border-b flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl text-indigo-600 shrink-0">
                                    📄
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <h3 className="text-xl font-serif font-bold text-gray-900 truncate max-w-lg" title={decodeURIComponent(selectedAsset.title || selectedAsset.name)}>
                                        {decodeURIComponent(selectedAsset.title || selectedAsset.name || 'Untitled')}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{selectedAsset.type || 'DOCUMENT'}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">ID: {selectedAsset.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAsset(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        {/* Main Content (Split View) */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#FAFAFA]">

                            {/* Left: Metadata & Status */}
                            <div className="w-full md:w-80 border-r bg-white p-8 overflow-y-auto shrink-0 flex flex-col gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Processing Status</h4>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className={`w-3 h-3 rounded-full ${selectedAsset.parse_status === 'success' || !selectedAsset.parse_status ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-yellow-500 animate-pulse'}`}></div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700 capitalize">{selectedAsset.parse_status || 'Ready'}</span>
                                            <span className="text-[10px] text-gray-400 leading-tight">
                                                {selectedAsset.parse_status === 'success' || !selectedAsset.parse_status
                                                    ? 'Indexed & Ready for Context'
                                                    : 'Evaluating content structure...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">File Details</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                                            <span className="text-xs text-gray-500">File Size</span>
                                            <span className="text-xs font-mono font-medium text-gray-700">-- KB</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                                            <span className="text-xs text-gray-500">Uploaded</span>
                                            <span className="text-xs font-mono font-medium text-gray-700">Just now</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                                            <span className="text-xs text-gray-500">Tokens</span>
                                            <span className="text-xs font-mono font-medium text-gray-700">~ Est. 1.2k</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-auto">
                                    <button disabled className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                                        <span>⬇</span> Download Original
                                    </button>
                                </div>
                            </div>

                            {/* Right: AI Summary / Content */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="max-w-2xl mx-auto space-y-8">

                                    {/* AI Summary Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">✨</span>
                                            <h4 className="text-lg font-serif font-bold text-gray-800">AI Knowledge Summary</h4>
                                        </div>
                                        <div className="p-6 bg-white rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-[100px] -z-0 opacity-50"></div>

                                            {/* Simulated Summary Content */}
                                            <div className="relative z-10 space-y-4">
                                                {selectedAsset.summary ? (
                                                    <p className="text-gray-600 leading-relaxed text-sm">
                                                        {selectedAsset.summary}
                                                    </p>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <p className="text-gray-400 text-sm mb-4">No summary generated yet.</p>
                                                        <button className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all">
                                                            Generate Summary & Analysis
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Preview Placehoder / Excerpt */}
                                    <div className="space-y-4 pt-4 border-t border-dashed">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <span>Text Content Extraction</span>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">Preview</span>
                                        </h4>

                                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm min-h-[300px] relative">
                                            {selectedAsset.content ? (
                                                <div className="prose prose-sm max-w-none text-gray-600">
                                                    {selectedAsset.content}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-3xl">
                                                        🔒
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <p className="font-bold text-gray-900">Content Secured & Indexed</p>
                                                        <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                                            This document has been successfully processed into vector embeddings.
                                                            Raw text is not stored for display to optimize performance.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};
