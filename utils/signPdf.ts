import { SocketCrypto } from "@webcrypto-local/client";
import { getCertificateKey } from "./keys";
import { calculateByteRangePos, createPKCS7Signature, insertSignature, removePlaceholderSignature, replaceByteRange } from "./signature";
import { addPlaceholder, findByteRange } from "./signPdfWrappers";

export const signPDFByForge = async (certificateProvider: SocketCrypto, certificatName: string, pdf: File) => {
    const key = await getCertificateKey("private", certificateProvider, certificatName);
    if (!key) {
        throw new Error("Certificate doesn't have private key");
    }

    let originalPdf = await pdf?.arrayBuffer();

    if (!originalPdf) {
        throw new Error("Can't read PDF document");
    }

    // Nacteni certifikatu jako PEM
    const cert = await certificateProvider?.certStorage.getItem(certificatName);
    const certPem = await certificateProvider?.certStorage.exportCert("pem", cert!);

    // Pridame placeholder
    originalPdf = addPlaceholder(originalPdf, {});

    // Najdeme v PDF byterange placeholderu
    const { byteRangePlaceholder } = findByteRange(Buffer.from(originalPdf));

    // Napocitame realnou byterange
    const byteRange = calculateByteRangePos(Buffer.from(originalPdf), byteRangePlaceholder);

    // Vytvorime PKCS7 podpis
    const signature = createPKCS7Signature(certPem!, key, certificateProvider!, originalPdf, byteRange.placeholderLength);

    // Nahradime dummy byterange realnym
    let modifiedPdf = replaceByteRange(Buffer.from(originalPdf), byteRange, byteRangePlaceholder);

    // Odstranime placeholder podpisu
    modifiedPdf = removePlaceholderSignature(Buffer.from(modifiedPdf), byteRange);

    // Vlozime podpis do PDF
    modifiedPdf = insertSignature(modifiedPdf, signature, byteRange);

    return modifiedPdf;
}