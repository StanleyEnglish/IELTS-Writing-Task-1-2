
import { GoogleGenAI, Type } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS, IELTS_TASK_1_EXEMPLARS, IELTS_TASK_2_EXEMPLARS, IELTS_TASK_2_BAND_6_7_EXEMPLARS } from '../constants';

const brainstormingModel = 'gemini-2.5-flash';
const feedbackModel = 'gemini-2.5-flash';

const handleApiError = (error, context) => {
    console.error(`Error during ${context}:`, error);
    
    let errorMessage = 'An unknown error occurred';
    
    // Attempt to extract the actual error message from various structures
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
        // Handle raw JSON error objects like { error: { code: 429, message: ... } }
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

    // specific checks
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
        throw new Error("Your API key is not valid. Please check it and try again.");
    }
    
    // Explicitly handle Quota/Rate Limit errors (429)
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

// Helper to retry API calls on 503/500 errors
const callWithRetry = async (apiCallFn, retries = 5, initialDelay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCallFn();
        } catch (error) {
            // Re-use logic to detect status code if possible, otherwise rely on message
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isServerError = errorMessage.includes('503') || errorMessage.includes('500');
            const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
            const isLastAttempt = i === retries - 1;

            // Do NOT retry on quota errors (429), only temporary server errors (5xx)
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
                  - **Body 2 (60%)**: Discuss the writer's opinion, the stronger argument, or the main solution.

                **CRITICAL INSTRUCTION FOR BODY PARAGRAPHS (IDEAS & EXAMPLES):**
                - **Giải thích (Explanation)**: 
                  - Suggest **2 simple and comprehensible supporting ideas** for the topic sentence.
                  - Use logical flow/arrows (e.g., "Idea -> Result" or "Because A -> B").
                  - Ideas should be developed enough to be natural and persuasive, not just keywords.
                  - Example style: "Idea 1 -> Consequence 1. Idea 2 -> Consequence 2."
                - **Ví dụ (Example)**: 
                  - Provide **ONE short, specific example**. 
                  - Show the consequence clearly using arrow notation if helpful.
                  - Example style: "Specific scenario -> specific outcome."

                **CRITICAL INSTRUCTION FOR CONCISENESS & EFFICIENCY (Target: ~280 words, 35 mins):**
                - **Goal**: Enable the student to write a ~280 word essay in 35 minutes.
                - **Câu chủ đề (Topic Sentences)**: MUST be concise, short, and direct. Avoid wordiness.
                - **Conciseness**: Keep the outline clear and actionable.

                **CRITICAL INSTRUCTION FOR TASK RESPONSE (Band 8+ Criteria):**
                - **Sufficiently Addressed**: Ensure ALL parts of the prompt are covered in depth.
                - **Well-Developed Position**: The opinion must be clear and consistent.
                - **Relevant & Extended Ideas**: Arguments must be directly relevant.

                **CRITICAL INSTRUCTION FOR INTRODUCTION:**
                - **Diễn giải đề**: Paraphrase simple & concise. No clichés.
                - **Luận điểm**: Direct standpoint.

                **CRITICAL INSTRUCTION FOR CONCLUSION:**
                - **Tóm tắt ý chính và quan điểm**: Concise summary & direct opinion. Keep it simple.

                **CRITICAL INSTRUCTION FOR VOCABULARY:**
                - For **ALL SECTIONS**: Insert natural, topic-specific, Band 7+ English collocations directly next to the relevant Vietnamese concepts, enclosed in square brackets [ ].
                - **Criteria**: Vocabulary must be **natural, appropriate, clear, and practical**.

                **STRUCTURE & LABELS (STRICT FORMATTING):**
                - You MUST use the following **VIETNAMESE LABELS** in **Bold** (Markdown style).
                - **CRITICAL FORMATTING**: Do NOT write a paragraph. Each label (e.g., **Diễn giải đề**:, **Câu chủ đề**:) must be on its own **SEPARATE LINE** starting with a bullet point (-).
                - **IMPORTANT**: The main section headers (**Mở bài**, **Thân bài 1**, **Thân bài 2**, **Kết bài**) must NOT have any hyphens, dashes, or numbers in front of them. Just the bold text.

                Structure the response exactly as follows:

                **Mở bài**:
                - **Diễn giải đề**: [Vietnamese suggestion] [vocabulary]
                - **Luận điểm**: [Vietnamese suggestion] [vocabulary]

                **Thân bài 1**:
                - **Câu chủ đề**: [Concise Topic Sentence] [vocabulary]
                - **Giải thích**: [2 simple ideas with logical flow (->)] [vocabulary]
                - **Ví dụ**: [ONE short example with consequence (->)] [vocabulary]
                - **Kết quả/ liên kết**: [Link] [vocabulary]

                **Thân bài 2**:
                - **Câu chủ đề**: [Concise Topic Sentence] [vocabulary]
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
                    systemInstruction: "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline. Use **Bold** for the specific VIETNAMESE headers and labels provided in the prompt. Do NOT merge points into paragraphs; keep each label on a new line starting with a bullet point. For main headers (Mở bài, etc.), do not use dashes or numbers. For 'Giải thích', provide 2 simple ideas using logical flow (A -> B). For 'Ví dụ', provide 1 short example with consequence. Ensure 40/60 balance. Insert English vocabulary suggestions directly into the text using square brackets [ ].",
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
1. **Simplicity & Authenticity:** You MUST suggest **simple, clear, and high-frequency academic vocabulary**.
2. **Avoid Obscurity:** Do NOT use complex, archaic, or overly "fancy" words.
3. **Naturalness:** Prioritize natural collocations used by native speakers over "big words".
4. **Logic:** The suggestion must be appropriate for the context.

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
        
        // OPTIMIZATION: Reduced exemplar count from 3 to 1 to significantly save tokens and speed up processing
        let exemplarsSection = "";
        if (isTask1) {
            const subset = getRandomExemplars(IELTS_TASK_1_EXEMPLARS, 1);
            exemplarsSection = `
**Band 9.0 Exemplar (Reference):**
${subset}
`;
        } else {
            const subset = getRandomExemplars(IELTS_TASK_2_EXEMPLARS, 1);
            exemplarsSection = `
**Band 6.0 vs 7.0 Calibration:**
${IELTS_TASK_2_BAND_6_7_EXEMPLARS}
---
**High-Scoring Exemplar (Reference):**
${subset}
`;
        }

        const systemInstruction = `You are a STRICT and RIGOROUS IELTS examiner providing feedback on an IELTS Writing ${taskType} essay.

        **LANGUAGE INSTRUCTION (CRITICAL):**
        - **PRIMARY LANGUAGE:** VIETNAMESE. You must provide all explanations, analysis (strengths, weaknesses), and feedback in **Vietnamese**.
        - **EXCEPTION:** You must keep all quoted phrases from the student's essay, specific vocabulary terms, and suggested English corrections/examples in **ENGLISH**. Do not translate the specific English examples or essay quotes.

        **Examiner's Marking Method (STRICT ADHERENCE REQUIRED):**
        - **RIGOROUS GRADING:** Do not inflate scores. Be harsh on unnatural phrasing, awkward collocations, and grammatical slips.
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
        5. **Task Response Logic & Examples (CRITICAL):** 
           - If you identify **logical fallacies**, **undeveloped ideas**, or **fabricated examples**:
           - You **MUST** provide a specific **"Corrected Example"** or **"Logical Fix"** in the 'weaknesses' section.
           - Do not just criticize; show the user exactly **HOW** to fix the logic or example to be Band 7+.

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
            strengths: { type: Type.STRING, description: "Positive feedback on the criterion in VIETNAMESE, citing specific band descriptor phrases." },
            weaknesses: { type: Type.STRING, description: "Actionable areas for improvement on the criterion in VIETNAMESE, citing specific band descriptor phrases." }
        };

        const mistakeSchema = {
            type: Type.OBJECT,
            properties: {
                originalPhrase: { type: Type.STRING, description: "The incorrect phrase from the essay (in English)." },
                suggestedCorrection: { type: Type.STRING, description: "The corrected version of the phrase (in English)." },
                explanation: { type: Type.STRING, description: "A brief explanation of the mistake in VIETNAMESE." }
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
                                properties: {
                                    strengths: { type: Type.STRING, description: "Positive feedback on the criterion in VIETNAMESE, citing specific band descriptor phrases." },
                                    weaknesses: { type: Type.STRING, description: "Actionable areas for improvement in VIETNAMESE. **IMPORTANT**: For Task Response/Achievement, if there are logical/example issues, you MUST provide a concrete 'Suggested Improvement' here." }
                                },
                                required: ['strengths', 'weaknesses']
                            },
                            taskCompletionScore: { type: Type.INTEGER, description: `An integer band score from 5-9 for ${taskCompletionCriterion}.` },
                            coherenceCohesion: {
                                type: Type.OBJECT,
                                properties: {
                                    ...baseFeedbackProperties,
                                    referencingAndSubstitution: { type: Type.STRING, description: "Specific feedback on referencing and substitution in VIETNAMESE." }
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
                                        originalSentence: { type: Type.STRING, description: "The original sentence from the user's essay (English)." },
                                        suggestedSentence: { type: Type.STRING, description: "The rewritten, more natural-sounding sentence (English)." }
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
