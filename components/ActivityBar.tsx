
import React from 'react';

interface Props {
    activeTab: 'files' | 'search' | 'ai' | 'settings';
    onTabChange: (tab: 'files' | 'search' | 'ai' | 'settings') => void;
    onLaunchDemo?: () => void;
}

export const ActivityBar: React.FC<Props> = ({ activeTab, onTabChange, onLaunchDemo }) => {
    const icons = [
        { id: 'files', label: 'Files', icon: '📄' },
        { id: 'search', label: 'Search', icon: '🔍' },
        { id: 'ai', label: 'Copilot', icon: '✨' },
    ];

    return (
        <aside className="w-12 bg-gray-900 flex flex-col items-center py-4 shrink-0 z-30">

            <div className="mb-6">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-serif text-white font-bold text-xs">
                    G
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
                {icons.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id as any)}
                        className={`w-full py-3 flex justify-center relative group transition-all ${activeTab === item.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        title={item.label}
                    >
                        {activeTab === item.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        )}
                        <span className="text-xl">{item.icon}</span>
                    </button>
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 w-full">
                {/* Lab / Demo Button */}
                {onLaunchDemo && (
                    <button
                        onClick={onLaunchDemo}
                        className="w-full py-3 flex justify-center text-gray-500 hover:text-indigo-400 transition-all"
                        title="Experimental Features (Demo)"
                    >
                        <span className="text-xl">🧪</span>
                    </button>
                )}

                <button
                    onClick={() => onTabChange('settings')}
                    className={`w-full py-3 flex justify-center transition-all ${activeTab === 'settings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className="text-xl">⚙️</span>
                </button>
            </div>
        </aside>
    );
};
