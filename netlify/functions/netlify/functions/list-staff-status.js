"use strict";

// ============================================================
// COMMUNITY HOSPITAL AFARI
// CHA — LIST STAFF STATUS
// Secure administrator-only Netlify Function
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
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
    // ONLY GET
    // --------------------------------------------------------

    if (event.httpMethod !== "GET") {
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
            "CHA list-staff-status: Supabase configuration is missing."
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
    // ADMIN SUPABASE CLIENT
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
    // VERIFY LOGGED-IN USER
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
            "CHA list-staff-status authentication error:",
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

    if (
        adminProfileError ||
        !adminProfile
    ) {

        console.error(
            "CHA list-staff-status admin profile error:",
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
    // ONLY ACTIVE ADMINISTRATORS
    // --------------------------------------------------------

    if (
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
    // LOAD ALL NON-ADMIN STAFF
    // --------------------------------------------------------

    const {
        data: staff,
        error: staffError
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
                is_active,
                departments (
                    name
                )
            `)
            .neq(
                "role",
                "admin"
            )
            .order(
                "full_name",
                {
                    ascending: true
                }
            );

    if (staffError) {

        console.error(
            "CHA list-staff-status database error:",
            staffError
        );

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error:
                    "Unable to load staff accounts."
            })
        };
    }

    // --------------------------------------------------------
    // FORMAT STAFF DATA
    // --------------------------------------------------------

    const staffList =
        (staff || []).map(
            function (member) {

                return {
                    id:
                        member.id,

                    full_name:
                        member.full_name,

                    staff_id:
                        member.staff_id,

                    role:
                        member.role,

                    department_id:
                        member.department_id,

                    department:
                        member.departments?.name ||
                        "Not assigned",

                    phone:
                        member.phone,

                    is_active:
                        member.is_active === true
                };
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
            count:
                staffList.length,
            staff:
                staffList
        })
    };
};
