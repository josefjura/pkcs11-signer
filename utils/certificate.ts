import { SocketCrypto } from "@webcrypto-local/client";
import forge from 'node-forge'
import { CryptoKey } from "webcrypto-liner";
import * as pki from 'pkijs'
import { fromBER } from 'asn1js'
import { findByteRange as fbr, removeTrailingNewLine as rtn, plainAddPlaceholder, SUBFILTER_ETSI_CADES_DETACHED } from "node-signpdf";

type KeyType = "private" | "public"

export const getCertificateKey = async (type: KeyType, provider: any, certID: string): Promise<CryptoKey | null> => {
    const keyIDs = await provider.keyStorage.keys()
    for (const keyID of keyIDs) {
        const parts = keyID.split("-");
        if (parts[0] === type && parts[2] === certID.split("-")[2]) {
            const key = await provider.keyStorage.getItem(keyID);
            if (key) {
                return key;
            }
        }
    }
    if (type === "public") {
        const cert = await provider.certStorage.getItem(certID);
        if (cert) {
            return cert.publicKey;
        }
    }
    return null;
}

// export const getPKIcert = async (provider: SocketCrypto, certId: string) => {
//     const cryptoCert = await provider.certStorage.getItem(certId);
//     const certRawData = await provider.certStorage.exportCert('raw', cryptoCert);

//     const pkiCert = new pki.Certificate({
//         schema: fromBER(certRawData).result,
//     });

//     return pkiCert;
// }

// export const signWithPKIJS = async (certificate: any, privateKey: any, pdfBuffer: Buffer) => {

//     let cmsSigned = new pki.SignedData({
//         version: 1,
//         encapContentInfo: new pki.EncapsulatedContentInfo({
//             eContentType: '1.2.840.113549.1.1.11',
//         }),
//         signerInfos: [
//             new pki.SignerInfo({
//                 version: 1,
//                 sid: new pki.IssuerAndSerialNumber({
//                     issuer: certificate.issuer,
//                     serialNumber: certificate.serialNumber
//                 })
//             })
//         ],
//         certificates: [certificate]
//     });
//     console.log(cmsSigned)
//     let signature = await cmsSigned.sign(privateKey, 0, 'SHA-256', pdfBuffer);
//     console.log(signature)
//     const cms = new pki.ContentInfo({
//         contentType: '1.2.840.113549.1.1.11',
//         content: cmsSigned.toSchema(true),
//     });
//     const result = cms.toSchema().toBER(false);
//     console.log(result)
//     return result;
// }

const toBinString = (ab: ArrayBuffer) => {
    const bytes = new Uint8Array(ab);
    return bytes.reduce((str, byte) => str + byte.toString(2).padStart(8, '0'), '');
}


const processSignature = (pdf: Buffer, p7: forge.pkcs7.PkcsSignedData, placeholderLength: number) => {
    // Check if the PDF has a good enough placeholder to fit the signature.
    const raw = forge.asn1.toDer(p7.toAsn1()).getBytes();
    // placeholderLength represents the length of the HEXified symbols but we're
    // checking the actual lengths.
    if ((raw.length * 2) > placeholderLength) {
        throw new Error(
            `Signature exceeds placeholder length: ${raw.length * 2} > ${placeholderLength}`
        );
    }

    let signature = Buffer.from(raw, 'binary').toString('hex');
    // Store the HEXified signature. At least useful in tests.
    let hexSignature = signature;

    // Pad the signature with zeroes so the it is the same length as the placeholder
    signature += Buffer
        .from(String.fromCharCode(0).repeat((placeholderLength / 2) - raw.length))
        .toString('hex');

    return signature;
}

export const signPDF = async (certificateProvider: SocketCrypto, certificatName: string, pdf: File) => {
    const key = await getCertificateKey("private", certificateProvider, certificatName);
    if (!key) {
        throw new Error("Certificate doesn't have private key");
    }

    let originalPdf = await pdf?.arrayBuffer();

    if (!originalPdf) {
        throw new Error("Can't read PDF document");
    }

    const cert = await certificateProvider?.certStorage.getItem(certificatName);
    const certPem = await certificateProvider?.certStorage.exportCert("pem", cert!);

    originalPdf = addPlaceholder(originalPdf, {});

    const { byteRangePlaceholder } = findByteRange(Buffer.from(originalPdf));

    const byteRange = calculateByteRangePos(Buffer.from(originalPdf), byteRangePlaceholder);

    const signature = createPKCS7Signature(certPem!, key, certificateProvider!, originalPdf, byteRange.placeholderLength);

    let modifiedPdf = replaceByteRange(Buffer.from(originalPdf), byteRange, byteRangePlaceholder);
    modifiedPdf = removePlaceholderSignature(Buffer.from(modifiedPdf), byteRange);

    modifiedPdf = insertSignature(modifiedPdf, signature, byteRange);

    return modifiedPdf;
}

export const createPKCS7Signature = (certPem: string, privateKey: CryptoKey, provider: SocketCrypto, pdf: ArrayBuffer, placeholderLength: number) => {
    let signer: any = {};
    signer.sign = async (md: any, algo: any) => {
        // https://stackoverflow.com/a/47106124
        const prefix = Buffer.from([
            0x30, 0x31, 0x30, 0x0d,
            0x06, 0x09, 0x60, 0x86,
            0x48, 0x01, 0x65, 0x03,
            0x04, 0x02, 0x01, 0x05,
            0x00, 0x04, 0x20
        ]);
        let buf = Buffer.concat([prefix, Buffer.from(md.digest().toHex(), 'hex')]);

        provider.subtle.sign(algo, privateKey, buf).then((value) => {
            return toBinString(value);
        });
    };

    const cert = forge.pki.certificateFromPem(certPem);
    // create PKCS#7 signed data with authenticatedAttributes
    // attributes include: PKCS#9 content-type, message-digest, and signing-time
    var p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdf);
    p7.addCertificate(certPem);
    p7.addSigner({
        key: signer,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [{
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data
        }, {
            type: forge.pki.oids.messageDigest
            // value will be auto-populated at signing time
        }, {
            type: forge.pki.oids.signingTime,
            // value can also be auto-populated at signing time
            value: new Date().toISOString()
        }]
    });
    p7.sign({ detached: true });

    return processSignature(Buffer.from(pdf), p7, placeholderLength);
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

export const removeTrailingNewLine = (pdfBuffer: Buffer): Uint8Array => {
    return rtn(pdfBuffer)
}

export class ByteRange {
    constructor(private docStart: number, private sigStart: number, private sigEnd: number, private docEnd: number, public placeholderLength: number, public byteRangeEnd: number) {

    }

    toArray() {
        return [this.docStart, this.sigStart, this.sigEnd, this.docEnd];
    }

    toPDFstring(byteRangePlaceholderlength: number) {
        let actualByteRange = `/ByteRange [${this.toArray().join(" ")}]`;
        actualByteRange += " ".repeat(byteRangePlaceholderlength - actualByteRange.length);
        return actualByteRange;
    }
}

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

type FindByteRangeResult = {
    byteRangePlaceholder: string;
    byteRangeStrings: string[];
    byteRanges: string[][];
}

export const findByteRange = (pdfBuffer: Buffer): FindByteRangeResult => {
    return fbr(pdfBuffer);
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

export function hex(arrayBuffer: ArrayBuffer): string {
    return Array.prototype.map.call(
        new Uint8Array(arrayBuffer),
        n => n.toString(16).padStart(2, "0")
    ).join("");
}