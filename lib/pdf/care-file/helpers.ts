import jsPDF from "jspdf";
import { format } from "date-fns";

export interface GenerateCareFilePDFOptions {
    formName: string;
    data: any;
    resident: any;
    orgLogoUrl?: string;
    careHomeName?: string;
}

export interface OrgLogoForPdf {
    dataUrl: string;
    width: number;
    height: number;
}

export interface PDFContext {
    doc: jsPDF;
    formName: string;
    data: any;
    resident: any;
    orgLogoUrl?: string;
    careHomeName?: string;
    pageWidth: number;
    margin: number;
    resolvedOrgLogo: OrgLogoForPdf | null;
}

/** jsPDF image format inferred from a data URL (org logos may be PNG, JPEG, or WebP). */
export function jspdfImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
    if (dataUrl.includes("image/png")) return "PNG";
    if (dataUrl.includes("image/webp")) return "WEBP";
    if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
    return "PNG";
}

/**
 * Load a remote logo for jsPDF without a tainted canvas (fetch + FileReader).
 * Falls back to Image + canvas when fetch is not usable.
 * Returns intrinsic dimensions so jsPDF can size the image (no getImageProperties).
 */
export async function loadOrgLogoForPdf(url: string): Promise<OrgLogoForPdf | null> {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const dimensionsFromDataUrl = (dataUrl: string): Promise<{ width: number; height: number }> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () =>
                resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
            img.onerror = () => reject(new Error("Could not read logo dimensions"));
            img.src = dataUrl;
        });

    let dataUrl: string | null = null;
    if (trimmed.startsWith("data:image/")) {
        dataUrl = trimmed;
    } else {
        const tryFetchAsDataUrl = async (href: string): Promise<string | null> => {
            const res = await fetch(href, { mode: "cors", credentials: "omit" });
            if (!res.ok) return null;
            const blob = await res.blob();
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("FileReader failed"));
                reader.readAsDataURL(blob);
            });
        };

        try {
            dataUrl = await tryFetchAsDataUrl(trimmed);
        } catch {
            dataUrl = null;
        }

        if (!dataUrl && typeof window !== "undefined") {
            const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
            if (supabaseBase && trimmed.startsWith(`${supabaseBase}/`)) {
                try {
                    const proxy = `/api/pdf/proxy-image?url=${encodeURIComponent(trimmed)}`;
                    dataUrl = await tryFetchAsDataUrl(`${window.location.origin}${proxy}`);
                } catch {
                    dataUrl = null;
                }
            }
        }

        if (!dataUrl) {
            for (const useCors of [true, false] as const) {
                try {
                    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const el = new Image();
                        if (useCors) el.crossOrigin = "anonymous";
                        el.onload = () => resolve(el);
                        el.onerror = () => reject(new Error("Image load failed"));
                        el.src = trimmed;
                    });
                    if (!img.naturalWidth || !img.naturalHeight) continue;
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return null;
                    ctx.drawImage(img, 0, 0);
                    dataUrl = canvas.toDataURL("image/png");
                    break;
                } catch {
                    continue;
                }
            }
        }
    }

    if (!dataUrl) return null;
    try {
        const { width, height } = await dimensionsFromDataUrl(dataUrl);
        return { dataUrl, width, height };
    } catch {
        return null;
    }
}

export const toSafeFilePart = (value: string | undefined): string => {
    if (!value) return "document";
    const sanitized = value
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return sanitized || "document";
};

// Helper to load images
export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const drawHeaderSync = (ctx: PDFContext, titleOverride?: string) => {
    const { doc, pageWidth, margin, formName, resolvedOrgLogo } = ctx;
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, "F");
    doc.setTextColor(31, 41, 55);

    const displayTitle = titleOverride || formName;
    if (displayTitle.toUpperCase().includes("INFECTION PREVENTION")) {
        doc.setFontSize(13);
    } else {
        doc.setFontSize(16);
    }
    doc.setFont("helvetica", "bold");
    doc.text(displayTitle.toUpperCase(), margin, 14);

    if (resolvedOrgLogo) {
        try {
            const fmt = jspdfImageFormatFromDataUrl(resolvedOrgLogo.dataUrl);
            const logoSize = 14;
            const aspect = resolvedOrgLogo.width / resolvedOrgLogo.height;
            const logoW = logoSize * aspect;
            doc.addImage(
                resolvedOrgLogo.dataUrl,
                fmt,
                pageWidth - margin - logoW,
                (headerHeight - logoSize) / 2,
                logoW,
                logoSize
            );
        } catch (e) {
            console.warn("Logo add to PDF failed", e);
        }
    }
};

export const drawHeader = async (ctx: PDFContext, titleOverride?: string) => {
    drawHeaderSync(ctx, titleOverride);
};

export const ensureSpace = async (ctx: PDFContext, heightNeeded: number, currentY: number) => {
    const { doc } = ctx;
    if (currentY + heightNeeded > 280) {
        doc.addPage();
        await drawHeader(ctx);
        return 30; // Return new yPos after header
    }
    return currentY;
};

export const addSectionTitle = async (ctx: PDFContext, title: string, y: number) => {
    const { doc, pageWidth, margin } = ctx;
    y = await ensureSpace(ctx, 12, y);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + 8);
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);
    return y + 10;
};

export const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
        if (value.length === 0) return "None";
        if (typeof value[0] !== 'object') return value.join(", ");
        return `${value.length} items`;
    }
    if (typeof value === "string") {
        const enumMap: Record<string, string> = {
            "ABLE_TO_CONSENT": "Resident is able to consent",
            "UNABLE_TO_CONSENT": "Resident is unable to consent",
            "PREFER_USE": "I prefer that restraint is used.",
            "DO_NOT_WANT_USE": "I do not want any form of restraint used.",
            "WOULD_HAVE_PREFERRED": "would have preferred",
            "WOULD_NOT_HAVE_PREFERRED": "not preferred"
        };

        const mappedValue = enumMap[value] || value;
        return mappedValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (typeof value === "object") return "";
    return String(value);
};

export const addField = async (ctx: PDFContext, label: string, value: any, x: number, y: number, width: number, skipSpaceCheck = false) => {
    const { doc } = ctx;
    if (!skipSpaceCheck) {
        y = await ensureSpace(ctx, 12, y); 
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);

    const displayValue = formatValue(value);
    if (!displayValue && typeof value === 'object') return y; 

    const splitValue = doc.splitTextToSize(displayValue, width);
    doc.text(splitValue, x, y + 4);
    return y + 4 + (splitValue.length * 4);
};
