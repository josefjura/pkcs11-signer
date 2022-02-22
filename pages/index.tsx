import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { ChangeEventHandler, MouseEventHandler, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import download from "downloadjs";
import { parse } from "path";
import Script from "next/script";
import type { SocketProvider } from "@webcrypto-local/client";
import { writeSync } from "fs";
import FileChooser from "../components/FileChooser";
import Connection from "../components/Connection";
import { useFortify } from "../components/context/SocketContext";
import ProviderChooser from "../components/ProviderChooser";
import CertificateChooser from "../components/CertificateChooser";
import Summary from "../components/Summary";

import * as pki from "pkijs";

import {
  addPlaceholder,
  calculateByteRangePos,
  findByteRange,
  getCertificate,
  getCertificateKey,
  getPKIcert,
  hex,
  insertSignature,
  newSign,
  removePlaceholderSignature,
  removeTrailingNewLine,
  replaceByteRange,
} from "../utils/certificate";
import { Certificate } from "../models/Certificate.model";
import { bytes_to_hex } from "asmcrypto.js";

const Home: NextPage = () => {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [selectedProvider, setSelectedProvider] = useState<any>();
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate>();

  const { ws, connected } = useFortify();

  const confirmFile = async (document: File) => {
    setSelectedFile(document);
  };

  const confirmProvider = async (provider: any) => {
    setSelectedProvider(provider);
  };

  const confirmCertificate = async (provider: Certificate) => {
    setSelectedCertificate(provider);
  };

  const sign = async () => {
    if (!selectedCertificate?.keyId) return;
    if (!selectedFile) return;
    const certificateProvider = await ws?.getCrypto(selectedProvider.id);
    const key = await getCertificateKey("private", certificateProvider, selectedCertificate.fullName);
    if (!key) {
      throw new Error("Certificate doesn't have private key");
    }

    let originalPdf = await selectedFile?.arrayBuffer();

    if (!originalPdf) {
      throw new Error("Problems with presign");
    }

    const alg = {
      name: key.algorithm.name,
      hash: "SHA-256",
    };

    const cert = await certificateProvider?.certStorage.getItem(selectedCertificate.fullName);
    const certPem = await certificateProvider?.certStorage.exportCert("pem", cert!);

    originalPdf = addPlaceholder(originalPdf);

    //const cert = await getPKIcert(certificateProvider!, selectedCertificate.fullName);
    //const signature = await certSign(cert, key, Buffer.from(originalPdf));
    //const signature = await certificateProvider?.subtle.sign(alg, key, oroginalPdf);
    const { byteRangePlaceholder } = findByteRange(Buffer.from(originalPdf));

    const byteRange = calculateByteRangePos(Buffer.from(originalPdf), byteRangePlaceholder);

    const signature = newSign(certPem!, key, certificateProvider!, originalPdf, byteRange.placeholderLength);
    console.log(signature.length);

    let modifiedPdf = replaceByteRange(Buffer.from(originalPdf), byteRange, byteRangePlaceholder);
    modifiedPdf = removePlaceholderSignature(Buffer.from(modifiedPdf), byteRange);
    //hex(new Uint8Array(signature!))
    modifiedPdf = insertSignature(modifiedPdf, signature, byteRange);

    const fileName = parse(selectedFile.name);
    download(new Blob([modifiedPdf]), `${fileName.name}_${new Date().toISOString()}${fileName.ext}`, "application/pdf");
  };

  const presignApi = async () => {
    if (!selectedFile) return;

    const body = new FormData();
    body.append("file", selectedFile);
    const response = await fetch("/api/presign", {
      method: "POST",
      body,
    });
    //const fileName = parse(selectedFile.name);
    // download(await response.blob(), `${fileName.name}_${new Date().toISOString()}.${fileName.ext}`);
    return response.arrayBuffer();
  };

  const backToFiles = () => {
    setSelectedFile(undefined);
  };
  const backToProviders = () => {
    setSelectedProvider(undefined);
  };
  const backTocerts = () => {
    setSelectedCertificate(undefined);
  };

  return (
    <>
      <Head>
        <title>PKCS11 Signer Tech Demo</title>
        <link rel="icon" href="/favicon.ico" />
        <script defer src="https://fortifyapp.com/external/asmCrypto/2.3.2/asmcrypto.all.es5.min.js"></script>
        <script defer src="https://fortifyapp.com/external/elliptic/elliptic.min.js"></script>
        <script defer type="module" src="https://fortifyapp.com/external/webcrypto-liner/1.2.3/webcrypto-liner.shim.min.mjs"></script>

        <script defer src="https://fortifyapp.com/external/protobuf/6.8.0/protobuf.min.js"></script>
        <script defer type="module" src="https://fortifyapp.com/external/webcrypto-local/client/1.6.5/webcrypto-socket.min.mjs"></script>
      </Head>
      <div className={styles.container}>
        <h1 style={{ marginBottom: "10%", marginTop: "-15%" }}>PKCS11 Signer Tech Demo</h1>
        <div className={styles.centered}>
          <Connection connected={connected} />
          {!selectedFile && <FileChooser onChosen={confirmFile} />}
          {selectedFile && !selectedProvider && <ProviderChooser onChosen={confirmProvider} onBack={backToFiles} />}
          {selectedFile && selectedProvider && !selectedCertificate && (
            <CertificateChooser onChosen={confirmCertificate} providerId={selectedProvider.id} onBack={backToProviders} />
          )}
          {selectedFile && selectedProvider && selectedCertificate && (
            <Summary file={selectedFile} provider={selectedProvider} certificate={selectedCertificate} onConfirm={sign} onBack={backTocerts} />
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
