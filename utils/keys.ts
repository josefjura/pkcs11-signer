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