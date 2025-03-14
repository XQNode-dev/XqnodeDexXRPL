import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { commitId } = req.body;
    if (!commitId) {
      return res.status(400).json({ error: "commitId is required" });
    }

    // 1) Ambil doc "commits/commitId"
    const commitRef = adminDb.collection("commits").doc(commitId);
    const commitDoc = await commitRef.get();
    if (!commitDoc.exists) {
      return res.status(404).json({ error: "Commit not found" });
    }

    const commitData = commitDoc.data();
    if (!commitData) {
      return res.status(404).json({ error: "Commit data is empty" });
    }

    // 2) Cek apakah sudah distributed
    if (commitData.status === "distributed") {
      return res
        .status(400)
        .json({ error: "Already distributed" });
    }

    // 3) Update status "distributed"
    await commitRef.update({
      status: "distributed",
      distributionTx: "FrontEndTxDemo", // misal, ganti dgn tx hash jika ingin
      distributedAt: new Date(),
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error in commit-update:", error);
    return res.status(500).json({ error: error.message });
  }
}
