
export const toBinString = (ab: ArrayBuffer) => {
    const bytes = new Uint8Array(ab);
    return bytes.reduce((str, byte) => str + byte.toString(2).padStart(8, '0'), '');
}