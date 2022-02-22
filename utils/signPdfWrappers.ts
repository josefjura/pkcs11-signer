import { findByteRange as fbr, removeTrailingNewLine as rtn, plainAddPlaceholder, SUBFILTER_ETSI_CADES_DETACHED } from "node-signpdf";

type FindByteRangeResult = {
    byteRangePlaceholder: string;
    byteRangeStrings: string[];
    byteRanges: string[][];
}

// Obal nad funkci node-signpdf
export const removeTrailingNewLine = (pdfBuffer: Buffer): Uint8Array => {
    return rtn(pdfBuffer)
}

// Obal nad funkci node-signpdf
export const findByteRange = (pdfBuffer: Buffer): FindByteRangeResult => {
    return fbr(pdfBuffer);
}

type PlaceholderOptions = {
    reason: string;
    contactInfo: string;
    name: string;
    location: string;
}

export const addPlaceholder = (pdfBuffer: ArrayBuffer, options: Partial<PlaceholderOptions>): Uint8Array => {
    let pdf = plainAddPlaceholder({
        pdfBuffer: Buffer.from(pdfBuffer),
        reason: options.reason || "Confirming authenticity of the document",
        contactInfo: options.contactInfo || "",
        name: options.name || "",
        location: options.location || "",
    });

    return pdf;
}