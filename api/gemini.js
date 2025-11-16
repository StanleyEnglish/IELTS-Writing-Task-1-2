


import { GoogleGenAI, Type } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const brainstormingModel = 'gemini-2.5-flash';
const feedbackModel = 'gemini-2.5-pro';

export const generateGuidance = async (taskType, prompt, imageBase64) => {
  try {
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
        const parsed = JSON.parse(jsonText);
        return parsed;
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

  } catch (error) {
    console.error("Error generating guidance:", error);
    throw new Error("The AI failed to generate guidance. This might be a temporary issue. Please try again.");
  }
};


export const generateBrainstormingIdeas = async (prompt, questions) => {
    try {
        const response = await ai.models.generateContent({
            model: brainstormingModel,
            contents: `Based on the essay prompt and the provided brainstorming questions, generate 2-3 short, bullet-pointed ideas for EACH question. The ideas should be simple, distinct, and directly answer the questions. Present them as a single list.

            Essay Prompt: "${prompt}"

            Brainstorming Questions:
            ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
            `,
            config: {
                systemInstruction: "You are an expert IELTS writing instructor. Your task is to provide brainstorming ideas for a student's Writing Task 2 essay.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ideas: {
                            type: Type.ARRAY,
                            description: "An array of bullet-pointed ideas, starting with '-'.",
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
    } catch (error) {
        console.error("Error generating brainstorming ideas:", error);
        throw new Error("Failed to generate ideas. This could be a temporary issue, please try again.");
    }
};


export const getIeltsFeedback = async (taskType, prompt, essay, imageBase64) => {
    try {
        const isTask1 = taskType === 'Task 1';
        const bandDescriptors = isTask1 ? IELTS_TASK_1_BAND_DESCRIPTORS : IELTS_TASK_2_BAND_DESCRIPTORS;
        const taskCompletionCriterion = isTask1 ? "Task Achievement" : "Task Response";

        const systemInstruction = `You are an expert IELTS examiner providing feedback on an IELTS Writing ${taskType} essay for a student aiming for a 7.0-7.5 band score. Your evaluation MUST be consistent, rigorous, and meticulously precise.

        **Your Task:**
        1.  **Evaluate Rigorously:** Evaluate the essay against the provided official IELTS Band Descriptors for Bands 6, 7, and 8.
        2.  **Ensure Consistency:** Your evaluation must be rigorously consistent. When evaluating the same essay text multiple times, the scores for unchanged criteria must remain identical. Base your scores SOLELY on the provided band descriptors and the strict logic. Do not introduce variability.
        3.  **Use Image for Task 1:** For Task 1, if an image is provided, your evaluation of ${taskCompletionCriterion} MUST consider how accurately the student described the data in the image.
        4.  **Strict Scoring Logic:** Follow a strict, top-down scoring logic: A criterion's score is capped at the band level where a weakness described in a lower band is present.
        5.  **Assign Scores:** Assign an integer score (5-9) for each of the four criteria.
        6.  **Strengths & Weaknesses:** For each criterion, provide specific "Strengths" and "Weaknesses", referencing the band descriptors.
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
        `;

        const essayContent = `Please analyze the following essay based on the instructions.

        **Essay Prompt:** "${prompt}"
        
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
            strengths: { type: Type.STRING, description: "Positive feedback on the criterion." },
            weaknesses: { type: Type.STRING, description: "Actionable areas for improvement on the criterion." }
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
                             required: ['strengths', 'weaknesses']
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
                            required: ['strengths', 'weaknesses']
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
                             required: ['strengths', 'weaknesses']
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
        const parsed = JSON.parse(jsonText);
        return parsed;

    } catch (error) {
        console.error("Error getting IELTS feedback:", error);
        throw new Error("Failed to get feedback from the AI. This may be a temporary issue. Please try again.");
    }
};