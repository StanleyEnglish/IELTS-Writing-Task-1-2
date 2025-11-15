import { GoogleGenAI, Type } from "@google/genai";
import { IELTS_TASK_1_BAND_DESCRIPTORS, IELTS_TASK_2_BAND_DESCRIPTORS } from '../constants';
import type { Feedback, Guidance, TaskType } from '../types';

// Define basic types for Vercel's request and response objects
interface VercelRequest {
    method?: string;
    body: {
        type: 'guidance' | 'brainstorming' | 'feedback';
        payload: any;
    };
}

interface VercelResponse {
    status: (code: number) => {
        json: (data: any) => void;
    };
}

// This is the main serverless function that will be executed by Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set on the server.");
        return res.status(500).json({ error: "Server configuration error: API key is missing." });
    }

    try {
        const ai = new GoogleGenAI({ 'AIzaSyAFZD1KgvX-jO9wIwNTNIGUaDfSQLpS0DQ' });
        const brainstormingModel = 'gemini-2.5-flash';
        const feedbackModel = 'gemini-2.5-pro';

        const { type, payload } = req.body;

        switch (type) {
            case 'guidance': {
                const { taskType, prompt, imageBase64 } = payload as { taskType: TaskType; prompt: string; imageBase64?: string | null };
                
                const isTask1 = taskType === 'Task 1';
                const systemInstruction = isTask1 
                    ? "You are an expert IELTS writing instructor. Your task is to help a student identify the key features for an IELTS Writing Task 1 essay."
                    : "You are an expert IELTS writing instructor. Your task is to help a student brainstorm for an IELTS Writing Task 2 essay.";
                
                const promptText = isTask1
                    ? `Analyze the following IELTS Writing Task 1 prompt and the provided image. Identify and list 3-4 key features, main trends, or significant points the student should focus on in their summary. Present them as a simple list.`
                    : `Generate two simple, open-ended brainstorming questions in **Vietnamese** for the following IELTS essay prompt. The questions should guide the student in structuring their essay.`;

                const fullContent = `${promptText}\n\nEssay Prompt: "${prompt}"`;
                
                const parts: any[] = [{ text: fullContent }];
                if (isTask1 && imageBase64) {
                    parts.unshift({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: imageBase64,
                        },
                    });
                }
                
                const response = await ai.models.generateContent({
                  model: brainstormingModel,
                  contents: { parts },
                  config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            points: {
                                type: Type.ARRAY,
                                description: isTask1 ? "An array of 3-4 key features to report on." : "An array of two brainstorming questions in Vietnamese.",
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['points']
                    },
                  },
                });

                return res.status(200).json(JSON.parse(response.text));
            }

            case 'brainstorming': {
                const { prompt, questions } = payload as { prompt: string; questions: string[] };

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
                
                return res.status(200).json(JSON.parse(response.text));
            }

            case 'feedback': {
                const { taskType, prompt, essay, imageBase64 } = payload as { taskType: TaskType; prompt: string; essay: string; imageBase64?: string | null };

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
                
                const parts: any[] = [{ text: essayContent }];
                if (isTask1 && imageBase64) {
                    parts.unshift({
                        inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
                    });
                }
                
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
                    contents: { parts },
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

                return res.status(200).json(JSON.parse(response.text));
            }

            default:
                // This is a type guard, `type` will be `never` here if all cases are handled.
                const exhaustiveCheck: never = type;
                return res.status(400).json({ error: `Invalid API route type: ${exhaustiveCheck}` });
        }
    } catch (error) {
        console.error('Error in API handler (api/writing.ts):', error);
        res.status(500).json({ error: 'An internal error occurred while contacting the AI service.' });
    }
}
