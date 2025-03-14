// file: /src/pages/api/dex/trustset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";
import { constructTokenCurrency } from "../../../../lib/xrplUtils";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY || "",
  process.env.XUMM_API_SECRET || ""
);

interface TrustSetRequest {
  userAddress: string;
  tokenCurrency: string;
  issuer: string;
  limit?: number;
}

interface TrustSetResponse {
  success: boolean;
  payloadUuid?: string;
  message: string;
}

type XRPLCurrency = "XRP" | { currency: string; issuer: string };

function makeLimitAmount(ctc: XRPLCurrency, issuer: string, limitValue: number) {
  if (ctc === "XRP") {
    return {
      currency: "XRP",
      issuer,
      value: limitValue.toString(),
    };
  } else {
    return {
      currency: ctc.currency,
      issuer: ctc.issuer,
      value: limitValue.toString(),
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrustSetResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { userAddress, tokenCurrency, issuer, limit } = req.body as TrustSetRequest;
    if (!userAddress || !tokenCurrency || !issuer) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const trustLimit = limit && limit > 0 ? limit : 1000000;

    // 1) XRPL currency
    const ctc = constructTokenCurrency(tokenCurrency, issuer);
    // 2) LimitAmount object
    const limitAmountObj = makeLimitAmount(ctc, issuer, trustLimit);

    // 3) TrustSet tx
    const trustSetTx = {
      TransactionType: "TrustSet",
      Account: userAddress,
      Fee: "12",
      Flags: 131072, // tfSetNoRipple, dsb
      LimitAmount: limitAmountObj,
    };

    // 4) Buat payload + cast 'as any' agar TS tak rewel
    const payloadBody = {
      txjson: trustSetTx,
      options: { submit: true },
    } as any;

    // 5) createAndSubscribe => param pertama 'as any'
    const subscription = await xumm.payload.createAndSubscribe(
      payloadBody as any,
      (event) => {
        if (event.data?.signed) return { resolved: true };
        return {};
      }
    );

    return res.status(200).json({
      success: true,
      payloadUuid: subscription.created.uuid,
      message: "TrustSet transaction created. Please sign in Xumm.",
    });
  } catch (error: any) {
    console.error("TrustSet error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
