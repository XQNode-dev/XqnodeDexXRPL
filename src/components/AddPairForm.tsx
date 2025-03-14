// src/components/AddPairForm.tsx

import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

interface Trustline {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  ripplingDisabled: boolean;
}

interface AddPairFormProps {
  onPairAdded: () => void;
}

export default function AddPairForm({ onPairAdded }: AddPairFormProps) {
  const [issuerAddress, setIssuerAddress] = useState("");
  const [poolAccount, setPoolAccount] = useState(""); // Input pool account
  const [tokens, setTokens] = useState<Trustline[]>([]);
  const [selectedBaseToken, setSelectedBaseToken] = useState("");
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingPair, setLoadingPair] = useState(false);

  const { userAddress } = useContext(AuthContext);

  const fetchIssuedTokens = async () => {
    if (!issuerAddress) {
      toast.error("Please enter issuer address.");
      return;
    }

    setLoadingTokens(true);
    try {
      const resp = await fetch("/api/dex/get-issued-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerAddress }),
      });
      const data = await resp.json();
      console.log("Fetched tokens:", data.tokens);
      if (!data.success) throw new Error(data.message);

      setTokens(data.tokens || []);
      toast.success("Tokens fetched successfully.");
    } catch (err: any) {
      toast.error(err.message || "Error fetching tokens");
      setTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleAddPair = async () => {
    if (!selectedBaseToken || !issuerAddress || !poolAccount) {
      toast.error("Please fill all fields.");
      return;
    }

    if (!userAddress) {
      toast.error("You must be logged in to add a trading pair.");
      return;
    }

    if (selectedBaseToken.toUpperCase() === "XRP") {
      toast.error("Cannot use XRP as the base token. (XRP is quote token by default.)");
      return;
    }

    setLoadingPair(true);
    try {
      const resp = await fetch("/api/dex/add-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseToken: selectedBaseToken,
          quoteToken: "XRP", 
          baseIssuer: issuerAddress,
          poolAccount,
          userAddress, 
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      toast.success(`Pair added successfully with ID: ${data.pairId}`);

      setIssuerAddress("");
      setPoolAccount("");
      setTokens([]);
      setSelectedBaseToken("");

      onPairAdded();
    } catch (err: any) {
      toast.error(err.message || "Error adding pair");
    } finally {
      setLoadingPair(false);
    }
  };

  return (
    <div className="bg-[#1f2538] p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">Add New Trading Pair</h2>

      {/* Input Issuer Address */}
      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Issuer Address</label>
        <input
          type="text"
          placeholder="Enter issuer address"
          value={issuerAddress}
          onChange={(e) => setIssuerAddress(e.target.value)}
          className="w-full px-4 py-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Input Pool Account */}
      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium">Pool Account</label>
        <input
          type="text"
          placeholder="Enter pool account address"
          value={poolAccount}
          onChange={(e) => setPoolAccount(e.target.value)}
          className="w-full px-4 py-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Button to Fetch Issued Tokens */}
      <div className="mb-4">
        <button
          onClick={fetchIssuedTokens}
          disabled={loadingTokens}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
        >
          {loadingTokens ? "Fetching Tokens..." : "Fetch Issued Tokens"}
        </button>
      </div>

      {/* Select Base Token */}
      {tokens.length > 0 && (
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Select Base Token</label>
          <select
            value={selectedBaseToken}
            onChange={(e) => setSelectedBaseToken(e.target.value)}
            className="w-full px-4 py-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">-- Select Token --</option>
            {tokens.map((token) => (
              <option key={token.currency + token.issuer} value={token.currency}>
                {token.currency}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Button to Add Pair */}
      {selectedBaseToken && (
        <div>
          <button
            onClick={handleAddPair}
            disabled={loadingPair}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
          >
            {loadingPair ? "Adding Pair..." : "Add Trading Pair"}
          </button>
        </div>
      )}
    </div>
  );
}
