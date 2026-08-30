// ============================================================
// COMMUNITY HOSPITAL AFARI
// DELETE TEST STAFF ACCOUNTS
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
    // FIND AND DELETE TEST AUTH USERS
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
                "Unable to list Auth users:",
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


        if (users.length === 0) {
            break;
        }


        for (
            const user of users
        ) {

            const email =
                String(
                    user.email || ""
                ).toLowerCase();


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
                        "Failed to delete test user:",
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
    // CLEAN UP ANY REMAINING STAFF PROFILES
    // --------------------------------------------------------

    for (
        const email of testEmails
    ) {

        /*
         * Auth deletion normally removes the linked profile
         * automatically if the database has the appropriate
         * foreign-key cascade.
         *
         * We intentionally do not delete arbitrary profiles here.
         */

    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            success: true,
            deleted,
            failed
        })
    };

};
