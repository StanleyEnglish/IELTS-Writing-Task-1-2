
import React from 'react';
import type { TaskType } from '../types';
import { SparklesIcon, ArrowPathIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface WritingEditorProps {
  taskType: TaskType;
  essay: string;
  setEssay: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onExportWord?: () => void;
  hasFeedback?: boolean;
}

const DocumentIcon: React.FC<{ className?: string }> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const WritingEditor: React.FC<WritingEditorProps> = ({ taskType, essay, setEssay, onSubmit, isLoading, onExportWord, hasFeedback }) => {
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const wordTarget = taskType === 'Task 1' ? 150 : 250;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Your Essay</h2>
      <div className="relative flex-grow">
        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder={`Start writing your response here... (Aim for at least ${wordTarget} words)`}
          className="w-full h-[500px] p-4 border border-slate-300 rounded-md resize-y focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200"
          disabled={isLoading}
        />
        <div className={`absolute bottom-3 right-3 text-sm font-medium px-2 py-1 rounded ${wordCount >= wordTarget ? 'text-green-700 bg-green-100' : 'text-slate-500 bg-slate-100'}`}>
          {wordCount} words
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        {hasFeedback && onExportWord && (
             <button
                onClick={onExportWord}
                className="flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-indigo-700 bg-indigo-100 rounded-lg shadow-sm hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                title="Export feedback to Word"
            >
                <DocumentIcon className="h-5 w-5" />
                Export to Word
            </button>
        )}
        <button
          onClick={onSubmit}
          disabled={isLoading || wordCount === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-sky-600 rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
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
