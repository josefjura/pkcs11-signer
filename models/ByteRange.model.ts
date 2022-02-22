export default class ByteRange {
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