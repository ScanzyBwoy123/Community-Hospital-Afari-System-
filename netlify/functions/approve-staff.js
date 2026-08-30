// ============================================================
// COMMUNITY HOSPITAL AFARI
// APPROVE STAFF FUNCTION
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {

    // --------------------------------------------------------
    // ONLY ALLOW POST REQUESTS
    // --------------------------------------------------------

    if (event.httpMethod !== "POST") {

        return {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: "Method not allowed."
            })
        };

    }


    // --------------------------------------------------------
    // SERVER ENVIRONMENT VARIABLES
    // --------------------------------------------------------

    const supabaseUrl =
        process.env.SUPABASE_URL;

    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;


    if (
        !supabaseUrl ||
        !serviceRoleKey
    ) {

        console.error(
            "CHA approve-staff: Supabase configuration is missing."
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Hospital server configuration is incomplete."
            })
        };

    }


    // --------------------------------------------------------
    // CREATE ADMIN SUPABASE CLIENT
    // --------------------------------------------------------

    const supabaseAdmin =
        createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );


    // --------------------------------------------------------
    // READ REQUEST BODY
    // --------------------------------------------------------

    let body;

    try {

        body =
            JSON.parse(
                event.body || "{}"
            );

    } catch (error) {

        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Invalid request data."
            })
        };

    }


    const staffProfileId =
        body.staffProfileId;


    // --------------------------------------------------------
    // VALIDATE STAFF PROFILE ID
    // --------------------------------------------------------

    if (!staffProfileId) {

        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Staff profile ID is required."
            })
        };

    }


    // --------------------------------------------------------
    // FIND STAFF PROFILE
    // --------------------------------------------------------

    const {
        data: staffProfile,
        error: profileError
    } =
        await supabaseAdmin
            .from("staff_profiles")
            .select(`
                id,
                full_name,
                staff_id,
                role,
                department_id,
                phone,
                is_active
            `)
            .eq(
                "id",
                staffProfileId
            )
            .single();


    if (profileError) {

        console.error(
            "CHA approve-staff profile lookup error:",
            profileError
        );

        return {
            statusCode: 404,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Staff profile could not be found."
            })
        };

    }


    // --------------------------------------------------------
    // PREVENT APPROVING AN ALREADY ACTIVE ACCOUNT
    // --------------------------------------------------------

    if (
        staffProfile.is_active === true
    ) {

        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "This staff account is already approved."
            })
        };

    }


    // --------------------------------------------------------
    // CONFIRM SUPABASE AUTHENTICATION EMAIL
    // --------------------------------------------------------

    const {
        data: authUser,
        error: authError
    } =
        await supabaseAdmin.auth.admin
            .updateUserById(
                staffProfileId,
                {
                    email_confirm: true
                }
            );


    if (authError) {

        console.error(
            "CHA approve-staff authentication error:",
            authError
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    authError.message ||
                    "Unable to confirm the staff authentication account."
            })
        };

    }


    // --------------------------------------------------------
    // ACTIVATE STAFF PROFILE
    // --------------------------------------------------------

    const {
        data: updatedProfile,
        error: updateError
    } =
        await supabaseAdmin
            .from("staff_profiles")
            .update({
                is_active: true
            })
            .eq(
                "id",
                staffProfileId
            )
            .select(`
                id,
                full_name,
                staff_id,
                role,
                department_id,
                phone,
                is_active
            `)
            .single();


    if (updateError) {

        console.error(
            "CHA approve-staff profile update error:",
            updateError
        );

        /*
         * If profile activation fails after email confirmation,
         * we attempt to leave the authentication account confirmed.
         *
         * The administrator can safely retry approval after
         * correcting the profile/database issue.
         */

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    updateError.message ||
                    "Authentication was confirmed, but the staff profile could not be activated."
            })
        };

    }


    // --------------------------------------------------------
    // VERIFY ACTIVATION
    // --------------------------------------------------------

    if (
        !updatedProfile ||
        updatedProfile.is_active !== true
    ) {

        console.error(
            "CHA approve-staff verification failed:",
            updatedProfile
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Staff account could not be verified as active."
            })
        };

    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    console.log(
        "CHA staff account approved:",
        {
            id: updatedProfile.id,
            staffId: updatedProfile.staff_id,
            fullName: updatedProfile.full_name
        }
    );


    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            success: true,
            message:
                "Staff account approved and email confirmed successfully.",
            staff: updatedProfile
        })
    };

};
