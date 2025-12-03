import { Resend } from "resend";

const isResendEnabled = process.env.RESEND_ENABLED === "true";
const apiKey = process.env.RESEND_API_KEY;

// Initialize Resend only if enabled and API key is present
// Otherwise export a mock or null to prevent crashes
const resend = (isResendEnabled && apiKey)
    ? new Resend(apiKey)
    : null;

export default resend;
