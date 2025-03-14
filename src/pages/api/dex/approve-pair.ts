// pages/api/dex/approve-pair.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

export default async function approvePairHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { pairId } = req.body;
    if (!pairId) {
      return res.status(400).json({ success: false, message: "Missing pairId" });
    }

    await adminDb.collection("pairs").doc(pairId).update({
      status: "approved",
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("approvePair error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error approving pair" });
  }
}
