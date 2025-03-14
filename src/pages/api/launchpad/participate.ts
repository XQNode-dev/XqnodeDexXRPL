// pages/api/launchpad/participate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface ParticipateResponse {
  success: boolean;
  message: string;
  campaign?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParticipateResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  try {
    const { campaignId, amount } = req.body;
    if (!campaignId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }
    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const doc = await campaignRef.get();
    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }
    await adminDb.runTransaction(async (transaction) => {
      const campaignDoc = await transaction.get(campaignRef);
      const currentRaised = campaignDoc.data()?.raisedAmount || 0;
      transaction.update(campaignRef, {
        raisedAmount: currentRaised + Number(amount),
      });
    });
    const updatedDoc = await campaignRef.get();
    const campaign = { id: updatedDoc.id, ...updatedDoc.data() };
    return res.status(200).json({
      success: true,
      message: "Participation successful",
      campaign,
    });
  } catch (error: any) {
    console.error("Error in participate:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
