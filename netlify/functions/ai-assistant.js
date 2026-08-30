"use strict";

// ============================================================
// COMMUNITY HOSPITAL AFARI
// CHA AI ASSISTANT — GEMINI
// ============================================================

exports.handler = async (event) => {

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }

    // --------------------------------------------------------
    // METHOD
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // GEMINI API KEY
    // --------------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing.");

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "GEMINI_API_KEY is not configured in Netlify."
            })
        };
    }

    // --------------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------------

    let body;

    try {
        body = JSON.parse(event.body || "{}");
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Invalid JSON request."
            })
        };
    }

    const message =
        String(body.message || "").trim();

    if (!message) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Please enter a question."
            })
        };
    }

    if (message.length > 4000) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Question is too long."
            })
        };
    }

    // --------------------------------------------------------
    // HOSPITAL AI INSTRUCTIONS
    // --------------------------------------------------------

    const systemInstruction = `
You are CHA AI Assistant for Community Hospital Afari.

You provide clear, helpful and safe general health information.

Important rules:

- You are an AI assistant, not a doctor.
- Do not claim that you examined a patient.
- Do not make definitive diagnoses.
- Do not prescribe medication.
- Do not provide individualized medication dosing.
- Explain medical terms in simple language.
- Encourage professional medical assessment when appropriate.
- If someone describes a possible emergency, advise them to seek
  urgent medical attention.
- Never invent patient records, laboratory results,
  appointments or hospital information.
- Protect patient privacy.
- Do not request unnecessary personal information.
- Be professional, concise and easy to understand.

Hospital:
Community Hospital Afari.
`;

    // --------------------------------------------------------
    // GEMINI API
    // --------------------------------------------------------

    const model = "gemini-3.7-flash";

    const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(apiKey);

    try {

        const response = await fetch(
            url,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
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
                                    text: message
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

        // ----------------------------------------------------
        // GEMINI ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            console.error(
                "Gemini API error:",
                JSON.stringify(data)
            );

            const apiError =
                data?.error?.message ||
                "Gemini rejected the request.";

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    success: false,
                    error:
                        "Gemini error: " +
                        apiError
                })
            };
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        const answer =
            data?.candidates?.[0]
                ?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

        if (!answer) {

            console.error(
                "Gemini returned no answer:",
                JSON.stringify(data)
            );

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    success: false,
                    error:
                        "Gemini returned an empty response."
                })
            };
        }

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                answer: answer
            })
        };

    } catch (error) {

        console.error(
            "CHA AI connection error:",
            error
        );

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Unable to connect to Gemini."
            })
        };
    }
};
