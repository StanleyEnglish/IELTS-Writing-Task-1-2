import React, { useState, useEffect, useCallback } from 'react';
import type { Feedback, TaskType, TaskContext } from './types';
import { IELTS_TASK_1_PROMPTS, IELTS_TASK_2_PROMPTS } from './constants';
import { generateGuidance, getIeltsFeedback, generateBrainstormingIdeas } from './services/geminiService';
import Header from './components/Header';
import PromptSection from './components/PromptSection';
import WritingEditor from './components/WritingEditor';
import FeedbackDisplay from './components/FeedbackDisplay';

const getInitialTaskContext = (isLoadingPrompt = false, isInitialized = false): TaskContext => ({
  prompt: '',
  customPromptInput: '',
  isCustomPromptMode: false,
  guidancePoints: [],
  brainstormingIdeas: [],
  task1Image: null,
  userEssay: '',
  feedback: null,
  isLoadingPrompt,
  isLoadingIdeas: false,
  isLoadingFeedback: false,
  isInitialized,
});

const App: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType>('Task 2');
  const [task1Context, setTask1Context] = useState<TaskContext>(getInitialTaskContext());
  const [task2Context, setTask2Context] = useState<TaskContext>(getInitialTaskContext(true, false));
  const [error, setError] = useState<string | null>(null);

  // Global timer state
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);

  const activeContext = taskType === 'Task 1' ? task1Context : task2Context;
  const setActiveContext = taskType === 'Task 1' ? setTask1Context : setTask2Context;

  const handleNewPrompt = useCallback(async (taskToLoad: TaskType) => {
    const setter = taskToLoad === 'Task 1' ? setTask1Context : setTask2Context;
    
    setter(getInitialTaskContext(true, true));
    setError(null);
    
    try {
      const prompts = taskToLoad === 'Task 1' ? IELTS_TASK_1_PROMPTS : IELTS_TASK_2_PROMPTS;
      const newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      const points = await generateGuidance(taskToLoad, newPrompt);
      setter(prev => ({
        ...prev,
        prompt: newPrompt,
        guidancePoints: points,
        isLoadingPrompt: false,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setter(prev => ({ ...prev, isLoadingPrompt: false }));
    }
  }, []);
  
  const handleTaskTypeChange = (newType: TaskType) => {
    if (newType === taskType) return;
    setTaskType(newType);
  };
  
  useEffect(() => {
    const contextToLoad = taskType === 'Task 1' ? task1Context : task2Context;
    if (!contextToLoad.isInitialized) {
      handleNewPrompt(taskType);
    }
  }, [taskType, task1Context, task2Context, handleNewPrompt]);
  
  // Effect for the global timer
  useEffect(() => {
    if (!isTimerActive) return;

    const intervalId = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTimerActive]);


  const handleSetCustomPromptMode = () => {
    setActiveContext(getInitialTaskContext(false, true));
    setError(null);
    setActiveContext(prev => ({...prev, isCustomPromptMode: true}));
  };

  const handleGenerateFromCustomPrompt = async () => {
    if (!activeContext.customPromptInput.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    setError(null);
    setActiveContext(prev => ({ ...prev, isLoadingPrompt: true, guidancePoints: [], brainstormingIdeas: [] }));

    try {
      const questions = await generateGuidance(taskType, activeContext.customPromptInput, activeContext.task1Image);
      setActiveContext(prev => ({ 
        ...prev, 
        prompt: prev.customPromptInput, 
        guidancePoints: questions,
        isLoadingPrompt: false
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setActiveContext(prev => ({ ...prev, isLoadingPrompt: false }));
    }
  };

  const handleGenerateIdeas = async () => {
    if (activeContext.guidancePoints.length === 0 || taskType === 'Task 1') return;
    setError(null);
    setActiveContext(prev => ({ ...prev, isLoadingIdeas: true, brainstormingIdeas: [] }));

    try {
      const ideas = await generateBrainstormingIdeas(activeContext.prompt, activeContext.guidancePoints);
      setActiveContext(prev => ({ ...prev, brainstormingIdeas: ideas, isLoadingIdeas: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setActiveContext(prev => ({ ...prev, isLoadingIdeas: false }));
    }
  };

  const handleSubmitEssay = async () => {
    if (!activeContext.userEssay.trim()) {
      setError("Please write an essay before requesting feedback.");
      return;
    }
    setError(null);
    setActiveContext(prev => ({ ...prev, isLoadingFeedback: true, feedback: null }));

    try {
      const result = await getIeltsFeedback(taskType, activeContext.prompt, activeContext.userEssay, activeContext.task1Image);
      setActiveContext(prev => ({ ...prev, feedback: result, isLoadingFeedback: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setActiveContext(prev => ({ ...prev, isLoadingFeedback: false }));
    }
  };

  const handleToggleTimer = () => {
    if (timeRemaining <= 0) return;
    setIsTimerActive(prev => !prev);
  };

  const handleResetTimer = () => {
      setTimeRemaining(3600);
      setIsTimerActive(false);
  };
  
  const isLoading = activeContext.isLoadingPrompt || activeContext.isLoadingFeedback;

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        taskType={taskType} 
        setTaskType={handleTaskTypeChange}
        isLoading={isLoading}
        timeRemaining={timeRemaining}
        isTimerActive={isTimerActive}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
      />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 xl:gap-12">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <PromptSection
              taskType={taskType}
              prompt={activeContext.prompt}
              guidancePoints={activeContext.guidancePoints}
              ideas={activeContext.brainstormingIdeas}
              onNewPrompt={() => handleNewPrompt(taskType)}
              // FIX: Corrected typo from `active` to `activeContext`.
              isLoadingPrompt={activeContext.isLoadingPrompt}
              isLoadingIdeas={activeContext.isLoadingIdeas}
              onGenerateIdeas={handleGenerateIdeas}
              isCustomPromptMode={activeContext.isCustomPromptMode}
              onSetCustomPromptMode={handleSetCustomPromptMode}
              customPromptInput={activeContext.customPromptInput}
              setCustomPromptInput={(val) => setActiveContext(p => ({...p, customPromptInput: val}))}
              onGenerateFromCustomPrompt={handleGenerateFromCustomPrompt}
              task1Image={activeContext.task1Image}
              setTask1Image={(val) => setActiveContext(p => ({...p, task1Image: val}))}
            />
            <WritingEditor
              taskType={taskType}
              essay={activeContext.userEssay}
              setEssay={(val) => setActiveContext(p => ({...p, userEssay: val}))}
              onSubmit={handleSubmitEssay}
              isLoading={activeContext.isLoadingFeedback}
            />
          </div>

          {/* Right Column */}
          <div className="mt-8 lg:mt-0">
             <FeedbackDisplay 
                taskType={taskType} 
                feedback={activeContext.feedback} 
                isLoading={activeContext.isLoadingFeedback} 
            />
          </div>
        </div>
        {error && (
            <div className="fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;