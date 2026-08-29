// ============================================================
// COMMUNITY HOSPITAL AFARI
// SECURE STAFF REGISTRATION FUNCTION
//
// FLOW:
// 1. Validate registration details
// 2. Verify department
// 3. Check Staff ID
// 4. Create Supabase Auth user
// 5. Existing database trigger creates staff_profiles row
// 6. Update that automatically-created profile
// 7. Keep new staff inactive until admin approval
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {

    // ========================================================
    // ONLY ALLOW POST REQUESTS
    // ========================================================

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

    try {

        // ====================================================
        // READ REQUEST
        // ====================================================

        let body = {};

        try {
            body = JSON.parse(event.body || "{}");
        } catch (parseError) {

            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Invalid registration request."
                })
            };
        }


        // ====================================================
        // GET REGISTRATION VALUES
        // ====================================================

        const fullName =
            String(body.fullName || "").trim();

        const staffId =
            String(body.staffId || "").trim();

        const email =
            String(body.email || "")
                .trim()
                .toLowerCase();

        const password =
            String(body.password || "");

        const phone =
            String(body.phone || "").trim();

        const role =
            String(body.role || "")
                .trim()
                .toLowerCase();

        const departmentId =
            String(body.departmentId || "").trim();


        // ====================================================
        // VALIDATE REQUIRED FIELDS
        // ====================================================

        if (
            !fullName ||
            !staffId ||
            !email ||
            !password ||
            !phone ||
            !role ||
            !departmentId
        ) {

            return {
                statusCode: 400,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "All staff registration fields are required."
                })
            };
        }


        // ====================================================
        // VALIDATE PASSWORD
        // ====================================================

        if (password.length < 8) {

            return {
                statusCode: 400,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Password must contain at least 8 characters."
                })
            };
        }


        // ====================================================
        // SUPABASE SERVER CONFIGURATION
        // ====================================================

        const supabaseUrl =
            process.env.SUPABASE_URL;

        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;


        if (
            !supabaseUrl ||
            !serviceRoleKey
        ) {

            console.error(
                "Missing Supabase server environment variables."
            );

            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Server authentication system is not configured."
                })
            };
        }


        // ====================================================
        // SERVER-SIDE SUPABASE CLIENT
        // ====================================================

        const supabase =
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


        // ====================================================
        // VERIFY DEPARTMENT
        // ====================================================

        const {
            data: department,
            error: departmentError
        } =
            await supabase
                .from("departments")
                .select("id, name")
                .eq("id", departmentId)
                .eq("is_active", true)
                .maybeSingle();


        if (departmentError) {

            console.error(
                "Department verification error:",
                departmentError
            );

            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Unable to verify the selected department.",
                    details:
                        departmentError.message
                })
            };
        }


        if (!department) {

            return {
                statusCode: 400,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "The selected department is not available."
                })
            };
        }


        // ====================================================
        // CHECK STAFF ID
        // ====================================================

        const {
            data: existingStaff,
            error: staffCheckError
        } =
            await supabase
                .from("staff_profiles")
                .select("id, staff_id")
                .eq("staff_id", staffId)
                .maybeSingle();


        if (staffCheckError) {

            console.error(
                "Staff ID check error:",
                staffCheckError
            );

            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Unable to verify the Staff ID.",
                    details:
                        staffCheckError.message
                })
            };
        }


        if (existingStaff) {

            return {
                statusCode: 409,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "This Staff ID is already registered."
                })
            };
        }


        // ====================================================
        // CHECK EMAIL IN SUPABASE AUTH
        // ====================================================

        let emailExists = false;
        let page = 1;

        while (!emailExists) {

            const {
                data: usersData,
                error: usersError
            } =
                await supabase.auth.admin.listUsers({
                    page: page,
                    perPage: 1000
                });


            if (usersError) {

                console.error(
                    "Auth user check error:",
                    usersError
                );

                return {
                    statusCode: 500,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        error:
                            "Unable to verify the email address.",
                        details:
                            usersError.message
                    })
                };
            }


            const users =
                usersData &&
                Array.isArray(usersData.users)
                    ? usersData.users
                    : [];


            emailExists =
                users.some(function (user) {

                    return (
                        String(user.email || "")
                            .trim()
                            .toLowerCase() ===
                        email
                    );

                });


            if (
                emailExists ||
                users.length < 1000
            ) {
                break;
            }


            page++;
        }


        if (emailExists) {

            return {
                statusCode: 409,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "This email address is already registered. Please use the Staff Login page."
                })
            };
        }


        // ====================================================
        // CREATE SUPABASE AUTH USER
        // ====================================================

        const {
            data: authData,
            error: authError
        } =
            await supabase.auth.admin.createUser({

                email: email,

                password: password,

                email_confirm: false

            });


        if (authError) {

            console.error(
                "Auth user creation error:",
                authError
            );

            return {
                statusCode: 400,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        authError.message ||
                        "Unable to create the staff account."
                })
            };
        }


        const user =
            authData &&
            authData.user;


        if (!user) {

            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Authentication account was not created."
                })
            };
        }


        // ====================================================
        // WAIT FOR DATABASE TRIGGER
        //
        // Your Supabase database has:
        //
        // on_auth_user_created
        //
        // which executes:
        //
        // handle_new_staff_user()
        //
        // That trigger creates the staff_profiles row.
        // ====================================================

        let profile = null;
        let profileError = null;

        for (
            let attempt = 1;
            attempt <= 5;
            attempt++
        ) {

            const result =
                await supabase
                    .from("staff_profiles")
                    .select(
                        "id, full_name, staff_id, role, department_id, phone, is_active"
                    )
                    .eq("id", user.id)
                    .maybeSingle();


            profile =
                result.data;

            profileError =
                result.error;


            if (profileError) {

                console.error(
                    "Staff profile lookup error:",
                    profileError
                );

                break;
            }


            if (profile) {
                break;
            }


            // Give the database trigger a short moment
            // to finish creating the profile.

            await new Promise(
                function(resolve) {
                    setTimeout(
                        resolve,
                        300
                    );
                }
            );
        }


        // ====================================================
        // PROFILE COULD NOT BE FOUND
        // ====================================================

        if (profileError) {

            await supabase.auth.admin
                .deleteUser(user.id);

            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Unable to verify the automatically-created staff profile.",
                    details:
                        profileError.message
                })
            };
        }


        if (!profile) {

            console.error(
                "Auth user was created, but the staff profile trigger did not create a profile."
            );


            await supabase.auth.admin
                .deleteUser(user.id);


            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "The staff profile could not be created automatically. Please contact hospital administration."
                })
            };
        }


        // ====================================================
        // UPDATE AUTOMATICALLY-CREATED PROFILE
        //
        // IMPORTANT:
        // We UPDATE instead of INSERT.
        //
        // This prevents the duplicate UUID error.
        // ====================================================

        const {
            data: updatedProfile,
            error: updateProfileError
        } =
            await supabase
                .from("staff_profiles")
                .update({

                    full_name:
                        fullName,

                    staff_id:
                        staffId,

                    role:
                        role,

                    department_id:
                        departmentId,

                    phone:
                        phone,

                    is_active:
                        false

                })
                .eq(
                    "id",
                    user.id
                )
                .select(
                    "id, full_name, staff_id, role, department_id, phone, is_active"
                )
                .single();


        // ====================================================
        // PROFILE UPDATE FAILED
        // ====================================================

        if (updateProfileError) {

            console.error(
                "Staff profile update error:",
                updateProfileError
            );


            await supabase.auth.admin
                .deleteUser(user.id);


            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Unable to complete the staff profile.",
                    details:
                        updateProfileError.message,
                    code:
                        updateProfileError.code ||
                        null
                })
            };
        }


        // ====================================================
        // SUCCESS
        // ====================================================

        return {
            statusCode: 201,

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                success: true,

                message:
                    "Registration submitted successfully. Your account is pending hospital administration approval.",

                staff: {

                    id:
                        updatedProfile.id,

                    full_name:
                        updatedProfile.full_name,

                    staff_id:
                        updatedProfile.staff_id,

                    role:
                        updatedProfile.role,

                    department:
                        department.name,

                    phone:
                        updatedProfile.phone,

                    is_active:
                        updatedProfile.is_active

                }

            })
        };


    } catch (error) {

        // ====================================================
        // UNEXPECTED ERROR
        // ====================================================

        console.error(
            "CHA register-staff function error:",
            error
        );


        return {
            statusCode: 500,

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                error:
                    "An unexpected server error occurred.",
                details:
                    error &&
                    error.message
                        ? error.message
                        : String(error)
            })
        };
    }
};
