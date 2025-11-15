export type TaskType = 'Task 1' | 'Task 2';

export interface MistakeCorrection {
    originalPhrase: string;
    suggestedCorrection: string;
    explanation: string;
}

export interface CriterionFeedback {
    strengths: string;
    weaknesses:string;
    mistakes?: MistakeCorrection[];
    referencingAndSubstitution?: string;
}

export interface SentenceImprovementSuggestion {
    originalSentence: string;
    suggestedSentence: string;
}

export interface Feedback {
  taskCompletion: CriterionFeedback;
  taskCompletionScore: number;
  coherenceCohesion: CriterionFeedback;
  coherenceCohesionScore: number;
  lexicalResource: CriterionFeedback;
  lexicalResourceScore: number;
  grammaticalRange: CriterionFeedback;
  grammaticalRangeScore: number;
  sentenceImprovements: SentenceImprovementSuggestion[];
}

export interface Guidance {
    points: string[];
}

export interface TaskContext {
  prompt: string;
  customPromptInput: string;
  isCustomPromptMode: boolean;
  guidancePoints: string[];
  brainstormingIdeas: string[];
  task1Image: string | null;
  userEssay: string;
  feedback: Feedback | null;
  isLoadingPrompt: boolean;
  isLoadingIdeas: boolean;
  isLoadingFeedback: boolean;
  isInitialized: boolean;
}