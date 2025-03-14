// pages/api/dex/get-trustlines.ts

import type { NextApiRequest, NextApiResponse } from "next";
import xrpl from "xrpl";

interface GetTrustlinesRequest {
  address: string;
}

interface Trustline {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  ripplingDisabled: boolean;
}

interface GetTrustlinesResponse {
  success: boolean;
  message: string;
  trustlines?: Trustline[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetTrustlinesResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { address }: GetTrustlinesRequest = req.body;
  if (!address) {
    return res
      .status(400)
      .json({ success: false, message: "Address is required" });
  }

  try {
    // 1) Buat client XRPL
    const client = new xrpl.Client("wss://s1.ripple.com"); // Mainnet
    await client.connect();

    // 2) Request 'account_lines' => cast 'as any'
    const request = {
      command: "account_lines",
      account: address,
    } as any;

    // 3) Panggil client.request => cast 'as any' jg
    const response = await client.request(request as any);
    await client.disconnect();

    // 4) Ambil lines -> cast
    const trustlines: Trustline[] = ((response as any).result.lines || []) as Trustline[];

    if (trustlines.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No tokens for address ${address} found.`,
      });
    }

    // 5) Return
    return res.status(200).json({
      success: true,
      message: "Trustlines fetched successfully.",
      trustlines,
    });
  } catch (error: any) {
    console.error("Error fetching trustlines:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}
