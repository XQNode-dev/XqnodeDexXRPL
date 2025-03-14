// pages/api/admin/get-processing-campaigns.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  try {
    const snap = await adminDb
      .collection("campaigns")
      .where("status", "==", "processing")
      .get();

    const campaigns: any[] = [];
    snap.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ success: true, campaigns });
  } catch (error: any) {
    console.error("Error get-processing-campaigns:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
