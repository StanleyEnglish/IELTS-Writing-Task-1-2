import React, { useState } from 'react';
import type { TaskContext, TaskType } from '../types';
import { exportReport, calculateScoreNumeric, formatScore, calculateCombinedWritingBand } from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  task1Context: TaskContext;
  task2Context: TaskContext;
  activeTaskType: TaskType;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  task1Context,
  task2Context,
  activeTaskType,
}) => {
  const hasTask1 = !!task1Context.feedback;
  const hasTask2 = !!task2Context.feedback;
  const hasBoth = hasTask1 && hasTask2;

  const [selectedFileType, setSelectedFileType] = useState<'doc' | 'pdf'>('doc');

  // Default selection logic:
  // If both exist, select 'both'. Otherwise select whichever task has feedback, or current active task type.
  const [selectedMode, setSelectedMode] = useState<'both' | 'task1' | 'task2'>(() => {
    if (hasBoth) return 'both';
    if (hasTask1) return 'task1';
    if (hasTask2) return 'task2';
    return activeTaskType === 'Task 1' ? 'task1' : 'task2';
  });

  if (!isOpen) return null;

  const task1Band = hasTask1 ? formatScore(calculateScoreNumeric(task1Context.feedback!)) : null;
  const task2Band = hasTask2 ? formatScore(calculateScoreNumeric(task2Context.feedback!)) : null;
  const combinedBand = calculateCombinedWritingBand(task1Context.feedback, task2Context.feedback);

  const handleExport = () => {
    exportReport({
      task1Context,
      task2Context,
      exportMode: selectedMode,
      fileType: selectedFileType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-lg w-full p-6 relative overflow-hidden transition-all transform scale-100">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-amber-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-100 p-2 rounded-xl text-red-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-900">Xuất Báo Cáo Chấm Bài</h3>
              <p className="text-xs text-slate-500 font-medium">Chọn định dạng và nội dung báo cáo cần tải về</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. Format Selection */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Chọn Định Dạng File Tải Về
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedFileType('doc')}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                selectedFileType === 'doc'
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-2 rounded-lg font-black text-xs ${selectedFileType === 'doc' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                DOC
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Word (.doc)</div>
                <p className="text-[11px] text-slate-500">Chuẩn A4, Calibri 12pt</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFileType('pdf')}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                selectedFileType === 'pdf'
                  ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-2 rounded-lg font-black text-xs ${selectedFileType === 'pdf' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                PDF
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">PDF (.pdf)</div>
                <p className="text-[11px] text-slate-500">Xem / In ấn trực tiếp A4</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Scope Options */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            2. Chọn Nội Dung Báo Cáo
          </label>
          <div className="space-y-2.5">
            
            {/* Both Tasks Option */}
            <label
              onClick={() => setSelectedMode('both')}
              className={`block p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                selectedMode === 'both'
                  ? 'border-red-600 bg-red-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              } ${!hasBoth ? 'opacity-90' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="exportMode"
                  value="both"
                  checked={selectedMode === 'both'}
                  onChange={() => setSelectedMode('both')}
                  className="mt-1 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      🎓 Xuất Cả 2 Tasks (Task 1 + Task 2)
                      {hasBoth && (
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                          Khuyên Dùng
                        </span>
                      )}
                    </span>
                    {combinedBand && (
                      <span className="text-sm font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        Band {combinedBand}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Xuất gộp cả 2 bài thành 1 file báo cáo đầy đủ kèm Tổng band score IELTS Writing.
                  </p>
                  <div className="flex gap-4 mt-1.5 text-[11px] font-semibold text-slate-500">
                    <span>
                      Task 1: {hasTask1 ? <b className="text-green-700">✅ Đã chấm ({task1Band})</b> : <span className="text-amber-600">⏳ Chưa chấm</span>}
                    </span>
                    <span>
                      Task 2: {hasTask2 ? <b className="text-green-700">✅ Đã chấm ({task2Band})</b> : <span className="text-amber-600">⏳ Chưa chấm</span>}
                    </span>
                  </div>
                </div>
              </div>
            </label>

            {/* Task 1 Only Option */}
            <label
              onClick={() => setSelectedMode('task1')}
              className={`block p-3 rounded-xl border-2 transition-all cursor-pointer ${
                selectedMode === 'task1'
                  ? 'border-red-600 bg-red-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="exportMode"
                  value="task1"
                  checked={selectedMode === 'task1'}
                  onChange={() => setSelectedMode('task1')}
                  className="text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="flex-grow flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">📄 Chỉ xuất Task 1</span>
                    <p className="text-xs text-slate-500">Báo cáo chấm bài IELTS Writing Task 1 (Kèm hình biểu đồ)</p>
                  </div>
                  {hasTask1 ? (
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      Band {task1Band}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Chưa chấm
                    </span>
                  )}
                </div>
              </div>
            </label>

            {/* Task 2 Only Option */}
            <label
              onClick={() => setSelectedMode('task2')}
              className={`block p-3 rounded-xl border-2 transition-all cursor-pointer ${
                selectedMode === 'task2'
                  ? 'border-red-600 bg-red-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="exportMode"
                  value="task2"
                  checked={selectedMode === 'task2'}
                  onChange={() => setSelectedMode('task2')}
                  className="text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="flex-grow flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">📄 Chỉ xuất Task 2</span>
                    <p className="text-xs text-slate-500">Báo cáo chấm bài IELTS Writing Task 2</p>
                  </div>
                  {hasTask2 ? (
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      Band {task2Band}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Chưa chấm
                    </span>
                  )}
                </div>
              </div>
            </label>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 rounded-xl shadow-md transition-all flex items-center gap-2 transform active:scale-95"
          >
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {selectedFileType === 'pdf' ? 'Xuất File PDF (.pdf)' : 'Tải File Word (.doc)'}
          </button>
        </div>

      </div>
    </div>
  );
};
