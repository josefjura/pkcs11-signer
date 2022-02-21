import { ChangeEventHandler, MouseEventHandler, useState } from "react";
import styles from "../styles/FileChooser.module.css";

type FileChooserProps = {
  onChosen: (file: File) => void;
};

const FileChooser = ({ onChosen }: FileChooserProps) => {
  const [document, setDocument] = useState<File>();

  const uploadToClient: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files[0]) {
      const i = event.target.files[0];

      setDocument(i);
    }
  };

  const uploadToServer: MouseEventHandler<HTMLInputElement> = async (event) => {
    event.preventDefault();
    onChosen(document!);
  };

  return (
    <form>
      <div className={styles.fileInput}>
        <input title="pdf" type="file" name="pdf" id="pdf" accept="application/pdf" className={styles.file} onChange={uploadToClient} />
        <label htmlFor="pdf">{document ? "Select different file" : "Select file"}</label>
      </div>
      <div>
        {document && (
          <div className={styles.sendPanel}>
            {document.name} - {document.size}b
            <input type="button" className={styles.button} onClick={uploadToServer} value="Confirm selection" />
          </div>
        )}
      </div>
    </form>
  );
};

export default FileChooser;
