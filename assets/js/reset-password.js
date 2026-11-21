
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

const form = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput =
    document.getElementById("confirmPassword");

const submitBtn = document.getElementById("submitBtn");
const btnLabel = submitBtn.querySelector("span");
const message = document.getElementById("message");

let recoveryReady = false;

// Check whether the recovery link created a valid session.
const { data: { session }, error } =
    await supabase.auth.getSession();

if (error) {
    console.error(error);
}

recoveryReady = Boolean(session);

if (!recoveryReady) {
    form.hidden = true;

    message.textContent =
        "لینک بازیابی نامعتبر یا منقضی شده است. لطفاً لینک جدیدی درخواست کنید.";

    message.classList.add("error");
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
        recoveryReady = true;
        form.hidden = false;
        message.textContent = "";
        message.classList.remove("error");
    }
});

// Update password
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!recoveryReady) {
        message.textContent =
            "نشست بازیابی نامعتبر یا منقضی شده است.";

        message.classList.add("error");
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 8) {
        message.textContent =
            "رمز عبور باید حداقل ۸ کاراکتر باشد.";

        message.classList.add("error");
        return;
    }

    if (password !== confirmPassword) {
        message.textContent =
            "رمزهای عبور یکسان نیستند.";

        message.classList.add("error");
        return;
    }

    submitBtn.disabled = true;
    btnLabel.textContent = "در حال به‌روزرسانی...";

    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            throw error;
        }

        message.classList.remove("error");

        message.textContent =
            "رمز عبور با موفقیت به‌روزرسانی شد!";

        form.reset();

        recoveryReady = false;

        await supabase.auth.signOut();

        setTimeout(() => {
            window.location.replace("auth.html");
        }, 2000);

    } catch (error) {
        console.error("Update Password Error:", error);

        message.textContent =
            error.message || "به‌روزرسانی رمز عبور ممکن نشد.";

        message.classList.add("error");

    } finally {
        submitBtn.disabled = false;
        btnLabel.textContent = "به‌روزرسانی رمز عبور";
    }
});
