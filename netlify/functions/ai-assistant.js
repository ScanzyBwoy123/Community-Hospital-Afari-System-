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

    // ========================================================
    // HEADERS
    // ========================================================

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "Content-Type, Authorization",
        "Access-Control-Allow-Methods":
            "POST, OPTIONS"
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
    // GEMINI API KEY
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
            "CHA AI: Invalid JSON request.",
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


    // ========================================================
    // ACCEPT MESSAGE OR QUESTION
    // ========================================================

    const message =
        String(
            body.message ||
            body.question ||
            ""
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


    // ========================================================
    // LIMIT REQUEST SIZE
    // ========================================================

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
    // CHA AI SYSTEM INSTRUCTION
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
- Do not tell users to start, stop, or change prescribed medication.
- Explain medical terms in simple language.
- Give general educational health information.
- Encourage professional medical assessment when appropriate.
- If someone describes a possible emergency, advise them to seek urgent medical attention immediately.
- Never invent patient records.
- Never invent laboratory results.
- Never invent appointments.
- Never invent hospital services.
- Never invent hospital contact information.
- Protect patient privacy.
- Do not request unnecessary personal information.
- Do not ask users to provide passwords, account credentials, or confidential patient information.
- Be professional, concise, calm and easy to understand.

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

If a user's question is related to hospital services,
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

============================================================
CLINICAL TOOLS
============================================================

The hospital website may contain general clinical reference
tools such as:

- Blood pressure calculator
- BMI calculator
- Pulse rate reference
- Temperature conversion
- Laboratory reference ranges

These tools are for general educational and reference purposes.

Do not present calculator results as a diagnosis.

Do not claim that a single measurement confirms a disease.

Encourage appropriate professional assessment when needed.

============================================================
`;


    // ========================================================
    // GEMINI MODEL
    //
    // Same working model/request style used by PulsePrep.
    // ========================================================

    const model =
        "gemini-3.1-flash-lite";


    // ========================================================
    // GEMINI URL
    // ========================================================

    const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent";


    // ========================================================
    // CALL GEMINI
    // ========================================================

    try {

        console.log(
            "CHA AI: Sending request to Gemini."
        );


        const response =
            await fetch(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey
                    },

                    body:
                        JSON.stringify({

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
                                    role:
                                        "user",

                                    parts: [

                                        {
                                            text:
                                                message
                                        }

                                    ]

                                }

                            ]

                        })
                }
            );


        // ====================================================
        // READ RESPONSE SAFELY
        // ====================================================

        const rawText =
            await response.text();


        let data = null;


        try {

            data =
                rawText
                    ? JSON.parse(
                        rawText
                    )
                    : null;

        } catch (error) {

            console.error(
                "CHA AI: Gemini returned invalid JSON.",
                rawText.substring(
                    0,
                    1000
                )
            );

            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    success: false,
                    error:
                        "The AI service returned an invalid response. Please try again."
                })
            };

        }


        // ====================================================
        // GEMINI ERROR
        // ====================================================

        if (!response.ok) {

            const geminiError =
                data?.error?.message ||
                "Gemini API request failed.";

            console.error(
                "CHA AI Gemini API error:",
                {
                    status:
                        response.status,

                    message:
                        geminiError,

                    data:
                        data
                }
            );


            // ------------------------------------------------
            // RATE LIMIT
            // ------------------------------------------------

            if (
                response.status === 429
            ) {

                return {
                    statusCode: 429,
                    headers,
                    body:
                        JSON.stringify({
                            success: false,
                            error:
                                "The AI service is temporarily busy. Please try again shortly."
                        })
                };

            }


            // ------------------------------------------------
            // AUTHENTICATION
            // ------------------------------------------------

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                return {
                    statusCode:
                        response.status,
                    headers,
                    body:
                        JSON.stringify({
                            success: false,
                            error:
                                "The AI service authentication needs attention. Please contact the hospital administrator."
                        })
                };

            }


            // ------------------------------------------------
            // OTHER GEMINI ERROR
            // ------------------------------------------------

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
                            "The AI service could not process the request. Please try again."
                    })
            };

        }


        // ====================================================
        // EXTRACT ANSWER
        // ====================================================

        const candidates =
            Array.isArray(
                data?.candidates
            )
                ? data.candidates
                : [];


        const textParts = [];


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

                                textParts.push(
                                    text
                                );

                            }

                        }

                    }
                );

            }
        );


        const answer =
            textParts
                .join("\n")
                .trim();


        // ====================================================
        // EMPTY RESPONSE
        // ====================================================

        if (!answer) {

            console.error(
                "CHA AI: Gemini returned no usable answer.",
                JSON.stringify(
                    data || {}
                )
            );


            const blockReason =
                data
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
                                "I’m unable to provide a response to that request. Please ask another health-related question."
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


        // ====================================================
        // SUCCESS
        // ====================================================

        console.log(
            "CHA AI: Gemini response received successfully."
        );


        return {
            statusCode: 200,
            headers,
            body:
                JSON.stringify({

                    success:
                        true,

                    answer:
                        answer

                })
        };


    } catch (error) {

        // ====================================================
        // NETWORK / FATAL ERROR
        // ====================================================

        console.error(
            "CHA AI fatal error:",
            error
        );


        return {
            statusCode: 502,
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
