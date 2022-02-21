import styles from "../styles/Summary.module.css";

type SummaryProps = {
  file: File;
  provider: any;
  certificate: any;
  onConfirm: () => void;
  onBack: () => void;
};

const Summary = ({ certificate, file, provider, onConfirm, onBack }: SummaryProps) => {
  return (
    <div className={styles.centered}>
      <div className={styles.question}>Do you want to sign the selected document?</div>
      <span>
        <b>Filename:</b> {file.name}
      </span>
      <span>
        <b>Certificate provider:</b> {provider.name}
      </span>
      <span>
        <b>Certificate ID:</b> {certificate.id}
      </span>
      <div className={styles.stack}>
        <input type="button" className={styles.button} value="Sign the document" onClick={onConfirm} />
        <input type="button" className={styles.button} value="Back" onClick={onBack} />
      </div>
    </div>
  );
};

export default Summary;
