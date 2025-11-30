
import React from 'react';
import type { Feedback, CriterionFeedback, SentenceImprovementSuggestion, TaskType, MistakeCorrection } from '../types';
import { BookOpenIcon, CheckCircleIcon, PuzzlePieceIcon, UsersIcon, CheckIcon, ExclamationTriangleIcon, SparklesIcon, WrenchScrewdriverIcon } from './icons';

interface FeedbackDisplayProps {
  taskType: TaskType;
  feedback: Feedback | null;
  isLoading: boolean;
}

const FeedbackPlaceholder: React.FC = () => (
    <div className="text-center flex flex-col items-center justify-center h-full bg-slate-100/50 border-2 border-dashed border-slate-300 rounded-lg p-8">
        <BookOpenIcon className="h-16 w-16 text-slate-400 mb-4"/>
        <h3 className="text-xl font-semibold text-slate-600">Awaiting Your Essay</h3>
        <p className="mt-2 text-slate-500 max-w-sm">
            Once you submit your essay, detailed feedback and approximate band scores will appear here.
        </p>
    </div>
);

const FeedbackSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="mb-6 bg-slate-200 p-4 rounded-lg text-center">
            <div className="h-6 bg-slate-300 rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-12 bg-slate-300 rounded w-1/4 mx-auto"></div>
        </div>
        <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-6 bg-slate-300 rounded w-1/4"></div>
                        <div className="h-10 w-12 bg-slate-300 rounded-md"></div>
                    </div>
                    <div className="space-y-4 mt-4">
                        {/* Strengths placeholder */}
                        <div>
                             <div className="h-4 bg-slate-300 rounded w-1/5 mb-2"></div>
                             <div className="space-y-2 pl-6">
                                <div className="h-3 bg-slate-200 rounded w-full"></div>
                                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                            </div>
                        </div>
                        {/* Weaknesses placeholder */}
                        <div>
                             <div className="h-4 bg-slate-300 rounded w-1/4 mb-2"></div>
                             <div className="space-y-2 pl-6">
                                <div className="h-3 bg-slate-200 rounded w-full"></div>
                                <div className="h-3 bg-slate-200 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
             {/* Sentence Improvements Skeleton */}
             <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <div className="h-6 bg-slate-300 rounded w-1/2 mb-4"></div>
                <div className="space-y-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="pl-4">
                            <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const MistakeCorrectionList: React.FC<{ mistakes: MistakeCorrection[] }> = ({ mistakes }) => (
    <div className="mt-4">
        <h5 className="font-semibold text-sm text-rose-800 bg-rose-100/70 inline-flex items-center gap-2 px-2 py-1 rounded-full">
            <WrenchScrewdriverIcon className="h-4 w-4" />
            Specific Corrections
        </h5>
        <ul className="space-y-3 mt-3 pl-2 border-l-2 border-rose-200 ml-3">
            {mistakes.map((mistake, index) => (
                <li key={index} className="text-sm">
                    <p className="text-slate-500 italic">
                        <span className="font-semibold text-slate-600 not-italic">Original:</span> "{mistake.originalPhrase}"
                    </p>
                    <p className="mt-1 text-green-700 font-semibold">
                        <span className="font-semibold text-green-800">Correction:</span> → "{mistake.suggestedCorrection}"
                    </p>
                    <p className="mt-1 text-slate-600">
                        <span className="font-semibold">Reason:</span> {mistake.explanation}
                    </p>
                </li>
            ))}
        </ul>
    </div>
);


const FeedbackCard: React.FC<{ title: string; feedbackItem: CriterionFeedback; icon: React.ReactNode; score: number }> = ({ title, feedbackItem, icon, score }) => (
    <div className="bg-white p-5 rounded-lg border border-rose-100 shadow-sm transition-shadow hover:shadow-md duration-300">
        <div className="flex justify-between items-start mb-2">
            <h4 className="text-md font-bold text-slate-700 flex items-center gap-3">
                {icon}
                {title}
            </h4>
            <span className="text-2xl font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-md" aria-label={`Score: ${score}`}>
                {score}
            </span>
        </div>
        <div className="mt-4 space-y-4">
            {feedbackItem.strengths && (
                <div>
                    <h5 className="font-semibold text-sm text-emerald-800 bg-emerald-100/70 inline-flex items-center gap-2 px-2 py-1 rounded-full">
                        <CheckIcon className="h-4 w-4" />
                        Strengths
                    </h5>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm pt-2 pl-2 border-l-2 border-emerald-200 ml-3">{feedbackItem.strengths}</p>
                </div>
            )}
            {feedbackItem.weaknesses && (
                <div>
                     <h5 className="font-semibold text-sm text-amber-800 bg-amber-100/70 inline-flex items-center gap-2 px-2 py-1 rounded-full">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Weaknesses
                    </h5>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm pt-2 pl-2 border-l-2 border-amber-200 ml-3">{feedbackItem.weaknesses}</p>
                    {feedbackItem.referencingAndSubstitution && (
                         <div className="mt-3">
                             <h6 className="font-semibold text-sm text-slate-600">Referencing & Substitution:</h6>
                             <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm pt-1">{feedbackItem.referencingAndSubstitution}</p>
                         </div>
                    )}
                </div>
            )}
            {feedbackItem.mistakes && feedbackItem.mistakes.length > 0 && (
                <MistakeCorrectionList mistakes={feedbackItem.mistakes} />
            )}
        </div>
    </div>
);

const SentenceImprovementCard: React.FC<{ improvements: SentenceImprovementSuggestion[] }> = ({ improvements }) => (
    <div className="bg-white p-5 rounded-lg border border-emerald-100 shadow-sm transition-shadow hover:shadow-md duration-300">
        <h4 className="text-md font-bold text-slate-700 flex items-center gap-3 mb-4">
            <SparklesIcon className="h-6 w-6 text-emerald-500" />
            Sentence Improvements
        </h4>
        <ul className="space-y-5">
            {improvements.map((item, index) => (
                <li key={index} className="border-l-4 border-emerald-100 pl-4 py-1">
                    <p className="text-slate-500 text-sm italic">
                        <span className="font-semibold text-slate-600 not-italic">Your sentence:</span>{' '}
                        "{item.originalSentence}"
                    </p>
                    <p className="mt-2 text-sm">
                        <span className="font-semibold text-emerald-700">Suggestion:</span>{' → '}
                        <span className="font-semibold text-emerald-800">
                           "{item.suggestedSentence}"
                        </span>
                    </p>
                </li>
            ))}
        </ul>
    </div>
);


const calculateOverallBandScore = (feedback: Feedback): string => {
    const scores = [
        feedback.taskCompletionScore,
        feedback.coherenceCohesionScore,
        feedback.lexicalResourceScore,
        feedback.grammaticalRangeScore,
    ];
    const average = scores.reduce((a, b) => a + b, 0) / 4;
    const decimalPart = average - Math.floor(average);

    if (decimalPart >= 0.75) {
        return `${Math.ceil(average)}.0`;
    }
    if (decimalPart >= 0.25) {
        return `${Math.floor(average)}.5`;
    }
    return `${Math.floor(average)}.0`;
};

const OverallScore: React.FC<{ score: string }> = ({ score }) => (
    <div className="mb-6 bg-rose-50 border-2 border-dashed border-rose-300 p-4 rounded-lg text-center">
        <p className="text-base font-medium text-rose-800">Approximate Overall Band Score</p>
        <p className="text-5xl font-bold text-rose-700 tracking-tight">{score}</p>
    </div>
);

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ taskType, feedback, isLoading }) => {
  if (isLoading) {
    return <FeedbackSkeleton />;
  }
  
  if (!feedback) {
    return <FeedbackPlaceholder />;
  }

  const overallScore = calculateOverallBandScore(feedback);
  const taskCompletionTitle = taskType === 'Task 1' ? 'Task Achievement' : 'Task Response';

  return (
    <div className="h-full">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Feedback Analysis</h2>
      <OverallScore score={overallScore} />
      <div className="space-y-4">
        <FeedbackCard 
            title={taskCompletionTitle} 
            feedbackItem={feedback.taskCompletion} 
            score={feedback.taskCompletionScore}
            icon={<CheckCircleIcon className="h-6 w-6 text-emerald-500" />}
        />
        <FeedbackCard 
            title="Coherence & Cohesion" 
            feedbackItem={feedback.coherenceCohesion} 
            score={feedback.coherenceCohesionScore}
            icon={<UsersIcon className="h-6 w-6 text-amber-500" />}
        />
        <FeedbackCard 
            title="Lexical Resource" 
            feedbackItem={feedback.lexicalResource}
            score={feedback.lexicalResourceScore}
            icon={<BookOpenIcon className="h-6 w-6 text-rose-500" />}
        />
        <FeedbackCard 
            title="Grammatical Range & Accuracy" 
            feedbackItem={feedback.grammaticalRange}
            score={feedback.grammaticalRangeScore}
            icon={<PuzzlePieceIcon className="h-6 w-6 text-purple-500" />}
        />
        {feedback.sentenceImprovements && feedback.sentenceImprovements.length > 0 && (
            <SentenceImprovementCard improvements={feedback.sentenceImprovements} />
        )}
      </div>
    </div>
  );
};

export default FeedbackDisplay;
