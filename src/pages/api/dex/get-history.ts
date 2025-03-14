// file: /src/pages/api/dex/get-history.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface TvlPoint {
  time: number;
  tvl: number;
}

interface HistoryResponse {
  success: boolean;
  tvlData?: TvlPoint[];
  message?: string;
}

export default async function getHistory(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { pairId, days } = req.query;
  if (!pairId) {
    return res.status(400).json({ success: false, message: "pairId is required" });
  }

  const pairIdValue = Array.isArray(pairId) ? pairId[0] : pairId;
  // Jika days tidak disediakan, default 7 hari
  const rangeDays = days ? parseInt(Array.isArray(days) ? days[0] : days, 10) : 7;
  const pastTimestamp = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  try {
    if (!adminDb) {
      return res.status(500).json({ success: false, message: "Firestore adminDb is not initialized" });
    }

    // Query Firestore hanya berdasarkan pairId
    const snapshot = await adminDb
      .collection("tvl_history")
      .where("pairId", "==", pairIdValue)
      .get();

    console.log(`Total docs for pairId ${pairIdValue}: ${snapshot.size}`);

    if (snapshot.empty) {
      console.log("No docs found in Firestore for this pairId.");
      return res.status(200).json({ success: true, tvlData: [], message: "No TVL data found." });
    }

    const tvlData: TvlPoint[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      let timeValue = 0;
      if (data.timestamp) {
        if (typeof data.timestamp.toMillis === "function") {
          timeValue = data.timestamp.toMillis();
        } else if (typeof data.timestamp === "number") {
          timeValue = data.timestamp;
        } else if (typeof data.timestamp === "string") {
          const parsed = Date.parse(data.timestamp);
          timeValue = isNaN(parsed) ? 0 : parsed;
        }
      }
      // Log tiap dokumen untuk debugging
      console.log(`Doc ID ${doc.id}: time=${timeValue}, tvlXRP=${data.tvlXRP}`);

      // Hanya ambil dokumen yang timestamp-nya lebih besar atau sama dengan batas waktu
      if (timeValue >= pastTimestamp) {
        tvlData.push({ time: timeValue, tvl: data.tvlXRP != null ? data.tvlXRP : 0 });
      }
    });

    // Urutkan data berdasarkan waktu secara ascending
    tvlData.sort((a, b) => a.time - b.time);
    console.log(`Returning ${tvlData.length} dokumen untuk chart.`);

    return res.status(200).json({ success: true, tvlData });
  } catch (error: any) {
    console.error("Error in getHistory:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
}
