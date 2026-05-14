import { FileText, Mail, Printer } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MENU_DIRECTIONS,
} from "../../config/menuCatalog";
import {
  getDietaryFullLabel,
  getDietaryLabel,
  getItemsByIds,
  groupByCategory,
} from "../../engine/menuConstraints";
import type { MenuFormData } from "../../types/menu";

interface Props {
  formData: MenuFormData;
  menuStory?: string;
}

function buildMenuHtml(formData: MenuFormData, menuStory?: string): string {
  const items = getItemsByIds(formData.selectedItems);
  const grouped = groupByCategory(items);
  const direction = MENU_DIRECTIONS.find(
    (d) => d.value === formData.menuDirection
  );

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${direction ? direction.label : "Custom"} Menu</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #292524; background: #faf8f5; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e7e5e4; margin-bottom: 24px; }
  .title { font-size: 28px; font-weight: 300; letter-spacing: -0.5px; }
  .subtitle { font-size: 11px; color: #a8a29e; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .story { background: #f5f5f4; border-radius: 12px; padding: 20px; margin-bottom: 24px; font-style: italic; font-size: 13px; color: #57534e; line-height: 1.7; }
  .category { margin-bottom: 24px; }
  .category-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #a8a29e; font-weight: 500; padding-bottom: 8px; border-bottom: 1px solid #e7e5e4; margin-bottom: 12px; }
  .item { margin-bottom: 12px; }
  .item-name { font-size: 14px; font-weight: 500; }
  .item-desc { font-size: 12px; color: #78716c; margin-top: 2px; }
  .tag { display: inline-block; font-size: 9px; font-weight: 600; background: #e7e5e4; color: #78716c; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
  .dietary-legend { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e7e5e4; }
  .dietary-legend span { font-size: 11px; color: #a8a29e; margin-right: 16px; }
  .footer { text-align: center; margin-top: 32px; font-size: 10px; color: #d6d3d1; }
  @media print { body { padding: 20px; background: white; } }
</style>
</head>
<body>
<div class="header">
  <div class="title">${direction ? direction.label : "Custom"} Menu</div>
  <div class="subtitle">${formData.guestCount} guests &middot; ${formData.season} &middot; ${(formData.serviceStyle || "").replace(/-/g, " ")}</div>
</div>`;

  if (menuStory) {
    html += `<div class="story">${menuStory}</div>`;
  }

  for (const cat of CATEGORY_ORDER) {
    const catItems = grouped[cat];
    if (!catItems || catItems.length === 0) continue;
    html += `<div class="category"><div class="category-title">${CATEGORY_LABELS[cat]}</div>`;
    for (const item of catItems) {
      const tags = item.dietaryFlags
        .map((f) => `<span class="tag">${getDietaryLabel(f)}</span>`)
        .join("");
      html += `<div class="item"><div class="item-name">${item.name}${tags}</div><div class="item-desc">${item.description}</div></div>`;
    }
    html += "</div>";
  }

  const usedFlags = new Set(items.flatMap((i) => i.dietaryFlags));
  if (usedFlags.size > 0) {
    html += `<div class="dietary-legend">`;
    for (const flag of usedFlags) {
      html += `<span><strong>${getDietaryLabel(flag)}</strong> ${getDietaryFullLabel(flag)}</span>`;
    }
    html += "</div>";
  }

  if (formData.barService && formData.barService !== "none") {
    html += `<div style="margin-top:16px;font-size:12px;color:#a8a29e;">Bar: ${formData.barService.replace(/-/g, " ")}</div>`;
  }

  html += `<div class="footer">Menu subject to seasonal availability. Prepared with care.</div></body></html>`;
  return html;
}

export default function MenuExport({ formData, menuStory }: Props) {
  const handlePrint = () => {
    const html = buildMenuHtml(formData, menuStory);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const handleHtmlExport = () => {
    const html = buildMenuHtml(formData, menuStory);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmailCopy = () => {
    const items = getItemsByIds(formData.selectedItems);
    const grouped = groupByCategory(items);
    const direction = MENU_DIRECTIONS.find(
      (d) => d.value === formData.menuDirection
    );

    let text = `${direction ? direction.label : "Custom"} Menu\n`;
    text += `${formData.guestCount} guests | ${formData.season} | ${(formData.serviceStyle || "").replace(/-/g, " ")}\n\n`;

    if (menuStory) text += `${menuStory}\n\n`;

    for (const cat of CATEGORY_ORDER) {
      const catItems = grouped[cat];
      if (!catItems || catItems.length === 0) continue;
      text += `${(CATEGORY_LABELS[cat] || cat).toUpperCase()}\n`;
      for (const item of catItems) {
        const tags =
          item.dietaryFlags.length > 0
            ? ` (${item.dietaryFlags.map((f) => getDietaryLabel(f)).join(", ")})`
            : "";
        text += `  ${item.name}${tags}\n  ${item.description}\n\n`;
      }
    }

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-stone-800 text-white hover:bg-stone-700 transition-all shadow-sm"
        onClick={handlePrint}
        type="button"
      >
        <Printer className="w-4 h-4" />
        Print / PDF
      </button>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all"
        onClick={handleHtmlExport}
        type="button"
      >
        <FileText className="w-4 h-4" />
        Download HTML
      </button>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all"
        onClick={handleEmailCopy}
        type="button"
      >
        <Mail className="w-4 h-4" />
        Copy as Text
      </button>
    </div>
  );
}
