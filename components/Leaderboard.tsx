
import React, { useState, useEffect } from 'react';
import type { HighScore } from '../types';
import { BookOpenIcon, CheckCircleIcon, SparklesIcon, XCircleIcon } from './icons';

interface LeaderboardProps {
    highScores: HighScore[];
    apiKey: string | null;
    onSaveApiKey: (key: string) => void;
    onStartPractice: (nickname: string) => void;
    savedNickname: string;
}

const BAD_WORDS = ['admin', 'root', 'shit', 'fuck', 'damn', 'bitch', 'crap', 'piss', 'dick', 'darn', 'cock', 'pussy', 'ass', 'asshole', 'fag', 'bastard', 'slut', 'douche', 'cunt', 'whore'];

const Leaderboard: React.FC<LeaderboardProps> = ({ highScores, apiKey, onSaveApiKey, onStartPractice, savedNickname }) => {
    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [nickname, setNickname] = useState(savedNickname || '');
    const [nicknameError, setNicknameError] = useState<string | null>(null);
    const [selectedEssay, setSelectedEssay] = useState<HighScore | null>(null);

    // Sync local nickname state if the savedNickname prop loads/changes (e.g. from localStorage)
    useEffect(() => {
        if (savedNickname) {
            setNickname(savedNickname);
        }
    }, [savedNickname]);

    const handleStart = () => {
        if (!nickname.trim()) {
            setNicknameError("Please enter a nickname.");
            return;
        }

        const lowerNick = nickname.toLowerCase();
        if (BAD_WORDS.some(word => lowerNick.includes(word))) {
             setNicknameError("Please choose a different nickname.");
             return;
        }

        if (localApiKey.trim()) {
            onSaveApiKey(localApiKey.trim());
        }
        
        onStartPractice(nickname.trim());
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
            <div className="max-w-4xl w-full space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">IELTS Writing Master</h1>
                    <p className="text-slate-600 text-lg">Practice, Feedback, and Improvement with AI Examiner</p>
                </div>

                {/* Hall of Fame Section */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="bg-sky-600 px-6 py-4 flex items-center gap-3">
                        <SparklesIcon className="h-6 w-6 text-yellow-300" />
                        <h2 className="text-xl font-bold text-white">Hall of Fame</h2>
                    </div>
                    
                    {highScores.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p className="text-lg mb-2">No records yet.</p>
                            <p className="text-sm">Submit your first essay to see your name here!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                                        <th className="px-6 py-3 font-semibold border-b border-slate-200">Rank</th>
                                        <th className="px-6 py-3 font-semibold border-b border-slate-200">Nickname</th>
                                        <th className="px-6 py-3 font-semibold border-b border-slate-200">Score</th>
                                        <th className="px-6 py-3 font-semibold border-b border-slate-200">Essay</th>
                                        <th className="px-6 py-3 font-semibold border-b border-slate-200">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {highScores.map((score, index) => (
                                        <tr key={score.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                 <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {score.nickname || 'Anonymous'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-800 text-lg">{score.displayScore}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => setSelectedEssay(score)}
                                                    className="text-sky-600 hover:text-sky-800 text-sm font-semibold hover:underline"
                                                >
                                                    View Essay
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(score.date).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* API Key & Start Section */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Start Your Practice Session</h3>
                    
                    <div className="max-w-md mx-auto space-y-5">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Your Nickname
                            </label>
                            <input
                                type="text"
                                placeholder="Enter a nickname..."
                                value={nickname}
                                onChange={(e) => {
                                    setNickname(e.target.value);
                                    setNicknameError(null);
                                }}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all ${
                                    nicknameError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                                }`}
                                maxLength={20}
                            />
                            {nicknameError && <p className="text-xs text-red-500 mt-1 ml-1">{nicknameError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Google Gemini API Key
                            </label>
                            <input
                                type="password"
                                placeholder="AIzaSy..."
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                            />
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={!localApiKey.trim() || !nickname.trim()}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            Start Practicing
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 mb-2">Don't have an API key?</p>
                        <p className="text-sm text-slate-600">
                            You can get a free Gemini API key from Google AI Studio. 
                        </p>
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-sky-600 font-semibold hover:text-sky-800 hover:underline"
                        >
                            Get your API Key here &rarr;
                        </a>
                    </div>
                </div>
            </div>

            {/* Essay Modal */}
            {selectedEssay && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center p-5 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    Essay by {selectedEssay.nickname || 'Anonymous'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                                        Band {selectedEssay.displayScore}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {new Date(selectedEssay.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedEssay(null)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <BookOpenIcon className="h-5 w-5 text-slate-500" />
                                Prompt:
                            </h4>
                            <p className="text-slate-600 mb-6 italic text-sm border-l-4 border-slate-200 pl-3 py-1 bg-slate-50">
                                {selectedEssay.prompt}
                            </p>
                            
                            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5 text-slate-500" />
                                Response:
                            </h4>
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line text-justify">
                                {selectedEssay.essay}
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg text-right">
                             <button 
                                onClick={() => setSelectedEssay(null)}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
