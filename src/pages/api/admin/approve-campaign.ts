import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface ApproveCampaignResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApproveCampaignResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing campaignId" });
    }

    const pendingRef = adminDb.collection("pendingCampaigns").doc(campaignId);
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found in pending campaigns",
      });
    }
    const pendingData = pendingSnap.data();

    const campaignData = {
      ...pendingData,
      status: "processing",
      approvedAt: new Date(),
    };

    await adminDb.collection("campaigns").doc(campaignId).set(campaignData);

    await pendingRef.delete();

    return res.status(200).json({
      success: true,
      message: "Campaign approved and moved to processing",
    });
  } catch (error: any) {
    console.error("Error approving campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal server error" });
  }
}
