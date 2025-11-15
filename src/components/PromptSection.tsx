import React from 'react';
import type { TaskType } from '../types';
import { RefreshIcon, LightbulbIcon, SparklesIcon, PencilIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import ImageUpload from './ImageUpload';

interface PromptSectionProps {
  taskType: TaskType;
  prompt: string;
  guidancePoints: string[];
  ideas: string[];
  onNewPrompt: () => void;
  isLoadingPrompt: boolean;
  isLoadingIdeas: boolean;
  onGenerateIdeas: () => void;
  isCustomPromptMode: boolean;
  onSetCustomPromptMode: () => void;
  customPromptInput: string;
  setCustomPromptInput: (value: string) => void;
  onGenerateFromCustomPrompt: () => void;
  task1Image: string | null;
  setTask1Image: (image: string | null) => void;
}

const PromptSection: React.FC<PromptSectionProps> = ({ 
  taskType,
  prompt, 
  guidancePoints,
  ideas,
  onNewPrompt, 
  isLoadingPrompt,
  isLoadingIdeas,
  onGenerateIdeas,
  isCustomPromptMode,
  onSetCustomPromptMode,
  customPromptInput,
  setCustomPromptInput,
  onGenerateFromCustomPrompt,
  task1Image,
  setTask1Image,
}) => {

  const guideTitle = taskType === 'Task 1' ? 'Key Features Guide' : 'Brainstorming Guide';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4 gap-2">
        <h2 className="text-lg font-semibold text-slate-700 pt-1.5">Writing Prompt</h2>
        <div className="flex gap-2 flex-wrap justify-end">
            <button
            onClick={onNewPrompt}
            disabled={isLoadingPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
            <RefreshIcon className="h-4 w-4" />
            New Prompt
            </button>
            <button
            onClick={onSetCustomPromptMode}
            disabled={isLoadingPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-100 rounded-md hover:bg-violet-200 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
            <PencilIcon className="h-4 w-4" />
            Insert Your Prompt
            </button>
        </div>
      </div>

      {isCustomPromptMode ? (
        <div className="space-y-3">
            <textarea
                value={customPromptInput}
                onChange={(e) => setCustomPromptInput(e.target.value)}
                placeholder={`Paste or type your IELTS Writing ${taskType} prompt here...`}
                className="w-full h-28 p-3 border border-slate-300 rounded-md resize-y focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow duration-200"
                disabled={isLoadingPrompt}
            />
            {taskType === 'Task 1' && (
              <ImageUpload image={task1Image} setImage={setTask1Image} disabled={isLoadingPrompt} />
            )}
            <button
                onClick={onGenerateFromCustomPrompt}
                disabled={isLoadingPrompt || !customPromptInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
                {isLoadingPrompt ? <LoadingSpinner className="h-5 w-5" /> : <LightbulbIcon className="h-5 w-5" />}
                Generate Guide
            </button>
        </div>
      ) : isLoadingPrompt ? (
        <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        </div>
      ) : (
        <p className="text-slate-600 leading-relaxed">{prompt}</p>
      )}

      {(guidancePoints.length > 0 || (isLoadingPrompt && isCustomPromptMode)) && (
        <div className="mt-6 pt-4 border-t border-slate-200">
             <h3 className="text-md font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <LightbulbIcon className="h-5 w-5 text-amber-500" />
                {guideTitle}
            </h3>
            {isLoadingPrompt && !isCustomPromptMode ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                </div>
            ) : (
                <>
                    <ul className="space-y-2 list-disc list-inside text-slate-600">
                        {guidancePoints.map((q, index) => (
                            <li key={index}>{q}</li>
                        ))}
                    </ul>
                    {taskType === 'Task 2' && guidancePoints.length > 0 && (
                        <div className="mt-4">
                            <button 
                                onClick={onGenerateIdeas}
                                disabled={isLoadingIdeas || ideas.length > 0}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                {isLoadingIdeas ? <LoadingSpinner className="h-4 w-4 text-amber-800"/> : <SparklesIcon className="h-4 w-4" />}
                                Gợi ý ideas
                            </button>
                        </div>
                    )}
                    {isLoadingIdeas && (
                         <div className="animate-pulse space-y-3 mt-4">
                            <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    )}
                    {ideas.length > 0 && (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
                            <h4 className="font-semibold text-sm text-slate-600 mb-2">Suggested Ideas:</h4>
                            <ul className="space-y-1 text-slate-600 text-sm">
                                {ideas.map((idea, index) => (
                                    <li key={index}>{idea}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
      )}
    </div>
  );
};

export default PromptSection;