import { useEffect, useState } from "react";
import { useFortify } from "./context/SocketContext";
import styles from "../styles/ProviderChooser.module.css";

type ProviderChooserProps = {
  onChosen: (provider: any) => void;
  onBack: () => void;
};

const ProviderChooser = ({ onChosen, onBack }: ProviderChooserProps) => {
  const [providers, setProviders] = useState<any[]>([]);

  const { ws, connected } = useFortify();

  useEffect(() => {
    if (ws && connected) {
      readProviders();
      ws.cardReader.on("insert", updateState).on("remove", updateState);
    }

    return () => {
      ws?.cardReader.removeListener("insert", updateState).removeListener("remove", updateState);
    };
  }, [ws, connected]);

  const updateState = () => {
    readProviders();
  };

  const readProviders = async () => {
    if (!ws) return;
    const info = await ws.info();
    setProviders(info.providers);
  };

  return (
    <div>
      <div className={styles.question}>Select certificate provider</div>
      <div className={styles.stack}>
        {providers.map((provider, i) => (
          <input type="button" className={styles.button} key={i} onClick={() => onChosen(provider)} value={provider?.token?.label ?? provider.name} />
        ))}
        <input type="button" className={styles.button} onClick={onBack} value="Back" />
      </div>
    </div>
  );
};

export default ProviderChooser;
