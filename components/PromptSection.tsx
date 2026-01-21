
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
      return <strong key={index} className="font-bold text-red-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span 
            key={index} 
            className="text-red-600 font-bold ml-1 bg-red-50 px-1 rounded"
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border-t-4 border-amber-500">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-amber-500" />
                        Writing Suggestion
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-600">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-100">
                        <p className="text-xs text-red-500 uppercase tracking-wide font-bold mb-1">Selected Passage:</p>
                        <p className="text-slate-700 italic">"{selectedText}"</p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <LoadingSpinner className="h-8 w-8 text-red-500 mb-3" />
                            <p className="text-slate-500 text-sm">Consulting the scholars...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((sug, idx) => (
                                <div key={idx} className="border-l-4 border-amber-500 bg-amber-50 p-3 rounded-r-md">
                                    <p className="font-bold text-slate-800 text-lg mb-1">{sug.english}</p>
                                    <div className="flex gap-2 items-center text-xs mb-2">
                                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-bold">{sug.tone}</span>
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
                        Dismiss
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
  
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{top: number, left: number} | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsGuidanceVisible(false);
    setSelectedText(null);
    setSelectionPosition(null);
  }, [prompt]);

  useEffect(() => {
      const handleSelectionChange = () => {
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed && contentRef.current?.contains(selection.anchorNode)) {
              const text = selection.toString().trim();
              if (text.length > 0) {
                  const range = selection.getRangeAt(0);
                  const rect = range.getBoundingClientRect();
                  
                  setSelectedText(text);
                  setSelectionPosition({
                      top: rect.top - 40, 
                      left: rect.left + (rect.width / 2) - 20 
                  });
                  return;
              }
          }
          setSelectionPosition(null);
      };

      document.addEventListener('selectionchange', handleSelectionChange);
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

  const hasTask1Guidance = taskType === 'Task 1' && task1Guidance;
  const hasTask2Guidance = taskType === 'Task 2' && guidancePoints.length > 0;

  return (
    <>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-amber-100 h-full overflow-y-auto max-h-[600px] custom-scrollbar relative" ref={contentRef}>
      <div className="flex justify-between items-start mb-4 gap-2">
        <h2 className="text-lg font-bold text-red-800 pt-1.5">Your Prompt</h2>
        <div className="flex gap-2 flex-wrap justify-end">
            {taskType === 'Task 2' && (
              <button
                onClick={onNewPrompt}
                disabled={isLoadingPrompt}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed border border-red-200"
              >
                <RefreshIcon className="h-4 w-4" />
                Next Challenge
              </button>
            )}
            <button
            onClick={onSetCustomPromptMode}
            disabled={isLoadingPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-amber-800 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed border border-amber-200"
            >
            <PencilIcon className="h-4 w-4" />
            Your Own Task
            </button>
        </div>
      </div>

      {isCustomPromptMode ? (
        <div className="space-y-3">
            <textarea
                value={customPromptInput}
                onChange={(e) => setCustomPromptInput(e.target.value)}
                placeholder={`Paste your IELTS prompt here...`}
                className="w-full h-28 p-3 border border-amber-200 rounded-md resize-y focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow duration-200 bg-amber-50/20"
                disabled={isLoadingPrompt}
            />
            {taskType === 'Task 1' && (
              <ImageUpload image={task1Image} setImage={setTask1Image} disabled={isLoadingPrompt} />
            )}
            <button
                onClick={onGenerateFromCustomPrompt}
                disabled={isLoadingPrompt || !customPromptInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md"
            >
                {isLoadingPrompt ? <LoadingSpinner className="h-5 w-5" /> : <LightbulbIcon className="h-5 w-5" />}
                How to Brainstorm
            </button>
        </div>
      ) : isLoadingPrompt ? (
        <div className="animate-pulse space-y-3">
            <div className="h-4 bg-red-50 rounded w-full"></div>
            <div className="h-4 bg-red-50 rounded w-5/6"></div>
        </div>
      ) : (
        <div className="bg-red-50/30 p-4 rounded-lg border border-red-100 border-l-4 border-l-red-600">
          <p className="text-slate-700 leading-relaxed font-medium">{prompt}</p>
        </div>
      )}

      {(hasTask1Guidance || hasTask2Guidance || (isLoadingPrompt && isCustomPromptMode)) && (
        <div className="mt-6 pt-4 border-t border-amber-200">
            {isLoadingPrompt && !isCustomPromptMode ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-red-50 rounded w-full"></div>
                    <div className="h-4 bg-red-50 rounded w-full"></div>
                </div>
            ) : (
                taskType === 'Task 1' && task1Guidance ? (
                    <>
                      {!isGuidanceVisible ? (
                        <button
                          onClick={() => setIsGuidanceVisible(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-900 bg-amber-400 rounded-md hover:bg-amber-500 transition-colors duration-200 shadow-sm"
                        >
                          <LightbulbIcon className="h-5 w-5" />
                          Xem dàn bài Hoàng Gia
                        </button>
                      ) : (
                        <div className="space-y-4 text-slate-600 animate-fade-in bg-amber-50/30 p-4 rounded-lg border border-amber-100">
                          <div>
                            <h4 className="font-bold text-red-800">Mở bài (Introduction):</h4>
                            <p className="pl-4 text-sm font-medium">{task1Guidance.introduction}</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-red-800">Đoạn tổng quan (Overall):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600 font-medium">
                              {task1Guidance.overall.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-red-800">Thân bài 1 (Body 1):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600 font-medium">
                              {task1Guidance.body1.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-red-800">Thân bài 2 (Body 2):</h4>
                            <ul className="pl-8 list-disc space-y-1 text-sm text-slate-600 font-medium">
                              {task1Guidance.body2.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                ) : (
                    <>
                        <ul className="space-y-2 list-disc list-inside text-slate-700 font-medium">
                           {guidancePoints.map((point, index) => (
                               <li key={index} className="leading-relaxed border-b border-red-50 pb-1">{point}</li>
                           ))}
                        </ul>
                        
                        {ideas.length > 0 ? (
                            <div className="mt-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide">
                                        Outline & Vocabulary
                                    </h4>
                                    <button
                                        onClick={onGenerateIdeas}
                                        disabled={isLoadingIdeas}
                                        className="text-red-400 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Recalculate Strategy"
                                    >
                                        <RefreshIcon className={`h-4 w-4 ${isLoadingIdeas ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <p className="text-xs text-red-500 mb-2 font-bold italic">💡 Mẹo: Chọn một cụm từ bất kỳ để xem gợi ý viết chính xác.</p>
                                <div className="space-y-4 bg-amber-50/40 p-4 rounded-md border border-amber-200 shadow-inner">
                                    {ideas.map((ideaBlock, index) => (
                                        <div 
                                            key={index} 
                                            className="text-sm text-slate-700 whitespace-pre-line text-justify leading-relaxed"
                                        >
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
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-900 bg-amber-400 rounded-md hover:bg-amber-500 transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md"
                                    >
                                        {isLoadingIdeas ? (
                                            <>
                                                <LoadingSpinner className="h-4 w-4" />
                                                Sowing Ideas...
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="h-4 w-4" />
                                                Generate Outline
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
      
      {selectionPosition && selectedText && (
          <div 
            className="fixed z-50 animate-fade-in"
            style={{ top: `${selectionPosition.top}px`, left: `${selectionPosition.left}px`, transform: 'translateX(-50%)' }}
          >
              <button
                onClick={handleGetSuggestions}
                className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-105 font-bold text-xs border border-amber-300"
              >
                  <SparklesIcon className="h-4 w-4 text-amber-300" />
                  Write Imperial?
              </button>
              <div className="w-3 h-3 bg-red-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 -z-10 border-r border-b border-amber-300"></div>
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
