
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "./supabase-config.js";

// Initialize Supabase
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// DOM Elements
const authForm = document.getElementById("authForm");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const nameGroup = document.getElementById("nameGroup");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

const formTitle = document.getElementById("formTitle");
const formDescription = document.getElementById("formDescription");

const switchMode = document.getElementById("switchMode");
const switchText = document.getElementById("switchText");

// Current authentication mode
let mode = "login";

// Show messages
function showMessage(text, isError = false) {
    message.textContent = text;

    message.classList.toggle("error", isError);
}

// Set loading state
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;

    if (isLoading) {
        submitBtn.textContent =
            mode === "signup"
                ? "در حال ساخت حساب..."
                : "در حال ورود...";
    } else {
        submitBtn.textContent =
            mode === "signup"
                ? "ساخت حساب"
                : "ورود";
    }
}

// Switch between login and signup
function setMode(newMode) {
    mode = newMode;

    const isSignup = mode === "signup";

    loginTab.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);

    nameGroup.hidden = !isSignup;
    fullNameInput.required = isSignup;

    passwordInput.autocomplete = isSignup
        ? "new-password"
        : "current-password";

    formTitle.textContent = isSignup
        ? "ساخت حساب کاربری"
        : "خوش برگشتید";

    formDescription.textContent = isSignup
        ? "سفر یادگیری شخصی‌سازی‌شده خود را شروع کنید."
        : "برای ورود به حساب، اطلاعات خود را وارد کنید.";

    switchText.firstChild.textContent = isSignup
        ? "قبلاً ثبت‌نام کرده‌اید؟ "
        : "حساب کاربری ندارید؟ ";

    switchMode.textContent = isSignup
        ? "ورود"
        : "ساخت حساب";

    showMessage("");

    setLoading(false);
}

// Display authentication errors
function handleAuthError(error) {
    console.error("Authentication Error:", error);

    const errorMessages = {
        "Invalid login credentials":
            "ایمیل یا رمز عبور اشتباه است. لطفاً اطلاعات خود را بررسی کنید.",

        "Email not confirmed":
            "لطفاً پیش از ورود، ایمیل خود را تأیید کنید.",

        "User already registered":
            "این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.",

        "Password should be at least 6 characters":
            "رمز عبور باید حداقل ۶ کاراکتر باشد.",

        "Unable to validate email address":
            "لطفاً یک آدرس ایمیل معتبر وارد کنید."
    };

    const friendlyMessage =
        errorMessages[error.message] ||
        error.message ||
        "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";

    showMessage(friendlyMessage, true);
}

// Login
async function loginUser(email, password) {
    const { data, error } =
        await supabase.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        throw error;
    }

    if (!data.session) {
        throw new Error("ورود ناموفق بود. نشستی ایجاد نشد.");
    }

    showMessage("ورود موفق! در حال انتقال...");

    window.location.replace("index.html");
}

// Signup
async function signupUser(email, password, fullName) {
    if (!fullName) {
        throw new Error("لطفاً نام کامل خود را وارد کنید.");
    }

    if (password.length < 8) {
        throw new Error(
            "رمز عبور باید حداقل ۸ کاراکتر باشد."
        );
    }

    const { data, error } =
        await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

    if (error) {
        throw error;
    }

    // Email confirmation is disabled
    if (data.session) {
        showMessage(
            "حساب با موفقیت ساخته شد! در حال انتقال..."
        );

        window.location.replace("index.html");

        return;
    }

    // Email confirmation is enabled
    showMessage(
        "حساب با موفقیت ساخته شد! لطفاً ایمیل خود را بررسی و حساب را تأیید کنید، سپس وارد شوید."
    );

    authForm.reset();

    setMode("login");
}

// Form submission
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    showMessage("");

    setLoading(true);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = fullNameInput.value.trim();

    try {
        if (!email || !password) {
            throw new Error(
                "لطفاً ایمیل و رمز عبور را وارد کنید."
            );
        }

        if (mode === "signup") {
            await signupUser(
                email,
                password,
                fullName
            );
        } else {
            await loginUser(
                email,
                password
            );
        }

    } catch (error) {
        handleAuthError(error);

    } finally {
        setLoading(false);
    }
});

// Tab events
loginTab.addEventListener("click", () => {
    setMode("login");
});

signupTab.addEventListener("click", () => {
    setMode("signup");
});

// Switch mode link
switchMode.addEventListener("click", () => {
    setMode(
        mode === "login"
            ? "signup"
            : "login"
    );
});

// Check existing session
async function checkExistingSession() {
    try {
        const {
            data: { session },
            error
        } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        if (session) {
            window.location.replace("index.html");
        }

    } catch (error) {
        console.error(
            "Session Check Error:",
            error
        );
    }
}

// Initialize
setMode("login");

checkExistingSession();
