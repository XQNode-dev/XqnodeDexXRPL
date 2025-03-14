// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import Cookies from "js-cookie";

interface AuthContextType {
  userAddress: string | null;
  setUserAddress: (address: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  userAddress: null,
  setUserAddress: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const address = Cookies.get("userAddress");
    if (address) {
      setUserAddress(address);
    }
  }, []);

  useEffect(() => {
    if (userAddress) {
      Cookies.set("userAddress", userAddress, { expires: 1 }); // Expires in 1 day
    } else {
      Cookies.remove("userAddress");
    }
  }, [userAddress]);

  return (
    <AuthContext.Provider value={{ userAddress, setUserAddress }}>
      {children}
    </AuthContext.Provider>
  );
};
