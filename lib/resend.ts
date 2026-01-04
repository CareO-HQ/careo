import { Resend } from "resend";

// Initialize Resend with proper error handling
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error("❌ RESEND_API_KEY is not set in environment variables!");
  console.error("Please add it to .env.local and restart the server");
}

const resend = new Resend(apiKey || "dummy_key_will_fail");

export default resend;
