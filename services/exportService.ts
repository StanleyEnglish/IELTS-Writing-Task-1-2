import type { TaskContext, Feedback, TaskType, MistakeCorrection } from '../types';

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateAnnotatedEssayHtml(
  essay: string,
  feedback: Feedback | null,
  isForWordExport: boolean = false
): string {
  if (!essay) return '';
  if (!feedback) {
    return essay
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
  }

  let processedHtml = essay
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  // Collect all mistakes across criteria
  const allMistakes: MistakeCorrection[] = [
    ...(feedback.lexicalResource?.mistakes || []),
    ...(feedback.grammaticalRange?.mistakes || []),
    ...((feedback.taskCompletion as any)?.mistakes || []),
    ...((feedback.coherenceCohesion as any)?.mistakes || []),
  ];

  // Sort by length descending to replace longer phrases first
  allMistakes.sort((a, b) => (b.originalPhrase?.length || 0) - (a.originalPhrase?.length || 0));

  const seenPhrases = new Set<string>();

  allMistakes.forEach(mistake => {
    if (!mistake.originalPhrase) return;
    const cleanPhrase = escapeRegExp(mistake.originalPhrase.trim());
    if (!cleanPhrase || seenPhrases.has(cleanPhrase.toLowerCase())) return;
    seenPhrases.add(cleanPhrase.toLowerCase());

    const regex = new RegExp(`(${cleanPhrase})(?![^<]*>|[^<>]*<\/span>)`, 'gi');

    processedHtml = processedHtml.replace(regex, (match) => {
      const explanationText = (mistake.explanation || '').replace(/"/g, '&quot;');
      const correctionText = mistake.suggestedCorrection || '';

      if (isForWordExport) {
        return `<span style="background-color: #fee2e2; color: #dc2626; text-decoration: line-through; font-weight: bold; padding: 2px 4px; margin: 0 1px;">${match}</span><span style="background-color: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 4px; margin: 0 1px; border-bottom: 2px solid #d97706;">${correctionText}</span><span style="color: #4b5563; font-size: 11pt; font-style: italic;"> (${explanationText})</span>`;
      } else {
        return `<span class="bg-red-100 text-red-600 line-through decoration-red-400 px-1 rounded-sm mx-0.5">${match}</span><span class="bg-amber-100 text-amber-800 font-bold px-1 rounded-sm mx-0.5 cursor-help border-b border-amber-500 border-dotted" title="${explanationText}">${correctionText}</span>`;
      }
    });
  });

  return processedHtml;
}

export const calculateScoreNumeric = (feedback: Feedback): number => {
  const scores = [
    feedback.taskCompletionScore,
    feedback.coherenceCohesionScore,
    feedback.lexicalResourceScore,
    feedback.grammaticalRangeScore,
  ];
  return scores.reduce((a, b) => a + b, 0) / 4;
};

export const formatScore = (average: number): string => {
  const decimalPart = average - Math.floor(average);
  if (decimalPart >= 0.75) {
    return `${Math.ceil(average)}.0`;
  }
  if (decimalPart >= 0.25) {
    return `${Math.floor(average)}.5`;
  }
  return `${Math.floor(average)}.0`;
};

export const calculateCombinedWritingBand = (
  task1Feedback: Feedback | null,
  task2Feedback: Feedback | null
): string | null => {
  if (!task1Feedback && !task2Feedback) return null;
  
  if (task1Feedback && !task2Feedback) {
    return formatScore(calculateScoreNumeric(task1Feedback));
  }
  
  if (!task1Feedback && task2Feedback) {
    return formatScore(calculateScoreNumeric(task2Feedback));
  }

  const s1 = calculateScoreNumeric(task1Feedback!);
  const s2 = calculateScoreNumeric(task2Feedback!);
  
  // Official IELTS Writing weight: Task 1 (1/3), Task 2 (2/3)
  const weighted = (s1 * 1 + s2 * 2) / 3;
  return formatScore(weighted);
};

export interface ExportReportParams {
  task1Context: TaskContext;
  task2Context: TaskContext;
  exportMode: 'both' | 'task1' | 'task2';
  fileType?: 'doc' | 'pdf';
}

export type ExportToWordParams = ExportReportParams;

export function exportReport({
  task1Context,
  task2Context,
  exportMode,
  fileType = 'doc',
}: ExportReportParams): void {
  const includeTask1 = (exportMode === 'task1' || exportMode === 'both') && !!task1Context.feedback;
  const includeTask2 = (exportMode === 'task2' || exportMode === 'both') && !!task2Context.feedback;

  if (!includeTask1 && !includeTask2) {
    alert("Chưa có dữ liệu bài chấm để xuất file. Vui lòng chấm bài trước khi xuất!");
    return;
  }

  const task1Band = task1Context.feedback ? formatScore(calculateScoreNumeric(task1Context.feedback)) : null;
  const task2Band = task2Context.feedback ? formatScore(calculateScoreNumeric(task2Context.feedback)) : null;
  const combinedBand = calculateCombinedWritingBand(
    includeTask1 ? task1Context.feedback : null,
    includeTask2 ? task2Context.feedback : null
  );

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderSingleTaskSection = (
    title: string,
    taskType: TaskType,
    context: TaskContext,
    bandScore: string | null
  ) => {
    const feedback = context.feedback;
    if (!feedback) return '';

    const annotatedEssayHtml = generateAnnotatedEssayHtml(context.userEssay, feedback, true);
    const wordCount = context.userEssay.trim() ? context.userEssay.trim().split(/\s+/).length : 0;
    const taskCriterionTitle = taskType === 'Task 1' ? 'Task Achievement' : 'Task Response';

    const sentenceRewritesHtml = feedback.sentenceImprovements && feedback.sentenceImprovements.length > 0
      ? `
        <div style="margin-top: 15px; background-color: #fffbe3; border: 1px solid #fde047; padding: 12px; border-radius: 6px;">
          <h4 style="margin: 0 0 10px 0; color: #854d0e; font-size: 12pt; font-weight: bold;">
            ✨ Gợi Ý Cải Thiện Diễn Đạt Cả Câu (Suggested Rewrites)
          </h4>
          <ul style="margin: 0; padding-left: 18px;">
            ${feedback.sentenceImprovements.map(item => `
              <li style="margin-bottom: 10px; font-size: 12pt; line-height: 1.5;">
                <p style="margin: 0; color: #6b7280; font-style: italic;">Draft: "${item.originalSentence}"</p>
                <p style="margin: 3px 0 0 0; color: #991b1b; font-weight: bold;">→ Polished: "${item.suggestedSentence}"</p>
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : '';

    const modelEssayHtml = context.modelEssay
      ? `
        <div style="margin-top: 20px; page-break-before: auto; background-color: #f8fafc; border: 2px solid #cbd5e1; padding: 15px; border-radius: 8px;">
          <h3 style="color: #1e293b; font-size: 13pt; margin-top: 0; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px;">
            🌟 Bài Viết Mẫu Band 7.0+ (Model Essay)
          </h3>
          <p style="font-size: 12pt; line-height: 1.7; color: #0f172a; white-space: pre-wrap;">${context.modelEssay}</p>
        </div>
      `
      : '';

    let formattedImgSrc = context.task1Image ? context.task1Image.trim() : null;
    if (formattedImgSrc && !formattedImgSrc.startsWith('data:') && !formattedImgSrc.startsWith('http')) {
      formattedImgSrc = `data:image/jpeg;base64,${formattedImgSrc}`;
    }

    const imageHtml = (taskType === 'Task 1' && formattedImgSrc)
      ? `
        <div style="margin-top: 12px; margin-bottom: 12px; text-align: center;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #334155; text-align: left; font-size: 12pt;">📊 Biểu Đồ / Hình Ảnh Đề Bài (Task 1 Diagram):</p>
          <img src="${formattedImgSrc}" style="max-width: 100%; max-height: 420px; width: auto; height: auto; border: 1px solid #cbd5e1; border-radius: 6px; display: block; margin: 0 auto;" alt="Task 1 Image" />
        </div>
      `
      : '';

    return `
      <div style="margin-bottom: 35px; page-break-inside: avoid;">
        <h2 style="font-size: 15pt; color: #991b1b; border-bottom: 2px solid #fca5a5; padding-bottom: 6px; margin-top: 25px;">
          ${title} (Band Score: ${bandScore || 'N/A'})
        </h2>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #334155; font-size: 12pt;">📌 Đề Bài (Prompt):</p>
          <p style="margin: 0; font-style: italic; color: #1e293b; font-size: 12pt;">${context.prompt || 'Không có đề bài'}</p>
          ${imageHtml}
          <p style="margin: 8px 0 0 0; font-size: 11pt; color: #64748b;"><b>Số từ bài làm:</b> ${wordCount} words</p>
        </div>

        <h3 style="font-size: 13pt; color: #78350f; margin-top: 15px; margin-bottom: 8px;">
          📝 Bài Sửa Chi Tiết
        </h3>
        <div style="background-color: #fffdfa; border: 2px solid #fcd34d; padding: 15px; border-radius: 8px; line-height: 1.8; font-size: 12pt; margin-bottom: 20px; color: #1f2937;">
          ${annotatedEssayHtml}
        </div>

        <h3 style="font-size: 13pt; color: #78350f; margin-top: 15px; margin-bottom: 8px;">
          📊 Kết Quả Chấm Chi Tiết Theo 4 Tiêu Chí
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12pt;">
          <thead>
            <tr style="background-color: #fee2e2;">
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left; width: 22%; color: #991b1b; font-size: 12pt;">Tiêu Chí</th>
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: center; width: 10%; color: #991b1b; font-size: 12pt;">Điểm</th>
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left; width: 34%; color: #166534; font-size: 12pt;">Điểm Mạnh (Strengths)</th>
              <th style="border: 1px solid #fca5a5; padding: 8px; text-align: left; width: 34%; color: #991b1b; font-size: 12pt;">Cần Cải Thiện (Weaknesses)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #991b1b;">${taskCriterionTitle}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold; font-size: 13pt; color: #dc2626;">${feedback.taskCompletionScore}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #166534;">${feedback.taskCompletion.strengths || '-'}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #374151;">${feedback.taskCompletion.weaknesses || '-'}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #d97706;">Coherence & Cohesion</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold; font-size: 13pt; color: #d97706;">${feedback.coherenceCohesionScore}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #166534;">${feedback.coherenceCohesion.strengths || '-'}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #374151;">
                ${feedback.coherenceCohesion.weaknesses || '-'}
                ${feedback.coherenceCohesion.referencingAndSubstitution ? `<br/><i style="font-size: 11pt; color: #4b5563;">Ref & Flow: ${feedback.coherenceCohesion.referencingAndSubstitution}</i>` : ''}
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #2563eb;">Lexical Resource</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold; font-size: 13pt; color: #2563eb;">${feedback.lexicalResourceScore}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #166534;">${feedback.lexicalResource.strengths || '-'}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #374151;">${feedback.lexicalResource.weaknesses || '-'}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #7c3aed;">Grammatical Range & Accuracy</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold; font-size: 13pt; color: #7c3aed;">${feedback.grammaticalRangeScore}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #166534;">${feedback.grammaticalRange.strengths || '-'}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: #374151;">${feedback.grammaticalRange.weaknesses || '-'}</td>
            </tr>
          </tbody>
        </table>

        ${sentenceRewritesHtml}
        ${modelEssayHtml}
      </div>
    `;
  };

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo IELTS Writing Evaluation</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 210mm 297mm;
          margin: 20mm;
        }
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 20mm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.WordSection1 {
          page: WordSection1;
        }

        body, table, td, th, p, span, li, div, strike, b, i {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif !important;
          font-size: 12pt;
        }

        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #1f2937;
        }

        h1 {
          font-size: 20pt;
          font-weight: bold;
          text-align: center;
          color: #991b1b;
          margin-bottom: 5px;
        }

        .subtitle {
          text-align: center;
          color: #4b5563;
          font-size: 11pt;
          font-style: italic;
          margin-bottom: 20px;
        }

        .summary-card {
          background-color: #fef2f2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
          text-align: center;
        }

        .summary-title {
          font-size: 12pt;
          font-weight: bold;
          color: #991b1b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .overall-score {
          font-size: 32pt;
          font-weight: 900;
          color: #b91c1c;
          margin: 5px 0;
        }

        .score-breakdown {
          font-size: 12pt;
          color: #374151;
          font-weight: bold;
        }

        table {
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        <h1>IELTS WRITING ASSESSMENT REPORT</h1>
        <p class="subtitle">Báo Cáo Chấm Bài & Sửa Lỗi Chi Tiết | Ngày xuất: ${currentDate}</p>

        <div class="summary-card">
          <div class="summary-title">Tổng Quan Band Score</div>
          <div class="overall-score">${combinedBand || 'N/A'}</div>
          <div class="score-breakdown">
            ${includeTask1 ? `Task 1 Band: <b>${task1Band}</b>` : ''}
            ${includeTask1 && includeTask2 ? ' &nbsp;|&nbsp; ' : ''}
            ${includeTask2 ? `Task 2 Band: <b>${task2Band}</b>` : ''}
          </div>
        </div>

        ${includeTask1 ? renderSingleTaskSection('TASK 1: ACADEMIC WRITING', 'Task 1', task1Context, task1Band) : ''}
        ${includeTask2 ? renderSingleTaskSection('TASK 2: ESSAY WRITING', 'Task 2', task2Context, task2Band) : ''}

        <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; pt: 15px; text-align: center; color: #64748b; font-size: 11pt; font-style: italic;">
          🌸 Chúc em ôn luyện hiệu quả và đạt kết quả tối đa trong kỳ thi IELTS!
        </div>
      </div>
    </body>
    </html>
  `;

  const fileNameBase = includeTask1 && includeTask2
    ? `IELTS_Writing_Task1_and_Task2_Report_${new Date().toISOString().slice(0, 10)}`
    : includeTask1
      ? `IELTS_Writing_Task1_Report_${new Date().toISOString().slice(0, 10)}`
      : `IELTS_Writing_Task2_Report_${new Date().toISOString().slice(0, 10)}`;

  if (fileType === 'pdf') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.title = fileNameBase;
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      };
    } else {
      alert("Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để tải/in file PDF!");
    }
  } else {
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNameBase}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function exportToWord(params: ExportReportParams): void {
  exportReport({ ...params, fileType: 'doc' });
}
