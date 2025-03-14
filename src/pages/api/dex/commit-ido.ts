// src/pages/api/dex/commit-ido.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";
import { v4 as uuidv4 } from 'uuid'; 

const xumm = new XummSdk(
  process.env.XUMM_API_KEY || "",
  process.env.XUMM_API_SECRET || ""
);

interface CommitIDORequest {
  userAddress: string;
  xrpAmount: number;
}

interface CommitIDOResponse {
  success: boolean;
  message?: string;
  payloadUuid?: string;
}

const DEV_WALLET = "rBMLzVQKefanmzxyXe5FCsZGgQgSDn5R4h";
const XQN_IDO_PRICE = 0.0002;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommitIDOResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { userAddress, xrpAmount } = req.body as CommitIDORequest;

    console.log("Received commit-ido request:", { userAddress, xrpAmount });

    if (!userAddress || xrpAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid input." });
    }

    const xqnLocked = xrpAmount / XQN_IDO_PRICE;

    const nonce = uuidv4();

    const payloadBody = {
      txjson: {
        TransactionType: "Payment",
        Account: userAddress,
        Destination: DEV_WALLET,
        Amount: String(Math.floor(xrpAmount * 1_000_000)), // drops
        Fee: "12",
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(`XQN_IDO:${nonce}`).toString("hex"), // "XQN_IDO:<nonce>" dalam hex
              MemoType: Buffer.from("IDO").toString("hex"),             // "IDO" dalam hex
            },
          },
        ],
      },
      custom_meta: {
        identifier: userAddress,
        blob: JSON.stringify({ 
          type: "IDO",
          xrpAmount,
          xqnLocked,
          nonce
        })
      },
      options: {
        submit: true
      }
    } as any;

    console.log("Payload Body:", JSON.stringify(payloadBody, null, 2));

    const payload = await xumm.payload.create(payloadBody);

    if (!payload) {
      return res.status(500).json({
        success: false,
        message: "Xumm payload creation returned null",
      });
    }

    console.log("Created Xumm payload with UUID:", payload.uuid);

    return res.status(200).json({
      success: true,
      payloadUuid: payload.uuid,
      message: "Created IDO commit payload. Please sign in Xumm.",
    });
  } catch (error: any) {
    console.error("commit-ido error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
