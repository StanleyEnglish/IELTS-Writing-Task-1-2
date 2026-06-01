import React, { useEffect, useState } from 'react';
import { fetchTopScores, LeaderboardEntry } from '../firebase';
import { SparklesIcon, UsersIcon } from './icons';

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const scores = await fetchTopScores(10);
        if (scores) setEntries(scores);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadScores();
  }, []);

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
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
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
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
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
      <p className="text-[10px] text-slate-400 text-center italic">
        * Ranked by Band Score (High to Low) and Duration (Low to High)
      </p>
    </div>
  );
};

export default Leaderboard;
