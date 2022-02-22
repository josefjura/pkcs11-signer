import { useEffect, useState } from "react";
import { useFortify } from "./context/SocketContext";
import styles from "../styles/CertificateChooser.module.css";
import { Certificate } from "../models/Certificate.model";

type CertificateChooserProps = {
  onChosen: (certificate: Certificate) => void;
  onBack: () => void;
  providerId: string;
};

const CertificateChooser = ({ onChosen, providerId, onBack }: CertificateChooserProps) => {
  const [certificates, setCertificates] = useState<any[]>([]);

  const { ws, connected } = useFortify();

  useEffect(() => {
    if (ws && connected) readCertificates();
    //TODO: Better cleanup
  }, [ws, connected]);

  const readCertificates = async () => {
    if (!ws) return;

    // get crypto for selected provider
    const crypto = await ws.getCrypto(providerId);

    // Check provider login
    if (!(await crypto.isLoggedIn())) {
      // Request provider for PIN window
      await crypto.login();
    }

    // Get certificate items
    const rawCerts = await crypto.certStorage.keys();

    const certs = rawCerts.map((c) => {
      const parts = c.split("-");
      return {
        name: parts[0],
        id: parts[2],
        fullName: c,
      };
    });

    setCertificates(certs);
  };

  const load = async (certIndex: any) => {
    if (!ws) return;
    const crypto = await ws.getCrypto(providerId);

    // Check provider login
    if (!(await crypto.isLoggedIn())) {
      // Request provider for PIN window
      await crypto.login();
    }

    const item = await crypto.certStorage.getItem(certIndex.fullName);

    onChosen({
      entity: item,
      fullName: certIndex.fullName,
      keyId: certIndex.id,
      name: certIndex.name,
    });
  };

  return (
    <div>
      <div className={styles.question}>Select certificate</div>
      <div className={styles.stack}>
        {certificates.map((certificate, i) => (
          <input type="button" className={styles.button} key={i} onClick={() => load(certificate)} value={certificate.name} />
        ))}
        <input type="button" className={styles.button} onClick={onBack} value="Back" />
      </div>
    </div>
  );
};

export default CertificateChooser;
