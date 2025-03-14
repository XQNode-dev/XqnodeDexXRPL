import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Tampilkan commit yang status-nya "locked" atau "distributed"
    const snapshot = await adminDb
      .collection("commits")
      .where("status", "in", ["locked", "distributed"])
      .get();

    const commits: any[] = [];
    snapshot.forEach((doc) => {
      commits.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ commits });
  } catch (error: any) {
    console.error("Error fetching commits:", error);
    return res.status(500).json({ error: error.message });
  }
}
