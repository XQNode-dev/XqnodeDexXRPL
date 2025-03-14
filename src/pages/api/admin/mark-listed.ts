// pages/api/admin/mark-listed.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface MarkListedResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarkListedResponse>
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

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const docSnap = await campaignRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found in 'campaigns'",
      });
    }

    const campaignData = docSnap.data();
    if (campaignData?.status !== "processing") {
      return res.status(400).json({
        success: false,
        message: "Campaign is not in 'processing' status.",
      });
    }

    // Tandai jadi "listed"
    await campaignRef.update({
      status: "listed",
      updatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Campaign marked as 'listed'.",
    });
  } catch (error: any) {
    console.error("Error marking campaign listed:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal server error" });
  }
}
