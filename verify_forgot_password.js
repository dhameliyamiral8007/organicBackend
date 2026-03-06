import userService from "./services/userService.js";
import User from "./models/User.js";
import { sequelize } from "./config/sequelize.js";

async function testFlow() {
    try {
        console.log("--- Starting Forgot Password Flow Test ---");

        const testEmail = "dhameliyamiral8007@gmail.com"; // Using the user's email for testing results
        const role = "admin";

        // 1. Forgot Password
        console.log(`\n1. Calling forgotPassword for ${testEmail} (${role})`);
        try {
            const forgotRes = await userService.forgotPassword(testEmail, role);
            console.log("Response:", forgotRes);
        } catch (err) {
            console.log("Expected error if admin doesn't exist:", err.message);
            // Create a dummy admin for testing if it doesn't exist
            const [admin, created] = await User.findOrCreate({
                where: { email: testEmail, role: "admin" },
                defaults: {
                    name: "Test Admin",
                    password: "dummy_password",
                    is_active: true
                }
            });
            if (created) console.log("Created dummy admin for testing.");
            const forgotRes = await userService.forgotPassword(testEmail, role);
            console.log("Response after creation:", forgotRes);
        }

        // 2. Intercept OTP from DB
        const user = await User.findOne({ where: { email: testEmail, role } });
        const otp = user.reset_password_token;
        console.log(`\n2. Intercepted OTP from DB: ${otp}`);

        // 3. Verify OTP
        console.log(`\n3. Calling verifyOTP with ${otp}`);
        const verifyRes = await userService.verifyOTP(testEmail, otp, role);
        console.log("Response:", verifyRes);

        // 4. Reset Password
        const newPass = "NewSecurePassword123!";
        console.log(`\n4. Calling resetPassword with new password`);
        const resetRes = await userService.resetPassword(testEmail, otp, newPass, role);
        console.log("Response:", resetRes);

        // 5. Verify User Record
        const updatedUser = await User.findOne({ where: { email: testEmail, role } });
        console.log(`\n5. Checking DB for cleared fields:`);
        console.log(`OTP Token: ${updatedUser.reset_password_token}`);
        console.log(`OTP Expires: ${updatedUser.reset_password_expires}`);

        console.log("\n--- Test Completed Successfully ---");
        process.exit(0);
    } catch (error) {
        console.error("\n--- Test Failed ---");
        console.error(error);
        process.exit(1);
    }
}

testFlow();
