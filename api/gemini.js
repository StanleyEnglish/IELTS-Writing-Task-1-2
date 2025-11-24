
import { GoogleGenAI, Type } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS, IELTS_TASK_1_EXEMPLARS, IELTS_TASK_2_EXEMPLARS, IELTS_TASK_2_BAND_6_7_EXEMPLARS } from '../constants';

const brainstormingModel = 'gemini-2.5-flash';
const feedbackModel = 'gemini-2.5-flash';

const handleApiError = (error, context) => {
    console.error(`Error during ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error("Your API key is not valid. Please check it and try again.");
        }
        if (error.message.toLowerCase().includes('quota')) {
            throw new Error("You have likely exceeded your API key's usage quota. Please check your account on Google AI Studio.");
        }
        if (error.message.includes('schema')) {
            throw new Error("The AI had trouble formatting its response. This is often a temporary issue. Please try submitting again.");
        }
        if (error.message.includes('[400]')) {
            throw new Error("The request to the AI was invalid, which could be due to the prompt's content. Please try modifying your essay or prompt.");
        }
        if (error.message.includes('503') || error.message.includes('500')) {
            throw new Error("The AI service is currently unavailable or experiencing high traffic. Please wait a few moments and try again.");
        }
        if (error.message.toLowerCase().includes('safety')) {
            throw new Error("The response was blocked due to safety concerns. Please modify your prompt or essay content.");
        }
    }
    throw new Error(`Failed to ${context}. This may be a temporary issue with the AI service. If the problem persists, please check your API key.`);
};

// Helper to retry API calls on 503/500 errors
const callWithRetry = async (apiCallFn, retries = 5, initialDelay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCallFn();
        } catch (error) {
            const isServerError = error.message.includes('503') || error.message.includes('500');
            const isLastAttempt = i === retries - 1;

            if (isServerError && !isLastAttempt) {
                const delay = initialDelay * Math.pow(2, i);
                console.warn(`API Error (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

// Helper to get random subset of exemplars
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
            const systemInstruction = "You are an expert IELTS writing instructor. Your task is to provide a structured guide in Vietnamese for an IELTS Writing Task 1 essay based on the user's prompt and image. The guide must follow a specific four-part structure: Introduction, Overall, Body 1, and Body 2.";
            const promptText = `Analyze the following IELTS Writing Task 1 prompt and the provided image. Based on your analysis, generate a structured guide in Vietnamese that a student can follow to write their essay. The output must be a JSON object with the following structure:

1.  **introduction**: A string suggestion on how to paraphrase the prompt for the introduction.
2.  **overall**: An array of strings, where each string is a bullet point identifying a main trend or key feature for the 'Overall' paragraph. This should be 2-3 points.
3.  **body1**: An array of strings, where each string is a bullet point suggesting what information to group and describe in the first body paragraph.
4.  **body2**: An array of strings, where each string is a bullet point suggesting what information to group and describe in the second body paragraph.

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

        // Task 2 Logic
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
                    - **IMPORTANT**: Even though this is the concession paragraph, the **Explanation** and **Example** MUST be **fully developed, natural, and coherent**. Avoid brief or choppy sentences. Write them as if they are part of a high-scoring essay to ensure natural flow.
                  - **Body 2 (60%)**: Discuss the writer's opinion, the stronger argument, or the main solution. This paragraph should be slightly more developed to emphasize the standpoint.

                **CRITICAL INSTRUCTION FOR CONCISENESS & EFFICIENCY (Target: ~280 words, 35 mins):**
                - **Goal**: Enable the student to write a ~280 word essay in 35 minutes.
                - **Câu chủ đề (Topic Sentences)**: MUST be concise, short, and direct. Avoid wordiness or overly complex structures.
                - **Ví dụ (Examples)**: Provide EXACTLY ONE specific, realistic example per explanation. DO NOT list multiple examples.

                **CRITICAL INSTRUCTION FOR TASK RESPONSE (Band 8+ Criteria):**
                - **Sufficiently Addressed**: Ensure ALL parts of the prompt are covered in depth.
                - **Well-Developed Position**: The opinion must be clear, well-developed, and consistent from the Introduction to the Conclusion.
                - **Relevant & Extended Ideas**: Arguments must be directly relevant to the prompt. Explanations must be logical, fully extended, and supported. Avoid vague generalizations.
                - **Consistency**: Ensure the flow of ideas is logical and consistent throughout the outline.

                **CRITICAL INSTRUCTION FOR INTRODUCTION:**
                - **Diễn giải đề**: Paraphrase the prompt simply, concisely, and directly. **Avoid clichés** (e.g., "In this day and age", "It is undeniable that"). Use direct, natural academic language.
                - **Luận điểm**: State the standpoint straight away. Be direct. Keep it short and simple.

                **CRITICAL INSTRUCTION FOR CONCLUSION:**
                - **Tóm tắt ý chính và quan điểm**: 
                  - Concise summary of main points.
                  - Direct answer to the question/restate opinion.
                  - **Keep it simple**. Do not give too much information.

                **CRITICAL INSTRUCTION FOR VOCABULARY:**
                - For **ALL SECTIONS**: Insert natural, topic-specific, Band 7+ English collocations directly next to the relevant Vietnamese concepts, enclosed in square brackets [ ].
                - **Criteria**: Vocabulary must be **natural, appropriate, clear, and practical**. Avoid overly fancy or obscure words. Focus on collocations that boost Lexical Resource (LR).

                **STRUCTURE & LABELS:**
                You MUST use the following **VIETNAMESE LABELS** in **Bold** (Markdown style).

                Structure the response exactly as follows:

                1. **Mở bài**:
                - **Diễn giải đề**: [Vietnamese suggestion] [vocabulary]
                - **Luận điểm**: [Vietnamese suggestion] [vocabulary]

                2. **Thân bài 1**:
                - **Câu chủ đề**: [State main idea - CONCISE] [vocabulary]
                - **Giải thích**: [Explain] [vocabulary]
                - **Ví dụ**: [ONE specific example] [vocabulary]
                - **Kết quả/ liên kết**: [Link] [vocabulary]

                3. **Thân bài 2**:
                - **Câu chủ đề**: [State main idea - CONCISE] [vocabulary]
                - **Giải thích**: [Explain] [vocabulary]
                - **Ví dụ**: [ONE specific example] [vocabulary]
                - **Kết quả/ liên kết**: [Link] [vocabulary]

                4. **Kết bài**:
                - **Tóm tắt ý chính và quan điểm**: [Concise summary & opinion] [vocabulary]

                Language: Vietnamese for the outline content. English for the specific Vocabulary items inside square brackets [ ].`;

            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction: "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline. Use **Bold** for the specific VIETNAMESE headers and labels provided in the prompt. Ensure the outline follows a 40/60 structure to show a clear standpoint. Ensure Body 1 Explanations and Examples are FULLY DEVELOPED and NATURAL, not choppy. Ensure Topic Sentences are CONCISE and Examples are limited to ONE per point. Ensure Introduction Paraphrase is simple, concise, and cliché-free. Insert English vocabulary suggestions directly into the text using square brackets [ ] for ALL sections.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            ideas: {
                                type: Type.ARRAY,
                                description: "An array of 4 strings representing the 4 sections of the essay outline, formatted with Markdown bolding, bullet points, and inline vocabulary in brackets.",
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
            const systemInstruction = `You are a helpful IELTS Writing tutor. The user has selected a portion of text (a word, phrase, or sentence) from their essay outline.

**YOUR TASK:**
Suggest the best way to write or use this selected text in a Band 7+ IELTS essay (Formal & Academic).

**CRITICAL RULES:**
1. **Input Analysis:** 
   - If Input is a **Word/Collocation**: Provide a complete, natural sentence demonstrating its usage.
   - If Input is a **Sentence/Idea**: Translate/Refine it into a single, strong academic English sentence.
2. **Mandatory Vocabulary Usage:** 
   - If the input text contains specific English vocabulary suggestions (e.g. inside brackets [ ]), you **MUST** use that exact vocabulary in your suggestion.
3. **Style:** Direct, Formal, Clear. Avoid clichés and overly flowery language.
4. **Quantity:** Provide EXACTLY ONE best suggestion.`;
            
            const promptContent = `
            Context: IELTS Writing Task 2 Brainstorming.
            Selected Text: "${textToAnalyze}"

            Provide exactly ONE suggestion in JSON format:
            {
              "english": "The complete suggested sentence or phrase.",
              "tone": "e.g., Formal & Direct",
              "explanation": "Brief reason for this phrasing or how to use the word."
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
        const bandDescriptors = isTask1 ? IELTS_TASK_1_BAND_DESCRIPTORS : IELTS_TASK_2_BAND_DESCRIPTORS;
        const taskCompletionCriterion = isTask1 ? "Task Achievement" : "Task Response";
        const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
        
        let exemplarsSection = "";
        if (isTask1) {
            const subset = getRandomExemplars(IELTS_TASK_1_EXEMPLARS, 3);
            exemplarsSection = `
**Band 9.0 Exemplars for Task 1 (Reference):**
Use these Band 9.0 examples to calibrate your scoring for structure and task achievement.
---
${subset}
---
`;
        } else {
            const subset = getRandomExemplars(IELTS_TASK_2_EXEMPLARS, 3);
            exemplarsSection = `
**Band 6.0 vs 7.0 Calibration (CRITICAL):**
Study these examples to distinguish between Band 6 and Band 7 performance.
${IELTS_TASK_2_BAND_6_7_EXEMPLARS}
---
**High-Scoring Exemplars for Task 2 (Reference):**
Use these high-scoring examples to calibrate your evaluation.
---
${subset}
---
`;
        }

        const systemInstruction = `You are an expert IELTS examiner providing feedback on an IELTS Writing ${taskType} essay.

        **Examiner's Marking Method (Strict Adherence Required):**
        - **Process:** Start with ${taskCompletionCriterion}, then Coherence & Cohesion (CC), Lexical Resource (LR), and Grammatical Range (GRA).
        - **Matching:** For each criterion, find the band descriptor statement that best matches the essay features. Check positive features of that band and ensure no negative features from lower bands are present.
        
        **Academic Tone:**
        - Formal, objective, non-emotional. No slang/contractions.
        - Band 8-9: Natural, precise, clear. NOT overly ornate/fancy.
        
        **Band 8-9 Principles:**
        - **Slips:** Band 9 allows for "extremely rare" minor errors. Do NOT penalize slips that don't impede communication.
        - **Vocabulary:** Focus on precision and naturalness, NOT rarity.
        - **No Comparison:** Grade strictly against descriptors, not other essays.
        - **Justify:** YOU MUST QUOTE SPECIFIC DESCRIPTOR PHRASES to justify scores in 'strengths'/'weaknesses'.

        **Critical Scoring Rules:**
        1. **Word Count:** Task 1 target: 150. Task 2 target: 250. 
           - **Do NOT severely penalize** slight under-length if quality/development is high. Only penalize significant under-length that affects content.
        2. **Task 1:** Missing key features = Band 4 TA. No/unclear overview = Band 5 TA. No data = Band 5 TA.
        3. **Format:** Bullet points/lists = Band 4/5. Must be paragraphs.
        4. **Task 2 Evidence:** Fabricated statistics (e.g. "80% of people...") are a weakness. Reward real-world examples/experience.

        **Output Requirements:**
        1. Evaluate against Band 5-9 descriptors.
        2. **Consistency:** Scores for identical text must be identical.
        3. **Mistakes:** List specific LR/GRA errors. Suggested correction must differ from original.
        4. **Improvement:** Rewrite ALL awkward/unnatural sentences.
        
        **Evaluation Criteria:**
        ---
        ${bandDescriptors}
        ---
        ${exemplarsSection}
        `;

        const essayContent = `Please analyze the following essay based on the instructions.

        **Essay Prompt:** "${prompt}"
        **Word Count:** ${wordCount} words
        
        **Student's Essay:**
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
        
        const baseFeedbackProperties = {
            strengths: { type: Type.STRING, description: "Positive feedback on the criterion, citing specific band descriptor phrases." },
            weaknesses: { type: Type.STRING, description: "Actionable areas for improvement on the criterion, citing specific band descriptor phrases." }
        };

        const mistakeSchema = {
            type: Type.OBJECT,
            properties: {
                originalPhrase: { type: Type.STRING, description: "The incorrect phrase from the essay." },
                suggestedCorrection: { type: Type.STRING, description: "The corrected version of the phrase." },
                explanation: { type: Type.STRING, description: "A brief explanation of the mistake." }
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
                                properties: baseFeedbackProperties,
                                required: ['strengths', 'weaknesses']
                            },
                            taskCompletionScore: { type: Type.INTEGER, description: `An integer band score from 5-9 for ${taskCompletionCriterion}.` },
                            coherenceCohesion: {
                                type: Type.OBJECT,
                                properties: {
                                    ...baseFeedbackProperties,
                                    referencingAndSubstitution: { type: Type.STRING, description: "Specific feedback on referencing and substitution." }
                                },
                                required: ['strengths', 'weaknesses', 'referencingAndSubstitution']
                            },
                            coherenceCohesionScore: { type: Type.INTEGER, description: "An integer band score from 5-9 for Coherence & Cohesion." },
                            lexicalResource: {
                                type: Type.OBJECT,
                                properties: {
                                    ...baseFeedbackProperties,
                                    mistakes: {
                                        type: Type.ARRAY,
                                        description: "List of specific lexical mistakes and corrections. Returns empty array if none.",
                                        items: mistakeSchema
                                    }
                                },
                                required: ['strengths', 'weaknesses', 'mistakes']
                            },
                            lexicalResourceScore: { type: Type.INTEGER, description: "An integer band score from 5-9 for Lexical Resource." },
                            grammaticalRange: {
                                type: Type.OBJECT,
                                properties: {
                                    ...baseFeedbackProperties,
                                    mistakes: {
                                        type: Type.ARRAY,
                                        description: "List of specific grammatical mistakes and corrections. Returns empty array if none.",
                                        items: mistakeSchema
                                    }
                                },
                                required: ['strengths', 'weaknesses', 'mistakes']
                            },
                            grammaticalRangeScore: { type: Type.INTEGER, description: "An integer band score from 5-9 for Grammatical Range & Accuracy." },
                            sentenceImprovements: {
                                type: Type.ARRAY,
                                description: "A list of suggestions for ALL sentences that are awkward or unnatural.",
                                items: {
                                    type: Type.OBJECT,
                                        properties: {
                                        originalSentence: { type: Type.STRING, description: "The original sentence from the user's essay." },
                                        suggestedSentence: { type: Type.STRING, description: "The rewritten, more natural-sounding sentence." }
                                    },
                                    required: ['originalSentence', 'suggestedSentence']
                                }
                            }
                        },
                        required: ['taskCompletion', 'taskCompletionScore', 'coherenceCohesion', 'coherenceCohesionScore', 'lexicalResource', 'lexicalResourceScore', 'grammaticalRange', 'grammaticalRangeScore', 'sentenceImprovements']
                    },
                },
            });

            const jsonText = response.text;
            return JSON.parse(jsonText);
        };

        return await callWithRetry(apiCall);

    } catch (error) {
        handleApiError(error, 'get feedback from the AI');
    }
};
