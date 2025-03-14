// src/pages/api/dex/get-transaction-history.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface Transaction {
  offerId: string;
  pairId: string;
  action: "buy" | "sell";
  amount: number;
  price: number | null;
  userAddress: string;
  status: "open" | "filled" | "cancelled";
  createdAt: string | null; // ISO string atau null
}

interface TransactionHistoryResponse {
  success: boolean;
  transactions?: Transaction[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionHistoryResponse>
) {
  if (req.method !== "GET") {
    console.warn("Method not allowed:", req.method);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { pairId } = req.query;

  if (!pairId || typeof pairId !== "string") {
    console.warn("Invalid pairId:", pairId);
    return res.status(400).json({ success: false, message: "pairId is required and must be a string" });
  }

  try {
    console.log(`Fetching transaction history for pairId: ${pairId}`);

    // Ambil semua transaksi untuk pairId tertentu
    const offersSnapshot = await adminDb.collection("offers")
      .where("pairId", "==", pairId)
      .orderBy("createdAt", "desc")
      .get();

    const transactions: Transaction[] = [];

    offersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Processing document ID: ${doc.id}`, data);

      // Pastikan semua field yang diperlukan ada
      if (
        data.offerId &&
        data.pairId &&
        data.action &&
        typeof data.amount === "number" &&
        (typeof data.price === "number" || data.price === null) &&
        data.userAddress &&
        data.status &&
        data.createdAt
      ) {
        const createdAt = data.createdAt.toDate
          ? data.createdAt.toDate().toISOString()
          : null;

        transactions.push({
          offerId: data.offerId,
          pairId: data.pairId,
          action: data.action,
          amount: data.amount,
          price: data.price,
          userAddress: data.userAddress,
          status: data.status,
          createdAt,
        });
      } else {
        console.warn(`Incomplete transaction data in document ID: ${doc.id}`);
      }
    });

    console.log(`Fetched ${transactions.length} transactions for pairId: ${pairId}`);

    return res.status(200).json({ success: true, transactions });
  } catch (error: any) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
