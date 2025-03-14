// src/components/TransactionHistory.tsx
import React, { useEffect, useState } from "react";

interface Transaction {
  offerId: string;
  pairId: string;
  action: "buy" | "sell";
  amount: number;
  price: number | null;
  userAddress: string;
  status: "open" | "filled" | "cancelled";
  createdAt: string | null;
}

interface TransactionHistoryProps {
  pairId: string;
}

export default function TransactionHistory({ pairId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dex/get-transaction-history?pairId=${pairId}`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      const data: { success: boolean; transactions?: Transaction[]; message?: string } = await response.json();
      console.log("Fetched transaction history:", data);

      if (data.success) {
        setTransactions(data.transactions || []);
        setError(null);
      } else {
        setError(data.message || "Failed to fetch transaction history.");
      }
    } catch (err: any) {
      console.error("Error fetching transaction history:", err);
      setError("Error fetching transaction history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pairId) return;

    console.log(`Fetching transaction history for pairId: ${pairId}`);
    fetchTransactions();

    // return () => clearInterval(interval);
  }, [pairId]);

  if (loading) {
    return <div className="text-gray-300">Loading transaction history...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h3 className="font-semibold mb-2 text-blue-400">Transaction History</h3>
      {transactions.length > 0 ? (
        <ul className="space-y-2">
          {transactions.map((tx) => (
            <li key={tx.offerId} className="bg-[#2a2f45] p-3 rounded-lg">
              <p><strong>Offer ID:</strong> {tx.offerId}</p>
              <p><strong>Action:</strong> {tx.action}</p>
              <p><strong>Amount:</strong> {tx.amount}</p>
              <p><strong>Price:</strong> {tx.price ? `${tx.price} XRP` : "Market"}</p>
              <p><strong>User Address:</strong> {tx.userAddress}</p>
              <p><strong>Status:</strong> {tx.status}</p>
              <p><strong>Created At:</strong> {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "N/A"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No transactions found for this pair.</p>
      )}
    </div>
  );
}
