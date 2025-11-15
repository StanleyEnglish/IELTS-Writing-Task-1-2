import type { Feedback, TaskType } from '../types';

/**
 * A helper function to handle the response from the backend API.
 * It checks for errors and parses the JSON response.
 * @param response The Fetch API response object.
 * @returns The JSON data from the response.
 * @throws An error if the response is not successful.
 */
async function handleApiResponse(response: Response) {
    if (!response.ok) {
        // Try to parse the error message from the response body, otherwise use a generic message.
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Fetches guidance points (key features for Task 1, brainstorming questions for Task 2)
 * from the backend API.
 */
export const generateGuidance = async (taskType: TaskType, prompt: string, imageBase64?: string | null): Promise<string[]> => {
    try {
        const response = await fetch('/api/writing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'guidance',
                payload: { taskType, prompt, imageBase64 }
            })
        });
        const data = await handleApiResponse(response);
        if (data.points && data.points.length > 0) {
            return data.points;
        }
        throw new Error("AI did not return any guidance points.");
    } catch (error) {
        console.error("Error generating guidance:", error);
        // Re-throw the error to be caught by the UI component.
        throw new Error(error instanceof Error ? error.message : "The AI failed to generate guidance. Please try again.");
    }
};

/**
 * Fetches brainstorming ideas for a Task 2 essay from the backend API.
 */
export const generateBrainstormingIdeas = async (prompt: string, questions: string[]): Promise<string[]> => {
    try {
        const response = await fetch('/api/writing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'brainstorming',
                payload: { prompt, questions }
            })
        });
        const data = await handleApiResponse(response);
        if (data.ideas && Array.isArray(data.ideas)) {
            return data.ideas;
        }
        throw new Error("AI did not return ideas in the expected format.");
    } catch (error) {
        console.error("Error generating brainstorming ideas:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to generate ideas. Please try again.");
    }
};

/**
 * Fetches detailed feedback for an IELTS essay from the backend API.
 */
export const getIeltsFeedback = async (taskType: TaskType, prompt: string, essay: string, imageBase64?: string | null): Promise<Feedback> => {
    try {
        const response = await fetch('/api/writing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'feedback',
                payload: { taskType, prompt, essay, imageBase64 }
            })
        });
        const data = await handleApiResponse(response);
        return data as Feedback;
    } catch (error) {
        console.error("Error getting IELTS feedback:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to get feedback from the AI. Please try again.");
    }
};
