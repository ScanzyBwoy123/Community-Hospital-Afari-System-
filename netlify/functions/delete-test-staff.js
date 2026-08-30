
// ============================================================
// COMMUNITY HOSPITAL AFARI
// SECURE TEST STAFF CLEANUP
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {

    // --------------------------------------------------------
    // ONLY POST REQUESTS
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

    const anonKey =
        process.env.SUPABASE_ANON_KEY;


    if (
        !supabaseUrl ||
        !serviceRoleKey ||
        !anonKey
    ) {

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Supabase server configuration is missing."
            })
        };

    }


    // --------------------------------------------------------
    // GET AUTHORIZATION HEADER
    // --------------------------------------------------------

    const authorization =
        event.headers?.authorization ||
        event.headers?.Authorization;


    if (!authorization) {

        return {
            statusCode: 401,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Authentication required."
            })
        };

    }


    // --------------------------------------------------------
    // CREATE USER CLIENT
    // --------------------------------------------------------

    const supabaseUser =
        createClient(
            supabaseUrl,
            anonKey,
            {
                global: {
                    headers: {
                        Authorization:
                            authorization
                    }
                }
            }
        );


    // --------------------------------------------------------
    // VERIFY LOGGED-IN USER
    // --------------------------------------------------------

    const {
        data: authData,
        error: authError
    } =
        await supabaseUser.auth.getUser();


    if (
        authError ||
        !authData ||
        !authData.user
    ) {

        return {
            statusCode: 401,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Invalid or expired authentication session."
            })
        };

    }


    const currentUser =
        authData.user;


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
                currentUser.id
            )
            .single();


    if (
        adminProfileError ||
        !adminProfile
    ) {

        return {
            statusCode: 403,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Administrator profile not found."
            })
        };

    }


    // --------------------------------------------------------
    // CHECK ADMIN + ACTIVE
    // --------------------------------------------------------

    if (
        adminProfile.role !== "admin" ||
        adminProfile.is_active !== true
    ) {

        return {
            statusCode: 403,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Administrator permission required."
            })
        };

    }


    // --------------------------------------------------------
    // TEST EMAILS
    // --------------------------------------------------------

    const testEmails = [
        "cha.test.staff2026@gmail.com",
        "herokujunior1@gmail.com",
        "ddangote701@gmail.com"
    ];


    const deleted = [];
    const failed = [];


    // --------------------------------------------------------
    // FIND AUTH USERS
    // --------------------------------------------------------

    let page = 1;


    while (true) {

        const {
            data,
            error
        } =
            await supabaseAdmin.auth.admin
                .listUsers({
                    page,
                    perPage: 100
                });


        if (error) {

            console.error(
                "CHA cleanup listUsers error:",
                error
            );

            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error:
                        error.message ||
                        "Unable to list authentication users."
                })
            };

        }


        const users =
            data?.users || [];


        if (
            users.length === 0
        ) {

            break;

        }


        for (
            const user of users
        ) {

            const email =
                String(
                    user.email || ""
                ).toLowerCase();


            // ------------------------------------------------
            // ONLY DELETE OUR THREE TEST EMAILS
            // ------------------------------------------------

            if (
                testEmails.includes(email)
            ) {

                const {
                    error:
                        deleteError
                } =
                    await supabaseAdmin.auth.admin
                        .deleteUser(
                            user.id
                        );


                if (deleteError) {

                    console.error(
                        "CHA cleanup delete error:",
                        email,
                        deleteError
                    );

                    failed.push({
                        email,
                        error:
                            deleteError.message ||
                            "Delete failed."
                    });

                }

                else {

                    deleted.push(
                        email
                    );

                }

            }

        }


        if (
            users.length < 100
        ) {

            break;

        }


        page++;

    }


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            success: true,
            message:
                "Test staff cleanup completed.",
            deleted,
            failed
        })
    };

};
