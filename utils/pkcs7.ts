import { SocketCrypto } from "@webcrypto-local/client";
import forge from 'node-forge'
import { CryptoKey } from "webcrypto-liner";
import ByteRange from "../models/ByteRange.model";
import { toBinString } from "./convert";

export const createPKCS7Signature = async (certPem: string, privateKey: CryptoKey, provider: SocketCrypto, pdf: ArrayBuffer, placeholderLength: number): Promise<string> => {

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
        const value = await provider.subtle.sign(algo, privateKey, buf);

        return toBinString(value);
    };



    const cert = forge.pki.certificateFromPem(certPem);

    // create PKCS#7 signed data with authenticatedAttributes
    // attributes include: PKCS#9 content-type, message-digest, and signing-time
    var p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdf);
    p7.addSigner({
        key: signer,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [{
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data
        }, {
            type: forge.pki.oids.signingTime,
        }, {
            type: forge.pki.oids.messageDigest
        }]
    });
    p7.sign({ detached: true });

    return processSignature(Buffer.from(pdf), p7, placeholderLength);
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