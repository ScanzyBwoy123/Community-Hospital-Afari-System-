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
    // API KEY
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
    // SYSTEM INSTRUCTION
    // --------------------------------------------------------

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
- If someone describes a possible emergency, advise them to
  seek urgent medical attention.
- Never invent patient records, laboratory results,
  appointments or hospital information.
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

============================================================
`;

    // --------------------------------------------------------
    // DELAY HELPER
    // --------------------------------------------------------

    function sleep(ms) {
        return new Promise(resolve =>
            setTimeout(resolve, ms)
        );
    }

    // --------------------------------------------------------
    // GEMINI REQUEST
    // --------------------------------------------------------

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

                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1000
                    }

                })
            }
        );
    }

    // --------------------------------------------------------
    // TRY MODEL WITH RETRIES
    // --------------------------------------------------------

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

                // Successful response

                if (response.ok) {

                    return {
                        ok: true,
                        data
                    };

                }

                // ------------------------------------------------
                // RETRY TEMPORARY SERVER ERRORS
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

                // Permanent error

                return {
                    ok: false,
                    status:
                        response.status,
                    data
                };

            }

            catch (error) {

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

    // --------------------------------------------------------
    // MAIN GEMINI LOGIC
    // --------------------------------------------------------

    try {

        /*
         * First try the main model.
         *
         * Keep this exactly as in the working version.
         */

        let result =
            await tryModel(
                "gemini-3.7-flash",
                3
            );


        // -----------------------------------------------------
        // FALLBACK MODEL
        // -----------------------------------------------------

        /*
         * If the main model is temporarily unavailable,
         * try the fallback model.
         */

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


        // -----------------------------------------------------
        // STILL FAILED
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // EXTRACT ANSWER
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

        return {
            statusCode: 200,
            headers,
            body:
                JSON.stringify({
                    success: true,
                    answer
                })
        };

    }

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
                        "Unable to connect to the AI service."
                })
        };

    }

};
