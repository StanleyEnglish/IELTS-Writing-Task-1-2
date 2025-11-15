import React from 'react';
import type { TaskType } from '../types';

interface HeaderProps {
    taskType: TaskType;
    setTaskType: (task: TaskType) => void;
    isLoading: boolean;
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
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                isActive
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-pressed={isActive}
        >
            {label}
        </button>
    )
}

const Header: React.FC<HeaderProps> = ({ taskType, setTaskType, isLoading }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
            IELTS Writing
        </h1>
        
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
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
    </header>
  );
};

export default Header;