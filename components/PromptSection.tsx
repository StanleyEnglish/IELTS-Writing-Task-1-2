
import React, { useState, useEffect, useRef } from 'react';
import type { TaskType, Task1Guidance, WritingSuggestion } from '../types';
import { RefreshIcon, LightbulbIcon, SparklesIcon, PencilIcon, XCircleIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import ImageUpload from './ImageUpload';
import { generateWritingSuggestions } from '../api/gemini.js';

interface PromptSectionProps {
  taskType: TaskType;
  prompt: string;
  guidancePoints: string[];
  task1Guidance: Task1Guidance | null;
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
  apiKey: string | null;
}

const formatIdeaText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span 
            key={index} 
            className="text-emerald-600 font-bold ml-1"
        >
            {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const SuggestionsModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    selectedText: string; 
    suggestions: WritingSuggestion[]; 
    isLoading: boolean; 
}> = ({ isOpen, onClose, selectedText, suggestions, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border-t-4 border-rose-500">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-amber-500" />
                        Writing Suggestion
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    <div className="mb-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">You selected:</p>
                        <p className="text-slate-700 italic">"{selectedText}"</p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <LoadingSpinner className="h-8 w-8 text-rose-500 mb-3" />
                            <p className="text-slate-500 text-sm">Asking AI for the best way to write this...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((sug, idx) => (
                                <div key={idx} className="border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded-r-md">
                                    <p className="font-bold text-slate-800 text-lg mb-1">{sug.english}</p>
                                    <div className="flex gap-2 items-center text-xs mb-2">
                                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full font-medium">{sug.tone}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{sug.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button 
                        onClick={onClose}
                        className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};


const PromptSection: React.FC<PromptSectionProps> = ({ 
  taskType,
  prompt, 
  guidancePoints,
  task1Guidance,
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
  apiKey
}) => {
  const [isGuidanceVisible, setIsGuidanceVisible] = useState(false);
  
  // Selection & Suggestions State
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{top: number, left: number} | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide the guidance whenever a new prompt is loaded
    setIsGuidanceVisible(false);
    setSelectedText(null);
    setSelectionPosition(null);
  }, [prompt]);

  // Handle text selection
  useEffect(() => {
      const handleSelectionChange = () => {
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed && contentRef.current?.contains(selection.anchorNode)) {
              const text = selection.toString().trim();
              if (text.length > 0) {
                  const range = selection.getRangeAt(0);
                  const rect = range.getBoundingClientRect();
                  
                  // Calculate relative position within the container
                  setSelectedText(text);
                  setSelectionPosition({
                      top: rect.top - 40, // Position above selection
                      left: rect.left + (rect.width / 2) - 20 // Center horizontally
                  });
                  return;
              }
          }
          // Clear selection UI if click outside or empty selection
          setSelectionPosition(null);
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      // Also listen for scroll to update position or hide
      document.addEventListener('scroll', () => setSelectionPosition(null), true); 
      
      return () => {
          document.removeEventListener('selectionchange', handleSelectionChange);
          document.removeEventListener('scroll', () => setSelectionPosition(null), true);
      };
  }, []);

  const handleGetSuggestions = async () => {
      if (!apiKey || !selectedText) return;
      
      setShowSuggestionsModal(true);
      setIsGeneratingSuggestions(true);
      setSuggestions([]);

      try {
          const result = await generateWritingSuggestions(selectedText, apiKey);
          if (result) {
              setSuggestions(result);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingSuggestions(false);
      }
  };

  const guideTitle = taskType === 'Task 1' ? 'Dàn bài gợi ý' : 'Brainstorming Guide';
  const hasTask1Guidance = taskType === 'Task 1' && task1Guidance;
  const hasTask2Guidance = taskType === 'Task 2' && guidancePoints.length > 0;

  return (
    <>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-rose-100 h-full overflow-y-auto max-h-[600px] custom-scrollbar relative" ref={contentRef}>
      <div className="flex justify-between items-start mb-4 gap-2">
        <h2 className="text-lg font-semibold text-slate-700 pt-1.5">Writing Prompt</h2>
        <div className="flex gap-2 flex-wrap justify-end">
            {taskType === 'Task 2' && (
              <button
                onClick={onNewPrompt}
                disabled={isLoadingPrompt}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-md hover:bg-emerald-200 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <RefreshIcon className="h-4 w-4" />
                New Prompt
              </button>
            )}
            <button
            onClick={onSetCustomPromptMode}
            disabled={isLoadingPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-100 rounded-md hover:bg-rose-200 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                className="w-full h-28 p-3 border border-slate-300 rounded-md resize-y focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow duration-200"
                disabled={isLoadingPrompt}
            />
            {taskType === 'Task 1' && (
              <ImageUpload image={task1Image} setImage={setTask1Image} disabled={isLoadingPrompt} />
            )}
            <button
                onClick={onGenerateFromCustomPrompt}
                disabled={isLoadingPrompt || !customPromptInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
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
        <div>
          <p className="text-slate-600 leading-relaxed">{prompt}</p>
        </div>
      )}

      {(hasTask1Guidance || hasTask2Guidance || (isLoadingPrompt && isCustomPromptMode)) && (
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
                taskType === 'Task 1' && task1Guidance ? (
                    <>
                      {!isGuidanceVisible ? (
                        <button
                          onClick={() => setIsGuidanceVisible(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                          <LightbulbIcon className="h-5 w-5" />
                          Xem dàn bài gợi ý
                        </button>
                      ) : (
                        <div className="space-y-4 text-slate-600 animate-fade-in">
                          <div>
                            <h4 className="font-semibold text-slate-700">Mở bài (Introduction):</h4>
                            <p className="pl-4 text-sm">{task1Guidance.introduction}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-700">Đoạn tổng quan (Overall):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600">
                              {task1Guidance.overall.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-700">Thân bài 1 (Body 1):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600">
                              {task1Guidance.body1.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-700">Thân bài 2 (Body 2):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600">
                              {task1Guidance.body2.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                ) : (
                    <>
                        <ul className="space-y-2 list-disc list-inside text-slate-600">
                           {guidancePoints.map((point, index) => (
                               <li key={index} className="leading-relaxed">{point}</li>
                           ))}
                        </ul>
                        
                        {ideas.length > 0 ? (
                            <div className="mt-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                        Brainstorming Ideas & Outline
                                    </h4>
                                    <button
                                        onClick={onGenerateIdeas}
                                        disabled={isLoadingIdeas}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Regenerate outline"
                                    >
                                        <RefreshIcon className={`h-4 w-4 ${isLoadingIdeas ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mb-2 italic">Tip: Select any text to get a writing suggestion.</p>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                                    {ideas.map((ideaBlock, index) => (
                                        <div 
                                            key={index} 
                                            className="text-sm text-slate-700 whitespace-pre-line text-justify"
                                        >
                                           {/* Safety replacement: Ensure any bullet point preceded by non-newline gets a newline */}
                                           {formatIdeaText(ideaBlock.replace(/([^\n])\s*-\s*\*\*/g, '$1\n- **'))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                           taskType === 'Task 2' && (
                                <div className="mt-4">
                                    <button
                                        onClick={onGenerateIdeas}
                                        disabled={isLoadingIdeas}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                    >
                                        {isLoadingIdeas ? (
                                            <>
                                                <LoadingSpinner className="h-4 w-4" />
                                                Generating Ideas...
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="h-4 w-4" />
                                                Generate Ideas & Outline
                                            </>
                                        )}
                                    </button>
                                </div>
                           )
                        )}
                    </>
                )
            )}
        </div>
      )}
      
      {/* Floating Tooltip for Text Selection */}
      {selectionPosition && selectedText && (
          <div 
            className="fixed z-50 animate-fade-in"
            style={{ top: `${selectionPosition.top}px`, left: `${selectionPosition.left}px`, transform: 'translateX(-50%)' }}
          >
              <button
                onClick={handleGetSuggestions}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-emerald-700 transition-transform hover:scale-105 font-medium text-xs"
              >
                  <SparklesIcon className="h-4 w-4" />
                  How to write this?
              </button>
              {/* Little arrow */}
              <div className="w-3 h-3 bg-emerald-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 -z-10"></div>
          </div>
      )}
    </div>
    
    <SuggestionsModal 
        isOpen={showSuggestionsModal} 
        onClose={() => setShowSuggestionsModal(false)} 
        selectedText={selectedText || ''}
        suggestions={suggestions}
        isLoading={isGeneratingSuggestions}
    />
    </>
  );
};

export default PromptSection;
