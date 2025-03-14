import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface GetUserCommitsResponse {
  success: boolean;
  totalLocked: number;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetUserCommitsResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, totalLocked: 0, message: "Method not allowed" });
  }

  const { userAddress } = req.query;
  if (!userAddress || typeof userAddress !== "string") {
    return res.status(400).json({ success: false, totalLocked: 0, message: "Invalid userAddress" });
  }

  try {
    // Kumpulkan semua doc commits
    const snap = await adminDb
      .collection("commits")
      .where("userAddress", "==", userAddress)
      .get();

    let totalLocked = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      if (data.xqnLocked && data.status === "locked") {
        totalLocked += data.xqnLocked;
      }
    });

    return res.status(200).json({
      success: true,
      totalLocked
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, totalLocked: 0, message: err.message });
  }
}
