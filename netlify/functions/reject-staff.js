// ============================================================
// CHA — REJECT STAFF REGISTRATION
// Secure Netlify Function
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {

    // --------------------------------------------------------
    // ONLY ALLOW POST
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
    // SUPABASE CONFIGURATION
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
            "CHA reject-staff: Supabase server configuration is missing."
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
    // READ REQUEST
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
    // FIND THE PENDING STAFF PROFILE
    // --------------------------------------------------------

    const {
        data: staffProfile,
        error: staffProfileError
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


    if (staffProfileError) {

        console.error(
            "CHA reject-staff profile lookup error:",
            staffProfileError
        );

        return {
            statusCode: 404,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Staff registration could not be found."
            })
        };

    }


    // --------------------------------------------------------
    // ONLY PENDING ACCOUNTS CAN BE REJECTED
    // --------------------------------------------------------

    if (staffProfile.is_active === true) {

        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "This staff account has already been approved and cannot be rejected as a pending registration."
            })
        };

    }


    // --------------------------------------------------------
    // DELETE STAFF PROFILE
    // --------------------------------------------------------

    const {
        error: deleteProfileError
    } =
        await supabaseAdmin
            .from("staff_profiles")
            .delete()
            .eq(
                "id",
                staffProfileId
            );


    if (deleteProfileError) {

        console.error(
            "CHA reject-staff profile deletion error:",
            deleteProfileError
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Unable to reject this staff registration."
            })
        };

    }


    // --------------------------------------------------------
    // DELETE SUPABASE AUTH USER
    // --------------------------------------------------------

    const {
        error: authDeleteError
    } =
        await supabaseAdmin.auth.admin.deleteUser(
            staffProfileId
        );


    if (authDeleteError) {

        console.error(
            "CHA reject-staff authentication deletion error:",
            authDeleteError
        );

        /*
         * The staff profile has already been deleted.
         * The authentication account may still exist.
         *
         * Return an error so the administrator knows
         * that manual cleanup may be required.
         */

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "The staff registration was rejected, but the authentication account could not be removed automatically. Please contact the system administrator."
            })
        };

    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    console.log(
        "CHA staff registration rejected:",
        {
            id: staffProfile.id,
            staffId: staffProfile.staff_id,
            fullName: staffProfile.full_name
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
                "Staff registration rejected successfully."
        })
    };

};
