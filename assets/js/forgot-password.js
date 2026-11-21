
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "./supabase-config.js";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("forgotForm");
const emailInput = document.getElementById("email");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const btnLabel = submitBtn.querySelector("span");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    message.textContent = "";
    submitBtn.disabled = true;
    btnLabel.textContent = "در حال ارسال...";

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: new URL("reset-password.html", window.location.href).href
            }
        );

        if (error) {
            throw error;
        }

        message.textContent =
            "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز عبور برای شما ارسال می‌شود.";

        message.classList.remove("error");

    } catch (error) {
        console.error("Password Reset Error:", error);

        message.textContent =
            error.message || "مشکلی پیش آمد.";

        message.classList.add("error");

    } finally {
        submitBtn.disabled = false;
        btnLabel.textContent = "ارسال لینک بازیابی";
    }
});
