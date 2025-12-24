
import React, { useState, useMemo } from 'react';
import type { HighScore } from '../types';
import { SparklesIcon, BookOpenIcon, HorseIcon, BlossomIcon, StickyRiceCakeIcon } from './icons';

interface DashboardProps {
    history: HighScore[];
    apiKey: string | null;
    onSaveApiKey: (key: string) => void;
    onStartPractice: () => void;
    apiKeyError: string | null;
}

const ChartIcon: React.FC<{ className?: string }> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M6 16.5v2.25a2.25 2.25 0 002.25 2.25h12a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H6a2.25 2.25 0 00-2.25 2.25V15m12 4.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H18A2.25 2.25 0 0015.75 6v10.5a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const SimpleLineChart: React.FC<{ data: { label: string; score: number }[] }> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-white/50">
                <ChartIcon className="h-10 w-10 mb-2 opacity-50" />
                <p>No data for this period</p>
            </div>
        );
    }

    const height = 250;
    const width = 600;
    const padding = 60; 
    
    const maxScore = 9;
    const minScore = 0;

    const points = data.map((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - ((point.score - minScore) / (maxScore - minScore)) * (height - padding * 2);
        return { x, y, ...point };
    });

    const pathD = points.length > 1 
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : `M ${points[0].x} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`; 

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
                {[0, 3, 5, 7, 9].map((s) => {
                    const y = height - padding - ((s - minScore) / (maxScore - minScore)) * (height - padding * 2);
                    return (
                        <g key={s}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#fecaca" strokeWidth="1" />
                            <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#991b1b">Band {s}</text>
                        </g>
                    );
                })}

                <path d={pathD} fill="none" stroke="#d97706" strokeWidth="3" />

                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#92400e" strokeWidth="2" />
                ))}

                {points.map((p, i) => (
                    <text key={i} x={p.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#991b1b">
                        {p.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ history, apiKey, onSaveApiKey, onStartPractice, apiKeyError }) => {
    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [period, setPeriod] = useState<'Day' | 'Month' | 'Year'>('Day');

    const chartData = useMemo(() => {
        const now = new Date();
        let filtered = [];

        if (period === 'Day') {
            filtered = history.filter(h => {
                const date = new Date(h.date);
                return (now.getTime() - date.getTime()) < 24 * 60 * 60 * 1000;
            }).map(h => ({
                label: new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                score: h.score
            }));
        } else if (period === 'Month') {
            const last30Days = new Date();
            last30Days.setDate(now.getDate() - 30);
            
            const relevant = history.filter(h => new Date(h.date) >= last30Days);
            const grouped: Record<string, number[]> = {};
            
            relevant.forEach(h => {
                const day = new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(h.score);
            });

            filtered = Object.keys(grouped).map(key => ({
                label: key,
                score: grouped[key].reduce((a, b) => a + b, 0) / grouped[key].length
            }));
        } else {
            const lastYear = new Date();
            lastYear.setFullYear(now.getFullYear() - 1);
            
            const relevant = history.filter(h => new Date(h.date) >= lastYear);
             const grouped: Record<string, number[]> = {};
            
            relevant.forEach(h => {
                const month = new Date(h.date).toLocaleDateString([], { month: 'short', year: '2-digit' });
                if (!grouped[month]) grouped[month] = [];
                grouped[month].push(h.score);
            });

            filtered = Object.keys(grouped).map(key => ({
                label: key,
                score: grouped[key].reduce((a, b) => a + b, 0) / grouped[key].length
            }));
        }
        
        return filtered.reverse(); 
    }, [history, period]);

    const handleSave = () => {
        if (localApiKey.trim()) {
            onSaveApiKey(localApiKey.trim());
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
            <div className="max-w-5xl w-full space-y-8 relative">
                <div className="absolute top-0 right-0 -mt-10 opacity-30 pointer-events-none">
                     <StickyRiceCakeIcon className="h-40 w-40" />
                </div>
                
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-4xl font-bold text-red-700 tracking-tight flex justify-center items-center gap-3">
                        IELTS Instructor
                    </h1>
                    <p className="text-red-900 text-lg font-medium italic">Sowing Success in your IELTS Journey</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-md border border-amber-200 p-6">
                            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-amber-500" />
                                Start Practicing
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Google Gemini API Key
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={localApiKey}
                                        onChange={(e) => setLocalApiKey(e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm ${
                                            apiKeyError ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    />
                                    {apiKeyError && <p className="text-xs text-red-500 mt-1">{apiKeyError}</p>}
                                </div>
                                <button
                                    onClick={() => { handleSave(); onStartPractice(); }}
                                    disabled={!localApiKey.trim()}
                                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Enter Training &rarr;
                                </button>
                                <div className="pt-4 border-t border-red-50 border-t-red-100 text-center">
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-red-600 font-semibold hover:underline"
                                    >
                                        Get a free API Key
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                         <div className="bg-white rounded-xl shadow-md border border-amber-200 p-6 h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                                    <BookOpenIcon className="h-5 w-5 text-amber-600" />
                                    Performance Journey
                                </h3>
                                <div className="flex bg-red-50 p-1 rounded-lg border border-red-100">
                                    {(['Day', 'Month', 'Year'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                                period === p 
                                                ? 'bg-red-600 text-white shadow-sm' 
                                                : 'text-red-800 hover:text-red-900'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-amber-50/30 rounded-lg p-4 border border-amber-100 min-h-[300px] flex items-center justify-center">
                                <SimpleLineChart data={chartData} />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
