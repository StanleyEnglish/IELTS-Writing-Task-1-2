
import { GoogleGenAI, Type } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS, IELTS_TASK_1_EXEMPLARS, IELTS_TASK_2_EXEMPLARS, IELTS_TASK_2_BAND_6_7_EXEMPLARS } from '../constants';

const brainstormingModel = 'gemini-3.5-flash';
const feedbackModel = 'gemini-3.5-flash';

const handleApiError = (error, context) => {
    console.error(`Error during ${context}:`, error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
        if (error.error && error.error.message) {
            errorMessage = error.error.message;
        } else {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = String(error);
            }
        }
    } else {
        errorMessage = String(error);
    }

    if (
        errorMessage.includes('API key not valid') || 
        errorMessage.includes('API_KEY_INVALID') ||
        errorMessage.includes('UNAUTHENTICATED') ||
        errorMessage.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
        errorMessage.includes('invalid authentication credentials') ||
        error?.error?.code === 401
    ) {
        throw new Error("Mã API Key không hợp lệ hoặc đã bị hết hạn/hủy (Lỗi 401 Xác thực). Vui lòng kiểm tra và nhập lại Gemini API Key hợp lệ trong phần Cài Đặt.");
    }
    
    if (errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') || 
        errorMessage.toLowerCase().includes('quota') ||
        (error?.error?.code === 429)) {
        throw new Error("Your API key has exceeded its usage quota (Error 429). Please use a different API key or check your billing details on Google AI Studio.");
    }
    
    if (errorMessage.includes('schema')) {
        throw new Error("The AI had trouble formatting its response. This is often a temporary issue. Please try submitting again.");
    }
    if (errorMessage.includes('[400]')) {
        throw new Error("The request to the AI was invalid. Please try modifying your essay or prompt.");
    }
    if (errorMessage.includes('503') || errorMessage.includes('500')) {
        throw new Error("The AI service is currently unavailable. Please wait a few moments and try again.");
    }
    if (errorMessage.toLowerCase().includes('safety')) {
        throw new Error("The response was blocked due to safety concerns. Please modify your prompt or essay content.");
    }
    
    throw new Error(errorMessage);
};

const callWithRetry = async (apiCallFn, retries = 5, initialDelay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCallFn();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isServerError = errorMessage.includes('503') || errorMessage.includes('500');
            const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
            const isLastAttempt = i === retries - 1;

            if (isServerError && !isQuotaError && !isLastAttempt) {
                const delay = initialDelay * Math.pow(2, i);
                console.warn(`API Error (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, errorMessage);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

const getRandomExemplars = (exemplarsString, count) => {
    if (!exemplarsString) return "";
    const chunks = exemplarsString.split(/### Exemplar/g).filter(chunk => chunk.trim().length > 0);
    const selected = chunks.sort(() => 0.5 - Math.random()).slice(0, count);
    return selected.map(chunk => `### Exemplar${chunk}`).join('\n---\n');
};

export const generateGuidance = async (taskType, prompt, imageBase64, apiKey, targetBand = '7.0+') => {
  if (!apiKey) throw new Error("API key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const apiCall = async () => {
        if (taskType === 'Task 1') {
            const isBand7 = targetBand === '7.0+';

            const levelInstruction = !isBand7
                ? `**TARGET LEVEL: BAND 5.0 - 6.0 (CRITICAL REQUIREMENTS):**
                  - **Mức độ đơn giản**: Mọi thứ cần ĐƠN GIẢN HƠN RẤT NHIỀU so với Band 7.0+. Không đặt nặng phân tích hay diễn đạt phức tạp.
                  - **Overall Paragraph**:
                    * Nếu là biểu đồ động (Dynamic chart - có nhiều năm): VẪN PHẢI CÓ XU HƯỚNG CHÍNH (trend: tăng/giảm bao quát) một cách ngắn gọn, đơn giản.
                    * Nếu là biểu đồ tĩnh (Static chart): Nêu đối tượng cao nhất/thấp nhất một cách trực diện.
                    * **Nếu là dạng Quy trình (Process)**: Overall BẮT BUỘC theo cấu trúc chuẩn: nêu rõ đây là quy trình tuyến tính (linear process) hay tuần hoàn (cyclical process), gồm bao nhiêu bước, bắt đầu từ đâu và kết thúc ở đâu.
                  - **Nội dung thân bài (Body 1 & Body 2)**:
                    * Nội dung ngắn gọn hơn, câu cú trực tiếp, dễ hiểu.
                    * Đa phần là **LIỆT KÊ THÔNG TIN RÕ RÀNG** theo từng ý, KHÔNG cần phải "kể câu chuyện" cho hình như Band 7.0+.
                    * **Dạng Quy trình (Process)**: Ưu tiên chia quy trình thành các **BƯỚC CỤ THỂ (Steps)** (Bước 1, Bước 2, Bước 3...) để học viên dễ viết câu; **phân chia các bước vào Body 1 và Body 2 một cách hợp lý và cân đối** (ví dụ: quy trình có 6 bước thì chia đều Bước 1-3 vào Body 1, Bước 4-6 vào Body 2).
                  - **Từ vựng (Vocabulary)**:
                    * Sử dụng từ vựng tiếng Anh rất dễ, quen thuộc trong ngoặc vuông [ ] (ví dụ: [increase], [decrease], [go up], [fall], [highest], [lowest]).
                    * **KHÔNG tập trung nhiều vào phần mức độ** (không cần các từ vựng mức độ phức tạp).
                  - **Độ chính xác của số liệu & Từ xấp xỉ**:
                    * Đảm bảo đúng số liệu từ biểu đồ.
                    * Hướng dẫn và gợi ý sử dụng các từ xấp xỉ phổ biến, đơn giản nếu số liệu khó ước lượng con số cụ thể: [about], [around], [roughly], [nearly], [approximately] (ví dụ: [about 50%], [nearly 30 million], [around half]).`
                : `**TARGET LEVEL: BAND 7.0+ (CRITICAL REQUIREMENTS):**
                  - **Conciseness & Crucial Features**: The guidance should NOT be overly long or bogged down in minute numerical details. Focus strictly on the **CRUCIAL / KEY FEATURES** of the chart, diagram, or map (e.g. key peaks, lowest points, overall dominant trends, stark contrasts, major transformations, turning points).
                  - **Overall Paragraph Rules (EXTREMELY IMPORTANT)**:
                    * **Dynamic Chart (có nhiều năm / có yếu tố thời gian)**: Phần Overall BẮT BUỘC có 2 ý theo đúng thứ tự:
                      1. **Xu hướng chung (Trend)**: Các đối tượng có xu hướng tăng, giảm, hay biến động thế nào qua toàn bộ thời gian.
                      2. **Thứ tự / Đối tượng nổi bật nhất (Order / Extremes)**: Đối tượng nào luôn chiếm vị trí lớn nhất, nhỏ nhất, hoặc có mức biến động mạnh nhất (tùy theo biểu đồ).
                    * **Static Chart (không có yếu tố thời gian / chỉ có 1 năm cố định)**: TUYỆT ĐỐI KHÔNG dùng từ chỉ xu hướng (không dùng 'trend', 'tăng/giảm'). Overall chỉ tập trung vào **So sánh & Thứ tự (Order / Extremes / Comparisons)**: Đối tượng nào chiếm tỷ trọng lớn nhất, thấp nhất, hoặc khoảng chênh lệch đáng kể nhất giữa các mục.
                    * **Process Diagram (QUY TRÌNH)**:
                      - Nêu rõ loại quy trình (linear hay cyclical process), tổng số bước hoặc giai đoạn, điểm bắt đầu và điểm kết thúc.
                      - **BẮT BUỘC PHẢI CÓ THÊM 1 ĐIỂM ĐẶC BIỆT / KEY FEATURE CỦA HÌNH**: (ví dụ: sự tham gia của con người vs máy móc tự động hóa, sự phân nhánh thành nhiều luồng/sản phẩm phụ, bước biến đổi nhiệt độ/hóa học then chốt, sự tái chế/lặp lại của một mắt xích, hoặc giai đoạn phức tạp nhất).
                      - **Linh hoạt chia bước/giai đoạn nhưng BẮT BUỘC ĐỒNG NHẤT VỚI THÂN BÀI**: Cho phép linh hoạt chia theo các bước (steps) hoặc gộp thành các giai đoạn chính (stages/phases). Tuy nhiên, số lượng giai đoạn chính được nêu ở Overall PHẢI XUẤT HIỆN ĐÚNG VÀ ĐỒNG NHẤT trong hai đoạn thân bài (Ví dụ: nếu Overall viết 4 giai đoạn chính thì ở 2 thân bài cũng phải chia và làm rõ đúng số lượng 4 giai đoạn chính đó, ví dụ Body 1 gồm 2 giai đoạn đầu, Body 2 gồm 2 giai đoạn sau).
                    * **Map**: Với Map, chỉ ra biến đổi tổng thể lớn nhất (khu vực hiện đại hóa, xuất hiện thêm tiện ích, thu hẹp mảng xanh...).
                  - **Logical Paragraphing**: Dividing information between Body 1 and Body 2 is CRUCIAL. Group data with a clear, logical rationale (e.g. upward trends vs downward trends, highest values vs lowest values, time period 1 vs time period 2, or stage 1-half vs stage 2-half).
                  - **Signposting for Coherence**:
                    * For data charts (line graph, bar chart, pie chart, table): Prioritize and explicitly guide starting Body 1 with cohesive phrases like **"Looking first at [category/trend]..."** (or "Looking at...", "Starting with...") and starting Body 2 with **"Turning to [remaining categories]..."** (or "Moving on to...", "With regard to..."). This makes the flow immediately clear and effortless for the reader/examiner to follow.
                    * For maps/diagrams: Use clear spatial or sequential signposts (e.g. "Looking first at the initial layout in [year]...", "Turning to the subsequent changes in [year]...").
                  - **Degree & Speed Vocabulary (Trạng từ & Tính từ chỉ mức độ tăng giảm)**:
                    * Cực kỳ quan trọng ở Band 7.0+: Gợi ý linh hoạt cả 2 cấu trúc diễn đạt mức độ thay đổi trong ngoặc vuông [ ]:
                      + **Verb + Adverb**: ví dụ [increase significantly], [rise dramatically], [grow substantially], [drop moderately], [decline slightly].
                      + **Adjective + Noun**: ví dụ [experienced a significant increase], [witnessed a substantial growth], [saw a dramatic rise], [recorded a moderate drop].`;

            const systemInstruction = `You are an expert IELTS writing instructor. Your task is to provide a structured, high-scoring guide in Vietnamese for an IELTS Writing Task 1 essay based on the user's prompt and image.
Follow a four-part structure: Introduction, Overall, Body 1, and Body 2.
${levelInstruction}
**CRITICAL:** 
1. For Band 5.0-6.0: Keep guidance very simple and straightforward. Overall must include trend if dynamic. For Process, Overall states linear/cyclical, number of steps, start/end; Body 1 and 2 balance and list these numbered steps clearly without complex analysis. Use easy vocabulary and approximations where needed.
2. For Band 7.0+: Follow the Dynamic vs Static chart rule strictly for the Overall paragraph (Trend then Order for dynamic; Comparison/Order without trends for static). For Process, Overall must identify linear/cyclical, stages, start/end, AND an outstanding key feature/special aspect; and the body paragraphs MUST strictly match the stages outlined in Overall (e.g. 4 main stages in Overall -> exactly 4 main stages clearly divided across Body 1 & Body 2). Logical paragraphing, crucial features only, signposting ('Looking first at...', 'Turning to...'), and varied degree collocations (verb+adv, adj+noun).`;

            const promptText = `Analyze the following IELTS Writing Task 1 prompt and the provided image. Based on your analysis, generate a structured guide in Vietnamese that a student can follow to write their essay.

The output must be a JSON object with the following structure:
1.  **introduction**: A concise Vietnamese suggestion on how to paraphrase the prompt for the introduction.
2.  **overall**: An array of 2-3 bullet points in Vietnamese identifying the main features for the 'Overall' paragraph (no raw numbers).
    ${isBand7 ? '- **Dynamic chart**: Bullet 1 MUST state the overall trend (xu hướng chính tăng/giảm). Bullet 2 states the order/extremes (đối tượng luôn lớn nhất/nhỏ nhất).\n    - **Static chart**: STRICTLY NO trend words. Bullet points focus on order and highest/lowest/dominant comparisons.\n    - **Process diagram (Band 7.0+)**: State if linear or cyclical, number of stages, starting & ending points, AND MUST identify an outstanding key feature/special aspect of the diagram (e.g. human intervention vs automation, branching steps, recycling loops, key temperature/chemical stage).' : '- **Dynamic chart**: State the overall general trend (tăng/giảm).\n    - **Static chart**: State the highest/lowest categories simply.\n    - **Process diagram (Band 5.0-6.0)**: MUST state: linear or cyclical process, how many steps, starting where and ending where.'}
3.  **body1**: An array of bullet points in Vietnamese for the first body paragraph.
    ${isBand7 ? '- **Band 7.0+ Requirement**: Highlight ONLY crucial features. For data charts (line/bar/pie/table), start the first bullet with a phrase like "Looking first at [nhóm đối tượng]...". For Process diagrams, describe the first set of stages, ensuring STRICT consistency with the total number of stages mentioned in Overall.' : '- **Band 5.0-6.0 Requirement**: Keep it short, simple, and direct. Focus on listing the data clearly (not storytelling). For Process diagrams, describe the first half of the numbered steps (Bước 1, Bước 2...) balanced with Body 2. Use easy vocabulary.'}
4.  **body2**: An array of bullet points in Vietnamese for the second body paragraph.
    ${isBand7 ? '- **Band 7.0+ Requirement**: Group the remaining crucial features logically. For data charts (line/bar/pie/table), start the first bullet with a phrase like "Turning to [nhóm đối tượng còn lại]..." (hoặc "Moving on to..."). For Process diagrams, describe the remaining stages, matching the exact stage structure outlined in Overall.' : '- **Band 5.0-6.0 Requirement**: Keep it short, simple, and direct. For Process diagrams, describe the second half of the numbered steps clearly and simply.'}

Essay Prompt: "${prompt}"`;

            const parts = [];
            if (imageBase64) {
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageBase64,
                    },
                });
            }
            parts.push({ text: promptText });
            const contents = { parts };

            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            introduction: { type: Type.STRING, description: "Vietnamese guidance for the introduction paragraph." },
                            overall: { 
                                type: Type.ARRAY,
                                description: "An array of bullet points in Vietnamese for the 'Overall' paragraph.",
                                items: { type: Type.STRING }
                            },
                            body1: {
                                type: Type.ARRAY,
                                description: "An array of bullet points in Vietnamese for the first body paragraph.",
                                items: { type: Type.STRING }
                            },
                            body2: {
                                type: Type.ARRAY,
                                description: "An array of bullet points in Vietnamese for the second body paragraph.",
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['introduction', 'overall', 'body1', 'body2']
                    },
                },
            });
            
            const jsonText = response.text;
            return JSON.parse(jsonText);
        }

        const systemInstruction = "You are an expert IELTS writing instructor. Your task is to help a student brainstorm for an IELTS Writing Task 2 essay.";
        const promptText = `Generate two simple, open-ended brainstorming questions in **Vietnamese** for the following IELTS essay prompt. The questions should guide the student in structuring their essay.`;
        const fullContent = `${promptText}\n\nEssay Prompt: "${prompt}"`;
        
        const contents = { parts: [{ text: fullContent }] };

        const response = await ai.models.generateContent({
          model: brainstormingModel,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    points: {
                        type: Type.ARRAY,
                        description: "An array of two brainstorming questions in Vietnamese.",
                        items: { type: Type.STRING }
                    }
                },
                required: ['points']
            },
          },
        });

        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        if (parsed.points && parsed.points.length > 0) {
            return parsed.points;
        }
        throw new Error("AI did not return any guidance points.");
    };

    return await callWithRetry(apiCall);

  } catch (error) {
    handleApiError(error, 'generate guidance');
  }
};


export const generateBrainstormingIdeas = async (prompt, questions, apiKey, targetBand = '7.0+') => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const apiCall = async () => {
            const isBand56 = targetBand === '5.0-6.0';

            const levelInstruction = isBand56
                ? `**CRITICAL INSTRUCTION FOR LEVEL (BAND 5.0-6.0):**
                  - **Target Level**: Band 5.0-6.0.
                  - **Idea style**: Simple, practical, and very clear ideas with straightforward explanations. Students are learning to get used to IELTS writing, so do not put them under pressure with complex ideas.
                  - **Vocabulary**: Suggest very easy, simple, and high-frequency English vocabulary and expressions inside square brackets [ ]. Do not use difficult B2-C1 words. Keep it comfortable and accessible for a beginner.
                  - **Grammar/Sentences**: Keep sentence patterns very easy, direct, and straightforward.`
                : `**CRITICAL INSTRUCTION FOR LEVEL (BAND 7.0+):**
                  - **Target Level**: Band 7.0+.
                  - **Idea style**: Highly persuasive, deeply analyzed, and logically coherent ideas.
                  - **Vocabulary**: Suggest practical, natural, and common English vocabulary and collocations inside square brackets [ ]. Vocabulary should NOT be obscure, excessively difficult, or rare ("không cần từ đắt giá hay xa lạ"). Instead, prioritize clear, high-utility, and common vocabulary that strictly adheres to formal academic written style (giữ đúng phong cách văn viết trang trọng, tự nhiên, dễ dùng và không quá khó).
                  - **Grammar/Sentences**: Suggest effective, natural sentence structures suited for academic writing that help students gain 7+ for Grammatical Range & Accuracy.`;

            const bodyStrategyInstruction = isBand56
                ? `**CRITICAL INSTRUCTION FOR BODY PARAGRAPHS (BAND 5.0 - 6.0):**
                - **Cấu trúc thân bài 1 và 2 (BẮT BUỘC SỬ DỤNG ĐÚNG 5 NHÃN NÀY CHO MỖI THÂN BÀI):**
                  - **Câu chủ đề**: Ngắn gọn, trực tiếp nêu chủ đề của đoạn (Thân bài 1 bắt đầu bằng "Một mặt,", Thân bài 2 bắt đầu bằng "Mặt khác,").
                  - **Giải thích 1**: Nêu ý tưởng và giải thích đơn giản thứ 1 cho luận điểm (Ý tưởng 1 -> Kết quả/Hệ quả dễ hiểu).
                  - **Ví dụ 1**: Cung cấp một ví dụ cụ thể có bối cảnh hoặc địa điểm rõ ràng (nêu rõ ở đâu: quốc gia, khu vực cụ thể như Việt Nam, Nhật Bản, các đô thị lớn... hoặc một sự việc/hiện tượng thực tế minh chứng trực tiếp cho Giải thích 1). **Lưu ý quan trọng**: Mặc dù có địa điểm/sự việc cụ thể, ví dụ phải ĐƠN GIẢN NHẤT CÓ THỂ, ngắn gọn, dễ hiểu và dễ viết thành câu tiếng Anh cho người mới học.
                  - **Giải thích 2**: Nêu ý tưởng và giải thích đơn giản thứ 2 bổ sung cho câu chủ đề (Ý tưởng 2 -> Kết quả/Hệ quả dễ hiểu).
                  - **Kết quả/ liên kết**: Tóm tắt kết quả hoặc liên kết ngắn gọn lại với luận điểm của đoạn/bài.
                - **Tính đơn giản & rõ ràng**: Giữ các ý tưởng trực diện, dễ hiểu, dễ viết thành câu hoàn chỉnh.`
                : `**CRITICAL INSTRUCTION FOR BODY PARAGRAPHS (BAND 7.0+):**
                - **Cấu trúc thân bài 1 và 2 (GIỮ NGUYÊN 4 NHÃN):**
                  - **Câu chủ đề**: Cô đọng, học thuật, định hướng sắc bén (Thân bài 1 bắt đầu bằng "Một mặt,", Thân bài 2 bắt đầu bằng "Mặt khác,").
                  - **Giải thích**: PHÂN TÍCH SÂU SẮC CHO DUY NHẤT 1 Ý TƯỞNG ĐƯỢC ĐƯA RA (Chỉ cần 1 ý tưởng duy nhất cho mỗi thân bài, KHÔNG liệt kê nhiều ý). Phân tích sâu về tác động theo nhiều mặt (cá nhân, xã hội, kinh tế, tâm lý, hoặc ngắn hạn vs dài hạn) và vẫn có liên quan chặt chẽ, trực tiếp đến đề bài.
                    * **Phát triển ý theo tiến trình mạch lạc (Cohesion & Coherence)**: Sử dụng các mô hình:
                      + **Rhyme-theme progression / Theme-rheme progression**: Phân tách thông tin và mở rộng chủ đề một cách tự nhiên, liền mạch.
                      + **Constant progression**: Giữ vững đối tượng trung tâm và liên tục khai thác các chiều kích tác động sâu hơn.
                      + **Linear progression**: Rheme của câu trước trở thành Theme của câu tiếp theo (A dẫn đến B -> B tạo tiền đề dẫn đến C -> C tác động trực tiếp đến D).
                  - **Ví dụ**: Cung cấp một ví dụ thực tế hoặc tình huống cụ thể, sắc sảo minh chứng rõ nét cho tác động đa chiều đã phân tích ở trên.
                  - **Kết quả/ liên kết**: Đánh giá tổng hợp hoặc liên kết sâu sắc trở lại lập trường và câu hỏi đề bài.
                - **Tiêu chuẩn từ vựng trong [ ]**: Sử dụng từ vựng và collocations phổ biến, chuẩn văn viết (formal written style), dễ sử dụng và tự nhiên, KHÔNG cần từ vựng "đắt giá", xa lạ hay quá khó hiểu.`;

            const structureTemplate = isBand56
                ? `**Mở bài**:
                - **Diễn giải đề**: [Diễn giải đề bài đơn giản, rõ ràng] [từ vựng tiếng Anh đơn giản]
                - **Luận điểm**: [Nêu rõ lập trường/quan điểm] [từ vựng tiếng Anh đơn giản]

                **Thân bài 1**:
                - **Câu chủ đề**: Một mặt, [Concise Topic Sentence] [vocabulary]
                - **Giải thích 1**: [Giải thích đơn giản ý 1: Ý tưởng 1 -> Kết quả/Hệ quả] [vocabulary]
                - **Ví dụ 1**: [Ví dụ cụ thể ở đâu (quốc gia/khu vực như VN, Nhật, đô thị...) hoặc hiện tượng thực tế minh họa cho Giải thích 1, nhưng ngắn gọn và đơn giản nhất có thể] [vocabulary]
                - **Giải thích 2**: [Giải thích đơn giản ý 2: Ý tưởng 2 -> Kết quả/Hệ quả] [vocabulary]
                - **Kết quả/ liên kết**: [Tóm tắt kết quả hoặc liên kết lại với luận điểm] [vocabulary]

                **Thân bài 2**:
                - **Câu chủ đề**: Mặt khác, [Concise Topic Sentence] [vocabulary]
                - **Giải thích 1**: [Giải thích đơn giản ý 1: Ý tưởng 1 -> Kết quả/Hệ quả] [vocabulary]
                - **Ví dụ 1**: [Ví dụ cụ thể ở đâu (quốc gia/khu vực như VN, Nhật, đô thị...) hoặc hiện tượng thực tế minh họa cho Giải thích 1, nhưng ngắn gọn và đơn giản nhất có thể] [vocabulary]
                - **Giải thích 2**: [Giải thích đơn giản ý 2: Ý tưởng 2 -> Kết quả/Hệ quả] [vocabulary]
                - **Kết quả/ liên kết**: [Tóm tắt kết quả hoặc liên kết lại với luận điểm] [vocabulary]

                **Kết bài**:
                - **Tóm tắt ý chính và quan điểm**: [Tóm tắt ngắn gọn các ý chính và tái khẳng định quan điểm] [vocabulary]`
                : `**Mở bài**:
                - **Diễn giải đề**: [Diễn giải đề bài chuẩn văn viết, rõ ràng] [common written vocabulary]
                - **Luận điểm**: [Khẳng định lập trường rõ ràng, thuyết phục] [common written vocabulary]

                **Thân bài 1**:
                - **Câu chủ đề**: Một mặt, [Concise Topic Sentence] [natural written collocations]
                - **Giải thích**: [Phân tích sâu sắc cho DUY NHẤT 1 ý tưởng cốt lõi: Phân tích sâu tác động đa chiều (cá nhân, xã hội, kinh tế...) bám sát đề bài, sử dụng rhyme-theme / constant / linear progression để triển khai ý mạch lạc và chặt chẽ] [common written vocabulary & easy-to-use collocations]
                - **Ví dụ**: [Ví dụ sắc bén hoặc tình huống thực tế minh họa rõ tác động đa chiều] [natural written vocabulary]
                - **Kết quả/ liên kết**: [Liên kết chặt chẽ trở lại luận điểm và câu hỏi đề bài] [natural written vocabulary]

                **Thân bài 2**:
                - **Câu chủ đề**: Mặt khác, [Concise Topic Sentence] [natural written collocations]
                - **Giải thích**: [Phân tích sâu sắc cho DUY NHẤT 1 ý tưởng cốt lõi: Phân tích sâu tác động đa chiều (cá nhân, xã hội, kinh tế...) bám sát đề bài, sử dụng rhyme-theme / constant / linear progression để triển khai ý mạch lạc và chặt chẽ] [common written vocabulary & easy-to-use collocations]
                - **Ví dụ**: [Ví dụ sắc bén hoặc tình huống thực tế minh họa rõ tác động đa chiều] [natural written vocabulary]
                - **Kết quả/ liên kết**: [Liên kết chặt chẽ trở lại luận điểm và câu hỏi đề bài] [natural written vocabulary]

                **Kết bài**:
                - **Tóm tắt ý chính và quan điểm**: [Khái quát toàn diện luận cứ và tái khẳng định quan điểm] [common written vocabulary]`;

            const systemInstruction = isBand56
                ? "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline for Band 5.0 - 6.0 learners. Use **Bold** for the specific VIETNAMESE headers and labels provided. Do NOT merge points into paragraphs; keep each label on a new line starting with a bullet point (-). For main headers (Mở bài, Thân bài 1, Thân bài 2, Kết bài), do not use dashes or numbers. For Thân bài 1 and Thân bài 2, you MUST strictly use the 5 labels: **Câu chủ đề**:, **Giải thích 1**:, **Ví dụ 1**:, **Giải thích 2**:, **Kết quả/ liên kết**:. For 'Ví dụ 1', provide a specific location or context (such as a specific country, region, e.g. Vietnam, Japan, or real-life trend), but keep the example as simple and concise as possible for beginner learners. Suggest simple, clear English vocabulary in square brackets [ ]. Ensure 40/60 balance. Start Body 1 topic sentence with 'Một mặt,'. Start Body 2 topic sentence with 'Mặt khác,'."
                : "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline for Band 7.0+ candidates. Use **Bold** for the specific VIETNAMESE headers and labels provided. Do NOT merge points into paragraphs; keep each label on a new line starting with a bullet point (-). For main headers (Mở bài, Thân bài 1, Thân bài 2, Kết bài), do not use dashes or numbers. For Thân bài 1 and Thân bài 2, maintain the 4 labels: **Câu chủ đề**:, **Giải thích**:, **Ví dụ**:, **Kết quả/ liên kết**:. In 'Giải thích', focus on ONLY 1 central idea, but analyze it deeply regarding multifaceted impacts (social, economic, psychological, individual, etc.) strictly relevant to the prompt, utilizing thematic progression (rhyme-theme progression, constant progression, or linear progression) for superior cohesion. Vocabulary suggestions in square brackets [ ] must be practical, common, and easy to use while strictly maintaining a proper formal written style (do not use rare, obscure, or overly complex 'fancy' words). Ensure 40/60 balance. Start Body 1 topic sentence with 'Một mặt,'. Start Body 2 topic sentence with 'Mặt khác,'.";

            const contents = `Based on the essay prompt and the provided brainstorming questions, create a comprehensive, structured essay outline in Vietnamese.
                
                Essay Prompt: "${prompt}"

                Brainstorming Questions:
                ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

                The output MUST be an array of exactly 4 strings, representing the 4 main sections of the essay:
                - String 0: Mở bài
                - String 1: Thân bài 1
                - String 2: Thân bài 2
                - String 3: Kết bài
                
                ${levelInstruction}

                **CRITICAL INSTRUCTION FOR CONTENT STRATEGY (40/60 RULE):**
                - You MUST adopt a **clear standpoint**. Do not sit on the fence (50/50).
                - Use a **40/60 structure**:
                  - **Body 1 (40%)**: Discuss the opposing view, the weaker argument, or the concession.
                  - **Body 2 (60%)**: Discuss the writer's opinion, the stronger argument, or the main solution.

                ${bodyStrategyInstruction}

                **CRITICAL INSTRUCTION FOR CONCISENESS & EFFICIENCY (Target: ~280 words, 35 mins):**
                - **Goal**: Enable the student to write a ~280 word essay in 35 minutes.
                - **Câu chủ đề (Topic Sentences)**: MUST be concise, short, and direct. Avoid wordiness.
                - **Conciseness**: Keep the outline clear and actionable.

                **CRITICAL INSTRUCTION FOR INTRODUCTION:**
                - **Diễn giải đề**: Paraphrase.
                - **Luận điểm**: Direct standpoint.

                **CRITICAL INSTRUCTION FOR CONCLUSION:**
                - **Tóm tắt ý chính và quan điểm**: Concise summary & direct opinion.

                **CRITICAL INSTRUCTION FOR VOCABULARY:**
                - For **ALL SECTIONS**: Insert natural, topic-specific English vocabulary or collocations directly next to the relevant Vietnamese concepts, enclosed in square brackets [ ].
                - Ensure the vocabulary level matches the requested target level (${targetBand}).
                - For Band 7.0+: Prioritize common, high-utility, and practical academic vocabulary and natural collocations that fit formal written style. Avoid overly rare, obscure, or pretentious words ("không cần từ đắt giá hay quá khó/lạ, dễ dùng và chuẩn văn viết").

                **STRUCTURE & LABELS (STRICT FORMATTING):**
                - You MUST use the following **VIETNAMESE LABELS** in **Bold** (Markdown style).
                - **CRITICAL FORMATTING**: Do NOT write a paragraph. Each label must be on its own **SEPARATE LINE** starting with a bullet point (-).
                - **IMPORTANT**: The main section headers (**Mở bài**, **Thân bài 1**, **Thân bài 2**, **Kết bài**) must NOT have any hyphens, dashes, or numbers in front of them. Just the bold text.

                Structure the response exactly as follows (ENSURE EACH BULLET POINT IS ON A NEW LINE):

                ${structureTemplate}

                Language: Vietnamese for the outline content. English for the specific Vocabulary items inside square brackets [ ].`;

            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            ideas: {
                                type: Type.ARRAY,
                                description: "An array of 4 strings representing the 4 sections of the essay outline, formatted with Markdown bolding, bullet points, and inline vocabulary in brackets. Each bullet point MUST be on a new line.",
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['ideas']
                    },
                },
            });
            const jsonText = response.text;
            const parsed = JSON.parse(jsonText);
            if (parsed.ideas && Array.isArray(parsed.ideas)) {
                return parsed.ideas;
            }
            throw new Error("AI did not return ideas in the expected format.");
        };

        return await callWithRetry(apiCall);
    } catch (error) {
        handleApiError(error, 'generate brainstorming ideas');
    }
};

export const generateWritingSuggestions = async (textToAnalyze, apiKey) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const apiCall = async () => {
            const systemInstruction = `You are a helpful IELTS Writing tutor. The user has selected a portion of text from their essay outline.

**YOUR TASK:**
Suggest the best way to write or use this selected text in a Band 7+ IELTS essay.

**CRITICAL RULES FOR VOCABULARY:**
1. **B2 - C1 Level & Authenticity:** You MUST suggest **natural, topic-specific vocabulary at B2 - C1 level**.
2. **Avoid Obscurity:** Do NOT use complex, archaic, or overly "fancy" words that feel unnatural.
3. **Naturalness:** Prioritize natural collocations used by native speakers.
4. **Logic:** The suggestion must be appropriate for the context and topic.

**OTHER RULES:**
1. **Input Analysis:** 
   - If Input is a **Word/Collocation**: Provide a complete, natural sentence.
   - If Input is a **Sentence/Idea**: Translate/Refine it into a single, strong academic English sentence using simple but precise words.
2. **Mandatory Vocabulary Usage:** 
   - If the input text contains specific English vocabulary suggestions (e.g. inside brackets [ ]), you **MUST** use that exact vocabulary.
3. **Quantity:** Provide EXACTLY ONE best suggestion.`;
            
            const promptContent = `
            Context: IELTS Writing Task 1 or Task 2 Brainstorming.
            Selected Text: "${textToAnalyze}"

            Provide exactly ONE writing suggestion inside the "suggestions" array wrapper in JSON format:
            {
              "suggestions": [
                {
                  "english": "The complete suggested sentence or phrase.",
                  "tone": "e.g., Natural & Academic",
                  "explanation": "Brief reason for this phrasing."
                }
              ]
            }
            `;

            const contents = { parts: [{ text: promptContent }] };
            
            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestions: {
                                type: Type.ARRAY,
                                description: "An array containing exactly one writing suggestion.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        english: { type: Type.STRING },
                                        tone: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    },
                                    required: ['english', 'tone', 'explanation']
                                }
                            }
                        },
                        required: ['suggestions']
                    }
                }
            });

            const jsonText = response.text;
            const parsed = JSON.parse(jsonText);
            return parsed.suggestions;
        };
        
        return await callWithRetry(apiCall);
    } catch (error) {
        handleApiError(error, 'generate writing suggestions');
    }
};


export const getIeltsFeedback = async (taskType, prompt, essay, imageBase64, apiKey) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const isTask1 = taskType === 'Task 1';
        const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
        const taskCriterion = isTask1 ? "Task Achievement" : "Task Response";

        const systemInstruction = `You are a Fair and Balanced IELTS examiner providing feedback on an IELTS Writing ${taskType} essay. You adhere strictly to the official public band descriptors but maintain a flexible and encouraging approach.

        **LANGUAGE INSTRUCTION (CRITICAL):**
        - **PRIMARY FEEDBACK LANGUAGE:** VIETNAMESE. All analysis and explanations must be in Vietnamese.
        - **ENGLISH USAGE:** Keep quoted phrases, vocabulary terms, and 'Suggested Rewrites' in **ENGLISH**.
        - **PERSONA & TONE (MANDATORY):** Trong các phần nhận xét bằng tiếng Việt, hãy xưng hô là "thầy" và gọi người viết là "em". Tạo sự gần gũi, truyền cảm hứng nhưng vẫn giữ được sự chuyên nghiệp của một giám khảo.
        - **IMPORTANT:** ALL 'suggestedSentence' entries MUST be in ACADEMIC ENGLISH. Do not translate them to Vietnamese.

        **ACCURACY & TEXT EXTRACTION (EXTREMELY CRITICAL):**
        - You MUST ensure the 'originalPhrase' field in 'mistakes' is a LITERALLY EXACT sequence of words found in the student's essay.
        - **DO NOT** misquote the student. **DO NOT** change their words, verb tenses, or punctuation when quoting.
        - If you cannot find the exact phrase in the provided manuscript, DO NOT list it as a mistake.
        - **IMPORTANT:** KHÔNG ĐƯỢC tách các chữ đuôi số nhiều "s", "es" sau danh từ để sửa lại. Luôn nhất quán nhất trong việc sửa lỗi chính tả, ngữ pháp, từ vựng.
        - Verify every single identified mistake against the actual manuscript text before outputting.

        **SCORING PHILOSOPHY & FLEXIBILITY (CRITICAL):**
        You should be fair and not overly punitive. Focus on whether the writing effectively communicates ideas and meets task goals, EXCEPT where the strict word count or Band 5 limitations are triggered.

        **SCORING RULES (STRICT):**
        - Chỉ chấm điểm CHẴN (số nguyên: 1, 2, 3, 4, 5, 6, 7, 8, 9...) cho 4 tiêu chí thành phần. KHÔNG chấm điểm lẻ như .5 cho từng tiêu chí này.

        ${isTask1 ? `
        **CRITICAL ASSESSMENT AND SCORING CRITERIA FOR TASK 1 (ACADEMIC):**
        1. **Task Achievement (TA)**:
           - **What to Assess**: Does it accurately summarise/describe the visual data or process? Is there a clear overview of main trends/comparisons? Are key features selected and supported with correct figures/data (not just narrating every number)?
           - **WORD COUNT LIMITATION**: If the essay is less than 150 words (current word count is ${wordCount} words), you MUST strictly limit the Task Achievement (TA) score to a **maximum of Band 5**.
           - **CRITERIA LIMITATION**: Even if the essay meets the word count, you MUST limit the Task Achievement (TA) score to a **maximum of Band 5** if it exhibits or fails to overcome any of the following:
             * Key features which are selected are not adequately covered.
             * The recounting of detail is mainly mechanical. There may be no data to support the description.
             * There may be a tendency to focus on details (without referring to the bigger picture).
             * The inclusion of irrelevant, inappropriate or inaccurate material in key areas detracts from the task achievement.
             * There is limited detail when extending and illustrating the main points.
           - **FLEXIBLE GRADING**: Otherwise, if the essay successfully avoids these negative features and answers the prompt with key features and correct data support, it can achieve Band 7.0 or above.

        2. **Coherence & Cohesion (CC)**:
           - **What to Assess**: Logical organisation, paragraphing, linking devices, referencing, overall progression.
           - Xem xét kỹ ý tưởng/ cách chia body trong task 1 để tối ưu hóa điểm CC. Đừng chỉ lặp từ mà trừ điểm; lặp từ được phép trong collocations hoặc cụm tự nhiên. Chỉ gợi ý nếu lặp từ quá nhiều (hơn 4 lần) gây mất mạch lạc.

        3. **Lexical Resource (LR)**:
           - **What to Assess**: Range and accuracy of vocabulary, especially data-description language (trends, comparisons, approximation). Spelling/word formation.
           - Ưu tiên từ vựng tự nhiên, hữu ích mức B2-C1. Không dùng từ quá khó hay gượng ép.

        4. **Grammatical Range & Accuracy (GRA)**:
           - **What to Assess**: Range of sentence structures, accuracy, punctuation.
           - Khuyến khích cấu trúc phức tạp như đảo ngữ, mệnh đề phân từ. Lỗi nhỏ không hệ thống vẫn được Band 7.0.
        ` : `
        **CRITICAL ASSESSMENT AND SCORING CRITERIA FOR TASK 2 (ESSAY):**
        1. **Task Response (TR)**:
           - **What to Assess**: Does it fully address all parts of the prompt? Is there a clear, well-developed position throughout? Are ideas relevant, extended, and supported with reasons/examples (not generic or repetitive)?
           - **WORD COUNT LIMITATION**: If the essay is less than 250 words (current word count is ${wordCount} words), you MUST strictly limit the Task Response (TR) score to a **maximum of Band 5**.
           - **CRITERIA LIMITATION**: Even if the essay meets the word count, you MUST limit the Task Response (TR) score to a **maximum of Band 5** if it exhibits or fails to overcome any of the following:
             * The main parts of the prompt are incompletely addressed. The format may be inappropriate in places.
             * The writer expresses a position, but the development is not always clear.
             * Some main ideas are put forward, but they are limited and are not sufficiently developed and/or there may be irrelevant detail.
             * There may be some repetition.
           - **FLEXIBLE GRADING**: Otherwise, if the essay is fully addressing all parts of the prompt with clear standpoint and examples, it can achieve Band 7.0 or above.

        2. **Coherence & Cohesion (CC)**:
           - **What to Assess**: Logical progression, effective paragraphing with one central idea each, cohesive devices used naturally (not mechanically inserted).
           - Gợi ý thay thế nếu có từ xuất hiện quá 4 lần không cần thiết.

        3. **Lexical Resource (LR)**:
           - **What to Assess**: Range, precision, and naturalness of vocabulary; collocation; spelling/word formation.
           - Gợi ý từ vựng tự nhiên B2-C1 phù hợp ngữ cảnh, tránh sáo rỗng hay quá cầu kỳ.

        4. **Grammatical Range & Accuracy (GRA)**:
           - **What to Assess**: Range and accuracy of grammar structures, punctuation control.
           - Đánh giá cao việc kết hợp cấu trúc đơn và phức tự nhiên.
        `}

        **Examiner's Marking Method:**
        - **Process:** Evaluate ${taskCriterion}, then CC, LR, and GRA.
        - **Academic Tone:** Formal, objective, yet constructive.

        **Output Requirements:**
        - **Mistakes:** Identify specific errors.
        - **Suggested Rewrites:** Rewrite sentences into clear academic English (NEVER in Vietnamese).
        `;

        const essayContent = `Analyze this essay:
        **Prompt:** "${prompt}"
        **Word Count:** ${wordCount}
        **Essay:**
        ---
        ${essay}
        ---
        `;
        
        const parts = [];
        if (isTask1 && imageBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            });
        }
        parts.push({ text: essayContent });
        const contents = { parts };
        
        const mistakeSchema = {
            type: Type.OBJECT,
            properties: {
                originalPhrase: { type: Type.STRING },
                suggestedCorrection: { type: Type.STRING },
                explanation: { type: Type.STRING }
            },
            required: ['originalPhrase', 'suggestedCorrection', 'explanation']
        };

        const apiCall = async () => {
            const response = await ai.models.generateContent({
                model: feedbackModel,
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            taskCompletion: { 
                                type: Type.OBJECT,
                                properties: { strengths: { type: Type.STRING }, weaknesses: { type: Type.STRING } },
                                required: ['strengths', 'weaknesses']
                            },
                            taskCompletionScore: { type: Type.INTEGER },
                            coherenceCohesion: {
                                type: Type.OBJECT,
                                properties: { 
                                    strengths: { type: Type.STRING }, 
                                    weaknesses: { type: Type.STRING },
                                    referencingAndSubstitution: { type: Type.STRING } 
                                },
                                required: ['strengths', 'weaknesses', 'referencingAndSubstitution']
                            },
                            coherenceCohesionScore: { type: Type.INTEGER },
                            lexicalResource: {
                                type: Type.OBJECT,
                                properties: { 
                                    strengths: { type: Type.STRING }, 
                                    weaknesses: { type: Type.STRING },
                                    mistakes: { type: Type.ARRAY, items: mistakeSchema }
                                },
                                required: ['strengths', 'weaknesses', 'mistakes']
                            },
                            lexicalResourceScore: { type: Type.INTEGER },
                            grammaticalRange: {
                                type: Type.OBJECT,
                                properties: { 
                                    strengths: { type: Type.STRING }, 
                                    weaknesses: { type: Type.STRING },
                                    mistakes: { type: Type.ARRAY, items: mistakeSchema }
                                },
                                required: ['strengths', 'weaknesses', 'mistakes']
                            },
                            grammaticalRangeScore: { type: Type.INTEGER },
                            sentenceImprovements: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        originalSentence: { type: Type.STRING },
                                        suggestedSentence: { type: Type.STRING }
                                    },
                                    required: ['originalSentence', 'suggestedSentence']
                                }
                            }
                        },
                        required: ['taskCompletion', 'taskCompletionScore', 'coherenceCohesion', 'coherenceCohesionScore', 'lexicalResource', 'lexicalResourceScore', 'grammaticalRange', 'grammaticalRangeScore', 'sentenceImprovements']
                    },
                },
            });

            return JSON.parse(response.text);
        };

        return await callWithRetry(apiCall);

    } catch (error) {
        handleApiError(error, 'get feedback from the AI');
    }
};

export const generateModelEssay = async (taskType, prompt, originalEssay, feedback, apiKey) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const apiCall = async () => {
            const systemInstruction = `You are an expert IELTS Writing instructor. 
            Your task is to rewrite the student's essay into a **Band 7.0 - 7.5** model essay in English.
            
            **CRITICAL RULES:**
            1. **Stick to the Student's Ideas:** Do NOT change the core arguments or ideas provided by the student. Just improve how they are expressed.
            2. **Target Band 7.0 - 7.5:** Use appropriate academic vocabulary (B2-C1 level) and a variety of sentence structures. Do NOT aim for Band 9.0 (avoid overly obscure words).
            3. **NO SPECIFIC STATISTICS:** For Task 2, NEVER use specific percentages or numbers in examples (e.g., do NOT say "70% of people"). Instead, use quantity phrases like "the majority of", "a significant proportion of", "a section of", or "many".
            4. **Everyday Examples:** Use relatable, everyday examples rather than overly scientific or technical ones.
            5. **Naturalness & Flow:** The essay must sound natural and flow logically.
            6. **Structure:** Ensure a clear 4-paragraph structure (Intro, Body 1, Body 2, Conclusion). Use exactly ONE blank line between each paragraph.
            7. **Language:** The output must be entirely in English.
            
            **INPUT PROVIDED:**
            - Task Type: ${taskType}
            - Prompt: ${prompt}
            - Original Essay: ${originalEssay}
            - Feedback Summary: ${JSON.stringify(feedback.taskCompletion)} ${JSON.stringify(feedback.coherenceCohesion)}
            `;

            const promptContent = `Based on the student's original essay and the feedback provided, rewrite the essay to reach a Band 7.0+ standard while keeping the same core ideas.`;

            const response = await ai.models.generateContent({
                model: brainstormingModel, // Use the faster model for this
                contents: { parts: [{ text: promptContent }] },
                config: {
                    systemInstruction,
                }
            });

            return response.text;
        };

        return await callWithRetry(apiCall);
    } catch (error) {
        handleApiError(error, 'generate model essay');
    }
};
