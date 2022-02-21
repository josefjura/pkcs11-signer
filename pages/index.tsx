import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import {
  ChangeEventHandler,
  MouseEventHandler,
  useEffect,
  useState,
} from "react";
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
import { getCertificateKey } from "../utils";
import { Certificate } from "../models/Certificate.model";

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
    const providerForReal = await ws?.getCrypto(selectedProvider.id);
    const key = await getCertificateKey(
      "private",
      providerForReal,
      selectedCertificate.fullName
    );
  };

  const uploadToServer = async () => {
    if (!selectedFile) return;

    const body = new FormData();
    body.append("file", selectedFile);
    const response = await fetch("/api/presign", {
      method: "POST",
      body,
    });
    const fileName = parse(selectedFile.name);
    download(
      await response.blob(),
      `${fileName.name}_${new Date().toISOString()}.${fileName.ext}`
    );
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
        <title>Czechpoint Signer Tech Demo</title>
        <link rel="icon" href="/favicon.ico" />
        <script
          defer
          src="https://fortifyapp.com/external/asmCrypto/2.3.2/asmcrypto.all.es5.min.js"
        ></script>
        <script
          defer
          src="https://fortifyapp.com/external/elliptic/elliptic.min.js"
        ></script>
        <script
          defer
          type="module"
          src="https://fortifyapp.com/external/webcrypto-liner/1.2.3/webcrypto-liner.shim.min.mjs"
        ></script>

        <script
          defer
          src="https://fortifyapp.com/external/protobuf/6.8.0/protobuf.min.js"
        ></script>
        <script
          defer
          type="module"
          src="https://fortifyapp.com/external/webcrypto-local/client/1.6.5/webcrypto-socket.min.mjs"
        ></script>
      </Head>
      <div className={styles.container}>
        <div className={styles.centered}>
          <Connection connected={connected} />
          {!selectedFile && <FileChooser onChosen={confirmFile} />}
          {selectedFile && !selectedProvider && (
            <ProviderChooser onChosen={confirmProvider} onBack={backToFiles} />
          )}
          {selectedFile && selectedProvider && !selectedCertificate && (
            <CertificateChooser
              onChosen={confirmCertificate}
              providerId={selectedProvider.id}
              onBack={backToProviders}
            />
          )}
          {selectedFile && selectedProvider && selectedCertificate && (
            <Summary
              file={selectedFile}
              provider={selectedProvider}
              certificate={selectedCertificate}
              onConfirm={sign}
              onBack={backTocerts}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
