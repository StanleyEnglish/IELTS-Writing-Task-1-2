import React from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon } from './icons';

interface TimerProps {
    timeRemaining: number;
    isTimerActive: boolean;
    onToggleTimer: () => void;
    onResetTimer: () => void;
    disabled: boolean;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, isTimerActive, onToggleTimer, onResetTimer, disabled }) => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isFinished = timeRemaining <= 0;

    return (
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <span className={`font-mono text-lg font-semibold w-16 text-center ${isFinished ? 'text-rose-500' : 'text-slate-700'}`}>
                {formattedTime}
            </span>
            <div className="flex items-center">
                <button
                    onClick={onToggleTimer}
                    disabled={disabled || isFinished}
                    className="p-2 text-slate-600 hover:text-sky-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    aria-label={isTimerActive ? 'Pause timer' : 'Start timer'}
                >
                    {isTimerActive ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>
                <button
                    onClick={onResetTimer}
                    disabled={disabled}
                    className="p-2 text-slate-600 hover:text-rose-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    aria-label="Reset timer"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default Timer;
