import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import styles from "../styles/Home.module.css";
import download from "downloadjs";
import { parse } from "path";
import FileChooser from "../components/FileChooser";
import Connection from "../components/Connection";
import { useFortify } from "../components/context/SocketContext";
import ProviderChooser from "../components/ProviderChooser";
import CertificateChooser from "../components/CertificateChooser";
import Summary from "../components/Summary";
import { Certificate } from "../models/Certificate.model";
import { signPDFByForge } from "../utils/signPdf";

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

    if (!certificateProvider) throw new Error("Can't read from certificate provider");

    const pdf = await signPDFByForge(certificateProvider, selectedCertificate.fullName, selectedFile);

    const fileName = parse(selectedFile.name);
    download(new Blob([pdf]), `${fileName.name}_${new Date().toISOString()}${fileName.ext}`, "application/pdf");
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
        {/* Je treba prehostovat kvuli CSRF */}
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
