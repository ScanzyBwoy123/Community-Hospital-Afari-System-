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

    const apiKey =
        process.env.GEMINI_API_KEY;

    if (!apiKey) {

        console.error(
            "GEMINI_API_KEY is missing."
        );

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

        body = JSON.parse(
            event.body || "{}"
        );

    } catch (error) {

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Invalid JSON request."
            })
        };
    }

    const message =
        String(
            body.message || ""
        ).trim();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

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
                    "Question is too long."
            })
        };
    }

    // ========================================================
    // COMMUNITY HOSPITAL AFARI AI INSTRUCTIONS
    // ========================================================

    const systemInstruction = `

You are CHA AI Assistant for Community Hospital Afari.

You provide clear, helpful, friendly and safe general
health information.

============================================================
IMPORTANT SAFETY RULES
============================================================

1. You are an AI assistant, not a doctor or nurse.

2. Do not claim that you personally examined a patient.

3. Do not make definitive diagnoses.

4. Do not prescribe medication.

5. Do not provide individualized medication doses.

6. Do not replace a qualified healthcare professional.

7. Explain medical terminology in simple language.

8. Encourage users to speak with a qualified healthcare
   professional when appropriate.

9. If someone describes a possible medical emergency,
   advise them to seek urgent medical attention immediately.

10. Never invent patient records, laboratory results,
    appointments, diagnoses or hospital information.

11. Protect patient privacy.

12. Do not request unnecessary personal information.

13. Be professional, friendly and easy to understand.

============================================================
COMMUNITY HOSPITAL AFARI INFORMATION
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
HOSPITAL CONTACT RECOMMENDATIONS
============================================================

When a user's question is related to Community Hospital
Afari, hospital services, appointments, booking,
referrals, visiting the hospital, follow-up care,
directions, or getting further assistance, recommend
contacting Community Hospital Afari when appropriate.

General contact:

Phone:
+233 24 412 3456

Email:
info@afaricommunityhospital.gh

For emergencies:

Emergency:
+233 20 567 8901

If the user specifically asks how to contact the hospital,
always provide the general phone number and email.

If the user asks for the hospital email, provide:

info@afaricommunityhospital.gh

If the user asks for the hospital phone number, provide:

+233 24 412 3456

If the user asks how to book an appointment, explain that
they can use the hospital's appointment booking system or
contact the hospital directly.

If the user asks how to reach the hospital or where the
hospital is located, provide the hospital location and,
when useful, the general phone number.

If the user needs further medical assistance after
receiving general information, recommend contacting the
hospital or speaking with a qualified healthcare professional.

Do not invent, modify or guess the hospital's contact
information.

============================================================
ANSWER STYLE
============================================================

Answer the user's question directly.

Use simple language.

Do not unnecessarily repeat the same information.

When hospital contact information is relevant, include it
naturally in the response.

For emergencies, prioritize urgent medical care and the
emergency phone number.

============================================================
`;

    // ========================================================
    // DELAY HELPER
    // ========================================================

    function sleep(ms) {

        return new Promise(
            resolve => setTimeout(
                resolve,
                ms
            )
        );

    }

    // ========================================================
    // GEMINI REQUEST
    // ========================================================

    async function callGemini(model) {

        const url =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(
                apiKey
            );

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

                        temperature: 0.3,

                        maxOutputTokens: 1000

                    }

                })
            }
        );

    }

    // ========================================================
    // RETRY MODEL
    // ========================================================

    async function tryModel(
        model,
        attempts = 3
    ) {

        for (
            let attempt = 1;
            attempt <= attempts;
            attempt++
        ) {

            try {

                console.log(
                    `Gemini ${model} attempt ${attempt}/${attempts}`
                );

                const response =
                    await callGemini(
                        model
                    );

                const data =
                    await response.json();

                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                if (response.ok) {

                    return {
                        ok: true,
                        data
                    };

                }

                // ------------------------------------------------
                // TEMPORARY ERRORS
                // ------------------------------------------------

                if (
                    response.status === 503 ||
                    response.status === 429 ||
                    response.status === 500
                ) {

                    console.warn(
                        `Gemini temporary error ${response.status}`
                    );

                    if (
                        attempt < attempts
                    ) {

                        const delay =
                            2000 *
                            Math.pow(
                                2,
                                attempt - 1
                            );

                        console.log(
                            `Retrying in ${delay}ms`
                        );

                        await sleep(
                            delay
                        );

                        continue;

                    }

                }

                // ------------------------------------------------
                // PERMANENT ERROR
                // ------------------------------------------------

                return {

                    ok: false,

                    status:
                        response.status,

                    data

                };

            } catch (error) {

                console.error(
                    "Gemini request error:",
                    error
                );

                if (
                    attempt < attempts
                ) {

                    const delay =
                        2000 *
                        Math.pow(
                            2,
                            attempt - 1
                        );

                    await sleep(
                        delay
                    );

                    continue;

                }

                return {

                    ok: false,

                    status: 500,

                    data: {

                        error: {

                            message:
                                error.message

                        }

                    }

                };

            }

        }

        return {

            ok: false,

            status: 503,

            data: {

                error: {

                    message:
                        "Gemini service is temporarily unavailable."

                }

            }

        };

    }

    // ========================================================
    // MAIN AI LOGIC
    // ========================================================

    try {

        // ------------------------------------------------------
        // PRIMARY MODEL
        // ------------------------------------------------------

        let result =
            await tryModel(
                "gemini-3.7-flash",
                3
            );

        // ------------------------------------------------------
        // FALLBACK MODEL
        // ------------------------------------------------------

        if (!result.ok) {

            console.warn(
                "Primary Gemini model unavailable. Trying fallback."
            );

            result =
                await tryModel(
                    "gemini-3.1-flash-lite",
                    2
                );

        }

        // ------------------------------------------------------
        // BOTH FAILED
        // ------------------------------------------------------

        if (!result.ok) {

            const geminiMessage =
                result?.data?.error?.message ||
                "Gemini is temporarily unavailable.";

            console.error(
                "Gemini final error:",
                geminiMessage
            );

            return {

                statusCode:
                    result.status || 502,

                headers,

                body:
                    JSON.stringify({

                        success: false,

                        error:
                            "The AI service is temporarily busy. Please try again in a moment."

                    })

            };

        }

        // ======================================================
        // EXTRACT ANSWER
        // ======================================================

        const answer =
            result?.data?.candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part.text || ""
                )
                .join("")
                .trim();

        if (!answer) {

            console.error(
                "Gemini returned no answer:",
                JSON.stringify(
                    result.data
                )
            );

            return {

                statusCode: 502,

                headers,

                body:
                    JSON.stringify({

                        success: false,

                        error:
                            "The AI returned an empty response."

                    })

            };

        }

        // ======================================================
        // SUCCESS
        // ======================================================

        return {

            statusCode: 200,

            headers,

            body:
                JSON.stringify({

                    success: true,

                    answer

                })

        };

    } catch (error) {

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
                        "Unable to connect to the AI service."

                })

        };

    }

};
