"use strict";
// ============================================================
// COMMUNITY HOSPITAL AFARI
// CHA AI ASSISTANT — GEMINI
//
// Secure Netlify Function
//
// IMPORTANT:
// GEMINI_API_KEY must ONLY exist in Netlify environment variables.
// Never place the API key in frontend JavaScript.
// ============================================================
exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
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
    }
    catch (error) {
        console.error(
            "CHA AI invalid request JSON:",
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
    // SAFE JSON RESPONSE READER
    // ========================================================
    async function readResponse(response) {
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
                rawText
            };
        }
        catch (error) {
            console.error(
                "CHA AI: Gemini returned non-JSON response:",
                rawText.substring(0, 1000)
            );
            return {
                data: null,
                rawText
            };
        }
    }
    // ========================================================
    // GEMINI REQUEST
    // ========================================================
    async function callGemini(model) {
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
                    // IMPORTANT:
                    // Gemini 3.7 Flash does not use
                    // the old temperature parameter.
                    generationConfig: {
                        maxOutputTokens:
                            1000
                    }
                })
            }
        );
    }
    // ========================================================
    // SLEEP
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
    // TRY GEMINI MODEL
    // ========================================================
    async function tryModel(
        model,
        attempts = 3
    ) {
        let lastResult = null;
        for (
            let attempt = 1;
            attempt <= attempts;
            attempt++
        ) {
            try {
                console.log(
                    `CHA AI: ${model} attempt ${attempt}/${attempts}`
                );
                const response =
                    await callGemini(
                        model
                    );
                const parsed =
                    await readResponse(
                        response
                    );
                const data =
                    parsed.data;
                lastResult = {
                    ok:
                        response.ok,
                    status:
                        response.status,
                    data:
                        data,
                    rawText:
                        parsed.rawText
                };
                // =================================================
                // SUCCESS
                // =================================================
                if (response.ok) {
                    return lastResult;
                }
                // =================================================
                // TEMPORARY ERRORS
                // =================================================
                if (
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504
                ) {
                    console.warn(
                        `CHA AI temporary Gemini error: ${response.status}`
                    );
                    if (
                        attempt < attempts
                    ) {
                        const delay =
                            1500 *
                            Math.pow(
                                2,
                                attempt - 1
                            );
                        await sleep(
                            delay
                        );
                        continue;
                    }
                }
                // =================================================
                // PERMANENT ERROR
                // =================================================
                return lastResult;
            }
            catch (error) {
                console.error(
                    `CHA AI ${model} request error:`,
                    error
                );
                lastResult = {
                    ok: false,
                    status: 500,
                    data: {
                        error: {
                            message:
                                error.message ||
                                "Unknown Gemini request error."
                        }
                    },
                    rawText: ""
                };
                if (
                    attempt < attempts
                ) {
                    const delay =
                        1500 *
                        Math.pow(
                            2,
                            attempt - 1
                        );
                    await sleep(
                        delay
                    );
                    continue;
                }
            }
        }
        return (
            lastResult || {
                ok: false,
                status: 503,
                data: {
                    error: {
                        message:
                            "Gemini service is temporarily unavailable."
                    }
                },
                rawText: ""
            }
        );
    }
    // ========================================================
    // EXTRACT GEMINI ANSWER
    // ========================================================
    function extractAnswer(data) {
        // ------------------------------------------------------
        // Normal generateContent response
        // ------------------------------------------------------
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
        const answer =
            texts.join("\n").trim();
        if (answer) {
            return answer;
        }
        return "";
    }
    // ========================================================
    // MAIN GEMINI LOGIC
    // ========================================================
    try {
        // -----------------------------------------------------
        // PRIMARY MODEL
        // -----------------------------------------------------
        let result =
            await tryModel(
                "gemini-3.7-flash",
                3
            );
        // -----------------------------------------------------
        // FALLBACK MODEL
        // -----------------------------------------------------
        if (!result.ok) {
            console.warn(
                "CHA AI: Primary model failed. Trying fallback model."
            );
            result =
                await tryModel(
                    "gemini-3.1-flash-lite",
                    2
                );
        }
        // -----------------------------------------------------
        // BOTH MODELS FAILED
        // -----------------------------------------------------
        if (!result.ok) {
            const geminiMessage =
                result?.data?.error?.message ||
                "Unknown Gemini error.";
            console.error(
                "CHA AI Gemini final error:",
                {
                    status:
                        result?.status,
                    message:
                        geminiMessage,
                    response:
                        result?.data ||
                        result?.rawText ||
                        null
                }
            );
            let userMessage =
                "The AI service is temporarily unavailable. Please try again in a moment.";
            // More useful messages for common errors.
            if (
                result?.status === 401 ||
                result?.status === 403
            ) {
                userMessage =
                    "The AI service authentication needs attention. Please contact the hospital administrator.";
            }
            else if (
                result?.status === 429
            ) {
                userMessage =
                    "The AI service is temporarily busy. Please try again shortly.";
            }
            else if (
                result?.status >= 400 &&
                result?.status < 500
            ) {
                userMessage =
                    "The AI service could not process that request. Please try again.";
            }
            return {
                statusCode:
                    result?.status >= 400 &&
                    result?.status < 600
                        ? result.status
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
                result.data
            );
        // -----------------------------------------------------
        // EMPTY RESPONSE / SAFETY BLOCK
        // -----------------------------------------------------
        if (!answer) {
            console.error(
                "CHA AI: Gemini returned no usable answer.",
                JSON.stringify(
                    result.data ||
                    result.rawText ||
                    {}
                )
            );
            const blockReason =
                result?.data
                    ?.promptFeedback
                    ?.blockReason;
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
                            "The AI service returned an empty response. Please try again."
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
