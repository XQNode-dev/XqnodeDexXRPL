import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface GetCampaignsResponse {
  success: boolean;
  message: string;
  campaigns?: {
    pending: any[];
    listed: any[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetCampaignsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const campaignsSnap = await adminDb
      .collection("campaigns")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const campaignsListed: any[] = [];
    const campaignsProcessing: any[] = [];

    campaignsSnap.forEach((doc) => {
      const data = doc.data();
      if (!data || typeof data !== "object") return;
      const status = data.status;
      if (status === "listed") {
        campaignsListed.push({ id: doc.id, ...data });
      } else if (status === "processing") {
        campaignsProcessing.push({ id: doc.id, ...data });
      }
    });

    const pendingSnap = await adminDb
      .collection("pendingCampaigns")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const campaignsPending: any[] = [];
    pendingSnap.forEach((doc) => {
      const data = doc.data();
      if (!data || typeof data !== "object") return;
      campaignsPending.push({ id: doc.id, ...data });
    });

    const finalPending = [...campaignsPending, ...campaignsProcessing];

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).json({
      success: true,
      message: "Campaigns fetched successfully.",
      campaigns: {
        pending: finalPending,
        listed: campaignsListed,
      },
    });
  } catch (error: any) {
    const errMsg = error?.message ?? String(error) ?? "Unknown error";
    console.error("Error fetching campaigns:", errMsg);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
