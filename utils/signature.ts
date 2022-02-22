import { SocketCrypto } from "@webcrypto-local/client";
import forge from 'node-forge'
import { CryptoKey } from "webcrypto-liner";
import ByteRange from "../models/ByteRange.model";
import { toBinString } from "./convert";

export const calculateByteRangePos = (pdf: Buffer, byteRangePlaceholder: string): ByteRange => {
    const byteRangePos = pdf.indexOf(byteRangePlaceholder);

    // Calculate the actual ByteRange that needs to replace the placeholder.
    const byteRangeEnd = byteRangePos + byteRangePlaceholder.length;
    const contentsTagPos = pdf.indexOf("/Contents ", byteRangeEnd);
    const placeholderPos = pdf.indexOf("<", contentsTagPos);
    const placeholderEnd = pdf.indexOf(">", placeholderPos);
    const placeholderLengthWithBrackets = placeholderEnd + 1 - placeholderPos;
    const placeholderLength = placeholderLengthWithBrackets - 2;
    const byteRange = [0, 0, 0, 0];
    byteRange[1] = placeholderPos;
    byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
    byteRange[3] = pdf.length - byteRange[2];

    return new ByteRange(byteRange[0], byteRange[1], byteRange[2], byteRange[3], placeholderLength, byteRangeEnd);
}

export const replaceByteRange = (pdf: Buffer, byteRangeObj: ByteRange, byteRangePlaceholder: string) => {
    const byteRangePos = pdf.indexOf(byteRangePlaceholder);
    const actualByteRange = byteRangeObj.toPDFstring(byteRangePlaceholder.length);
    // Replace the /ByteRange placeholder with the actual ByteRange
    return Buffer.concat([pdf.slice(0, byteRangePos), Buffer.from(actualByteRange), pdf.slice(byteRangeObj.byteRangeEnd)]);
}

export const removePlaceholderSignature = (pdf: Buffer, byteRangeObj: ByteRange) => {
    const byteRange = byteRangeObj.toArray();
    // Remove the placeholder signature
    return Buffer.concat([pdf.slice(0, byteRange[1]), pdf.slice(byteRange[2], byteRange[2] + byteRange[3])]);
}

export const insertSignature = (pdf: Buffer, signature: string, byteRangeObj: ByteRange) => {
    const byteRange = byteRangeObj.toArray();
    // Place it in the document.
    return Buffer.concat([pdf.slice(0, byteRange[1]), Buffer.from(`<${signature}>`), pdf.slice(byteRange[1])]);
}