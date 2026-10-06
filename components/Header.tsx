
import React from 'react';
import type { TaskType } from '../types';
import Timer from './Timer';
import { CoffeeIcon, ExclamationTriangleIcon } from './icons';

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
    onRemoveApiKey?: () => void;
    hasCustomApiKey?: boolean;
    apiKeyError: string | null;
    onOpenSupportModal?: () => void;
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
    apiKeyError,
    onOpenSupportModal
}) => {
  return (
    <header className="bg-red-700 shadow-md sticky top-0 z-10 border-b-4 border-amber-500">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                IELTS Instructor
            </h1>
        </div>
        
        <div className="flex items-center gap-3">
            {onOpenSupportModal && (
              <button
                onClick={onOpenSupportModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-900 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-200 hover:scale-105 active:scale-95"
                title="Ủng hộ tác giả cốc cà phê"
              >
                <CoffeeIcon className="w-4 h-4 text-red-800" />
                <span className="hidden sm:inline">Support Me</span>
              </button>
            )}

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
        <div className="bg-red-950 text-red-100 text-xs sm:text-sm py-2 px-4 border-t border-red-800 animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-left">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{apiKeyError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold bg-red-800 hover:bg-red-700 text-amber-200 underline rounded transition-colors"
                >
                    Get a new API Key &rarr;
                </a>
            </div>
        </div>
       )}
    </header>
  );
};

export default Header;
