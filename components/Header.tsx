
import React, { useState, useEffect } from 'react';
import type { TaskType } from '../types';
import Timer from './Timer';
import { SnowflakeIcon } from './icons';

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
                ? 'bg-rose-700 text-white shadow ring-2 ring-rose-500'
                : 'bg-white text-rose-800 hover:bg-rose-50'
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
    <header className="bg-rose-700 shadow-md sticky top-0 z-10 border-b-4 border-amber-400">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <SnowflakeIcon className="h-6 w-6 text-white animate-pulse" />
                IELTS Winter Master
            </h1>
            {(!apiKey || apiKeyError) && (
                <div className="flex items-center gap-2 animate-fade-in">
                    <input
                        type="password"
                        placeholder="Enter your Google Gemini API Key"
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`px-3 py-1.5 text-sm border rounded-md shadow-sm w-52 sm:w-64 focus:outline-none focus:ring-2 transition-colors ${
                            apiKeyError ? 'border-red-500 focus:ring-red-500' : 'border-rose-300 focus:ring-amber-400 focus:border-amber-400'
                        }`}
                        aria-label="Google Gemini API Key"
                    />
                    <button
                        onClick={handleSave}
                        disabled={!localApiKey.trim() || localApiKey.trim() === apiKey}
                        className="px-4 py-1.5 text-sm font-semibold text-rose-800 bg-white rounded-md shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
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
            <div className="flex items-center gap-2 p-1 bg-rose-800 rounded-lg">
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
        <div className="bg-red-100 text-red-800 text-sm text-center py-1.5 px-4 animate-fade-in">
            {apiKeyError} {' '}
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-red-900"
            >
                Get a new key here.
            </a>
        </div>
       )}
    </header>
  );
};

export default Header;
