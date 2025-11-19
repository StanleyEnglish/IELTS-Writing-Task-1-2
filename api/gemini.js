
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

// Helper function to retry API calls on 503/500 errors
const callWithRetry = async (apiCallFn, retries = 3, initialDelay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCallFn();
        } catch (error) {
            const isServerError = error.message.includes('503') || error.message.includes('500');
            const isLastAttempt = i === retries - 1;

            if (isServerError && !isLastAttempt) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = initialDelay * Math.pow(2, i);
                console.warn(`API Error (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
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
                
                **CRITICAL INSTRUCTION FOR CONTENT STRATEGY & OPINION:**
                - **Address Two Parts**: Ensure Body 1 and Body 2 address distinct aspects or sides of the prompt (e.g., View 1 vs View 2, Reason 1 vs Reason 2, Pros vs Cons).
                - **Explicit Opinion**: The outline MUST clearly show the writer's stance (agree/disagree, positive/negative, etc.).
                  - **Luận điểm (Thesis)**: Must clearly state the position.
                  - **Khẳng định quan điểm (Conclusion)**: Must reaffirm this position decisively.

                **CRITICAL INSTRUCTION FOR INTRODUCTION:**
                - **Diễn giải đề (Paraphrase)**: The suggestion MUST completely rephrase the prompt using synonyms and different grammatical structures. **Do NOT simply copy or translate the prompt word-for-word.**
                - **Luận điểm (Thesis Statement)**: Keep it simple, clear, concise, and not too long. Avoid overly complicated sentence structures.

                **CRITICAL INSTRUCTION FOR CONCLUSION:**
                - **Tóm tắt ý chính**: Briefly summarize the main arguments from Body 1 and Body 2.
                - **Khẳng định quan điểm**: Clearly restate the writer's opinion or answer the specific question (e.g., explicitly state "This is a positive development").
                - **DO NOT** provide a generic "Final Thought", "Prediction", or "Lời kết" unless it directly answers the prompt. Keep it concise.
                - Avoid overly long or complicated sentences.

                **CRITICAL INSTRUCTION FOR VOCABULARY:**
                - For **ALL SECTIONS (Introduction, Body Paragraphs, Conclusion)**: Insert natural, topic-specific, Band 7+ English collocations or phrases directly next to the relevant Vietnamese concepts, enclosed in square brackets.
                - **Criteria**: Vocabulary must be **natural, appropriate, clear, and practical**. Avoid overly fancy or obscure words. Focus on collocations that boost Lexical Resource (LR).
                - Example format: "Người dân ngày càng phụ thuộc vào công nghệ [increasingly rely on technology] để làm việc..."

                **STRUCTURE & LABELS:**
                You MUST use the following **VIETNAMESE LABELS** in **Bold** (Markdown style).

                Structure the response exactly as follows:

                1. **Mở bài**:
                - **Diễn giải đề**: [Vietnamese suggestion for paraphrasing] [vocabulary]
                - **Luận điểm**: [Vietnamese suggestion for position] [vocabulary]

                2. **Thân bài 1**:
                - **Câu chủ đề**: [State the main idea] [vocabulary]
                - **Giải thích**: [Explain the idea in detail] [vocabulary]
                - **Ví dụ**: [Provide a specific, realistic example. e.g. "Ví dụ..."] [vocabulary]
                - **Kết quả/Liên kết**: [Conclude or link to next point] [vocabulary]

                3. **Thân bài 2**:
                - **Câu chủ đề**: [State the main idea] [vocabulary]
                - **Giải thích**: [Explain the idea in detail] [vocabulary]
                - **Ví dụ**: [Provide a specific, realistic example] [vocabulary]
                - **Kết quả/Liên kết**: [Conclude or link] [vocabulary]

                4. **Kết bài**:
                - **Tóm tắt ý chính**: [Summarize main points from Body 1 & 2] [vocabulary]
                - **Khẳng định quan điểm**: [Directly answer the question/Restate opinion] [vocabulary]

                Language: Vietnamese for the outline content. English for the specific Vocabulary items inside square brackets [ ].`;

            const response = await ai.models.generateContent({
                model: brainstormingModel,
                contents,
                config: {
                    systemInstruction: "You are an expert IELTS writing instructor. Provide a structured, bulleted essay outline. Use **Bold** for the specific VIETNAMESE headers and labels provided in the prompt. Ensure the outline addresses two parts of the problem/topic and explicitly states an opinion (Agree/Disagree, etc.) in the Introduction and Conclusion. Ensure Introduction Paraphrase is distinct from the prompt. Keep Introduction and Conclusion suggestions simple, concise and clear. Insert English vocabulary suggestions directly into the text using square brackets [ ] for ALL sections. For Vocabulary, strictly prioritize naturalness, appropriateness, and clarity (Band 7+ style).",
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


export const getIeltsFeedback = async (taskType, prompt, essay, imageBase64, apiKey) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const isTask1 = taskType === 'Task 1';
        const bandDescriptors = isTask1 ? IELTS_TASK_1_BAND_DESCRIPTORS : IELTS_TASK_2_BAND_DESCRIPTORS;
        const taskCompletionCriterion = isTask1 ? "Task Achievement" : "Task Response";
        const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
        const exemplars = isTask1 ? `
**Band 9.0 Exemplars for Task 1:**
To calibrate your evaluation, here are several examples of Band 9.0 responses for different Task 1 types. Use these as a reference for excellent structure, vocabulary, and task achievement.
---
${IELTS_TASK_1_EXEMPLARS}
---
` : `
**Band 6.0 vs 7.0 Calibration:**
Study these examples to distinguish between Band 6 and Band 7 performance, paying close attention to the examiner's commentary on mistakes vs strengths.
${IELTS_TASK_2_BAND_6_7_EXEMPLARS}
---
**High-Scoring Exemplars for Task 2:**
To calibrate your evaluation, here are several examples of high-scoring responses for different Task 2 types. Use these as a reference for excellent structure, vocabulary, argumentation, and task response.
---
${IELTS_TASK_2_EXEMPLARS}
---
`;

        const systemInstruction = `You are an expert IELTS examiner providing feedback on an IELTS Writing ${taskType} essay. Your evaluation MUST be consistent, rigorous, and meticulously precise.

        **Examiner's Marking Method:**
        You MUST follow this exact marking method to ensure accuracy:
        - Read the task carefully and identify the requirements of the task (Task 1) or different parts of the prompt (Task 2).
        - Start with ${taskCompletionCriterion} and then move to Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. For each criterion, read the first statement that most closely matches the features of the script.
        - Focus on the more detailed features of performance at that band and assess if these features match the script. Check that the script contains all of the positive features presented at that band.
        - Check the descriptors below to ensure that the script does not contain negative features that would prevent a higher band, for example, inadequate paragraphing. Check the descriptors above to check that your rating is accurate.
        
        **Academic Tone Requirement:**
        - Writing must remain formal, objective, non-emotional, and consistent.
        - Penalize the use of slang, contractions (e.g., "don't", "can't"), conversational expressions, exaggeration, or idioms.
        - Do NOT reward overly ornate, archaic, or forced academic language ("purple prose").
        - Band 8-9 requires a tone that is clear, natural, and precise.
        
        **Guiding Principles for High Band Scoring (Band 8-9):**
        1. **Tolerance for Slips:** Band 9 is NOT perfection. It allows for "extremely rare lapses" or "minor errors" (slips). Do NOT reduce scores for minor, acceptable errors that do not impede communication.
        2. **Vocabulary Assessment:** Do NOT judge based on the "fanciness" or rarity of words. Band 8-9 requires precision, naturalness, and sophisticated control, not obscure vocabulary. High-level clarity is paramount.
        3. **No Comparison:** Evaluate ONLY against the provided band descriptors. Do not compare the essay to others.
        4. **Descriptor Citation:** When explaining the score in 'strengths' or 'weaknesses', you MUST cite specific phrases from the provided Band Descriptors to justify your assessment (e.g., "presents a fully developed position", "uses cohesion naturally", "uses a wide range of structures with full flexibility").

        **Critical Scoring Rules & Penalties:**
        1. **Word Count Assessment:** 
           - Task 1 target: 150 words. Task 2 target: 250 words.
           - **Nuanced Penalty:** Do NOT automatically cap or severely downgrade the score just because an essay is slightly under length.
           - **Quality Over Quantity:** If an essay is short (e.g., Task 2 is 230-240 words) but fully developed, concise, and high-quality, penalize minimally (if at all).
           - **Significant Under-length:** Only apply severe penalties if the short length results in undeveloped ideas or insufficient content (e.g., Task 2 < 200 words).
        2. **Missing Key Features (Task 1):** If all key features aren't presented, Task Achievement is limited to Band 4.
        3. **Inappropriate Format:** Bullet points, numbered lists, or headings result in Band 4 or 5 for TA/TR. Essays must be in paragraphs.
        4. **No Overview (Task 1):** If there is no overview, or it is unclear, Task Achievement is limited to Band 5. An overview is required for Band 6+.
        5. **Insufficient Data (Task 1):** If there is no data to support the description, Task Achievement is limited to Band 5.

        **Your Task:**
        1.  **Evaluate Rigorously:** Evaluate the essay against the provided official IELTS Band Descriptors for Bands 5, 6, 7, 8, and 9, strictly following the marking methodology above.
        2.  **Ensure Consistency:** Your evaluation must be rigorously consistent. When evaluating the same essay text multiple times, the scores for unchanged criteria must remain identical. Base your scores SOLELY on the provided band descriptors and the strict logic. Do not introduce variability.
        3.  **Use Image for Task 1:** For Task 1, if an image is provided, your evaluation of ${taskCompletionCriterion} MUST consider how accurately the student described the data in the image.
        4.  **Evaluate Task 2 Examples:** For Task 2, you MUST critically evaluate the supporting examples. Using fabricated statistics with specific numbers (e.g., "A recent study shows 80%...") is a significant weakness for Band 7+ and should be penalized under 'Task Response'. Praise and reward the use of real-world or personal experience-based examples (e.g., "In my country..." or "For example, in Sydney...").
        5.  **Assign Scores:** Assign an integer score (5-9) for each of the four criteria.
        6.  **Strengths & Weaknesses:** For each criterion, provide specific "Strengths" and "Weaknesses". You **MUST** quote specific phrases from the official band descriptors in your response to support your rating (e.g., "uses cohesion naturally").
        7.  **Coherence & Cohesion Details:** For "Coherence & Cohesion", provide a dedicated analysis of the student's use of referencing (e.g., pronouns) and substitution (e.g., synonyms).
        8.  **List All Mistakes (LR & GRA):** For "Lexical Resource" and "Grammatical Range & Accuracy", you MUST identify specific mistakes.
            - **CRITICAL PRECISION:** When providing a 'suggestedCorrection', it MUST be meaningfully different from the 'originalPhrase'. Do not suggest a correction that is identical to the original text. Quote the original phrase EXACTLY as it appears.
            - For each mistake, provide the original incorrect phrase, a corrected version, and a brief explanation. If there are no mistakes, return an empty array.
        9.  **Improve All Awkward Sentences:** Provide a list of 'Sentence Improvement' suggestions for ALL sentences from the essay that are grammatically correct but sound unnatural or awkward.
            - **COMPREHENSIVE LIST:** This list must be exhaustive. Do not omit any sentences that require improvement to meet a 7.0+ standard.
            - Provide the full original sentence and a rewritten, more natural-sounding version.
            
        **Evaluation Criteria:**
        ---
        ${bandDescriptors}
        ---
        ${exemplars}
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
