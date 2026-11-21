# راهنمای راه‌اندازی (قدم‌به‌قدم)

ترتیب پیشنهادی: ۱) Supabase ← ۲) n8n ← ۳) تست روی کامپیوتر ← ۴) GitHub ← ۵) انتشار.

## ۱) Supabase

1. وارد پروژه‌ات در [supabase.com](https://supabase.com) شو.
2. از منوی چپ **SQL Editor → New query** را باز کن، کل فایل `supabase/schema.sql` را paste کن و **Run** بزن.
3. از **Authentication → URL Configuration** بعداً (بعد از انتشار سایت) آدرس سایتت را در **Site URL** و **Redirect URLs** اضافه کن (مثلاً `https://USERNAME.github.io/REPO/reset-password.html`). بدون این، لینک بازیابی رمز کار نمی‌کند.

## ۲) n8n

1. در [n8n.io](https://n8n.io) حساب Cloud بساز (دوره آزمایشی دارد) یا n8n را روی سیستم خودت نصب کن. دقت کن n8n محلی (localhost) از روی سایت منتشرشده در دسترس نیست.
2. یک **Workflow** جدید بساز، از منوی سه‌نقطه (⋯) بالای صفحه **Import from file** را بزن و فایل `n8n/learnpath-workflow.json` را انتخاب کن.
3. کلید Gemini بگیر: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
4. روی نود **Google Gemini Chat Model** دوبار کلیک کن → **Credential to connect with → Create new** → کلید را paste و ذخیره کن. اگر نام مدل در لیست نبود، یکی از مدل‌های `flash` را از همان لیست انتخاب کن.
5. دکمه **Execute workflow** فقط برای تست است. برای کار واقعی workflow را **Active/Publish** کن.
6. روی نود **Webhook** دوبار کلیک کن، تب **Production URL** را کپی کن. شبیه این است: `https://xxxx.app.n8n.cloud/webhook/learnpath-generate`
7. این آدرس را در فایل `assets/js/n8n-config.js` به‌جای `PASTE_YOUR_N8N_WEBHOOK_URL_HERE` بگذار.

> اگر Gemini در دسترس تو نیست، نود مدل را حذف کن و یک Chat Model دیگر (OpenAI، OpenRouter، …) به ورودی **Chat Model** نود AI Agent وصل کن. بقیه workflow تغییری نمی‌کند.

## ۳) تست روی کامپیوتر

فایل‌ها را نباید با دابل‌کلیک باز کنی (ماژول‌های JS روی `file://` کار نمی‌کنند). یکی از این دو راه:

- در VS Code افزونه **Live Server** را نصب کن و روی `auth.html` راست‌کلیک → **Open with Live Server**.
- یا در پوشه پروژه ترمینال باز کن و بزن: `python -m http.server 8000` سپس برو به `http://localhost:8000/auth.html`.

ثبت‌نام کن، یک هدف بساز و منتظر بمان (۱۰ تا ۶۰ ثانیه).

## ۴) آپلود روی GitHub (بدون نصب git)

1. در [github.com](https://github.com) روی **New repository** بزن، نامی مثل `learnpath-ai` بده، **Public** را انتخاب کن و بساز.
2. روی لینک **uploading an existing file** بزن.
3. **محتوای** پوشه پروژه را (نه خود پوشه را) با drag & drop داخل صفحه بینداز و **Commit changes** را بزن.

با git: داخل پوشه پروژه

```
git init
git add .
git commit -m "LearnPath AI"
git branch -M main
git remote add origin https://github.com/USERNAME/learnpath-ai.git
git push -u origin main
```

## ۵) انتشار سایت (GitHub Pages)

1. در ریپو: **Settings → Pages → Build and deployment**: Source را `Deploy from a branch` و Branch را `main` / `(root)` بگذار و **Save**.
2. بعد از چند دقیقه آدرس سایت نمایش داده می‌شود: `https://USERNAME.github.io/learnpath-ai/`
3. این آدرس را (مرحله ۱، بند ۳) به Supabase بده.

## خطاهای رایج

| پیام / مشکل | علت و راه‌حل |
|---|---|
| «آدرس webhook هنوز وارد نشده» | مرحله ۲ بند ۷ را انجام بده. |
| «اتصال به n8n برقرار نشد» | workflow فعال (Active) نیست، یا آدرس به‌جای Production URL، Test URL است. |
| مسیر ساخته شد، اما ذخیره نشد | `supabase/schema.sql` اجرا نشده یا جدول ستون‌های NOT NULL دیگری دارد (query آخر فایل را اجرا و خروجی را بفرست). |
| «تأیید هویت در n8n ناموفق بود» | دوباره از حساب خارج و وارد شو. |
| بعد از انتشار، لینک بازیابی رمز باز نمی‌شود | آدرس سایت در Supabase → Redirect URLs اضافه نشده است. |
| خطای CORS در Console مرورگر | در n8n روی نود Webhook گزینه **Allowed Origins (CORS)** را روی `*` بگذار. |

> توجه: فایل workflow با دانش من از ساختار n8n نوشته شده و من نتوانستم آن را در خود n8n اجرا کنم. اگر هنگام Import به نودی خطا داد، همان نود را حذف و دستی از منوی `+` اضافه کن: **Webhook → Code → HTTP Request → If → AI Agent (+ Chat Model + Structured Output Parser) → Respond to Webhook**.
