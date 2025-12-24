
import React, { useState, useEffect, useCallback } from 'react';
import type { Feedback, TaskType, TaskContext, HighScore } from './types';
import { IELTS_TASK_2_PROMPTS } from './constants';
import { generateGuidance, getIeltsFeedback, generateBrainstormingIdeas } from './api/gemini.js';
import Header from './components/Header';
import PromptSection from './components/PromptSection';
import WritingEditor from './components/WritingEditor';
import FeedbackDisplay from './components/FeedbackDisplay';
import Dashboard from './components/Dashboard';

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

  // App Mode (Dashboard vs Main)
  const [isAppStarted, setIsAppStarted] = useState(false);

  // Score History
  const [history, setHistory] = useState<HighScore[]>([]);

  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Global timer state
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);

  const activeContext = taskType === 'Task 1' ? task1Context : task2Context;
  const setActiveContext = taskType === 'Task 1' ? setTask1Context : setTask2Context;
  
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    const storedHistory = localStorage.getItem('ielts-score-history');
    if (storedHistory) {
        try {
            setHistory(JSON.parse(storedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }
  }, []);

  const saveHistory = (newRecord: HighScore) => {
    setHistory(prev => {
        const updated = [newRecord, ...prev]; // Newest first
        localStorage.setItem('ielts-score-history', JSON.stringify(updated));
        return updated;
    });
  };
  
  const handleApiError = (e: unknown) => {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    const isApiKeyError = /API key not valid|permission denied|API key is missing|quota|429/i.test(errorMessage);

    if (isApiKeyError) {
      localStorage.removeItem('gemini-api-key');
      setApiKey(null);
      setApiKeyError("Your API key has issues (Invalid or Quota Exceeded). Please provide a new one.");
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
      
      const numericScore = calculateScoreNumeric(result);
      const displayScore = formatScore(numericScore);
      
      const newRecord: HighScore = {
          id: Date.now().toString(),
          nickname: 'User',
          date: new Date().toISOString(),
          score: numericScore,
          displayScore: displayScore,
          prompt: activeContext.prompt,
          essay: activeContext.userEssay,
          taskType: taskType
      };
      
      saveHistory(newRecord);
      
      setActiveContext(prev => ({ ...prev, feedback: result, isLoadingFeedback: false }));
    } catch (e) {
      handleApiError(e);
      setActiveContext(prev => ({ ...prev, isLoadingFeedback: false }));
    }
  };
  
  const handleSaveApiKey = (key: string) => {
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

  const handleStartPractice = () => {
      setIsAppStarted(true);
  };

  const handleExportToWord = () => {
    const feedback = activeContext.feedback;
    const essay = activeContext.userEssay;
    const prompt = activeContext.prompt;

    if (!feedback) return;

    const overallScore = formatScore(calculateScoreNumeric(feedback));
    
    // Create HTML content for the Word document
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>IELTS Tet Feedback Report</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
                h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20px; color: #b91c1c; }
                h2 { font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 10px; color: #78350f; }
                .essay-section { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 20px; }
                .score-box { font-size: 16pt; font-weight: bold; color: #e74c3c; margin-bottom: 20px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 10px; vertical-align: top; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .criteria-name { font-weight: bold; color: #b91c1c; }
                .score-cell { font-weight: bold; text-align: center; }
            </style>
        </head>
        <body>
            <h1>IELTS Tet Master Feedback Report</h1>
            
            <div class="score-box">
                Overall Band Score: ${overallScore}
            </div>

            <div class="essay-section">
                <h2>Prompt</h2>
                <p><i>${prompt}</i></p>
                
                <h2>Your Essay</h2>
                <p>${essay.replace(/\n/g, '<br>')}</p>
            </div>

            <h2>Detailed Evaluation</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%">Criteria</th>
                        <th style="width: 10%">Score</th>
                        <th style="width: 35%">Strengths</th>
                        <th style="width: 35%">Weaknesses</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="criteria-name">${taskType === 'Task 1' ? 'Task Achievement' : 'Task Response'}</td>
                        <td class="score-cell">${feedback.taskCompletionScore}</td>
                        <td>${feedback.taskCompletion.strengths}</td>
                        <td>${feedback.taskCompletion.weaknesses}</td>
                    </tr>
                    <tr>
                        <td class="criteria-name">Coherence & Cohesion</td>
                        <td class="score-cell">${feedback.coherenceCohesionScore}</td>
                        <td>${feedback.coherenceCohesion.strengths}</td>
                        <td>${feedback.coherenceCohesion.weaknesses}</td>
                    </tr>
                    <tr>
                        <td class="criteria-name">Lexical Resource</td>
                        <td class="score-cell">${feedback.lexicalResourceScore}</td>
                        <td>${feedback.lexicalResource.strengths}</td>
                        <td>
                            ${feedback.lexicalResource.weaknesses}
                            ${feedback.lexicalResource.mistakes && feedback.lexicalResource.mistakes.length > 0 ? 
                                '<br><b>Mistakes:</b><br>' + feedback.lexicalResource.mistakes.map(m => `"${m.originalPhrase}" -> "${m.suggestedCorrection}"`).join('<br>') 
                                : ''}
                        </td>
                    </tr>
                    <tr>
                        <td class="criteria-name">Grammatical Range & Accuracy</td>
                        <td class="score-cell">${feedback.grammaticalRangeScore}</td>
                        <td>${feedback.grammaticalRange.strengths}</td>
                        <td>
                            ${feedback.grammaticalRange.weaknesses}
                             ${feedback.grammaticalRange.mistakes && feedback.grammaticalRange.mistakes.length > 0 ? 
                                '<br><b>Mistakes:</b><br>' + feedback.grammaticalRange.mistakes.map(m => `"${m.originalPhrase}" -> "${m.suggestedCorrection}"`).join('<br>') 
                                : ''}
                        </td>
                    </tr>
                </tbody>
            </table>
            <br>
            <p><i>Wishing you a prosperous Year of the Horse and high scores!</i></p>
        </body>
        </html>
    `;

    // Create a Blob and trigger download
    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    
    // Create link and simulate click
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IELTS_Tet_Feedback_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const isLoading = activeContext.isLoadingPrompt || activeContext.isLoadingFeedback;

  if (!isAppStarted) {
      return (
          <Dashboard 
            history={history}
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            onStartPractice={handleStartPractice}
            apiKeyError={apiKeyError}
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
                    className="self-start text-sm text-red-700 hover:text-red-900 flex items-center gap-1 font-semibold"
                >
                    &larr; Return to Palace
                </button>
            </div>

          {/* Prompt and Editor Section */}
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
                  onExportWord={handleExportToWord}
                  feedback={activeContext.feedback}
                />
            </div>
          </div>

          {/* Feedback Section */}
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
