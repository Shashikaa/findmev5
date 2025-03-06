import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your actual Gemini API key from environment variables.
const GEMINI_API_KEY = 'AIzaSyAPcw8yWV8bNLRHyk0mTHXpQ5N6b6oNdd4';

if (!GEMINI_API_KEY) {
    console.error("Gemini API key not found in environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

//  Use "gemini-1.5-pro-latest" or "gemini-pro-vision" (if image is mandatory)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

export const sendMessageToGemini = async (message, imageUri) => {
    try {
        // If there's an image, use the vision model and prepare the image
        if (imageUri) {
            const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

            // Convert image URI to blob
            const imageResponse = await fetch(imageUri);
            const blob = await imageResponse.blob();

            // Convert blob to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result.split(',')[1]);
                        } else {
                            reject(new Error('Failed to convert blob to base64'));
                        }
                    } else {
                        reject(new Error('Failed to convert blob to base64'));
                    }
                };
                reader.readAsDataURL(blob);
            });

            // Create parts array with text and image
            const parts = [
                { text: message },
                { inlineData: { data: base64, mimeType: "image/jpeg" } }
            ];

            const result = await visionModel.generateContent({ contents: [{ parts }] });
            const response = await result.response;
            return response.text();
        } else {
            // Text-only query
            const result = await model.generateContent(message);
            const response = await result.response;
            return response.text();
        }
    } catch (error) {
        console.error('Error communicating with Gemini API:', error);
        return 'Sorry, something went wrong! Please try again.';
    }
};;

function reject(arg0: Error) {
    throw new Error("Function not implemented.");
}
