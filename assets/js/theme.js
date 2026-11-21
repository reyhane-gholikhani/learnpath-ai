// تم روشن / تاریک و آیکون‌ها برای صفحه‌هایی که قالب برنامه را ندارند
// (ورود، فراموشی رمز و تغییر رمز)
import { icon, setupThemeToggle } from "./shell.js";

setupThemeToggle(document.getElementById("themeToggle"));

document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon);
});
