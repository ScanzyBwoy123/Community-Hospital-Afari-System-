"use strict";

/*
 * COMMUNITY HOSPITAL AFARI
 * AI ASSISTANT — GEMINI NETLIFY FUNCTION
 *
 * The Gemini API key is NEVER stored in this file.
 * It must be stored as a Netlify environment variable.
 */

exports.handler = async (event) => {
    // ---------------------------------------------------------
    // CORS
    // ---------------------------------------------------------

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // ---------------------------------------------------------
    // OPTIONS / PREFLIGHT
    // ---------------------------------------------------------

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }

    // ---------------------------------------------------------
    // ONLY POST REQUESTS
    // ---------------------------------------------------------

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Method not allowed."
            })
        };
    }

    // ---------------------------------------------------------
    // GEMINI API KEY
    // ---------------------------------------------------------

    const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error(
            "Gemini API key is not configured."
        );

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "AI service is not configured yet."
            })
        };
    }

    // ---------------------------------------------------------
    // READ REQUEST BODY
    // ---------------------------------------------------------

    let body;

    try {
        body = JSON.parse(
            event.body || "{}"
        );
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Invalid request."
            })
        };
    }

    const message =
        String(
            body.message || ""
        ).trim();

    // ---------------------------------------------------------
    // VALIDATE MESSAGE
    // ---------------------------------------------------------

    if (!message) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Please enter a question."
            })
        };
    }

    if (message.length > 4000) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Your question is too long."
            })
        };
    }

    // ---------------------------------------------------------
    // HOSPITAL AI INSTRUCTIONS
    // ---------------------------------------------------------

    const systemInstruction = `
You are the Community Hospital Afari AI Assistant.

Your role is to provide helpful, clear and safe
health-information support.

IMPORTANT SAFETY RULES:

1. You are an AI assistant, not a doctor or nurse.
2. Do not claim to have examined a patient.
3. Do not make a definitive diagnosis.
4. Do not prescribe medication or give individualized
   medication doses.
5. Do not replace a qualified healthcare professional.
6. For emergencies, advise the user to seek immediate
   emergency medical care.
7. Explain medical terminology in simple language.
8. Be concise but useful.
9. When appropriate, recommend speaking with a qualified
   healthcare professional.
10. Never invent patient records, laboratory results,
    appointments or clinical information.
11. Protect patient privacy. Do not request unnecessary
    personal identifying information.
12. If information is uncertain, clearly say so.

The hospital is Community Hospital Afari.

Answer the user's question directly and professionally.
`;

    // ---------------------------------------------------------
    // GEMINI REQUEST
    // ---------------------------------------------------------

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
                encodeURIComponent(apiKey),
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text:
                                    systemInstruction
                            }
                        ]
                    },

                    contents: [
                        {
                            role: "user",

                            parts: [
                                {
                                    text:
                                        message
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1000
                    }
                })
            }
        );

        const data =
            await response.json();

        // -----------------------------------------------------
        // GEMINI ERROR
        // -----------------------------------------------------

        if (!response.ok) {
            console.error(
                "Gemini API error:",
                data
            );

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    success: false,
                    error:
                        "The AI service could not process the request."
                })
            };
        }

        // -----------------------------------------------------
        // EXTRACT ANSWER
        // -----------------------------------------------------

        const answer =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

        if (!answer) {
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    success: false,
                    error:
                        "The AI returned an empty response."
                })
            };
        }

        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                answer
            })
        };

    } catch (error) {

        console.error(
            "AI Assistant error:",
            error
        );

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Unable to connect to the AI service."
            })
        };
    }
};
