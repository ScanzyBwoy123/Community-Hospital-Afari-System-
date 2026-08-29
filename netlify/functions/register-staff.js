// ============================================================
// COMMUNITY HOSPITAL AFARI
// SECURE STAFF REGISTRATION FUNCTION
// ============================================================
const { createClient } = require("@supabase/supabase-js");
exports.handler = async function (event) {
    // --------------------------------------------------------
    // Only allow POST requests
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
    try {
        // ----------------------------------------------------
        // Read request
        // ----------------------------------------------------
        const body = JSON.parse(event.body || "{}");
        const fullName =
            String(body.fullName || "").trim();
        const staffId =
            String(body.staffId || "").trim();
        const email =
            String(body.email || "").trim().toLowerCase();
        const password =
            String(body.password || "");
        const phone =
            String(body.phone || "").trim();
        const role =
            String(body.role || "").trim();
        const departmentId =
            String(body.departmentId || "").trim();
        // ----------------------------------------------------
        // Validate required fields
        // ----------------------------------------------------
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
                    error: "All staff registration fields are required."
                })
            };
        }
        // ----------------------------------------------------
        // Password validation
        // ----------------------------------------------------
        if (password.length < 8) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Password must contain at least 8 characters."
                })
            };
        }
        // ----------------------------------------------------
        // Supabase environment variables
        // ----------------------------------------------------
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
                    error: "Server authentication system is not configured."
                })
            };
        }
        // ----------------------------------------------------
        // SERVER-SIDE SUPABASE CLIENT
        //
        // IMPORTANT:
        // The service-role key is NEVER sent to the browser.
        // ----------------------------------------------------
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
        // ----------------------------------------------------
        // Verify department exists and is active
        // ----------------------------------------------------
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
                    error: "Unable to verify the selected department."
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
                    error: "The selected department is not available."
                })
            };
        }
        // ----------------------------------------------------
        // Check whether Staff ID already exists
        // ----------------------------------------------------
        const {
            data: existingStaff,
            error: staffCheckError
        } =
            await supabase
                .from("staff_profiles")
                .select("id")
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
                    error: "Unable to verify the Staff ID."
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
                    error: "This Staff ID is already registered."
                })
            };
        }
        // ----------------------------------------------------
        // Create Supabase Auth user
        // ----------------------------------------------------
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
            let message =
                authError.message ||
                "Unable to create the staff account.";
            if (
                message
                    .toLowerCase()
                    .includes("already")
            ) {
                message =
                    "This email address is already registered.";
            }
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: message
                })
            };
        }
        const user =
            authData.user;
        if (!user) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Authentication account was not created."
                })
            };
        }
        // ----------------------------------------------------
        // Create staff profile
        //
        // is_active = false means:
        // NEW STAFF CANNOT ACCESS THE STAFF PORTAL YET.
        // ----------------------------------------------------
        const {
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
                });
        // ----------------------------------------------------
        // If profile creation fails, remove Auth account
        // so we don't leave an incomplete staff account.
        // ----------------------------------------------------
        if (profileError) {
    console.error(
        "Staff profile creation error:",
        profileError
    );

    await supabase.auth.admin.deleteUser(
        user.id
    );

    return {
        statusCode: 500,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            error:
                "Staff profile error: " +
                (profileError.message ||
                    "Unknown database error")
        })
    };
}
        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                message:
                    "Registration submitted successfully. Your account is pending hospital administration approval.",
                staff: {
                    id: user.id,
                    full_name: fullName,
                    staff_id: staffId,
                    role: role,
                    department: department.name,
                    is_active: false
                }
            })
        };
    } catch (error) {
        console.error(
            "CHA register-staff function error:",
            error
        );
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error:
                    "An unexpected server error occurred. Please try again."
            })
        };
    }
};
