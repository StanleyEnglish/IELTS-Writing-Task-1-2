
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS, IELTS_TASK_1_EXEMPLARS, IELTS_TASK_2_EXEMPLARS, IELTS_TASK_2_BAND_6_7_EXEMPLARS } from '../constants';

const brainstormingModel = 'gemini-3-flash-preview';
const feedbackModel = 'gemini-3-flash-preview';

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

    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
        throw new Error("Your API key is not valid. Please check it and try again.");
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

export const generateGuidance = async (taskType, prompt, imageBase64, apiKey) => {
  if (!apiKey) throw new Error("API key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const apiCall = async () => {
        if (taskType === 'Task 1') {
            const systemInstruction = "You are an expert IELTS writing instructor. Your task is to provide a structured guide in Vietnamese for an IELTS Writing Task 1 essay based on the user's prompt and image. The guide must follow a specific four-part structure: Introduction, Overall, Body 1, and Body 2. **CRITICAL:** Ensure the division of information between Body 1 and Body 2 is highly logical to maximize Coherence & Cohesion.";
            const promptText = `Analyze the following IELTS Writing Task 1 prompt and the provided image. Based on your analysis, generate a structured guide in Vietnamese that a student can follow to write their essay. The output must be a JSON object with the following structure:

1.  **introduction**: A string suggestion on how to paraphrase the prompt for the introduction.
2.  **overall**: An array of strings, where each string is a bullet point identifying a main trend or key feature for the 'Overall' paragraph. This should be 2-3 points.
3.  **body1**: An array of strings, where each string is a bullet point suggesting what information to group and describe in the first body paragraph. **Logic:** Group related data points together.
4.  **body2**: An array of strings, where each string is a bullet point suggesting what information to group and describe in the second body paragraph. **Logic:** Group the remaining data points logically.

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
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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


export const generateBrainstormingIdeas = async (prompt, questions, apiKey) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const apiCall = async () => {
            const contents = `Based on the essay prompt and the provided brainstorming questions, create a comprehensive, structured essay outline in Vietnamese.
                
                Essay Prompt: "${prompt}"

                Brainstorming Questions:
                ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

                The output MUST be an array of exactly 4 strings, representing the 4 main sections of the essay.
                
                **CRITICAL INSTRUCTION FOR CONTENT STRATEGY (40/60 RULE):**
                - You MUST adopt a **clear standpoint**. Do not sit on the fence (50/50).
                - Use a **40/60 structure**:
                  - **Body 1 (40%)**: Discuss the opposing view, the weaker argument, or the concession.
                  - **Body 2 (60%)**: Discuss the writer's opinion, the stronger argument, or the main solution.

                **CRITICAL INSTRUCTION FOR IDEA GENERATION (SIMPLE & MEMORABLE):**
                - **Logic & Flow:** Ensure the logical progression of ideas within and between paragraphs to maximize Coherence & Cohesion (CC).
                - **Simplicity**: Ideas must be straightforward and easy to explain in English. Avoid overly complex or abstract philosophical arguments.
                - **Memorability**: Use common, relatable concepts (e.g., family, money, health, convenience, work, education) that students can easily recall.
                - **Friendly Tone**: The ideas should feel natural and not forced.
                - **Standard IELTS Themes**: Prioritize high-frequency arguments (e.g., "saves money", "better for health", "broadens horizons", "causes stress").

                **CRITICAL INSTRUCTION FOR BODY PARAGRAPHS (IDEAS & EXAMPLES):**
                - **Giải thích (Explanation)**: 
                  - Suggest **2 simple and comprehensible supporting ideas** for the topic sentence.
                  - Use logical flow/arrows (e.g., "Idea -> Result").
                  - Ideas should be simple enough to be translated easily.
                  - Example style: "Idea 1 -> Consequence 1. Idea 2 -> Consequence 2."
                - **Ví dụ (Example)**: 
                  - Provide **ONE simple, real-life example**. 
                  - Show the consequence clearly.
                  - Example style: "Specific scenario -> specific outcome."

                **CRITICAL INSTRUCTION FOR CONCISENESS & EFFICIENCY (Target: ~280 words, 35 mins):**
                - **Goal**: Enable the student to write a ~280 word essay in 35 minutes.
                - **Câu chủ đề (Topic Sentences)**: MUST be concise, short, and direct. Avoid wordiness.
                - **Conciseness**: Keep the outline clear and actionable.

                **CRITICAL INSTRUCTION FOR INTRODUCTION:**
                - **Diễn giải đề**: Paraphrase simple & concise. No clichés.
                - **Luận điểm**: Direct standpoint.

                **CRITICAL INSTRUCTION FOR CONCLUSION:**
                - **Tóm tắt ý chính và quan điểm**: Concise summary & direct opinion. Keep it simple.

                **CRITICAL INSTRUCTION FOR VOCABULARY:**
                - For **ALL SECTIONS**: Insert natural, topic-specific, B2 - C1 level English collocations directly next to the relevant Vietnamese concepts, enclosed in square brackets [ ].
                - **Criteria**: Vocabulary must be **common, natural, and practical** (not obscure, complex, or overly academic). Focus on topic-specific language.

                **STRUCTURE & LABELS (STRICT FORMATTING):**
                - You MUST use the following **VIETNAMESE LABELS** in **Bold** (Markdown style).
                - **CRITICAL FORMATTING**: Do NOT write a paragraph. Each label (e.g., **Diễn giải đề**:, **Câu chủ đề**:) must be on its own **SEPARATE LINE** starting with a bullet point (-).
                - **IMPORTANT**: The main section headers (**Mở bài**, **Thân bài 1**, **Thân bài 2**, **Kết bài**) must NOT have any hyphens, dashes, or numbers in front of them. Just the bold text.

                Structure the response exactly as follows (ENSURE EACH BULLET POINT IS ON A NEW LINE):

                **Mở bài**:
                - **Diễn giải đề**: [Vietnamese suggestion] [vocabulary]
                - **Luận điểm**: [Vietnamese suggestion] [vocabulary]

                **Thân bài 1**:
                - **Câu chủ đề**: Một mặt, [Concise Topic Sentence] [vocabulary]
                - **Giải thích**: [2 simple ideas with logical flow (->)] [vocabulary]
                - **Ví dụ**: [ONE short example with consequence (->)] [vocabulary]
                - **Kết quả/ liên kết**: [Link] [vocabulary]

                **Thân bài 2**:
                - **Câu chủ đề**: Mặt khác, [Concise Topic Sentence] [vocabulary]
                - **Giải thích**: [2 simple ideas with logical flow (->)] [vocabulary]
                - **Ví dụ**: [ONE short example with consequence (->)] [vocabulary]
                - **Kết quả/ liên kết**: [Link] [vocabulary]

                **Kết bài**:
                - **Tóm tắt ý chính và quan điểm**: [Concise summary & opinion] [vocabulary]

                Language: Vietnamese for the outline content. English for the specific Vocabulary items inside square brackets [ ].`;

            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction: "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline. Use **Bold** for the specific VIETNAMESE headers and labels provided in the prompt. Do NOT merge points into paragraphs; keep each label on a new line starting with a bullet point. For main headers (Mở bài, etc.), do not use dashes or numbers. For 'Giải thích', provide 2 simple ideas using logical flow (A -> B). For 'Ví dụ', provide 1 short example with consequence. Ensure 40/60 balance. Start Body 1 topic sentence with 'Một mặt,'. Start Body 2 topic sentence with 'Mặt khác,'. Insert English vocabulary suggestions directly into the text using square brackets [ ].",
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
            Context: IELTS Writing Task 2 Brainstorming.
            Selected Text: "${textToAnalyze}"

            Provide exactly ONE suggestion in JSON format:
            {
              "english": "The complete suggested sentence or phrase.",
              "tone": "e.g., Natural & Academic",
              "explanation": "Brief reason for this phrasing."
            }
            `;

            const contents = { parts: [{ text: promptContent }] };
            
            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
        You should be fair and not overly punitive. Focus on whether the writing effectively communicates ideas and meets task goals.

        **SCORING RULES (STRICT):**
        - Chỉ chấm điểm CHẴN (số nguyên: 6, 7, 8, 9...) cho 4 tiêu chí thành phần. KHÔNG chấm điểm lẻ như .5 cho từng tiêu chí này.

        1. **${taskCriterion} (FLEXIBLE GRADING):**
           - Nếu bài viết có thể trả lời được yêu cầu đề bài, có phát triển ý và có ví dụ minh hoạ thì tiêu chí này đã có thể đạt ít nhất **Band 7.0**.
           - Do not be overly critical of minor omissions if the core argument is well-sustained.

        2. **Coherence & Cohesion (CC):**
           - **CRITICAL:** Xem xét kỹ ý tưởng/ cách chia body trong task 1 và logic bài viết trong task 2 để tối ưu hóa điểm CC.
           - Đừng chỉ chăm chăm trừ điểm lặp từ. Lặp từ được cho phép trong IELTS miễn là các từ lặp đi theo các cụm collocations hay idiomatic language.
           - Chỉ chỉ gợi ý nếu như có lặp từ quá nhiều gây ảnh hưởng mạch lạc.
           - Nếu một cụm từ xuất hiện quá 4 lần một cách không cần thiết, hãy nhận xét trong 'referencingAndSubstitution' và gợi ý 2-3 từ đồng nghĩa phù hợp.
           - Reward the flexible use of referencing, substitution, and cohesive devices.

        3. **Lexical Resource (B2-C1 LEVEL & NATURALNESS):**
           - Ưu tiên sử dụng các mẫu câu và từ vựng ở mức level B2 - C1, và theo chủ đề.
           - KHÔNG dùng từ khó, phức tạp hay thiếu tự nhiên.
           - Chấm thoáng hơn. Ở Band 7.0, khi dùng được vài cụm idiomatic language (kể cả đơn giản) thì cũng đã đạt được điểm số này. 
           - Một số lỗi nhỏ được chấp nhận, không tính là lỗi hệ thống (systematic errors).
           - Nếu bài viết không sai sót nhiều, dùng được collocations và idiomatic language chính xác thì có thể chấm **Band 8.0 trở lên**.

        4. **Grammatical Range & Accuracy (ERROR TOLERANCE):**
           - Một số lỗi ngữ pháp cơ bản với tần suất thấp (1-2 lần) không phải lỗi hệ thống thì vẫn có thể được **Band 7.0**.
           - Khuyến khích và cộng điểm cho các cấu trúc khó như đảo ngữ, mệnh đề phân từ, câu phức.

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
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                }
            });

            return response.text;
        };

        return await callWithRetry(apiCall);
    } catch (error) {
        handleApiError(error, 'generate model essay');
    }
};
