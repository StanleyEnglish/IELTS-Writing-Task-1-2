
import React from 'react';
import type { Feedback, CriterionFeedback, SentenceImprovementSuggestion, TaskType, MistakeCorrection } from '../types';
import { BookOpenIcon, CheckCircleIcon, GrammarIcon, UsersIcon, CheckIcon, ExclamationTriangleIcon, SparklesIcon, WrenchScrewdriverIcon } from './icons';

interface FeedbackDisplayProps {
  taskType: TaskType;
  feedback: Feedback | null;
  isLoading: boolean;
}

const FeedbackPlaceholder: React.FC = () => (
    <div className="text-center flex flex-col items-center justify-center h-full bg-amber-50/50 border-2 border-dashed border-amber-300 rounded-lg p-8">
        <BookOpenIcon className="h-16 w-16 text-amber-400 mb-4"/>
        <h3 className="text-xl font-bold text-red-800">Your Evaluation Awaits</h3>
        <p className="mt-2 text-red-900 font-medium max-w-sm">
            Submit your manuscript to receive detailed feedback and imperial band scores.
        </p>
    </div>
);

const FeedbackSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="mb-6 bg-red-100 p-4 rounded-lg text-center border border-red-200">
            <div className="h-6 bg-red-200 rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-12 bg-red-300 rounded w-1/4 mx-auto"></div>
        </div>
        <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-6 bg-slate-300 rounded w-1/4"></div>
                        <div className="h-10 w-12 bg-slate-300 rounded-md"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const MistakeCorrectionList: React.FC<{ mistakes: MistakeCorrection[] }> = ({ mistakes }) => (
    <div className="mt-4">
        <h5 className="font-bold text-sm text-red-800 bg-red-100/70 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-200">
            <WrenchScrewdriverIcon className="h-4 w-4" />
            Precise Adjustments
        </h5>
        <ul className="space-y-3 mt-3 pl-2 border-l-2 border-red-200 ml-3">
            {mistakes.map((mistake, index) => (
                <li key={index} className="text-sm">
                    <p className="text-slate-500 italic">
                        <span className="font-bold text-slate-600 not-italic">Manuscript:</span> "{mistake.originalPhrase}"
                    </p>
                    <p className="mt-1 text-amber-700 font-bold">
                        <span className="font-bold text-amber-800">Refined:</span> → "{mistake.suggestedCorrection}"
                    </p>
                    <p className="mt-1 text-slate-600 text-xs">
                        <span className="font-bold">Scholar's Note:</span> {mistake.explanation}
                    </p>
                </li>
            ))}
        </ul>
    </div>
);


const FeedbackCard: React.FC<{ title: string; feedbackItem: CriterionFeedback; icon: React.ReactNode; score: number }> = ({ title, feedbackItem, icon, score }) => (
    <div className="bg-white p-5 rounded-lg border border-amber-200 shadow-sm transition-shadow hover:shadow-md duration-300">
        <div className="flex justify-between items-start mb-2">
            <h4 className="text-md font-bold text-red-900 flex items-center gap-3">
                {icon}
                {title}
            </h4>
            <span className="text-2xl font-bold text-white bg-red-700 px-3 py-1 rounded-md shadow-sm" aria-label={`Score: ${score}`}>
                {score}
            </span>
        </div>
        <div className="mt-4 space-y-4">
            {feedbackItem.strengths && (
                <div>
                    <h5 className="font-bold text-sm text-green-800 bg-green-100/70 inline-flex items-center gap-2 px-2 py-1 rounded-full">
                        <CheckIcon className="h-4 w-4" />
                        Virtues
                    </h5>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm pt-2 pl-2 border-l-2 border-green-200 ml-3 font-medium">{feedbackItem.strengths}</p>
                </div>
            )}
            {feedbackItem.weaknesses && (
                <div>
                     <h5 className="font-bold text-sm text-red-800 bg-red-100/70 inline-flex items-center gap-2 px-2 py-1 rounded-full">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Omissions
                    </h5>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm pt-2 pl-2 border-l-2 border-red-200 ml-3 font-medium">{feedbackItem.weaknesses}</p>
                    {feedbackItem.referencingAndSubstitution && (
                         <div className="mt-3 bg-slate-50 p-2 rounded">
                             <h6 className="font-bold text-sm text-slate-700">Referencing & Flow:</h6>
                             <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-xs pt-1">{feedbackItem.referencingAndSubstitution}</p>
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
    <div className="bg-white p-5 rounded-lg border border-amber-300 shadow-sm transition-shadow hover:shadow-md duration-300 bg-gradient-to-r from-white to-amber-50">
        <h4 className="text-md font-bold text-red-900 flex items-center gap-3 mb-4">
            <SparklesIcon className="h-6 w-6 text-amber-500" />
            Suggested Rewrites
        </h4>
        <ul className="space-y-5">
            {improvements.map((item, index) => (
                <li key={index} className="border-l-4 border-amber-400 pl-4 py-1">
                    <p className="text-slate-500 text-xs italic font-medium">
                        <span className="font-bold text-slate-600 not-italic">Draft:</span>{' '}
                        "{item.originalSentence}"
                    </p>
                    <p className="mt-2 text-sm">
                        <span className="font-bold text-red-700">Polished:</span>{' → '}
                        <span className="font-bold text-red-800">
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
    <div className="mb-6 bg-red-700 border-b-4 border-amber-500 p-6 rounded-lg text-center shadow-lg transform hover:scale-105 transition-transform">
        <p className="text-base font-bold text-amber-400 uppercase tracking-widest">Imperial Band Score</p>
        <p className="text-6xl font-black text-white tracking-tighter drop-shadow-md">{score}</p>
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
      <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
          Feedback Analysis
      </h2>
      <OverallScore score={overallScore} />
      <div className="space-y-4">
        <FeedbackCard 
            title={taskCompletionTitle} 
            feedbackItem={feedback.taskCompletion} 
            score={feedback.taskCompletionScore}
            icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
        />
        <FeedbackCard 
            title="Coherence & Cohesion" 
            feedbackItem={feedback.coherenceCohesion} 
            score={feedback.coherenceCohesionScore}
            icon={<UsersIcon className="h-6 w-6 text-amber-600" />}
        />
        <FeedbackCard 
            title="Lexical Resource" 
            feedbackItem={feedback.lexicalResource}
            score={feedback.lexicalResourceScore}
            icon={<BookOpenIcon className="h-6 w-6 text-red-600" />}
        />
        <FeedbackCard 
            title="Grammatical Range & Accuracy" 
            feedbackItem={feedback.grammaticalRange}
            score={feedback.grammaticalRangeScore}
            icon={<GrammarIcon className="h-6 w-6 text-purple-600" />}
        />
        {feedback.sentenceImprovements && feedback.sentenceImprovements.length > 0 && (
            <SentenceImprovementCard improvements={feedback.sentenceImprovements} />
        )}
      </div>
      <div className="mt-8 p-4 bg-amber-100 rounded-lg border border-amber-200 text-center">
          <p className="text-red-900 font-bold italic">Wishing you great prosperity and success in your IELTS journey! 🌸</p>
      </div>
    </div>
  );
};

export default FeedbackDisplay;
