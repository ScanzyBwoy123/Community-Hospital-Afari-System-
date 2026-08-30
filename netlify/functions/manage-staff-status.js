"use strict";
// ============================================================
// COMMUNITY HOSPITAL AFARI
// CHA — MANAGE STAFF STATUS
// Secure Netlify Function
//
// Actions:
//   deactivate = block staff access
//   activate   = restore staff access
//
// IMPORTANT:
// The Supabase Service Role Key must ONLY exist in Netlify
// environment variables. Never put it in frontend JavaScript.
// ============================================================
const { createClient } = require("@supabase/supabase-js");
exports.handler = async function (event) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    // ONLY POST
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
    // SUPABASE SERVER CONFIGURATION
    // --------------------------------------------------------
    const supabaseUrl =
        process.env.SUPABASE_URL;
    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        console.error(
            "CHA manage-staff-status: Supabase server configuration is missing."
        );
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Hospital server configuration is incomplete."
            })
        };
    }
    // --------------------------------------------------------
    // CREATE ADMIN CLIENT
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
    // READ AUTHORIZATION HEADER
    // --------------------------------------------------------
    const authorization =
        event.headers?.authorization ||
        event.headers?.Authorization ||
        "";
    if (!authorization.startsWith("Bearer ")) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Administrator authentication is required."
            })
        };
    }
    const accessToken =
        authorization.substring(7).trim();
    if (!accessToken) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Invalid authentication token."
            })
        };
    }
    // --------------------------------------------------------
    // VERIFY CURRENT USER
    // --------------------------------------------------------
    const {
        data: userData,
        error: userError
    } =
        await supabaseAdmin.auth.getUser(
            accessToken
        );
    if (
        userError ||
        !userData ||
        !userData.user
    ) {
        console.error(
            "CHA manage-staff-status authentication error:",
            userError
        );
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Your administrator session is invalid or expired."
            })
        };
    }
    const adminUser =
        userData.user;
    // --------------------------------------------------------
    // VERIFY ADMIN PROFILE
    // --------------------------------------------------------
    const {
        data: adminProfile,
        error: adminProfileError
    } =
        await supabaseAdmin
            .from("staff_profiles")
            .select(`
                id,
                role,
                is_active
            `)
            .eq(
                "id",
                adminUser.id
            )
            .single();
    if (adminProfileError) {
        console.error(
            "CHA manage-staff-status admin profile error:",
            adminProfileError
        );
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Administrator profile could not be verified."
            })
        };
    }
    // --------------------------------------------------------
    // ONLY ACTIVE ADMINS ARE ALLOWED
    // --------------------------------------------------------
    if (
        !adminProfile ||
        adminProfile.role !== "admin" ||
        adminProfile.is_active !== true
    ) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Administrator permission is required."
            })
        };
    }
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
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Invalid request data."
            })
        };
    }
    // --------------------------------------------------------
    // REQUEST VALUES
    // --------------------------------------------------------
    const staffProfileId =
        String(
            body.staffProfileId || ""
        ).trim();
    const action =
        String(
            body.action || ""
        ).trim().toLowerCase();
    // --------------------------------------------------------
    // VALIDATE ACTION
    // --------------------------------------------------------
    if (
        action !== "activate" &&
        action !== "deactivate"
    ) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Invalid staff status action."
            })
        };
    }
    // --------------------------------------------------------
    // VALIDATE STAFF ID
    // --------------------------------------------------------
    if (!staffProfileId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Staff profile ID is required."
            })
        };
    }
    // --------------------------------------------------------
    // NEVER ALLOW ADMIN TO DEACTIVATE THEMSELVES
    // --------------------------------------------------------
    if (
        staffProfileId === adminUser.id &&
        action === "deactivate"
    ) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "You cannot deactivate your own administrator account."
            })
        };
    }
    // --------------------------------------------------------
    // FIND STAFF ACCOUNT
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
                is_active
            `)
            .eq(
                "id",
                staffProfileId
            )
            .single();
    if (staffProfileError || !staffProfile) {
        console.error(
            "CHA manage-staff-status staff lookup error:",
            staffProfileError
        );
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Staff account could not be found."
            })
        };
    }
    // --------------------------------------------------------
    // PREVENT CHANGING ANOTHER ADMIN ACCOUNT
    // --------------------------------------------------------
    //
    // This prevents one administrator from accidentally
    // disabling another administrator through this function.
    //
    // If you later want multi-admin account management,
    // we can create a separate controlled workflow.
    // --------------------------------------------------------
    if (
        staffProfile.role === "admin" &&
        staffProfile.id !== adminUser.id
    ) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Administrator accounts cannot be changed from Staff Status Management."
            })
        };
    }
    // --------------------------------------------------------
    // DETERMINE NEW STATUS
    // --------------------------------------------------------
    const newStatus =
        action === "activate";
    // --------------------------------------------------------
    // NO CHANGE NEEDED
    // --------------------------------------------------------
    if (
        staffProfile.is_active === newStatus
    ) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message:
                    newStatus
                        ? "This staff account is already active."
                        : "This staff account is already inactive."
            })
        };
    }
    // --------------------------------------------------------
    // UPDATE STAFF PROFILE
    // --------------------------------------------------------
    const {
        data: updatedProfile,
        error: updateError
    } =
        await supabaseAdmin
            .from("staff_profiles")
            .update({
                is_active: newStatus
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
                is_active
            `)
            .single();
    if (updateError) {
        console.error(
            "CHA manage-staff-status update error:",
            updateError
        );
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Unable to change the staff account status."
            })
        };
    }
    // --------------------------------------------------------
    // LOG ACTION
    // --------------------------------------------------------
    console.log(
        "CHA staff status changed:",
        {
            administratorId:
                adminUser.id,
            staffProfileId:
                updatedProfile.id,
            staffId:
                updatedProfile.staff_id,
            fullName:
                updatedProfile.full_name,
            action:
                action,
            isActive:
                updatedProfile.is_active
        }
    );
    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message:
                newStatus
                    ? "Staff account activated successfully."
                    : "Staff account deactivated successfully.",
            staff: {
                id:
                    updatedProfile.id,
                full_name:
                    updatedProfile.full_name,
                staff_id:
                    updatedProfile.staff_id,
                role:
                    updatedProfile.role,
                is_active:
                    updatedProfile.is_active
            }
        })
    };
};
