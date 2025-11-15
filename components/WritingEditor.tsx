import React from 'react';
import type { TaskType } from '../types';
import { SparklesIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface WritingEditorProps {
  taskType: TaskType;
  essay: string;
  setEssay: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const WritingEditor: React.FC<WritingEditorProps> = ({ taskType, essay, setEssay, onSubmit, isLoading }) => {
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const wordTarget = taskType === 'Task 1' ? 150 : 250;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Your Essay</h2>
      <div className="relative">
        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder={`Start writing your response here... (Aim for at least ${wordTarget} words)`}
          className="w-full h-80 p-4 border border-slate-300 rounded-md resize-y focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200"
          disabled={isLoading}
        />
        <div className={`absolute bottom-3 right-3 text-sm font-medium px-2 py-1 rounded ${wordCount >= wordTarget ? 'text-green-700 bg-green-100' : 'text-slate-500 bg-slate-100'}`}>
          {wordCount} words
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isLoading || wordCount === 0}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-sky-600 rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="h-5 w-5" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5" />
              Get Feedback
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WritingEditor;