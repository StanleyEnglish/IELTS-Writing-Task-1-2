import React, { useEffect, useState } from 'react';
import { fetchTopScores, LeaderboardEntry } from '../firebase';
import { SparklesIcon } from './icons';

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEssay, setActiveEssay] = useState<{ entry: LeaderboardEntry; top: number; left: number } | null>(null);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const scores = await fetchTopScores(1000);
        if (scores) {
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const filtered = scores.filter((entry) => {
            if (!entry.submissionDate) return false;
            
            let dateMs: number;
            if (entry.submissionDate && typeof entry.submissionDate.toMillis === 'function') {
              dateMs = entry.submissionDate.toMillis();
            } else if (entry.submissionDate && typeof entry.submissionDate.seconds === 'number') {
              dateMs = entry.submissionDate.seconds * 1000;
            } else {
              dateMs = new Date(entry.submissionDate).getTime();
            }
            
            if (dateMs < oneWeekAgo) return false;

            const duration = entry.durationMinutes;
            if (duration === undefined) return false;
            
            const taskType = entry.taskType || 'Task 2';
            if (taskType === 'Task 1') {
              return duration >= 10 && duration <= 20;
            } else {
              return duration >= 15 && duration <= 40;
            }
          });
          
          // Sort by band score descending, then duration minutes ascending (faster time ranked higher)
          filtered.sort((a, b) => {
            if (b.bandScore !== a.bandScore) {
              return b.bandScore - a.bandScore;
            }
            return a.durationMinutes - b.durationMinutes;
          });
          
          setEntries(filtered.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadScores();
  }, []);

  const handleMouseEnter = (entry: LeaderboardEntry, e: React.MouseEvent<HTMLTableCellElement>) => {
    if (activeEssay && activeEssay.entry.id === entry.id) {
      // If it is already visible, remove it (make it disappear)
      setActiveEssay(null);
    } else {
      // Position tooltip nicely below the cell, avoiding left-overflow
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveEssay({
        entry,
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(10, rect.left + window.scrollX - 100),
      });
    }
  };

  const handleMouseLeave = () => {
    // Keep visible essays frozen on mouse leave
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
        <p className="text-red-900 font-medium animate-pulse">Loading top scores...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
          🕒 Rolling Weekly Reset
        </span>
        <p className="text-xs text-slate-500 italic">
          💡 Hover over a Band Score to toggle (show/hide) that student's essay.
        </p>
      </div>
      
      <div className="overflow-visible rounded-xl border border-amber-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-50 border-b border-amber-200">
              <th className="px-4 py-3 text-xs font-bold text-red-900 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-xs font-bold text-red-900 uppercase tracking-wider">Student</th>
              <th className="px-4 py-3 text-xs font-bold text-red-900 uppercase tracking-wider text-center">Band</th>
              <th className="px-4 py-3 text-xs font-bold text-red-900 uppercase tracking-wider text-center">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {entries.length > 0 ? (
              entries.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{entry.studentName}</span>
                      {index === 0 && <SparklesIcon className="h-4 w-4 text-amber-500" />}
                    </div>
                  </td>
                  <td 
                    className="px-4 py-3 text-center cursor-pointer select-none"
                    onMouseEnter={(e) => handleMouseEnter(entry, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="inline-block px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 hover:text-red-850 transition-colors">
                      {entry.bandScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 font-medium">
                    {entry.durationMinutes}m
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                  No scores yet. Be the first to top the board!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Hover Cards */}
      {activeEssay && (
        <div 
          style={{ 
            position: 'absolute', 
            top: `${activeEssay.top}px`, 
            left: `${activeEssay.left}px`,
            width: '320px',
            maxWidth: 'calc(100vw - 20px)'
          }}
          className="z-50 bg-white rounded-xl shadow-xl border border-amber-200 p-4 font-sans text-left text-xs text-slate-850 pointer-events-auto transition-all duration-150 ease-out animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="absolute top-0 left-12 -mt-1.5 h-3 w-3 rotate-45 border-t border-l border-amber-200 bg-white" />
          <div className="flex justify-between items-center border-b border-amber-100 pb-2 mb-2">
            <span className="font-bold text-red-900 text-sm truncate max-w-[180px]">
              {activeEssay.entry.studentName}'s Essay
            </span>
            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {activeEssay.entry.taskType || 'Task 2'}
            </span>
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
              <span>⏱️ Duration: <strong>{activeEssay.entry.durationMinutes}m</strong></span>
              {activeEssay.entry.essay && (
                <span>✍️ Word Count: <strong>{activeEssay.entry.essay.trim().split(/\s+/).filter(Boolean).length} words</strong></span>
              )}
            </div>
            
            {activeEssay.entry.prompt && (
              <div>
                <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-0.5">Prompt / Topic:</p>
                <div className="max-h-20 overflow-y-auto bg-red-50/20 p-2 rounded border border-red-50/50 scrollbar-thin">
                  <p className="text-slate-600 italic font-serif leading-relaxed">
                    "{activeEssay.entry.prompt}"
                  </p>
                </div>
              </div>
            )}
            
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-0.5">Essay Manuscript:</p>
              {activeEssay.entry.essay ? (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 max-h-40 overflow-y-auto leading-relaxed text-[11px] text-slate-700 whitespace-pre-wrap select-text scrollbar-thin">
                  {activeEssay.entry.essay}
                </div>
              ) : (
                <p className="text-slate-400 italic text-center p-2 bg-slate-50 rounded border border-slate-100">
                  Full essay text not archived.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
