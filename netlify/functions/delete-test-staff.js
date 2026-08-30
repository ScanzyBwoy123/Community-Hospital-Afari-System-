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


    if (
        !supabaseUrl ||
        !serviceRoleKey
    ) {

        console.error(
            "CHA cleanup: Supabase server configuration is missing."
        );

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
    // CREATE SUPABASE ADMIN CLIENT
    // --------------------------------------------------------

    const supabaseAdmin =
        createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                global: {
                    headers: {
                        Authorization:
                            authorization
                    }
                }
            }
        );


    // --------------------------------------------------------
    // VERIFY CURRENT USER
    // --------------------------------------------------------

    const {
        data: authData,
        error: authError
    } =
        await supabaseAdmin.auth.getUser();


    if (
        authError ||
        !authData ||
        !authData.user
    ) {

        console.error(
            "CHA cleanup authentication error:",
            authError
        );

        return {
            statusCode: 401,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "Invalid or expired administrator session."
            })
        };

    }


    const currentUser =
        authData.user;


    // --------------------------------------------------------
    // VERIFY ADMIN PROFILE
    // --------------------------------------------------------

    const {
        data: adminProfile,
        error: adminError
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
        adminError ||
        !adminProfile
    ) {

        console.error(
            "CHA cleanup administrator profile error:",
            adminError
        );

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
    // ADMIN CHECK
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
    // EXACT TEST EMAILS
    // --------------------------------------------------------

    const testEmails = [
        "cha.test.staff2026@gmail.com",
        "herokujunior1@gmail.com",
        "ddangote701@gmail.com"
    ];


    const deleted = [];
    const notFound = [];
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
                "CHA cleanup list users error:",
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
            // ONLY MATCH THE THREE TEST EMAILS
            // ------------------------------------------------

            if (
                testEmails.includes(email)
            ) {

                // --------------------------------------------
                // EXTRA SAFETY:
                // NEVER DELETE THE CURRENT ADMIN
                // --------------------------------------------

                if (
                    user.id === currentUser.id
                ) {

                    failed.push({
                        email,
                        error:
                            "Safety protection prevented deletion of the current administrator."
                    });

                    continue;

                }


                // --------------------------------------------
                // DELETE AUTH USER
                // --------------------------------------------

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
    // CHECK WHICH TEST EMAILS WERE NOT FOUND
    // --------------------------------------------------------

    for (
        const email of testEmails
    ) {

        if (
            !deleted.includes(email) &&
            !failed.some(
                function(item) {
                    return item.email === email;
                }
            )
        ) {

            notFound.push(
                email
            );

        }

    }


    // --------------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------------

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            success: true,

            message:
                "Test account cleanup completed.",

            deleted,

            notFound,

            failed
        })
    };

};
