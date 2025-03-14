// file: /pages/api/amm/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface AmmPool {
  id: string;
  assetA: string;
  assetB: string;
  assetA_issuer?: string;
  assetB_issuer?: string;
  totalA: number;
  totalB: number;
  lpTokenSupply: number;
  currentFee: number;
}

interface AmmListResponse {
  success: boolean;
  pools?: AmmPool[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AmmListResponse>
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const snap = await adminDb.collection("ammPools").get();
    const pools: AmmPool[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as Omit<AmmPool, "id">;
      pools.push({ id: doc.id, ...data });
    });

    return res.status(200).json({ success: true, pools });
  } catch (error: any) {
    console.error("Error listing AMM pools:", error);
    return res.status(500).json({
      success: false,
      message: "Error listing AMM pools",
    });
  }
}
