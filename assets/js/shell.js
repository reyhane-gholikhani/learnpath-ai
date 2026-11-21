// ---------------------------------
// قالب مشترک همه صفحه‌های برنامه
// (منوی کناری، نوار بالا، منوی پایین موبایل، تغییر تم، آیکون‌ها)
// ---------------------------------

const ICONS = {
    dashboard:
        '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    target:
        '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    route:
        '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    sun:
        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    logout:
        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    sparkles:
        '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    trophy:
        '<path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4"/><path d="M12 15v4M8 21h8M10 19h4"/>',
    quiz:
        '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"/><path d="M12 18h.01"/>',
    wand:
        '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M3 21l9-9"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar:
        '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    graduation:
        '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
};

export function icon(name) {
    return (
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (ICONS[name] || "") +
        "</svg>"
    );
}

export function iconEl(name, className = "icon") {
    const span = document.createElement("span");
    span.className = className;
    span.innerHTML = icon(name);
    return span;
}

// دکمه تغییر تم روشن / تاریک (در همه صفحه‌ها، حتی صفحه ورود)
export function setupThemeToggle(toggle) {
    if (!toggle) return;

    const root = document.documentElement;

    const paint = () => {
        const isLight = root.dataset.theme === "light";

        toggle.innerHTML = icon(isLight ? "moon" : "sun");
        toggle.title = isLight ? "حالت تاریک" : "حالت روشن";
        toggle.setAttribute("aria-label", toggle.title);
    };

    toggle.addEventListener("click", () => {
        const next = root.dataset.theme === "light" ? "dark" : "light";

        root.dataset.theme = next;

        try {
            localStorage.setItem("lp-theme", next);
        } catch {
            // اگر ذخیره‌سازی در دسترس نبود، فقط برای همین بازدید اعمال می‌شود
        }

        paint();
    });

    paint();
}

// پنجره تأیید (مثلاً برای حذف). نتیجه true یا false برمی‌گرداند.
export function confirmDialog({ title, text, confirmLabel = "تأیید", cancelLabel = "انصراف" }) {
    const modal = document.getElementById("confirmModal");

    if (!modal) return Promise.resolve(window.confirm(text));

    modal.querySelector("#confirmTitle").textContent = title;
    modal.querySelector("#confirmText").textContent = text;

    const ok = modal.querySelector("#confirmOk");
    const cancel = modal.querySelector("#confirmCancel");

    ok.textContent = confirmLabel;
    cancel.textContent = cancelLabel;

    return new Promise((resolve) => {
        const finish = (value) => {
            modal.hidden = true;
            ok.removeEventListener("click", onOk);
            cancel.removeEventListener("click", onCancel);
            modal.removeEventListener("click", onOverlay);
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };

        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onOverlay = (event) => { if (event.target === modal) finish(false); };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        ok.addEventListener("click", onOk);
        cancel.addEventListener("click", onCancel);
        modal.addEventListener("click", onOverlay);
        document.addEventListener("keydown", onKey);

        modal.hidden = false;
        cancel.focus();
    });
}

const MODALS = `
    <div class="modal-overlay" id="profileModal" hidden>
        <div class="modal">
            <div class="modal-heading">
                <h2>پروفایل من</h2>
                <button id="closeProfileBtn" class="close-btn" type="button" aria-label="بستن">×</button>
            </div>

            <form id="profileForm">
                <div class="profile-photo">
                    <span class="avatar avatar-xl" id="profileAvatarPreview">U</span>
                    <div class="profile-photo-actions">
                        <button type="button" class="mini-btn" id="chooseAvatarBtn"><span data-icon="camera"></span>انتخاب عکس</button>
                        <button type="button" class="mini-btn danger" id="removeAvatarBtn"><span data-icon="trash"></span>حذف عکس</button>
                        <input type="file" id="avatarInput" accept="image/*" hidden>
                    </div>
                </div>

                <label for="profileName">نام نمایشی</label>
                <input id="profileName" type="text" maxlength="60" autocomplete="name" required>

                <p id="profileMessage" class="form-message" role="status"></p>

                <button type="submit" class="primary-btn full-btn" id="saveProfileBtn">ذخیره پروفایل</button>
            </form>
        </div>
    </div>

    <div class="modal-overlay" id="confirmModal" hidden>
        <div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
            <div class="modal-heading"><h2 id="confirmTitle"></h2></div>
            <p id="confirmText" class="confirm-text"></p>
            <div class="quiz-actions">
                <button type="button" class="mini-btn" id="confirmCancel">انصراف</button>
                <button type="button" class="btn btn-danger" id="confirmOk">تأیید</button>
            </div>
        </div>
    </div>
`;

const NAV = [
    { key: "dashboard", href: "index.html", label: "داشبورد", icon: "dashboard", accent: "violet" },
    { key: "goals", href: "goals.html", label: "اهداف من", icon: "target", accent: "coral" },
    { key: "paths", href: "paths.html", label: "مسیرها", icon: "route", accent: "mint" },
    { key: "activity", href: "activity.html", label: "فعالیت‌ها", icon: "activity", accent: "amber" }
];

export function renderShell() {
    const page = document.getElementById("page");

    if (!page) return;

    const current = document.body.dataset.page;

    const links = (className) =>
        NAV.map((item) => {
            const active = item.key === current;

            return (
                `<a href="${item.href}" class="${className}${active ? " active" : ""}" ` +
                `data-accent="${item.accent}"${active ? ' aria-current="page"' : ""}>` +
                `<span class="nav-chip">${icon(item.icon)}</span><span>${item.label}</span></a>`
            );
        }).join("");

    const shell = document.createElement("div");
    shell.className = "shell";

    shell.innerHTML = `
        <aside class="sidebar">
            <a href="index.html" class="brand">
                <span class="brand-mark">${icon("graduation")}</span>
                <span>LearnPath <b>AI</b></span>
            </a>

            <nav class="side-nav" aria-label="منوی اصلی">${links("nav-link")}</nav>

            <div class="side-note">
                ${icon("sparkles")}
                <p>هر موضوعی که تیک بزنید، مسیر را یک قدم جلو می‌برد.</p>
            </div>

            <button id="logoutBtn" class="side-logout" type="button">
                ${icon("logout")}<span>خروج از حساب</span>
            </button>
        </aside>

        <div class="content">
            <header class="topbar">
                <div class="page-heading">
                    <h1></h1>
                    <p></p>
                </div>

                <div class="top-actions">
                    <button id="themeToggle" class="icon-btn" type="button"></button>

                    <button id="profileBtn" class="user-chip" type="button" title="ویرایش پروفایل" aria-label="ویرایش پروفایل">
                        <span class="user-text"><strong id="userName">در حال بارگذاری...</strong></span>
                        <span class="avatar" id="userAvatar">U</span>
                    </button>
                </div>
            </header>

            <div id="pageSlot"></div>

            <footer class="footer">© ۲۰۲۶ LearnPath AI · ساخته‌شده برای یادگیری مداوم</footer>
        </div>

        <nav class="bottom-nav" aria-label="منوی اصلی">${links("bottom-link")}</nav>
    `;

    shell.querySelector("h1").textContent = page.dataset.title || "";
    shell.querySelector(".page-heading p").textContent = page.dataset.sub || "";

    document.body.prepend(shell);
    shell.querySelector("#pageSlot").replaceWith(page);

    setupThemeToggle(shell.querySelector("#themeToggle"));

    // پنجره‌های مشترک (پروفایل و تأیید)
    const holder = document.createElement("div");
    holder.innerHTML = MODALS;
    document.body.append(...holder.children);

    // آیکون‌های ثابت صفحه: <span data-icon="target"></span>
    document.querySelectorAll("[data-icon]").forEach((node) => {
        node.innerHTML = icon(node.dataset.icon);
    });
}
