// file: /pages/api/amm/get-user-lp.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface UserLpResponse {
  success: boolean;
  lpBalance?: number;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserLpResponse>
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }

    const { poolId, userAddress } = req.body;
    if (!poolId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: "Missing poolId or userAddress",
      });
    }

    const docRef = adminDb.collection("lpHoldings").doc(`${poolId}_${userAddress}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(200).json({ success: true, lpBalance: 0 });
    }

    const data = docSnap.data() || {};
    const lpBal = data.lpBalance || 0;

    return res.status(200).json({ success: true, lpBalance: lpBal });
  } catch (error: any) {
    console.error("Error fetching user LP:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user LP balance",
    });
  }
}
