// src/pages/api/dex/analytics-overview.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface AnalyticsOverviewResponse {
  success: boolean;
  totalVolume?: number;
  topTokens?: string[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsOverviewResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {

    const totalVolume = 123456;
    const topTokens = ["XQN", "MAG", "TEST"];

    return res.status(200).json({
      success: true,
      totalVolume,
      topTokens,
    });
  } catch (err: any) {
    console.error("analytics-overview:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
