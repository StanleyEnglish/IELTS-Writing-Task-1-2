
import React, { useState, useEffect, useMemo } from 'react';
import type { TaskType, Feedback, MistakeCorrection } from '../types';
import { SparklesIcon, EyeIcon, PencilIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface WritingEditorProps {
  taskType: TaskType;
  essay: string;
  setEssay: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onExportWord?: () => void;
  feedback: Feedback | null;
}

const DocumentIcon: React.FC<{ className?: string }> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

// Helper to escape regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

const WritingEditor: React.FC<WritingEditorProps> = ({ 
    taskType, 
    essay, 
    setEssay, 
    onSubmit, 
    isLoading, 
    onExportWord, 
    feedback 
}) => {
  const [viewMode, setViewMode] = useState<'write' | 'review'>('write');
  
  // Automatically switch to review mode when feedback arrives
  useEffect(() => {
    if (feedback) {
        setViewMode('review');
    } else {
        setViewMode('write');
    }
  }, [feedback]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const wordTarget = taskType === 'Task 1' ? 150 : 250;

  // Process the essay text to inject highlights
  const highlightedContent = useMemo(() => {
    if (!feedback) return essay;

    let processedHtml = essay
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");

    // Gather all mistakes
    const allMistakes: MistakeCorrection[] = [
        ...(feedback.lexicalResource.mistakes || []),
        ...(feedback.grammaticalRange.mistakes || [])
    ];

    // Sort by length (longest first) to prevent replacing substrings of other mistakes
    allMistakes.sort((a, b) => b.originalPhrase.length - a.originalPhrase.length);

    // Naive replacement strategy - iterates through mistakes and wraps occurrences
    allMistakes.forEach(mistake => {
        const cleanPhrase = escapeRegExp(mistake.originalPhrase.trim());
        if (!cleanPhrase) return;

        // Create a regex that looks for the phrase, ensuring we don't replace inside existing HTML tags
        const regex = new RegExp(`(${cleanPhrase})(?![^<]*>|[^<>]*<\/span>)`, 'gi');
        
        processedHtml = processedHtml.replace(regex, (match) => {
            const explanation = mistake.explanation.replace(/"/g, '&quot;');
            // Inline correction format: Mistake (Red Strikethrough) followed by Correction (Green Bold)
            // CRITICAL: Everything must be on one line string to avoid whitespace-pre-wrap creating newlines
            return `<span class="bg-red-100 text-red-600 line-through decoration-red-400 px-1 rounded-sm mx-0.5">${match}</span><span class="bg-green-100 text-green-700 font-bold px-1 rounded-sm mx-0.5 cursor-help border-b border-green-300 border-dotted" title="${explanation}">${mistake.suggestedCorrection}</span>`;
        });
    });

    return processedHtml;
  }, [essay, feedback]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Your Essay</h2>
        
        {/* View Mode Toggles */}
        {feedback && (
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                    onClick={() => setViewMode('write')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'write' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                </button>
                <button
                    onClick={() => setViewMode('review')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'review' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <EyeIcon className="h-4 w-4" />
                    Review Mistakes
                </button>
            </div>
        )}
      </div>

      <div className="relative flex-grow min-h-[500px]">
        {viewMode === 'write' ? (
            <textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={`Start writing your response here... (Aim for at least ${wordTarget} words)`}
                className="w-full h-full p-4 border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 font-sans text-base leading-relaxed"
                disabled={isLoading}
            />
        ) : (
            <div 
                className="w-full h-full p-4 border border-slate-300 rounded-md overflow-y-auto bg-white font-sans text-base leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
        )}
        
        <div className={`absolute bottom-3 right-3 text-sm font-medium px-2 py-1 rounded shadow-sm border ${wordCount >= wordTarget ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
          {wordCount} words
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        {feedback && onExportWord && (
             <button
                onClick={onExportWord}
                className="flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-indigo-700 bg-indigo-100 rounded-lg shadow-sm hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                title="Export feedback to Word"
            >
                <DocumentIcon className="h-5 w-5" />
                Export
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
              {feedback ? 'Re-Evaluate' : 'Get Feedback'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WritingEditor;
