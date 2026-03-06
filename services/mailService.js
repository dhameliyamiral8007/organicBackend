import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendOTPEmail(email, otp) {
        try {
            const mailOptions = {
                from: `"Organic Backend" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Password Reset OTP",
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">Organic Backend</h2>
            <p>Hello,</p>
            <p>You requested to reset your password. Use the OTP below to proceed:</p>
            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Organic Backend. All rights reserved.</p>
          </div>
        `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log("Email sent: %s", info.messageId);
            return info;
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send OTP email");
        }
    }
}

export default new MailService();
