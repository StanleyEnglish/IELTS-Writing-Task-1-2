import type { Feedback, TaskType } from '../types';

/**
 * A helper function to make POST requests to our backend API.
 * @param action The specific function to call on the backend (e.g., 'generateGuidance').
 * @param payload The data to send to the backend.
 * @returns The JSON response from the backend.
 */
async function callWritingApi<T>(action: string, payload: unknown): Promise<T> {
    try {
        const response = await fetch('/api/writing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Use the error message from the backend if available, otherwise use a default.
            throw new Error(data.error || `API request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`Error in callWritingApi for action "${action}":`, error);
        // Re-throw a user-friendly error message for the UI to display.
        const message = error instanceof Error ? error.message : "An unknown network error occurred.";
        throw new Error(message);
    }
}

export const generateGuidance = async (taskType: TaskType, prompt: string, imageBase64?: string | null): Promise<string[]> => {
    const result = await callWritingApi<{ points: string[] }>('generateGuidance', { taskType, prompt, imageBase64 });
    if (result.points && result.points.length > 0) {
        return result.points;
    }
    throw new Error("AI did not return any guidance points.");
};

export const generateBrainstormingIdeas = async (prompt: string, questions: string[]): Promise<string[]> => {
    const result = await callWritingApi<{ ideas: string[] }>('generateBrainstormingIdeas', { prompt, questions });
    if (result.ideas && Array.isArray(result.ideas)) {
        return result.ideas;
    }
    throw new Error("AI did not return ideas in the expected format.");
};

export const getIeltsFeedback = async (taskType: TaskType, prompt: string, essay: string, imageBase64?: string | null): Promise<Feedback> => {
    return await callWritingApi<Feedback>('getIeltsFeedback', { taskType, prompt, essay, imageBase64 });
};
