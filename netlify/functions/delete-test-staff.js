// ============================================================
// CHA — DELETE TEST STAFF ACCOUNTS
// Server-side cleanup function
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
            "CHA delete-test-staff: Supabase server configuration is missing."
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
            await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage: 100
            });


        if (error) {

            console.error(
                "CHA delete-test-staff listUsers error:",
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
            // ONLY DELETE THE THREE SPECIFIED TEST EMAILS
            // ------------------------------------------------

            if (
                testEmails.includes(email)
            ) {

                const {
                    error:
                        deleteError
                } =
                    await supabaseAdmin.auth.admin.deleteUser(
                        user.id
                    );


                if (deleteError) {

                    console.error(
                        "CHA delete-test-staff deleteUser error:",
                        email,
                        deleteError
                    );

                    failed.push({
                        email,
                        error:
                            deleteError.message ||
                            "Unable to delete account."
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
    // FIND TEST EMAILS THAT WERE NOT FOUND
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
    // SUCCESS
    // --------------------------------------------------------

    console.log(
        "CHA test staff cleanup completed:",
        {
            deleted,
            notFound,
            failed
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
                "Test account cleanup completed.",
            deleted,
            notFound,
            failed
        })
    };

};
