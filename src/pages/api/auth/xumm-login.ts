// src/pages/api/auth/xumm-login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";

interface SignInPayload {
  TransactionType: "SignIn";
  [key: string]: any;
}

export default async function xummLoginHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }

    const xummApiKey = process.env.XUMM_API_KEY || "";
    const xummApiSecret = process.env.XUMM_API_SECRET || "";

    if (!xummApiKey || !xummApiSecret) {
      return res.status(500).json({
        success: false,
        message: "XUMM API credentials are not set.",
      });
    }

    const xumm = new XummSdk(xummApiKey, xummApiSecret);

    // Payload SignIn
    const payload: SignInPayload = {
      TransactionType: "SignIn",
    };

    const options = {
      expire: 5,
      return_url: {
        web: "https://xrplquantum.com/dex", 
      },
    };

    const result = await xumm.payload.create(payload as any, options as any);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to create Xumm login payload (result was null).",
      });
    }

    const customRefs = {
      qr_png: result.refs?.qr_png || "",
      open_in_xumm_web: result.next?.always || "",
    };

    return res.status(200).json({
      success: true,
      uuid: result.uuid,
      refs: customRefs,
    });
  } catch (error: any) {
    console.error("xumm-login error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create Xumm login payload",
    });
  }
}
