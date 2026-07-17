
import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, signInWithGoogle, signInWithGoogleRedirect, logout } from '../firebase';
import { SparklesIcon, StickyRiceCakeIcon, UsersIcon } from './icons';
import Leaderboard from './Leaderboard';

interface DashboardProps {
    apiKey: string | null;
    onSaveApiKey: (key: string) => void;
    onStartPractice: () => void;
    apiKeyError: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ apiKey, onSaveApiKey, onStartPractice, apiKeyError }) => {
    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [user, setUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        setLocalApiKey(apiKey || '');
    }, [apiKey]);

    useEffect(() => {
        // Check for redirect sign-in result when component mounts
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    setUser(result.user);
                }
            })
            .catch((error: any) => {
                console.error('Redirect sign-in error:', error);
                setAuthError(error.message || String(error));
            });

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = () => {
        if (localApiKey.trim()) {
            onSaveApiKey(localApiKey.trim());
        }
    };

    const handleSignIn = async () => {
        setAuthError(null);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Sign in failed:', error);
            setAuthError(error.message || String(error));
        }
    };

    const handleSignInRedirect = async () => {
        setAuthError(null);
        try {
            await signInWithGoogleRedirect();
        } catch (error: any) {
            console.error('Sign in with redirect failed:', error);
            setAuthError(error.message || String(error));
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
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
                                <UsersIcon className="h-5 w-5 text-amber-500" />
                                Student Profile
                            </h3>
                            {user ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                        {user.photoURL && (
                                            <img src={user.photoURL} alt={user.displayName || 'User'} className="h-10 w-10 rounded-full border-2 border-amber-400" referrerPolicy="no-referrer" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-red-900 truncate">{user.displayName}</p>
                                            <p className="text-xs text-red-700 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-2 text-xs font-bold text-red-700 hover:text-red-900 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Sign in to save your results and compete on the global leaderboard!
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleSignIn}
                                            className="w-full py-2.5 bg-white border-2 border-slate-200 hover:border-red-300 text-slate-700 font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-4 w-4" />
                                            Sign in with Google (Popup)
                                        </button>
                                        <button
                                            onClick={handleSignInRedirect}
                                            className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
                                        >
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-3.5 w-3.5 opacity-85" />
                                            Try Redirect Fallback (Recommended)
                                        </button>
                                    </div >
                                    {authError && (
                                        <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200 space-y-1.5 leading-relaxed">
                                            <p className="font-bold text-red-900">Current Login Log:</p>
                                            <p className="font-mono text-[10px] bg-white p-1.5 rounded border border-red-100 overflow-x-auto whitespace-pre-wrap select-text">{authError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
                                        placeholder="AIzaSy... or AQ..."
                                        value={localApiKey}
                                        onChange={(e) => setLocalApiKey(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && localApiKey.trim()) {
                                                handleSave();
                                                onStartPractice();
                                            }
                                        }}
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
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6 pb-2 border-b border-amber-100">
                                <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5 text-amber-600" />
                                    Global Leaderboard
                                </h3>
                                <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                    ⏱️ Start the timer to get ranked.
                                </span>
                            </div>
                            
                            <div className="bg-amber-50/30 rounded-lg p-4 border border-amber-100 min-h-[400px]">
                                <Leaderboard />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
