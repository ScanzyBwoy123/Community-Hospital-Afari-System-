"use strict";
// ============================================================
// COMMUNITY HOSPITAL AFARI
// CHA AI ASSISTANT — GEMINI
//
// Optimized for:
// - Faster responses
// - Reliable JSON responses
// - One quick retry for temporary errors
// - Gemini 3.7 Flash low thinking
//
// IMPORTANT:
// GEMINI_API_KEY must ONLY exist in Netlify environment variables.
// Never place the API key in frontend JavaScript.
// ============================================================
exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };
    // ========================================================
    // CORS
    // ========================================================
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: ""
        };
    }
    // ========================================================
    // ONLY POST
    // ========================================================
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
    // ========================================================
    // API KEY
    // ========================================================
    const apiKey =
        process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error(
            "CHA AI: GEMINI_API_KEY is missing."
        );
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "The AI service is not configured."
            })
        };
    }
    // ========================================================
    // REQUEST BODY
    // ========================================================
    let body;
    try {
        body =
            JSON.parse(
                event.body || "{}"
            );
    } catch (error) {
        console.error(
            "CHA AI: Invalid request JSON.",
            error
        );
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Invalid request data."
            })
        };
    }
    const message =
        String(
            body.message || ""
        ).trim();
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
    // ========================================================
    // SYSTEM INSTRUCTION
    // ========================================================
    const systemInstruction = `
You are CHA AI Assistant for Community Hospital Afari.
You provide clear, helpful and safe general health information.
IMPORTANT RULES:
- You are an AI assistant, not a doctor.
- Do not claim to have examined a patient.
- Do not make definitive diagnoses.
- Do not prescribe medication.
- Do not provide individualized medication dosing.
- Explain medical terms in simple language.
- Encourage professional medical assessment when appropriate.
- If someone describes a possible emergency, advise them to seek urgent medical attention immediately.
- Never invent patient records, laboratory results, appointments or hospital information.
- Protect patient privacy.
- Do not request unnecessary personal information.
- Be professional, concise and easy to understand.
============================================================
COMMUNITY HOSPITAL AFARI CONTACT INFORMATION
============================================================
Hospital:
Community Hospital Afari
Email:
info@afaricommunityhospital.gh
General hospital phone:
+233 24 412 3456
Emergency phone:
+233 20 567 8901
Location:
Afari Off Nkawie Road,
Greater Kumasi,
Ashanti Region,
Ghana.
============================================================
CONTACT RECOMMENDATIONS
============================================================
If a user asks how to contact Community Hospital Afari,
provide the hospital's general phone number and email.
If a user asks for the hospital email, provide:
info@afaricommunityhospital.gh
If a user asks for the hospital phone number, provide:
+233 24 412 3456
If a user asks how to book an appointment, tell them they
can use the hospital appointment system or contact the
hospital directly.
If the user's question is related to hospital services,
referrals, follow-up care, visiting the hospital, directions,
or getting further assistance, recommend contacting the
hospital when appropriate.
For emergencies, advise the user to seek urgent medical
attention immediately and provide:
Emergency:
+233 20 567 8901
Do not invent, modify or guess the hospital contact details.
Do not unnecessarily repeat the contact information for
unrelated questions.
`;
    // ========================================================
    // GEMINI REQUEST
    // ========================================================
    async function callGemini() {
        const model =
            "gemini-3.7-flash";
        const url =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(apiKey);
        return fetch(
            url,
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
                        maxOutputTokens:
                            1000,
                        thinkingConfig: {
                            thinkingLevel:
                                "low"
                        }
                    }
                })
            }
        );
    }
    // ========================================================
    // READ GEMINI RESPONSE SAFELY
    // ========================================================
    async function readGeminiResponse(
        response
    ) {
        const rawText =
            await response.text();
        if (!rawText) {
            return {
                data: null,
                rawText: ""
            };
        }
        try {
            return {
                data:
                    JSON.parse(rawText),
                rawText:
                    rawText
            };
        } catch (error) {
            console.error(
                "CHA AI: Gemini returned invalid JSON.",
                rawText.substring(
                    0,
                    1000
                )
            );
            return {
                data: null,
                rawText:
                    rawText
            };
        }
    }
    // ========================================================
    // EXTRACT ANSWER
    // ========================================================
    function extractAnswer(data) {
        const candidates =
            Array.isArray(
                data?.candidates
            )
                ? data.candidates
                : [];
        const texts = [];
        candidates.forEach(
            function(candidate) {
                const parts =
                    Array.isArray(
                        candidate?.content?.parts
                    )
                        ? candidate.content.parts
                        : [];
                parts.forEach(
                    function(part) {
                        if (
                            typeof part?.text ===
                            "string"
                        ) {
                            const text =
                                part.text.trim();
                            if (text) {
                                texts.push(
                                    text
                                );
                            }
                        }
                    }
                );
            }
        );
        return texts
            .join("\n")
            .trim();
    }
    // ========================================================
    // WAIT
    // ========================================================
    function sleep(ms) {
        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }
    // ========================================================
    // MAIN AI REQUEST
    // ========================================================
    try {
        // -----------------------------------------------------
        // FIRST REQUEST
        // -----------------------------------------------------
        let response =
            await callGemini();
        let parsed =
            await readGeminiResponse(
                response
            );
        // -----------------------------------------------------
        // ONE QUICK RETRY
        // -----------------------------------------------------
        if (
            !response.ok &&
            (
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504
            )
        ) {
            console.warn(
                "CHA AI: Temporary Gemini error. Performing one retry."
            );
            await sleep(800);
            response =
                await callGemini();
            parsed =
                await readGeminiResponse(
                    response
                );
        }
        // -----------------------------------------------------
        // GEMINI ERROR
        // -----------------------------------------------------
        if (!response.ok) {
            const geminiError =
                parsed?.data?.error?.message ||
                "Unknown Gemini error.";
            console.error(
                "CHA AI Gemini error:",
                {
                    status:
                        response.status,
                    message:
                        geminiError
                }
            );
            let userMessage =
                "The AI service is temporarily unavailable. Please try again shortly.";
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                userMessage =
                    "The AI service authentication needs attention. Please contact the hospital administrator.";
            }
            else if (
                response.status === 429
            ) {
                userMessage =
                    "The AI service is currently busy. Please wait a moment and try again.";
            }
            else if (
                response.status >= 400 &&
                response.status < 500
            ) {
                userMessage =
                    "The AI service could not process that request. Please try again.";
            }
            return {
                statusCode:
                    response.status >= 400 &&
                    response.status < 600
                        ? response.status
                        : 502,
                headers,
                body:
                    JSON.stringify({
                        success: false,
                        error:
                            userMessage
                    })
            };
        }
        // -----------------------------------------------------
        // EXTRACT ANSWER
        // -----------------------------------------------------
        const answer =
            extractAnswer(
                parsed.data
            );
        // -----------------------------------------------------
        // SAFETY BLOCK
        // -----------------------------------------------------
        if (!answer) {
            const blockReason =
                parsed?.data
                    ?.promptFeedback
                    ?.blockReason;
            console.error(
                "CHA AI: No usable answer.",
                {
                    blockReason:
                        blockReason || null,
                    response:
                        parsed?.data || null
                }
            );
            if (blockReason) {
                return {
                    statusCode: 200,
                    headers,
                    body:
                        JSON.stringify({
                            success: true,
                            answer:
                                "I’m unable to provide a response to that request. Please ask a different health-related question."
                        })
                };
            }
            return {
                statusCode: 502,
                headers,
                body:
                    JSON.stringify({
                        success: false,
                        error:
                            "The AI returned an empty response. Please try again."
                    })
            };
        }
        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------
        return {
            statusCode: 200,
            headers,
            body:
                JSON.stringify({
                    success: true,
                    answer:
                        answer
                })
        };
    }
    // ========================================================
    // FATAL ERROR
    // ========================================================
    catch (error) {
        console.error(
            "CHA AI fatal error:",
            error
        );
        return {
            statusCode: 500,
            headers,
            body:
                JSON.stringify({
                    success: false,
                    error:
                        "Unable to connect to the AI service. Please try again."
                })
        };
    }
};
