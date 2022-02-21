import type { SocketProvider } from "@webcrypto-local/client";
import { createContext, useContext, useEffect, useState } from "react";

type FortifyContextProps = {
  ws: SocketProvider | null;
  connected: boolean;
};

export const FortifyContext = createContext<FortifyContextProps>({
  ws: null,
  connected: false,
});

type FortifyProviderProps = {
  children: any;
};

export const FortifyProvider = ({ children }: FortifyProviderProps) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [ws, setWs] = useState<SocketProvider | null>(null);

  useEffect(() => {
    connect();
  }, []);

  const connect = async () => {
    const ws: SocketProvider = new WebcryptoSocket.SocketProvider({
      storage: await WebcryptoSocket.BrowserStorage.create(),
    });
    ws.connect()
      .on("error", (err) => {
        console.error(err);
      })
      .on("listening", async () => {
        if (!(await ws.isLoggedIn())) {
          const pin = await ws.challenge();
          // show PIN
          setTimeout(() => {
            alert("2key session PIN:" + pin);
          }, 100);
          // ask to approve session
          await ws.login();
        }

        setConnected(true);
      });

    setWs(ws);

    return () => {
      ws.close();
    };
  };

  return (
    <FortifyContext.Provider
      value={{
        ws,
        connected,
      }}
    >
      {children}
    </FortifyContext.Provider>
  );
};

export const useFortify = () => {
  const context = useContext(FortifyContext);

  return { ...context };
};
