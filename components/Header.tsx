
import React, { useState, useEffect } from 'react';
import type { TaskType } from '../types';
import Timer from './Timer';
import { HorseIcon } from './icons';

interface HeaderProps {
    taskType: TaskType;
    setTaskType: (task: TaskType) => void;
    isLoading: boolean;
    timeRemaining: number;
    isTimerActive: boolean;
    onToggleTimer: () => void;
    onResetTimer: () => void;
    apiKey: string | null;
    onSaveApiKey: (key: string) => void;
    apiKeyError: string | null;
}

const TaskToggleButton: React.FC<{
    label: TaskType;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
}> = ({ label, isActive, onClick, disabled }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 ${
                isActive
                ? 'bg-amber-500 text-red-900 shadow ring-2 ring-amber-400'
                : 'bg-red-800 text-red-100 hover:bg-red-700'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-pressed={isActive}
        >
            {label}
        </button>
    )
}

const Header: React.FC<HeaderProps> = ({ 
    taskType, 
    setTaskType, 
    isLoading, 
    timeRemaining, 
    isTimerActive, 
    onToggleTimer, 
    onResetTimer, 
    apiKey,
    onSaveApiKey,
    apiKeyError
}) => {
    const [localApiKey, setLocalApiKey] = useState(apiKey || '');

    useEffect(() => {
        setLocalApiKey(apiKey || '');
    }, [apiKey]);

    const handleSave = () => {
        if (localApiKey.trim()) {
            onSaveApiKey(localApiKey.trim());
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          handleSave();
        }
    };
    
  return (
    <header className="bg-red-700 shadow-md sticky top-0 z-10 border-b-4 border-amber-500">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <HorseIcon className="h-6 w-6 text-amber-400 animate-bounce" />
                IELTS Tet Master
            </h1>
            {(!apiKey || apiKeyError) && (
                <div className="flex items-center gap-2 animate-fade-in">
                    <input
                        type="password"
                        placeholder="Enter Gemini API Key"
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`px-3 py-1.5 text-sm border rounded-md shadow-sm w-52 sm:w-64 focus:outline-none focus:ring-2 transition-colors ${
                            apiKeyError ? 'border-red-500 focus:ring-red-500' : 'border-red-300 focus:ring-amber-400 focus:border-amber-400 bg-red-800/20 text-white placeholder:text-red-200'
                        }`}
                        aria-label="Google Gemini API Key"
                    />
                    <button
                        onClick={handleSave}
                        disabled={!localApiKey.trim() || localApiKey.trim() === apiKey}
                        className="px-4 py-1.5 text-sm font-semibold text-red-800 bg-amber-400 rounded-md shadow-sm hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-4">
            <Timer
                timeRemaining={timeRemaining}
                isTimerActive={isTimerActive}
                onToggleTimer={onToggleTimer}
                onResetTimer={onResetTimer}
                disabled={isLoading}
            />
            <div className="flex items-center gap-2 p-1 bg-red-900 rounded-lg shadow-inner">
               <TaskToggleButton 
                    label="Task 1"
                    isActive={taskType === 'Task 1'}
                    onClick={() => setTaskType('Task 1')}
                    disabled={isLoading}
               />
               <TaskToggleButton 
                    label="Task 2"
                    isActive={taskType === 'Task 2'}
                    onClick={() => setTaskType('Task 2')}
                    disabled={isLoading}
               />
            </div>
        </div>
      </div>
       {apiKeyError && (
        <div className="bg-red-950 text-red-100 text-sm text-center py-1.5 px-4 animate-fade-in">
            {apiKeyError} {' '}
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-amber-400 underline hover:text-amber-300"
            >
                Get a new key here.
            </a>
        </div>
       )}
    </header>
  );
};

export default Header;
