// ============================================================
// COMMUNITY HOSPITAL AFARI
// APPOINTMENT SMS NOTIFICATION
// ============================================================

"use strict";


// ============================================================
// RESPONSE HELPER
// ============================================================

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify(body)
    };
}


// ============================================================
// NETLIFY FUNCTION
// ============================================================

exports.handler = async function (event) {

    // --------------------------------------------------------
    // CORS PREFLIGHT
    // --------------------------------------------------------

    if (event.httpMethod === "OPTIONS") {
        return jsonResponse(200, {
            success: true
        });
    }


    // --------------------------------------------------------
    // ONLY POST ALLOWED
    // --------------------------------------------------------

    if (event.httpMethod !== "POST") {
        return jsonResponse(405, {
            success: false,
            error: "Method not allowed."
        });
    }


    // --------------------------------------------------------
    // HUBTEL CREDENTIAL CHECK
    // --------------------------------------------------------

    const clientId =
        process.env.HUBTEL_CLIENT_ID;

    const clientSecret =
        process.env.HUBTEL_CLIENT_SECRET;

    const senderId =
        process.env.HUBTEL_SENDER_ID;


    /*
     * IMPORTANT:
     *
     * We are intentionally NOT putting Hubtel credentials
     * directly into this file.
     *
     * They will later be stored securely in Netlify
     * environment variables.
     *
     * Since CHAAfari is currently pending approval,
     * SMS sending is not activated yet.
     */

    if (
        !clientId ||
        !clientSecret ||
        !senderId
    ) {

        return jsonResponse(503, {
            success: false,
            configured: false,
            error:
                "SMS service is not configured yet. " +
                "Hubtel Sender ID or API credentials are pending."
        });

    }


    // --------------------------------------------------------
    // READ REQUEST
    // --------------------------------------------------------

    let body;

    try {

        body =
            JSON.parse(
                event.body || "{}"
            );

    }

    catch (error) {

        return jsonResponse(400, {
            success: false,
            error: "Invalid JSON request."
        });

    }


    // --------------------------------------------------------
    // INPUTS
    // --------------------------------------------------------

    const phone =
        String(
            body.phone || ""
        ).trim();

    const patientName =
        String(
            body.patientName || ""
        ).trim();

    const appointmentDate =
        String(
            body.appointmentDate || ""
        ).trim();

    const appointmentTime =
        String(
            body.appointmentTime || ""
        ).trim();

    const status =
        String(
            body.status || ""
        ).trim().toLowerCase();


    // --------------------------------------------------------
    // VALIDATE PHONE
    // --------------------------------------------------------

    if (!phone) {

        return jsonResponse(400, {
            success: false,
            error: "Patient phone number is required."
        });

    }


    // --------------------------------------------------------
    // VALIDATE STATUS
    // --------------------------------------------------------

    if (
        status !== "confirmed" &&
        status !== "cancelled"
    ) {

        return jsonResponse(400, {
            success: false,
            error:
                "Appointment status must be confirmed or cancelled."
        });

    }


    // --------------------------------------------------------
    // NORMALIZE GHANA PHONE NUMBER
    // --------------------------------------------------------

    let normalizedPhone =
        phone.replace(
            /[\s()-]/g,
            ""
        );


    if (
        normalizedPhone.startsWith(
            "+"
        )
    ) {

        normalizedPhone =
            normalizedPhone.substring(1);

    }


    if (
        normalizedPhone.startsWith(
            "0"
        )
    ) {

        normalizedPhone =
            "233" +
            normalizedPhone.substring(1);

    }


    // --------------------------------------------------------
    // BASIC PHONE VALIDATION
    // --------------------------------------------------------

    if (
        !/^233\d{9}$/.test(
            normalizedPhone
        )
    ) {

        return jsonResponse(400, {
            success: false,
            error:
                "Invalid Ghana phone number."
        });

    }


    // --------------------------------------------------------
    // CREATE MESSAGE
    // --------------------------------------------------------

    let message;


    if (
        status === "confirmed"
    ) {

        message =
            "Community Hospital Afari: " +
            "Dear " +
            (
                patientName ||
                "Patient"
            ) +
            ", your appointment has been CONFIRMED for " +
            (
                appointmentDate ||
                "your scheduled date"
            ) +
            (
                appointmentTime
                    ? " at " + appointmentTime
                    : ""
            ) +
            ". Please arrive 15 minutes early.";

    }

    else {

        message =
            "Community Hospital Afari: " +
            "Dear " +
            (
                patientName ||
                "Patient"
            ) +
            ", your appointment scheduled for " +
            (
                appointmentDate ||
                "your scheduled date"
            ) +
            (
                appointmentTime
                    ? " at " + appointmentTime
                    : ""
            ) +
            " has been CANCELLED. " +
            "Please contact the hospital for assistance.";

    }


    // --------------------------------------------------------
    // HUBTEL SMS
    // --------------------------------------------------------

    try {

        /*
         * Hubtel SMS API connection will be activated here
         * after the Sender ID has been approved and the
         * API credentials have been created.
         *
         * The credentials remain server-side in Netlify.
         */

        return jsonResponse(503, {
            success: false,
            configured: true,
            active: false,
            error:
                "Hubtel SMS is not active yet. " +
                "Waiting for Sender ID approval."
        });

    }

    catch (error) {

        console.error(
            "Hubtel SMS Error:",
            error
        );


        return jsonResponse(500, {
            success: false,
            error:
                "Unable to send appointment SMS."
        });

    }

};
