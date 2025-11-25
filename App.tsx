
import React, { useState, useEffect, useCallback } from 'react';
import type { Feedback, TaskType, TaskContext, HighScore } from './types';
import { IELTS_TASK_2_PROMPTS } from './constants';
import { generateGuidance, getIeltsFeedback, generateBrainstormingIdeas } from './api/gemini.js';
import Header from './components/Header';
import PromptSection from './components/PromptSection';
import WritingEditor from './components/WritingEditor';
import FeedbackDisplay from './components/FeedbackDisplay';
import Leaderboard from './components/Leaderboard';

const getInitialTaskContext = (isLoadingPrompt = false, isInitialized = false): TaskContext => ({
  prompt: '',
  customPromptInput: '',
  isCustomPromptMode: false,
  guidancePoints: [],
  task1Guidance: null,
  brainstormingIdeas: [],
  task1Image: null,
  userEssay: '',
  feedback: null,
  isLoadingPrompt,
  isLoadingIdeas: false,
  isLoadingFeedback: false,
  isInitialized,
});

const calculateScoreNumeric = (feedback: Feedback): number => {
    const scores = [
        feedback.taskCompletionScore,
        feedback.coherenceCohesionScore,
        feedback.lexicalResourceScore,
        feedback.grammaticalRangeScore,
    ];
    const average = scores.reduce((a, b) => a + b, 0) / 4;
    return average;
};

const formatScore = (average: number): string => {
    const decimalPart = average - Math.floor(average);
    if (decimalPart >= 0.75) {
        return `${Math.ceil(average)}.0`;
    }
    if (decimalPart >= 0.25) {
        return `${Math.floor(average)}.5`;
    }
    return `${Math.floor(average)}.0`;
};

const App: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType>('Task 2');
  const [task1Context, setTask1Context] = useState<TaskContext>({
    ...getInitialTaskContext(false, true),
    isCustomPromptMode: true,
  });
  const [task2Context, setTask2Context] = useState<TaskContext>(getInitialTaskContext(true, false));
  const [error, setError] = useState<string | null>(null);

  // App Mode (Landing vs Main)
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [userNickname, setUserNickname] = useState('');

  // High Scores
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Global timer state
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);

  const activeContext = taskType === 'Task 1' ? task1Context : task2Context;
  const setActiveContext = taskType === 'Task 1' ? setTask1Context : setTask2Context;
  
  // Load API Key, High Scores, and Nickname on initial render
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    const storedScores = localStorage.getItem('ielts-high-scores');
    if (storedScores) {
        try {
            setHighScores(JSON.parse(storedScores));
        } catch (e) {
            console.error("Failed to parse high scores", e);
        }
    }

    const storedNickname = localStorage.getItem('ielts-user-nickname');
    if (storedNickname) {
        setUserNickname(storedNickname);
    }
  }, []);

  // Save High Score Helper
  const saveHighScore = (newScore: HighScore) => {
    const updatedScores = [...highScores, newScore]
        .sort((a, b) => b.score - a.score) // Sort descending by numeric score
        .slice(0, 10); // Keep top 10

    setHighScores(updatedScores);
    localStorage.setItem('ielts-high-scores', JSON.stringify(updatedScores));
  };
  
  const handleApiError = (e: unknown) => {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    const isApiKeyError = /API key not valid|permission denied|API key is missing/i.test(errorMessage);

    if (isApiKeyError) {
      localStorage.removeItem('gemini-api-key');
      setApiKey(null);
      setApiKeyError("Your API key seems invalid. Please check it or get a new one from Google AI Studio.");
    } else {
      setError(errorMessage);
    }
  };

  const handleNewPrompt = useCallback(async () => {
    if (!apiKey) {
      setApiKeyError("Please save a valid API key to generate a new prompt.");
      return;
    }
    setTask2Context(getInitialTaskContext(true, true));
    setError(null);
    setApiKeyError(null);
    
    try {
      const prompts = IELTS_TASK_2_PROMPTS;
      const newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      const guidanceResult = await generateGuidance('Task 2', newPrompt, null, apiKey);

      setTask2Context(prev => ({
        ...prev,
        prompt: newPrompt,
        guidancePoints: guidanceResult,
        isLoadingPrompt: false,
      }));
      
    } catch (e) {
      handleApiError(e);
      setTask2Context(prev => ({ ...prev, isLoadingPrompt: false }));
    }
  }, [apiKey]);
  
  const handleTaskTypeChange = (newType: TaskType) => {
    if (newType === taskType) return;
    setTaskType(newType);
  };
  
  // Initial prompt generation when entering the app
  useEffect(() => {
    if (isAppStarted && taskType === 'Task 2' && !task2Context.isInitialized && apiKey) {
      handleNewPrompt();
    }
  }, [isAppStarted, taskType, task2Context.isInitialized, handleNewPrompt, apiKey]);
  
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
    if (!apiKey) {
      setApiKeyError("Please save a valid API key to generate guidance.");
      return;
    }
    if (!activeContext.customPromptInput.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    setError(null);
    setApiKeyError(null);
    setActiveContext(prev => ({ ...prev, isLoadingPrompt: true, guidancePoints: [], task1Guidance: null, brainstormingIdeas: [] }));

    try {
      const guidanceResult = await generateGuidance(taskType, activeContext.customPromptInput, activeContext.task1Image, apiKey);
      if (taskType === 'Task 1') {
        setActiveContext(prev => ({ 
          ...prev, 
          prompt: prev.customPromptInput, 
          task1Guidance: guidanceResult,
          isLoadingPrompt: false
        }));
      } else {
         setActiveContext(prev => ({ 
          ...prev, 
          prompt: prev.customPromptInput, 
          guidancePoints: guidanceResult,
          isLoadingPrompt: false
        }));
      }
    } catch (e) {
      handleApiError(e);
      setActiveContext(prev => ({ ...prev, isLoadingPrompt: false }));
    }
  };

  const handleGenerateIdeas = async () => {
    if (!apiKey) {
      setApiKeyError("Please save a valid API key to generate ideas.");
      return;
    }
    if (activeContext.guidancePoints.length === 0 || taskType === 'Task 1') return;
    setError(null);
    setApiKeyError(null);
    setActiveContext(prev => ({ ...prev, isLoadingIdeas: true, brainstormingIdeas: [] }));

    try {
      const ideas = await generateBrainstormingIdeas(activeContext.prompt, activeContext.guidancePoints, apiKey);
      setActiveContext(prev => ({ ...prev, brainstormingIdeas: ideas, isLoadingIdeas: false }));
    } catch (e) {
      handleApiError(e);
      setActiveContext(prev => ({ ...prev, isLoadingIdeas: false }));
    }
  };

  const handleSubmitEssay = async () => {
    if (!apiKey) {
      setApiKeyError("Please save a valid API key to get feedback.");
      return;
    }
    if (!activeContext.userEssay.trim()) {
      setError("Please write an essay before requesting feedback.");
      return;
    }
    setError(null);
    setApiKeyError(null);
    setActiveContext(prev => ({ ...prev, isLoadingFeedback: true, feedback: null }));

    try {
      const result = await getIeltsFeedback(taskType, activeContext.prompt, activeContext.userEssay, activeContext.task1Image, apiKey);
      
      // Calculate and save high score
      const numericScore = calculateScoreNumeric(result);
      const displayScore = formatScore(numericScore);
      
      const newRecord: HighScore = {
          id: Date.now().toString(),
          nickname: userNickname || 'Anonymous',
          date: new Date().toISOString(),
          score: numericScore,
          displayScore: displayScore,
          prompt: activeContext.prompt,
          essay: activeContext.userEssay,
          taskType: taskType
      };
      
      saveHighScore(newRecord);
      
      setActiveContext(prev => ({ ...prev, feedback: result, isLoadingFeedback: false }));
    } catch (e) {
      handleApiError(e);
      setActiveContext(prev => ({ ...prev, isLoadingFeedback: false }));
    }
  };
  
  const handleSaveApiKey = (key: string) => {
    // A very basic check. Real validation happens on API call.
    if (!key.startsWith('AIza')) {
        setApiKeyError("This doesn't look like a valid Gemini API key. Please check it.");
        return;
    }
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
    setApiKeyError(null);
  };

  const handleToggleTimer = () => {
    if (timeRemaining <= 0) return;
    setIsTimerActive(prev => !prev);
  };

  const handleResetTimer = () => {
      setTimeRemaining(3600);
      setIsTimerActive(false);
  };

  const handleStartPractice = (nickname: string) => {
      setUserNickname(nickname);
      localStorage.setItem('ielts-user-nickname', nickname); // Save nickname
      setIsAppStarted(true);
  };
  
  const isLoading = activeContext.isLoadingPrompt || activeContext.isLoadingFeedback;

  if (!isAppStarted) {
      return (
          <Leaderboard 
            highScores={highScores}
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            onStartPractice={handleStartPractice}
            savedNickname={userNickname}
          />
      );
  }

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
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        apiKeyError={apiKeyError}
      />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <button 
                    onClick={() => setIsAppStarted(false)}
                    className="self-start text-sm text-sky-600 hover:text-sky-800 flex items-center gap-1 font-medium"
                >
                    &larr; Back to Hall of Fame
                </button>
                <div className="text-sm text-slate-500">
                    Writing as: <span className="font-semibold text-slate-700">{userNickname || 'Anonymous'}</span>
                </div>
            </div>

          {/* Prompt and Editor Section: Grid Layout for Large Screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="h-full">
                <PromptSection
                  taskType={taskType}
                  prompt={activeContext.prompt}
                  guidancePoints={activeContext.guidancePoints}
                  task1Guidance={activeContext.task1Guidance}
                  ideas={activeContext.brainstormingIdeas}
                  onNewPrompt={handleNewPrompt}
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
                  apiKey={apiKey}
                />
            </div>
            <div className="h-full">
                <WritingEditor
                  taskType={taskType}
                  essay={activeContext.userEssay}
                  setEssay={(val) => setActiveContext(p => ({...p, userEssay: val}))}
                  onSubmit={handleSubmitEssay}
                  isLoading={activeContext.isLoadingFeedback}
                />
            </div>
          </div>

          {/* Feedback Section - Full Width at Bottom */}
          <div className="w-full">
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
