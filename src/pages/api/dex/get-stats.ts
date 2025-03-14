// file: /pages/api/dex/get-stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface StatsResponse {
  success: boolean;
  message: string;
  volume24h?: number;
  marketCapUSD?: number;
  supply?: number;
  holders?: number;
  trustlines?: number;
  priceChange?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Method not allowed." });
    return;
  }

  const { pairId } = req.query;
  if (!pairId) {
    res.status(400).json({
      success: false,
      message: "Parameter 'pairId' harus disediakan.",
    });
    return;
  }

  try {
    // Ambil data pair dari Firestore (opsional)
    const pairDoc = await adminDb.collection("pairs").doc(String(pairId)).get();
    if (!pairDoc.exists) {
      res.status(404).json({
        success: false,
        message: "Pair tidak ditemukan di Firestore.",
      });
      return;
    }

    const pairData = pairDoc.data() ?? {};
    // Jika perlu:
    const baseToken = pairData.baseToken || "XQN";
    const quoteToken = pairData.quoteToken || "XRP";

    const volume24h = 12345; 
    const marketCapUSD = 200000; // $200k
    const supply = 273_000_000; 
    const holders = 466;
    const trustlines = 19000;
    const priceChange = 12.5; 

    res.status(200).json({
      success: true,
      message: "Stats fetched successfully.",
      volume24h,
      marketCapUSD,
      supply,
      holders,
      trustlines,
      priceChange,
    });
  } catch (err) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    console.error("Error in get-stats:", err);
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}
