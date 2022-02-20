import { NextApiHandler, NextApiRequest } from "next";
import { SUBFILTER_ETSI_CADES_DETACHED, plainAddPlaceholder } from 'node-signpdf';
import formidable from "formidable";
import { readFileSync } from "fs";

export const config = {
    api: {
        bodyParser: false
    }
};

const parseFile = (req: NextApiRequest) => {
    return new Promise<any>((resolve, reject) => {
        const form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            if (err) return reject(err);
            const pdf = files.file as formidable.File;
            try {
                const pdfBuffer = readFileSync(pdf.filepath)
                const refs = plainAddPlaceholder({
                    pdfBuffer,
                    reason: 'I am the author',
                    subFilter: SUBFILTER_ETSI_CADES_DETACHED,
                    signatureLength: 1612,
                    name: 'example name',
                });
                resolve(refs);
            } catch (err) {
                reject(err)
            }
        });
    });
}

const presignRoute: NextApiHandler = async (req, res) => {
    try {
        const refs = await parseFile(req);
        res.status(200).send(refs);
    } catch (err) {
        console.error(err)
        res.status(500).json({ err });
    }
}

export default presignRoute;