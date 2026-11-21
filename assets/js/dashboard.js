import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_URL, SUPABASE_KEY } from "./supabase-config.js";
import { N8N_WEBHOOK_URL } from "./n8n-config.js";
import { renderShell, icon, iconEl, confirmDialog } from "./shell.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// آدرس workflow آزمون: همان آدرس workflow اصلی با نام learnpath-quiz
const QUIZ_WEBHOOK_URL = N8N_WEBHOOK_URL.replace(
    /learnpath-generate\/?$/,
    "learnpath-quiz"
);

// آدرس workflow اصلاح برنامه: learnpath-revise
const REVISE_WEBHOOK_URL = N8N_WEBHOOK_URL.replace(
    /learnpath-generate\/?$/,
    "learnpath-revise"
);

// ---------------------------------
// عناصر صفحه
// ---------------------------------

// منوی کناری، نوار بالا و تم را می‌سازد (همه صفحه‌ها یک کد مشترک دارند)
renderShell();

const $ = (id) => document.getElementById(id);

// فقط اگر عنصر در این صفحه وجود داشت، متنش را عوض می‌کند
const setText = (id, text) => {
    const node = $(id);
    if (node) node.textContent = text;
};

// محیط حلقه پیشرفت (۲ × π × شعاع ۵۴)
const RING_LENGTH = 339.292;

const userName = $("userName");
const userAvatar = $("userAvatar");


const goalsList = $("goalsList");
const pathsList = $("pathsList");
const activityList = $("activityList");

const goalModal = $("goalModal");
const goalForm = $("goalForm");
const goalMessage = $("goalMessage");
const saveGoalBtn = $("saveGoalBtn");

let currentUser = null;

// مسیرهای بارگذاری‌شده (برای محاسبه میانگین پیشرفت بدون درخواست دوباره)
let pathsState = [];

// نمره آخرین آزمون هر هفته: "pathId-weekIndex" => نمره
const quizScores = new Map();

// اهداف بارگذاری‌شده (برای دانستن سطح کاربر هنگام ساخت آزمون)
const goalsById = new Map();

const LEVEL_LABELS = {
    beginner: "مبتدی",
    intermediate: "متوسط",
    advanced: "پیشرفته"
};

const STATUS_LABELS = {
    active: "در حال انجام",
    in_progress: "در حال انجام",
    pending: "در انتظار",
    paused: "متوقف‌شده",
    completed: "تکمیل‌شده",
    archived: "بایگانی‌شده"
};

// ---------------------------------
// توابع کمکی
// ---------------------------------

const faNum = (n) => Number(n).toLocaleString("fa-IR");

// عنوان هفته گاهی خودش با «هفته ۴:» شروع می‌شود؛ پیشوند تکراری حذف می‌شود
function cleanWeekTitle(title) {
    return String(title || "")
        .replace(/^\s*هفته\s*[0-9۰-۹]+\s*[:：\-–—]?\s*/, "")
        .trim();
}

// ساخت امن عنصر HTML (متن همیشه با textContent گذاشته می‌شود)
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function showGoalMessage(message, isError = false) {
    goalMessage.textContent = message;
    goalMessage.classList.toggle("error", isError);
}

function formatDate(dateString) {
    if (!dateString) return "تاریخ نامشخص";

    return new Date(dateString).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function showProgress(value) {
    const safeValue = Math.max(0, Math.min(100, value));

    setText("ringValue", `${faNum(safeValue)}٪`);

    const ring = $("ringFill");

    if (ring) {
        ring.style.strokeDashoffset = String(RING_LENGTH * (1 - safeValue / 100));
    }
}

// پیام کوتاه پایین صفحه (مثلاً «پیشرفت ذخیره شد»)
let toastTimer = null;

function showToast(message, isError = false) {
    let toast = $("toast");

    if (!toast) {
        toast = el("div", "toast");
        toast.id = "toast";
        toast.setAttribute("role", "status");
        document.body.append(toast);
    }

    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ---------------------------------
// بررسی ورود کاربر
// ---------------------------------

async function checkAuthentication() {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (!data.session) {
        window.location.replace("auth.html");
        return null;
    }

    return data.session.user;
}

// ---------------------------------
// پروفایل
// ---------------------------------

// نام و عکس پروفایل کاربر
let profile = { name: "کاربر", avatar: null };

// اگر ستون avatar_url هنوز در Supabase ساخته نشده باشد، false می‌شود
let avatarColumnReady = true;

function paintAvatar(node, name, url) {
    node.replaceChildren();

    if (url) {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        node.append(image);
    } else {
        node.textContent = (name || "?").trim().charAt(0).toUpperCase();
    }
}

function paintProfile() {
    userName.textContent = profile.name;
    paintAvatar(userAvatar, profile.name, profile.avatar);

    setText("heroName", profile.name.split(" ")[0]);
}

async function loadProfile() {
    let { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        // احتمالاً ستون avatar_url هنوز ساخته نشده؛ فقط نام را می‌خوانیم
        avatarColumnReady = false;

        ({ data, error } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", currentUser.id)
            .maybeSingle());

        if (error) throw error;
    }

    profile = {
        name: data?.full_name || currentUser.user_metadata?.full_name || "کاربر",
        avatar: data?.avatar_url || null
    };

    paintProfile();
}

// ---------------------------------
// محاسبه پیشرفت مسیر
// ---------------------------------

// هر مورد قابل تیک‌زدن یک کلید دارد:
//   w{شماره هفته}-t{شماره موضوع}  یا  w{شماره هفته}-p (تمرین)  یا  final (پروژه نهایی)
function weekItemKeys(week, weekIndex) {
    const keys = [];

    (week.topics || []).forEach((_, topicIndex) => {
        keys.push(`w${weekIndex}-t${topicIndex}`);
    });

    if (week.practice) keys.push(`w${weekIndex}-p`);

    return keys;
}

function pathItemKeys(plan) {
    const keys = [];

    (plan.weeks || []).forEach((week, weekIndex) => {
        keys.push(...weekItemKeys(week, weekIndex));
    });

    if (plan.final_project) keys.push("final");

    return keys;
}

function calcPercent(plan, progress) {
    const keys = pathItemKeys(plan);

    if (!keys.length) return 0;

    const done = keys.filter((key) => progress?.[key] === true).length;

    return Math.round((done / keys.length) * 100);
}

function showAverageProgress() {
    if (!pathsState.length) {
        showProgress(0);
        return;
    }

    const total = pathsState.reduce(
        (sum, row) => sum + calcPercent(row.plan || {}, row.progress),
        0
    );

    showProgress(Math.round(total / pathsState.length));
}

// ---------------------------------
// آمار داشبورد
// ---------------------------------

async function loadStatistics() {
    const [goalsResult, pathsResult, completedResult] =
        await Promise.all([
            supabase
                .from("learning_goals")
                .select("*", { count: "exact", head: true }),

            supabase
                .from("learning_paths")
                .select("*", { count: "exact", head: true }),

            supabase
                .from("learning_goals")
                .select("*", { count: "exact", head: true })
                .eq("status", "completed")
        ]);

    if (goalsResult.error) throw goalsResult.error;
    if (pathsResult.error) throw pathsResult.error;
    if (completedResult.error) throw completedResult.error;

    setText("goalsCount", faNum(goalsResult.count ?? 0));
    setText("pathsCount", faNum(pathsResult.count ?? 0));
    setText("completedCount", faNum(completedResult.count ?? 0));

    const scores = [...quizScores.values()];

    setText(
        "quizAvg",
        scores.length
            ? `${faNum(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))}٪`
            : "—"
    );

    // میانگین پیشرفت از روی تیک‌های مسیرها محاسبه می‌شود
    showAverageProgress();
}

// ---------------------------------
// ثبت فعالیت‌ها (بخش «فعالیت‌های اخیر»)
// ---------------------------------

// رویدادهایی که در این نشست ثبت شده‌اند (برای جلوگیری از ثبت تکراری)
const loggedEvents = new Set();

async function logActivity(action, note, percent = null) {
    try {
        const { error } = await supabase.from("progress_logs").insert({
            user_id: currentUser.id,
            action,
            note,
            progress_percent: percent
        });

        if (error) throw error;

        await loadActivities();
    } catch (error) {
        console.warn("Activity log skipped:", error);
    }
}

// ---------------------------------
// ذخیره پیشرفت
// ---------------------------------

const saveTimers = new Map();

function scheduleSave(row, percent) {
    clearTimeout(saveTimers.get(row.id));

    saveTimers.set(
        row.id,
        setTimeout(() => saveProgress(row, percent), 500)
    );
}

async function saveProgress(row, percent) {
    const { error } = await supabase
        .from("learning_paths")
        .update({ progress: row.progress })
        .eq("id", row.id);

    if (error) {
        console.error("Save progress error:", error);
        showToast(
            "ذخیره پیشرفت ممکن نشد. فایل supabase/schema.sql را در Supabase اجرا کرده‌اید؟",
            true
        );
        return;
    }

    showToast("پیشرفت ذخیره شد");

    await syncGoalStatus(row, percent);
}

// وقتی همه موارد یک مسیر تیک خورد، هدف مربوطه «تکمیل‌شده» می‌شود
async function syncGoalStatus(row, percent) {
    if (!row.goal_id) return;

    const isDone = percent === 100;

    if (isDone === row._wasDone) return;

    row._wasDone = isDone;

    if (isDone && !loggedEvents.has(`done-${row.id}`)) {
        loggedEvents.add(`done-${row.id}`);

        logActivity(
            "تکمیل مسیر",
            `مسیر «${row.title || "یادگیری"}» را کامل کردید`,
            100
        );
    }

    const { error } = await supabase
        .from("learning_goals")
        .update({ status: isDone ? "completed" : "active" })
        .eq("id", row.goal_id);

    if (error) {
        console.warn("Goal status update skipped:", error);
        return;
    }

    try {
        const goalIds = new Set(pathsState.map((p) => String(p.goal_id)));
        await Promise.all([loadGoals(goalIds), loadStatistics()]);
    } catch (refreshError) {
        console.error("Refresh error:", refreshError);
    }
}

// ---------------------------------
// نمایش مسیر یادگیری ساخته‌شده توسط هوش مصنوعی
// ---------------------------------

function buildList(label, items) {
    const block = el("div", "week-block");
    block.append(el("strong", "", label));

    const list = el("ul");
    items.forEach((item) => list.append(el("li", "", String(item))));

    block.append(list);
    return block;
}

// یک مورد تیک‌دار
function buildCheckItem(text, key, row, onToggle) {
    const label = el("label", "check-item");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = row.progress[key] === true;
    input.addEventListener("change", () => onToggle(key, input.checked));

    label.append(input, el("span", "", text));

    return label;
}

function buildPathBody(plan, row, onToggle, weekViews) {
    const body = el("div", "path-body");

    if (plan.summary) {
        body.append(el("p", "path-summary", plan.summary));
    }

    if (plan.last_revision?.summary) {
        body.append(
            el(
                "p",
                "path-revision",
                `آخرین اصلاح برنامه (${formatDate(plan.last_revision.at)}): ${plan.last_revision.summary}`
            )
        );
    }

    const pathTools = el("div", "path-tools");
    const reviseBtn = el("button", "mini-btn", "اصلاح برنامه بر اساس پیشرفت");
    reviseBtn.type = "button";
    reviseBtn.prepend(iconEl("wand"));
    reviseBtn.addEventListener("click", () => startRevision(row));
    pathTools.append(reviseBtn);
    body.append(pathTools);

    (plan.weeks || []).forEach((week, weekIndex) => {
        const box = el("div", "week");

        const count = el("span", "week-count", "");
        const head = el("div", "week-head");

        // نمره آخرین آزمون این هفته
        const badge = el("span", "quiz-badge");

        const setBadge = (score) => {
            const hasScore = score !== null && score !== undefined;

            badge.hidden = !hasScore;

            if (hasScore) {
                badge.textContent = `آزمون: ${faNum(score)}٪`;
                badge.classList.toggle("good", score >= 70);
                badge.classList.toggle("low", score < 70);
            }
        };

        setBadge(quizScores.get(`${row.id}-${weekIndex}`));

        const quizBtn = el("button", "mini-btn", "آزمون هفته");
        quizBtn.type = "button";
        quizBtn.prepend(iconEl("quiz"));
        quizBtn.addEventListener("click", () =>
            openQuiz(row, week, weekIndex, setBadge)
        );

        const tools = el("div", "week-tools");
        tools.append(badge, count, quizBtn);

        head.append(
            el("h4", "", `هفته ${faNum(week.week)}: ${cleanWeekTitle(week.title)}`),
            tools
        );

        box.append(head);

        if (week.objectives?.length) {
            box.append(buildList("اهداف", week.objectives));
        }

        if (week.topics?.length) {
            const block = el("div", "week-block");
            block.append(el("strong", "", "موضوعات (انجام‌شده‌ها را تیک بزنید)"));

            const list = el("div", "check-list");

            week.topics.forEach((topic, topicIndex) => {
                list.append(
                    buildCheckItem(
                        String(topic),
                        `w${weekIndex}-t${topicIndex}`,
                        row,
                        onToggle
                    )
                );
            });

            block.append(list);
            box.append(block);
        }

        if (week.practice) {
            const block = el("div", "week-block");
            block.append(el("strong", "", "تمرین عملی"));

            const list = el("div", "check-list");
            list.append(
                buildCheckItem(
                    String(week.practice),
                    `w${weekIndex}-p`,
                    row,
                    onToggle
                )
            );

            block.append(list);
            box.append(block);
        }

        if (week.resources?.length) {
            box.append(buildList("منابع پیشنهادی", week.resources));
        }

        weekViews.push({
            box,
            count,
            index: weekIndex,
            title: cleanWeekTitle(week.title) || `هفته ${faNum(week.week)}`,
            wasDone: false,
            keys: weekItemKeys(week, weekIndex)
        });

        body.append(box);
    });

    if (plan.final_project) {
        const box = el("div", "week extra");
        box.append(el("h4", "", "پروژه نهایی"));

        const list = el("div", "check-list");
        list.append(
            buildCheckItem(String(plan.final_project), "final", row, onToggle)
        );

        box.append(list);
        body.append(box);
    }

    if (plan.tips?.length) {
        const box = el("div", "week extra");
        box.append(buildList("نکات مهم", plan.tips));
        body.append(box);
    }

    return body;
}

function buildPathCard(row, open) {
    const plan = row.plan || {};

    // پیشرفت ذخیره‌شده: { "w0-t1": true, ... }
    row.progress =
        row.progress && typeof row.progress === "object" ? row.progress : {};

    const card = el("details", "path-card");
    card.open = open;
    card.dataset.accent = accentName(row.goal_id);

    // ---- سرتیتر ----
    const summary = el("summary");
    const head = el("div", "path-head");

    head.append(
        el("strong", "", row.title || plan.title || "مسیر یادگیری")
    );

    const weeks = Array.isArray(plan.weeks) ? plan.weeks.length : 0;

    head.append(
        el("small", "", `${faNum(weeks)} هفته · ${formatDate(row.created_at)}`)
    );

    const bar = el("div", "path-progress");
    const fill = el("span", "path-progress-fill");
    bar.append(fill);

    const percentLabel = el("span", "percent-pill", "");

    const progressBox = el("div", "path-progress-box");
    progressBox.append(bar, percentLabel, iconEl("chevron", "chevron"));

    summary.append(iconEl("route", "path-icon"), head, progressBox);

    // ---- به‌روزرسانی نمایش ----
    const weekViews = [];

    // نمایش را به‌روز می‌کند و هفته‌هایی را که همین حالا کامل شده‌اند برمی‌گرداند
    function refreshView() {
        const percent = calcPercent(plan, row.progress);
        const newlyDone = [];

        fill.style.width = `${percent}%`;
        percentLabel.textContent = `${faNum(percent)}٪`;

        weekViews.forEach((view) => {
            const done = view.keys.filter(
                (key) => row.progress[key] === true
            ).length;

            const isDone = view.keys.length > 0 && done === view.keys.length;

            view.count.textContent =
                `${faNum(done)} از ${faNum(view.keys.length)}`;

            view.box.classList.toggle("done", isDone);

            if (isDone && !view.wasDone) newlyDone.push(view);

            view.wasDone = isDone;
        });

        return { percent, newlyDone };
    }

    function onToggle(key, checked) {
        if (checked) {
            row.progress[key] = true;
        } else {
            delete row.progress[key];
        }

        const { percent, newlyDone } = refreshView();

        showAverageProgress();
        scheduleSave(row, percent);

        newlyDone.forEach((view) => {
            const eventKey = `week-${row.id}-${view.index}`;

            if (loggedEvents.has(eventKey)) return;

            loggedEvents.add(eventKey);

            logActivity("تکمیل هفته", `${view.title} را کامل کردید`, percent);
        });
    }

    card.append(summary, buildPathBody(plan, row, onToggle, weekViews));

    row._wasDone = refreshView().percent === 100;

    return card;
}

// رنگ هر هدف (برای هدف، مسیر و پیشرفتش یکسان است)
const ACCENTS = ["violet", "mint", "coral", "amber", "sky", "pink"];

function accentName(key) {
    let hash = 0;

    for (const ch of String(key)) {
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }

    return ACCENTS[hash % ACCENTS.length];
}

function emptyState(iconName, title, text, action) {
    const box = el("div", "empty");

    box.append(iconEl(iconName, "empty-icon"), el("strong", "", title), el("p", "", text));

    if (action) {
        const link = el("a", "btn btn-primary", action.label);
        link.href = action.href;
        box.append(link);
    }

    return box;
}

function chip(iconName, text) {
    const node = el("span", "chip");

    if (iconName) node.append(iconEl(iconName));

    node.append(document.createTextNode(text));

    return node;
}

// کارت بزرگ بالای داشبورد: مسیر فعلی و قدم بعدی
function renderHero() {
    const link = $("heroLink");

    if (!link) return;

    const path =
        pathsState.find((p) => calcPercent(p.plan || {}, p.progress) < 100) ||
        pathsState[0];

    if (!path) {
        setText("heroPath", "اولین مسیر یادگیری‌تان را بسازید");
        setText(
            "heroNext",
            "یک هدف بنویسید تا هوش مصنوعی مسیر هفته‌به‌هفته‌اش را طراحی کند."
        );
        link.textContent = "ساخت اولین هدف";
        link.href = "goals.html#new";
        return;
    }

    const weeks = path.plan?.weeks || [];
    const progress = path.progress || {};

    const nextIndex = weeks.findIndex((week, weekIndex) =>
        weekItemKeys(week, weekIndex).some((key) => progress[key] !== true)
    );

    setText("heroPath", path.title || path.plan?.title || "مسیر یادگیری");

    setText(
        "heroNext",
        nextIndex === -1
            ? "همه هفته‌ها را کامل کرده‌اید. تبریک!"
            : `قدم بعدی: هفته ${faNum(nextIndex + 1)} · ${cleanWeekTitle(weeks[nextIndex].title)}`
    );

    link.textContent = "ادامه مسیر";
    link.href = `paths.html#path-${path.id}`;
}

async function loadPaths() {
    await loadQuizScores();

    const { data, error } = await supabase
        .from("learning_paths")
        .select("id, goal_id, title, plan, progress, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load paths error:", error);
        pathsState = [];

        pathsList?.replaceChildren(
            emptyState(
                "route",
                "بارگذاری مسیرها ممکن نشد",
                "فایل supabase/schema.sql را یک‌بار در Supabase اجرا کنید."
            )
        );

        return [];
    }

    pathsState = data;
    renderHero();

    if (!pathsList) return data;

    pathsList.replaceChildren();

    if (!data.length) {
        pathsList.append(
            emptyState(
                "route",
                "هنوز مسیری ندارید",
                "یک هدف بسازید تا هوش مصنوعی مسیر هفته‌به‌هفته‌اش را طراحی کند.",
                { href: "goals.html#new", label: "ساخت اولین هدف" }
            )
        );

        return data;
    }

    // لینک paths.html#path-<id> همان مسیر را باز می‌کند
    const wanted = location.hash.startsWith("#path-")
        ? location.hash.slice(6)
        : null;

    data.forEach((row, index) => {
        const card = buildPathCard(row, wanted ? row.id === wanted : index === 0);
        card.id = `path-${row.id}`;
        pathsList.append(card);
    });

    if (wanted) {
        document.getElementById(`path-${wanted}`)?.scrollIntoView({ block: "start" });
    }

    return data;
}

// ---------------------------------
// اهداف یادگیری
// ---------------------------------

function buildGoalCard(goal, path) {
    const card = el("article", "goal-card");
    card.dataset.accent = accentName(goal.id);

    const main = el("div", "goal-main");
    main.append(el("strong", "", goal.title));

    if (goal.description) {
        main.append(el("p", "goal-desc", goal.description));
    }

    const meta = el("div", "goal-meta");

    meta.append(
        chip(null, LEVEL_LABELS[goal.current_level] || goal.current_level),
        chip("clock", `${faNum(goal.weekly_hours || 0)} ساعت در هفته`)
    );

    if (goal.target_date) {
        meta.append(chip("calendar", `تا ${formatDate(goal.target_date)}`));
    }

    main.append(meta);

    const side = el("div", "goal-side");

    side.append(
        el(
            "span",
            `status-pill status-${goal.status || "active"}`,
            STATUS_LABELS[goal.status] || goal.status || "—"
        )
    );

    if (path) {
        const percent = calcPercent(path.plan || {}, path.progress);

        const bar = el("div", "mini-bar");
        const fill = el("span");
        fill.style.width = `${percent}%`;
        bar.append(fill);

        const link = el("a", "mini-btn", `مسیر · ${faNum(percent)}٪`);
        link.href = `paths.html#path-${path.id}`;
        link.prepend(iconEl("route"));

        side.append(bar, link);
    } else {
        const button = el("button", "mini-btn", "ساخت مسیر با AI");
        button.type = "button";
        button.prepend(iconEl("sparkles"));
        button.addEventListener("click", () => retryPath(goal, button));

        side.append(button);
    }

    const remove = el("button", "mini-btn danger", "حذف");
    remove.type = "button";
    remove.title = "حذف هدف";
    remove.setAttribute("aria-label", `حذف هدف ${goal.title}`);
    remove.prepend(iconEl("trash"));
    remove.addEventListener("click", () => deleteGoal(goal, path));

    side.append(remove);

    card.append(iconEl("target", "goal-icon"), main, side);

    return card;
}

// حذف کامل یک هدف همراه با مسیر، پیشرفت و آزمون‌هایش
async function deleteGoal(goal, path) {
    const ok = await confirmDialog({
        title: "این هدف حذف شود؟",
        text: path
            ? `«${goal.title}» همراه با مسیر یادگیری، تیک‌های پیشرفت و آزمون‌هایش برای همیشه حذف می‌شود. این کار برگشت‌پذیر نیست.`
            : `«${goal.title}» برای همیشه حذف می‌شود. این کار برگشت‌پذیر نیست.`,
        confirmLabel: "بله، حذف شود"
    });

    if (!ok) return;

    const { data, error } = await supabase
        .from("learning_goals")
        .delete()
        .eq("id", goal.id)
        .select("id");

    if (error || !data?.length) {
        console.error("Delete goal error:", error);
        showToast(
            "حذف هدف ممکن نشد. فایل supabase/schema.sql را یک‌بار در Supabase اجرا کنید.",
            true
        );
        return;
    }

    // مسیرهای این هدف (آزمون‌هایشان خودکار همراه آن‌ها پاک می‌شود)
    const { error: pathError } = await supabase
        .from("learning_paths")
        .delete()
        .eq("goal_id", String(goal.id));

    if (pathError) console.error("Delete paths error:", pathError);

    showToast("هدف حذف شد");

    logActivity("حذف هدف", `هدف «${goal.title}» حذف شد`, null);

    await refreshAll();
}

async function loadGoals() {
    const { data, error } = await supabase
        .from("learning_goals")
        .select(
            "id, title, description, current_level, weekly_hours, target_date, status, created_at"
        )
        .order("created_at", { ascending: false });

    if (error) throw error;

    goalsById.clear();
    data.forEach((goal) => goalsById.set(String(goal.id), goal));

    if (!goalsList) return;

    const limit = Number(goalsList.dataset.limit) || data.length;
    const pathByGoal = new Map(pathsState.map((p) => [String(p.goal_id), p]));

    goalsList.replaceChildren();

    if (!data.length) {
        goalsList.append(
            emptyState(
                "target",
                "هنوز هدفی ندارید",
                "اولین هدف یادگیری‌تان را بنویسید؛ بقیه‌اش با هوش مصنوعی.",
                { href: "goals.html#new", label: "ساخت هدف" }
            )
        );

        return;
    }

    data.slice(0, limit).forEach((goal) => {
        goalsList.append(buildGoalCard(goal, pathByGoal.get(String(goal.id))));
    });
}

// ---------------------------------
// فعالیت‌های اخیر
// ---------------------------------

const ACTIVITY_STYLES = {
    "ساخت مسیر": ["route", "violet"],
    "تکمیل هفته": ["check", "mint"],
    "تکمیل مسیر": ["trophy", "amber"],
    "آزمون هفتگی": ["quiz", "sky"],
    "اصلاح برنامه": ["wand", "pink"],
    "حذف هدف": ["trash", "coral"]
};

async function loadActivities() {
    if (!activityList) return;

    const limit = Number(activityList.dataset.limit) || 5;

    const { data, error } = await supabase
        .from("progress_logs")
        .select("action, note, logged_at")
        .order("logged_at", { ascending: false })
        .limit(limit);

    if (error) throw error;

    activityList.replaceChildren();

    if (!data.length) {
        activityList.append(
            emptyState(
                "activity",
                "هنوز فعالیتی ثبت نشده",
                "با تیک‌زدن موضوع‌ها و دادن آزمون، پیشرفت شما اینجا نمایش داده می‌شود."
            )
        );

        return;
    }

    data.forEach((activity) => {
        const [iconName, tone] = ACTIVITY_STYLES[activity.action] || ["activity", "violet"];

        const item = el("div", "activity-item");
        item.dataset.accent = tone;

        const text = el("div", "activity-text");
        text.append(
            el("strong", "", activity.action),
            el("small", "", activity.note || "فعالیت یادگیری")
        );

        item.append(
            iconEl(iconName, "activity-icon"),
            text,
            el("time", "activity-date", formatDate(activity.logged_at))
        );

        activityList.append(item);
    });
}

// ---------------------------------
// اتصال به n8n (AI Agent)
// ---------------------------------

async function postToN8n(url, payload) {
    if (!url || url.includes("PASTE")) {
        throw new Error(
            "آدرس webhook مربوط به n8n هنوز در فایل assets/js/n8n-config.js وارد نشده است."
        );
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید.");
    }

    const body = {
        access_token: session.access_token,
        ...payload
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150000);

    let response;

    try {
        // درخواست به‌صورت فرم ارسال می‌شود تا مرورگر درخواست
        // preflight (OPTIONS) نفرستد و با CORS در n8n مشکلی پیش نیاید.
        response = await fetch(url, {
            method: "POST",
            body: new URLSearchParams({ payload: JSON.stringify(body) }),
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("پاسخ n8n بیش از حد طول کشید. دوباره تلاش کنید.");
        }

        throw new Error(
            "پاسخی از n8n نرسید. معمولاً یعنی سقف رایگان روزانه Gemini پر شده و n8n منتظر مانده است؛ چند ساعت بعد دوباره امتحان کنید. اگر باز هم نشد، آدرس webhook و فعال‌بودن workflow را بررسی کنید."
        );
    } finally {
        clearTimeout(timer);
    }

    if (response.status === 401) {
        throw new Error("تأیید هویت در n8n ناموفق بود. دوباره وارد حساب شوید.");
    }

    if (response.status === 404) {
        throw new Error(
            "workflow موردنظر در n8n پیدا نشد یا فعال (Active/Publish) نیست."
        );
    }

    // n8n وقتی سقف رایگان Gemini پر شده باشد، 503 (یا 429) برمی‌گرداند
    if (response.status === 503 || response.status === 429) {
        throw new Error(
            "هوش مصنوعی موقتاً در دسترس نیست؛ سقف رایگان روزانه پر شده است. چند ساعت بعد دوباره تلاش کنید."
        );
    }

    if (!response.ok) {
        throw new Error(`n8n خطا برگرداند (کد ${response.status}).`);
    }

    try {
        return await response.json();
    } catch {
        throw new Error("پاسخ n8n قابل خواندن نبود.");
    }
}

async function requestPlan(goal) {
    const body = await postToN8n(N8N_WEBHOOK_URL, {
        goal: {
            title: goal.title,
            description: goal.description || "",
            current_level: goal.current_level,
            weekly_hours: goal.weekly_hours,
            target_date: goal.target_date || null
        }
    });

    const plan = body?.output ?? body;

    if (!plan || !Array.isArray(plan.weeks) || plan.weeks.length === 0) {
        throw new Error("پاسخ n8n مسیر معتبری نداشت.");
    }

    return plan;
}

async function createPathForGoal(goal) {
    const plan = await requestPlan(goal);

    const { error } = await supabase.from("learning_paths").insert({
        user_id: currentUser.id,
        goal_id: String(goal.id),
        title: plan.title || goal.title,
        plan,
        progress: {}
    });

    if (error) {
        throw new Error(
            "مسیر ساخته شد، اما ذخیره‌اش در Supabase ممکن نشد: " + error.message
        );
    }

    await logActivity(
        "ساخت مسیر",
        `مسیر «${plan.title || goal.title}» ساخته شد`,
        0
    );
}

async function retryPath(goal, button) {
    button.disabled = true;
    button.textContent = "در حال ساخت مسیر...";

    try {
        await createPathForGoal(goal);
    } catch (error) {
        alert(error.message || "ساخت مسیر ناموفق بود.");
    }

    await refreshAll();
}

// ---------------------------------
// آزمون هفتگی
// ---------------------------------

const quizModal = $("quizModal");
const quizBody = $("quizBody");
const quizTitle = $("quizTitle");

function closeQuiz() {
    quizModal.hidden = true;
}

function quizMessage(text, isError = false) {
    quizBody.replaceChildren(
        el("p", isError ? "form-message error" : "form-message", text)
    );
}

async function loadQuizScores() {
    quizScores.clear();

    const { data, error } = await supabase
        .from("quiz_results")
        .select("path_id, week_index, score");

    if (error) {
        console.warn("Quiz scores not loaded:", error);
        return;
    }

    data.forEach((result) => {
        if (result.score !== null) {
            quizScores.set(`${result.path_id}-${result.week_index}`, result.score);
        }
    });
}

function quizTableError(error) {
    const missingTable =
        error?.code === "42P01" ||
        error?.code === "PGRST205" ||
        /quiz_results/.test(error?.message || "");

    if (missingTable) {
        return new Error(
            "جدول آزمون‌ها در Supabase ساخته نشده است. فایل supabase/schema.sql را یک‌بار در SQL Editor اجرا کنید."
        );
    }

    return new Error(error?.message || "خطا در ارتباط با Supabase.");
}

// ترتیب گزینه‌ها را بر می‌زند تا گزینه درست همیشه در یک جا نباشد
function shuffleOptions(question) {
    const correctText = question.options[question.correct_index];
    const options = [...question.options];

    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    return {
        ...question,
        options,
        correct_index: options.indexOf(correctText)
    };
}

function normalizeQuestions(raw) {
    const list = Array.isArray(raw?.questions) ? raw.questions : [];

    const valid = list
        .filter(
            (q) =>
                q &&
                typeof q.question === "string" &&
                Array.isArray(q.options) &&
                q.options.length >= 2 &&
                Number.isInteger(q.correct_index) &&
                q.correct_index >= 0 &&
                q.correct_index < q.options.length
        )
        .map((q) =>
            shuffleOptions({
                question: q.question,
                options: q.options.map(String),
                correct_index: q.correct_index,
                explanation: String(q.explanation || "")
            })
        );

    if (valid.length < 3) {
        throw new Error("آزمون معتبری ساخته نشد. دوباره تلاش کنید.");
    }

    return valid.slice(0, 10);
}

// متن آزمون گاهی کد دارد (```python ... ``` یا `print`) و \n را نوشتاری می‌فرستد؛
// این تابع آن را به متن و کد خوانا تبدیل می‌کند (همه‌چیز با textContent، بدون خطر)
function richText(raw, className = "", tag = "span") {
    const box = el(tag, `rich ${className}`.trim());

    const text = String(raw ?? "")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "    ");

    text.split("```").forEach((part, index) => {
        if (index % 2 === 1) {
            // بلوک کد؛ خط اول ممکن است فقط اسم زبان باشد (مثلاً python)
            const lines = part.replace(/^\s*\n/, "").split("\n");

            if (lines.length > 1 && /^\s*[a-zA-Z+#]{1,12}\s*$/.test(lines[0])) {
                lines.shift();
            }

            const pre = document.createElement("pre");
            pre.className = "code-block";
            pre.dir = "ltr";

            const code = document.createElement("code");
            code.textContent = lines.join("\n").replace(/\s+$/, "");

            pre.append(code);
            box.append(pre);
            return;
        }

        // کد درون‌خطی با یک بک‌تیک
        part.split(/`([^`\n]+)`/).forEach((chunk, i) => {
            if (!chunk) return;

            if (i % 2 === 1) {
                const inline = document.createElement("code");
                inline.className = "inline-code";
                inline.textContent = chunk;
                box.append(inline);
            } else {
                box.append(document.createTextNode(chunk));
            }
        });
    });

    return box;
}

async function requestQuiz(row, week) {
    const goal = goalsById.get(String(row.goal_id));

    const body = await postToN8n(QUIZ_WEBHOOK_URL, {
        quiz: {
            path_title: row.title || row.plan?.title || "",
            week_title: week.title || "",
            level: goal?.current_level || "beginner",
            topics: week.topics || [],
            objectives: week.objectives || [],
            num_questions: 5
        }
    });

    return normalizeQuestions(body?.output ?? body);
}

async function fetchQuizRecord(pathId, weekIndex) {
    const { data, error } = await supabase
        .from("quiz_results")
        .select("id, questions, answers, score")
        .eq("path_id", pathId)
        .eq("week_index", weekIndex)
        .maybeSingle();

    if (error) throw quizTableError(error);

    return data;
}

async function saveNewQuiz(pathId, weekIndex, questions) {
    const { data, error } = await supabase
        .from("quiz_results")
        .insert({
            user_id: currentUser.id,
            path_id: pathId,
            week_index: weekIndex,
            questions
        })
        .select("id, questions, answers, score")
        .single();

    if (error) {
        // اگر همزمان آزمون ساخته شده بود، همان را برمی‌داریم
        if (error.code === "23505") {
            const existing = await fetchQuizRecord(pathId, weekIndex);
            if (existing) return existing;
        }

        throw quizTableError(error);
    }

    return data;
}

async function openQuiz(row, week, weekIndex, onScore) {
    const ctx = {
        row,
        weekIndex,
        onScore,
        title: `هفته ${faNum(week.week)}: ${cleanWeekTitle(week.title)}`
    };

    quizTitle.textContent = ctx.title;
    quizModal.hidden = false;
    quizMessage("در حال آماده‌سازی آزمون...");

    try {
        let record = await fetchQuizRecord(row.id, weekIndex);

        if (!record) {
            quizMessage(
                "هوش مصنوعی در حال طراحی سؤال‌هاست (حدود ۱۰ تا ۴۰ ثانیه)..."
            );

            const questions = await requestQuiz(row, week);

            record = await saveNewQuiz(row.id, weekIndex, questions);
        }

        if (Array.isArray(record.answers) && record.score !== null) {
            renderQuizResult(record, ctx);
        } else {
            renderQuizForm(record, ctx);
        }
    } catch (error) {
        console.error("Quiz error:", error);
        quizMessage(error.message || "ساخت آزمون ناموفق بود.", true);
    }
}

function renderQuizForm(record, ctx) {
    const questions = record.questions;
    const wrap = el("div", "quiz-form");

    questions.forEach((q, qi) => {
        const box = el("div", "quiz-q");
        box.setAttribute("role", "radiogroup");
        const question = el("div", "quiz-question");
        question.append(`${faNum(qi + 1)}. `, richText(q.question));
        box.append(question);

        q.options.forEach((option, optionIndex) => {
            const label = el("label", "quiz-option");

            const input = document.createElement("input");
            input.type = "radio";
            input.name = `quiz-q${qi}`;
            input.value = String(optionIndex);

            label.append(input, richText(option));
            box.append(label);
        });

        wrap.append(box);
    });

    const message = el("p", "form-message");

    const submit = el("button", "primary-btn full-btn", "ثبت پاسخ‌ها");
    submit.type = "button";

    submit.addEventListener("click", async () => {
        const answers = questions.map((_, qi) => {
            const checked = wrap.querySelector(
                `input[name="quiz-q${qi}"]:checked`
            );

            return checked ? Number(checked.value) : null;
        });

        if (answers.includes(null)) {
            message.textContent = "لطفاً به همه سؤال‌ها پاسخ بدهید.";
            message.classList.add("error");
            return;
        }

        submit.disabled = true;
        message.classList.remove("error");
        message.textContent = "در حال ثبت نتیجه...";

        try {
            await submitQuiz(record, answers, ctx);
        } catch (error) {
            submit.disabled = false;
            message.textContent = error.message || "ثبت نتیجه ممکن نشد.";
            message.classList.add("error");
        }
    });

    wrap.append(message, submit);
    quizBody.replaceChildren(wrap);
}

async function submitQuiz(record, answers, ctx) {
    const total = record.questions.length;

    const correct = record.questions.filter(
        (q, index) => answers[index] === q.correct_index
    ).length;

    const score = Math.round((correct / total) * 100);

    const { error } = await supabase
        .from("quiz_results")
        .update({
            answers,
            score,
            completed_at: new Date().toISOString()
        })
        .eq("id", record.id);

    if (error) {
        throw new Error("ثبت نتیجه آزمون ممکن نشد: " + error.message);
    }

    record.answers = answers;
    record.score = score;

    quizScores.set(`${ctx.row.id}-${ctx.weekIndex}`, score);
    ctx.onScore(score);

    renderQuizResult(record, ctx);

    logActivity("آزمون هفتگی", `${ctx.title} · نمره ${faNum(score)}٪`, null);
}

function renderQuizResult(record, ctx) {
    const questions = record.questions;
    const answers = record.answers || [];

    const correct = questions.filter(
        (q, index) => answers[index] === q.correct_index
    ).length;

    const passed = record.score >= 70;

    const summary = el("div", `quiz-score ${passed ? "good" : "low"}`);

    summary.append(
        el("strong", "", `${faNum(record.score)}٪`),
        el(
            "span",
            "",
            `${faNum(correct)} پاسخ درست از ${faNum(questions.length)}`
        )
    );

    const verdict = el(
        "p",
        "quiz-verdict",
        passed
            ? "عالی بود! این هفته را خوب یاد گرفته‌اید."
            : "بهتر است موضوع‌های این هفته را مرور کنید و دوباره امتحان بدهید."
    );

    const reviews = el("div", "quiz-reviews");

    questions.forEach((q, qi) => {
        const isCorrect = answers[qi] === q.correct_index;
        const item = el("div", `quiz-review ${isCorrect ? "correct" : "wrong"}`);

        const title = el("strong", "quiz-review-q");
        title.append(`${faNum(qi + 1)}. `, richText(q.question));
        item.append(title);

        if (!isCorrect) {
            const yours = el("p", "quiz-yours");
            yours.append("پاسخ شما: ", richText(q.options[answers[qi]] ?? "—"));
            item.append(yours);
        }

        const right = el("p", "quiz-right");
        right.append("پاسخ درست: ", richText(q.options[q.correct_index]));
        item.append(right);

        if (q.explanation) {
            const explain = el("p", "quiz-explain");
            explain.append(richText(q.explanation));
            item.append(explain);
        }

        reviews.append(item);
    });

    const actions = el("div", "quiz-actions");

    const retry = el("button", "mini-btn", "تلاش دوباره");
    retry.type = "button";
    retry.addEventListener("click", () => renderQuizForm(record, ctx));

    const close = el("button", "primary-btn", "بستن");
    close.type = "button";
    close.addEventListener("click", closeQuiz);

    actions.append(retry, close);

    quizBody.replaceChildren(summary, verdict, reviews, actions);
}

$("closeQuizBtn")?.addEventListener("click", closeQuiz);

quizModal?.addEventListener("click", (event) => {
    if (event.target === quizModal) closeQuiz();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && quizModal && !quizModal.hidden) closeQuiz();
});

// ---------------------------------
// اصلاح برنامه بر اساس پیشرفت
// ---------------------------------

const reviseModal = $("reviseModal");
const reviseBody = $("reviseBody");

function closeRevise() {
    reviseModal.hidden = true;
}

function reviseMessage(text, isError = false) {
    reviseBody.replaceChildren(
        el("p", isError ? "form-message error" : "form-message", text)
    );
}

function getWeekStats(row, week, weekIndex) {
    const keys = weekItemKeys(week, weekIndex);
    const done = keys.filter((key) => row.progress[key] === true).length;

    return {
        done,
        total: keys.length,
        percent: keys.length ? Math.round((done / keys.length) * 100) : 0
    };
}

function normalizeRevisedWeeks(raw) {
    const list = Array.isArray(raw?.weeks) ? raw.weeks : [];

    const weeks = list
        .filter(
            (w) =>
                w &&
                typeof w.title === "string" &&
                Array.isArray(w.topics) &&
                w.topics.length > 0
        )
        .map((w) => ({
            title: w.title,
            objectives: Array.isArray(w.objectives) ? w.objectives.map(String) : [],
            topics: w.topics.map(String),
            practice: String(w.practice || ""),
            resources: Array.isArray(w.resources) ? w.resources.map(String) : []
        }));

    if (!weeks.length) {
        throw new Error("پاسخ n8n برنامه معتبری نداشت. دوباره تلاش کنید.");
    }

    return {
        summary: String(
            raw?.change_summary || "برنامه بر اساس پیشرفت شما به‌روز شد."
        ),
        weeks: weeks.slice(0, 12)
    };
}

async function startRevision(row) {
    const plan = row.plan || {};
    const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];

    reviseModal.hidden = false;

    // آخرین هفته‌ای که کاربر در آن تیک زده یا آزمون داده
    let lastTouched = -1;

    weeks.forEach((week, weekIndex) => {
        const { done } = getWeekStats(row, week, weekIndex);

        if (done > 0 || quizScores.has(`${row.id}-${weekIndex}`)) {
            lastTouched = weekIndex;
        }
    });

    if (lastTouched === -1) {
        reviseMessage(
            "هنوز پیشرفتی ثبت نشده است. چند موضوع را تیک بزنید یا یک آزمون هفتگی بدهید، سپس برنامه را اصلاح کنید.",
            true
        );
        return;
    }

    if (lastTouched >= weeks.length - 1) {
        reviseMessage(
            "همه هفته‌ها را شروع کرده‌اید و هفته‌ای برای بازنویسی باقی نمانده است.",
            true
        );
        return;
    }

    reviseMessage(
        "هوش مصنوعی در حال بررسی پیشرفت شما و بازنویسی هفته‌های باقی‌مانده است (حدود ۱۰ تا ۶۰ ثانیه)..."
    );

    try {
        const goal = goalsById.get(String(row.goal_id));
        const keptWeeks = weeks.slice(0, lastTouched + 1);

        const completed = keptWeeks.map((week, weekIndex) => {
            const stats = getWeekStats(row, week, weekIndex);
            const score = quizScores.get(`${row.id}-${weekIndex}`);

            return {
                week: weekIndex + 1,
                title: week.title || "",
                progress_percent: stats.percent,
                quiz_score: score === undefined ? null : score,
                unfinished_topics: (week.topics || []).filter(
                    (_, topicIndex) => row.progress[`w${weekIndex}-t${topicIndex}`] !== true
                )
            };
        });

        const remaining = weeks.slice(lastTouched + 1).map((week, i) => ({
            week: lastTouched + 2 + i,
            title: week.title || "",
            objectives: week.objectives || [],
            topics: week.topics || [],
            practice: week.practice || "",
            resources: week.resources || []
        }));

        const body = await postToN8n(REVISE_WEBHOOK_URL, {
            revise: {
                path_title: row.title || plan.title || "",
                level: goal?.current_level || "beginner",
                weekly_hours: goal?.weekly_hours || 5,
                target_date: goal?.target_date || null,
                completed_weeks: completed,
                remaining_weeks: remaining
            }
        });

        const revision = normalizeRevisedWeeks(body?.output ?? body);

        renderRevisionPreview(row, keptWeeks, revision);
    } catch (error) {
        console.error("Revision error:", error);
        reviseMessage(error.message || "اصلاح برنامه ناموفق بود.", true);
    }
}

function renderRevisionPreview(row, keptWeeks, revision) {
    const summary = el("div", "revise-summary");

    summary.append(
        el("strong", "", "چه چیزی تغییر می‌کند و چرا؟"),
        el("p", "", revision.summary)
    );

    const note = el(
        "p",
        "revise-note",
        `${faNum(keptWeeks.length)} هفته اول (که شروع کرده‌اید) بدون تغییر می‌ماند و تیک‌ها و نمره‌هایتان حفظ می‌شود. هفته‌های بعدی با برنامه زیر جایگزین می‌شوند:`
    );

    const list = el("div", "revise-weeks");

    revision.weeks.forEach((week, i) => {
        const box = el("div", "revise-week");

        box.append(
            el("h4", "", `هفته ${faNum(keptWeeks.length + i + 1)}: ${cleanWeekTitle(week.title)}`)
        );

        const topics = el("ul");
        week.topics.forEach((topic) => topics.append(el("li", "", topic)));
        box.append(topics);

        list.append(box);
    });

    const message = el("p", "form-message");
    const actions = el("div", "quiz-actions");

    const cancel = el("button", "mini-btn", "انصراف");
    cancel.type = "button";
    cancel.addEventListener("click", closeRevise);

    const apply = el("button", "primary-btn", "اعمال تغییرات");
    apply.type = "button";

    apply.addEventListener("click", async () => {
        apply.disabled = true;
        cancel.disabled = true;
        message.classList.remove("error");
        message.textContent = "در حال ذخیره برنامه جدید...";

        try {
            await applyRevision(row, keptWeeks, revision);
        } catch (error) {
            apply.disabled = false;
            cancel.disabled = false;
            message.textContent = error.message || "ذخیره برنامه ممکن نشد.";
            message.classList.add("error");
        }
    });

    actions.append(cancel, apply);

    reviseBody.replaceChildren(summary, note, list, message, actions);
}

async function applyRevision(row, keptWeeks, revision) {
    const merged = [...keptWeeks, ...revision.weeks].map((week, index) => ({
        ...week,
        week: index + 1
    }));

    const plan = {
        ...row.plan,
        weeks: merged,
        last_revision: {
            at: new Date().toISOString(),
            summary: revision.summary
        }
    };

    const { error } = await supabase
        .from("learning_paths")
        .update({ plan })
        .eq("id", row.id);

    if (error) {
        throw new Error("ذخیره برنامه جدید ممکن نشد: " + error.message);
    }

    closeRevise();

    logActivity(
        "اصلاح برنامه",
        `برنامه «${row.title || "یادگیری"}» بر اساس پیشرفت شما اصلاح شد`,
        null
    );

    await refreshAll();
}

$("closeReviseBtn")?.addEventListener("click", closeRevise);

reviseModal?.addEventListener("click", (event) => {
    if (event.target === reviseModal) closeRevise();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && reviseModal && !reviseModal.hidden) closeRevise();
});

// ---------------------------------
// بارگذاری همه بخش‌ها
// ---------------------------------

async function refreshAll() {
    const paths = await loadPaths();
    const goalIds = new Set(paths.map((path) => String(path.goal_id)));

    await Promise.all([
        loadGoals(goalIds),
        loadStatistics(),
        loadActivities()
    ]);
}

// ---------------------------------
// ساخت هدف جدید + مسیر یادگیری
// ---------------------------------

goalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    saveGoalBtn.disabled = true;
    showGoalMessage("در حال ذخیره هدف...");

    const title = $("goalTitle").value.trim();
    const description = $("goalDescription").value.trim();
    const currentLevel = $("currentLevel").value;
    const weeklyHours = Number($("weeklyHours").value);
    const targetDate = $("targetDate").value || null;

    let goal = null;

    try {
        if (!title) {
            throw new Error("لطفاً هدف یادگیری را وارد کنید.");
        }

        if (!Number.isFinite(weeklyHours) || weeklyHours < 1 || weeklyHours > 168) {
            throw new Error("ساعت هفتگی باید بین ۱ تا ۱۶۸ باشد.");
        }

        const { data, error } = await supabase
            .from("learning_goals")
            .insert({
                user_id: currentUser.id,
                title,
                description,
                current_level: currentLevel,
                weekly_hours: weeklyHours,
                target_date: targetDate
            })
            .select("id, title, description, current_level, weekly_hours, target_date")
            .single();

        if (error) throw error;

        goal = data;
        goalForm.reset();

        showGoalMessage(
            "هدف ذخیره شد. هوش مصنوعی در حال طراحی مسیر است (حدود ۱۰ تا ۶۰ ثانیه)..."
        );

        await createPathForGoal(goal);

        showGoalMessage("مسیر یادگیری با موفقیت ساخته شد!");

        setTimeout(() => {
            goalModal.hidden = true;
            showGoalMessage("");
        }, 1200);
    } catch (error) {
        const extra = goal
            ? " هدف شما ذخیره شده است؛ بعداً می‌توانید از لیست اهداف دکمه «ساخت مسیر با AI» را بزنید."
            : "";

        showGoalMessage(
            (error.message || "ذخیره هدف ممکن نشد.") + extra,
            true
        );
    } finally {
        saveGoalBtn.disabled = false;
    }

    if (goal) {
        try {
            await refreshAll();
        } catch (error) {
            console.error("Refresh error:", error);
        }
    }
});

// ---------------------------------
// پنجره ساخت هدف
// ---------------------------------

function openGoalModal() {
    if (!goalModal) return;

    goalModal.hidden = false;
    $("goalTitle").focus();
}

$("newGoalBtn")?.addEventListener("click", openGoalModal);

$("closeModalBtn")?.addEventListener("click", () => {
    goalModal.hidden = true;
});

goalModal?.addEventListener("click", (event) => {
    if (event.target === goalModal) {
        goalModal.hidden = true;
    }
});

// لینک goals.html#new پنجره ساخت هدف را باز می‌کند
if (location.hash === "#new") openGoalModal();

// ---------------------------------
// پروفایل: تغییر نام و عکس
// ---------------------------------

const profileModal = $("profileModal");

// undefined: بدون تغییر | null: حذف عکس | رشته: عکس جدید
let pendingAvatar;

function profileMessage(text, isError = false) {
    const node = $("profileMessage");

    node.textContent = text;
    node.classList.toggle("error", isError);
}

function openProfile() {
    pendingAvatar = undefined;

    $("profileName").value = profile.name;
    paintAvatar($("profileAvatarPreview"), profile.name, profile.avatar);
    profileMessage("");

    profileModal.hidden = false;
    $("profileName").focus();
}

function closeProfile() {
    profileModal.hidden = true;
}

// عکس را مربعی و کوچک می‌کند تا فشرده در دیتابیس ذخیره شود
async function imageToAvatar(file) {
    if (!file.type.startsWith("image/")) {
        throw new Error("لطفاً یک فایل تصویر انتخاب کنید.");
    }

    if (file.size > 8 * 1024 * 1024) {
        throw new Error("حجم عکس باید کمتر از ۸ مگابایت باشد.");
    }

    let bitmap;

    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        bitmap = await createImageBitmap(file);
    }

    const size = 192;
    const side = Math.min(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    canvas.getContext("2d").drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size
    );

    bitmap.close?.();

    return canvas.toDataURL("image/jpeg", 0.85);
}

async function saveProfile(name, avatar) {
    const changes = { full_name: name };

    if (avatar !== undefined) changes.avatar_url = avatar;

    const { data, error } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", currentUser.id)
        .select("id");

    if (error) throw error;

    // اگر ردیفی برای این کاربر نبود، می‌سازیمش
    if (!data?.length) {
        const { error: insertError } = await supabase
            .from("profiles")
            .insert({ id: currentUser.id, ...changes });

        if (insertError) throw insertError;
    }

    // نام کوتاه در حساب کاربری هم ذخیره می‌شود (عکس نه، تا توکن ورود سنگین نشود)
    supabase.auth.updateUser({ data: { full_name: name } });
}

$("profileBtn")?.addEventListener("click", openProfile);
$("closeProfileBtn")?.addEventListener("click", closeProfile);

profileModal?.addEventListener("click", (event) => {
    if (event.target === profileModal) closeProfile();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && profileModal && !profileModal.hidden) closeProfile();
});

$("chooseAvatarBtn")?.addEventListener("click", () => $("avatarInput").click());

$("avatarInput")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    try {
        pendingAvatar = await imageToAvatar(file);

        paintAvatar($("profileAvatarPreview"), $("profileName").value, pendingAvatar);
        profileMessage("");
    } catch (error) {
        profileMessage(error.message || "خواندن عکس ممکن نشد.", true);
    }
});

$("removeAvatarBtn")?.addEventListener("click", () => {
    pendingAvatar = null;

    paintAvatar($("profileAvatarPreview"), $("profileName").value || profile.name, null);
});

$("profileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = $("profileName").value.trim();
    const button = $("saveProfileBtn");

    if (!name) {
        profileMessage("نام نمی‌تواند خالی باشد.", true);
        return;
    }

    if (pendingAvatar !== undefined && !avatarColumnReady) {
        profileMessage(
            "برای ذخیره عکس، فایل supabase/schema.sql را یک‌بار در Supabase اجرا کنید.",
            true
        );
        return;
    }

    button.disabled = true;
    profileMessage("در حال ذخیره...");

    try {
        await saveProfile(name, pendingAvatar);

        profile = {
            name,
            avatar: pendingAvatar === undefined ? profile.avatar : pendingAvatar
        };

        paintProfile();
        closeProfile();
        showToast("پروفایل ذخیره شد");
    } catch (error) {
        console.error("Save profile error:", error);

        profileMessage(
            "ذخیره پروفایل ممکن نشد. فایل supabase/schema.sql را یک‌بار در Supabase اجرا کنید.",
            true
        );
    } finally {
        button.disabled = false;
    }
});

// ---------------------------------
// خروج از حساب
// ---------------------------------

$("logoutBtn").addEventListener("click", async () => {
    const button = $("logoutBtn");
    button.disabled = true;

    const { error } = await supabase.auth.signOut();

    if (error) {
        button.disabled = false;
        alert("خروج ممکن نشد: " + error.message);
        return;
    }

    window.location.replace("auth.html");
});

// ---------------------------------
// شروع
// ---------------------------------

async function initializeDashboard() {
    try {
        currentUser = await checkAuthentication();

        if (!currentUser) return;

        await loadProfile();
        await refreshAll();
    } catch (error) {
        console.error("Dashboard initialization error:", error);

        const message = el(
            "p",
            "empty-state",
            "بارگذاری اطلاعات داشبورد ممکن نشد. لطفاً صفحه را دوباره بارگذاری کنید."
        );

        goalsList?.replaceChildren(message);
        pathsList?.replaceChildren(message.cloneNode(true));
        activityList?.replaceChildren(message.cloneNode(true));
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
        window.location.replace("auth.html");
    }
});

initializeDashboard();
