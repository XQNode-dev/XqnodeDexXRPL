// file: /pages/api/amm/get-auction-slot.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface AuctionSlotResponse {
  success: boolean;
  slotHolder?: string;
  slotExpiry?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuctionSlotResponse>
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { poolId } = req.query;
    if (!poolId || typeof poolId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing poolId",
      });
    }

    // Asumsi disimpan di: ammPools/{poolId}/auctionSlot/slotData
    const slotRef = adminDb
      .collection("ammPools")
      .doc(poolId)
      .collection("auctionSlot")
      .doc("slotData");

    const snap = await slotRef.get();
    if (!snap.exists) {
      return res.status(200).json({
        success: true,
        slotHolder: "",
        slotExpiry: ""
      });
    }

    const data = snap.data() || {};
    return res.status(200).json({
      success: true,
      slotHolder: data.holder || "",
      slotExpiry: data.expiry || "",
    });
  } catch (error: any) {
    console.error("Error get-auction-slot:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
