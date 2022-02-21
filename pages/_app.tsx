import "../styles/globals.css";
import type { AppProps } from "next/app";
import { FortifyProvider } from "../components/context/SocketContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <FortifyProvider>
      <Component {...pageProps} />
    </FortifyProvider>
  );
}

export default MyApp;
