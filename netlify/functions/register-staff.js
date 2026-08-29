// ============================================================
// COMMUNITY HOSPITAL AFARI
// SECURE STAFF REGISTRATION FUNCTION
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

        const body = JSON.parse(event.body || "{}");

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
            String(body.role || "").trim().toLowerCase();

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
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error:
                        "All staff registration fields are required."
                })
            };
        }


        // ====================================================
        // PASSWORD VALIDATION
        // ====================================================

        if (password.length < 8) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Password must contain at least 8 characters."
                })
            };
        }


        // ====================================================
        // SUPABASE ENVIRONMENT VARIABLES
        // ====================================================

        const supabaseUrl =
            process.env.SUPABASE_URL;

        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {

            console.error(
                "Missing Supabase server environment variables."
            );

            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Staff ID check failed.",
                    details:
                        staffCheckError.message,
                    code:
                        staffCheckError.code || null
                })
            };
        }


        if (existingStaff) {

            return {
                statusCode: 409,
                headers: {
                    "Content-Type": "application/json"
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

        let page = 1;
        let emailExists = false;

        while (!emailExists) {

            const {
                data: usersPage,
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
                usersPage &&
                Array.isArray(usersPage.users)
                    ? usersPage.users
                    : [];

            emailExists =
                users.some(function (user) {
                    return (
                        String(user.email || "")
                            .toLowerCase() ===
                        email
                    );
                });

            if (
                users.length < 1000 ||
                emailExists
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
        // CREATE STAFF PROFILE
        //
        // IMPORTANT:
        // The profile uses ONLY columns that actually exist:
        //
        // id
        // full_name
        // staff_id
        // role
        // department_id
        // phone
        // is_active
        // ====================================================

        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("staff_profiles")
                .insert({
                    id: user.id,
                    full_name: fullName,
                    staff_id: staffId,
                    role: role,
                    department_id: departmentId,
                    phone: phone,
                    is_active: false
                })
                .select(
                    "id, full_name, staff_id, role, department_id, phone, is_active"
                )
                .single();


        // ====================================================
        // PROFILE CREATION FAILED
        // ====================================================

        if (profileError) {

            console.error(
                "Staff profile creation error:",
                profileError
            );


            // -----------------------------------------------
            // Remove Auth user created by this registration
            // -----------------------------------------------

            const {
                error: deleteUserError
            } =
                await supabase.auth.admin
                    .deleteUser(user.id);


            if (deleteUserError) {

                console.error(
                    "Auth cleanup error:",
                    deleteUserError
                );
            }


            // -----------------------------------------------
            // Duplicate primary key
            // -----------------------------------------------

            if (
                profileError.code === "23505"
            ) {

                return {
                    statusCode: 409,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        error:
                            "A staff profile with this authentication ID already exists."
                    })
                };
            }


            // -----------------------------------------------
            // Check constraint
            // -----------------------------------------------

            if (
                profileError.code === "23514"
            ) {

                return {
                    statusCode: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        error:
                            "The selected staff position is not accepted by the hospital database.",
                        details:
                            profileError.message
                    })
                };
            }


            return {
                statusCode: 500,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    error:
                        "Unable to create the staff profile.",
                    details:
                        profileError.message,
                    code:
                        profileError.code || null
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
                        profile.id,

                    full_name:
                        profile.full_name,

                    staff_id:
                        profile.staff_id,

                    role:
                        profile.role,

                    department:
                        department.name,

                    phone:
                        profile.phone,

                    is_active:
                        false

                }

            })
        };


    } catch (error) {

        // ====================================================
        // UNEXPECTED SERVER ERROR
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
