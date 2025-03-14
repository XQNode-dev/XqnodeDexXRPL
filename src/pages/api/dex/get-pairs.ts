// pages/api/dex/get-pairs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface GetPairsResponse {
  success: boolean;
  message: string;
  pairs?: any[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetPairsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("Fetching approved pairs...");

    const pairsCol = adminDb.collection("pairs");
    const q = pairsCol.where("status", "==", "approved");
    const snapshot = await q.get();

    console.log(`Found ${snapshot.size} approved pairs.`);

    const pairs: any[] = [];
    snapshot.forEach((doc) => {
      pairs.push({ id: doc.id, ...doc.data() });
    });

    console.log("Pairs fetched successfully:", pairs);

    // No-cache headers
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // **Tambahkan 'message' di respons**
    return res.status(200).json({
      success: true,
      message: "Approved pairs fetched successfully.",
      pairs,
    });
  } catch (error: any) {
    console.error("Error fetching pairs:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
