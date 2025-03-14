// pages/api/auth/xumm-verify.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";
import { adminDb } from "../../../../lib/firebaseAdmin";

export default async function xummVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const { uuid } = req.body;
    if (!uuid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing UUID" });
    }

    const xummApiKey = process.env.XUMM_API_KEY || "";
    const xummApiSecret = process.env.XUMM_API_SECRET || "";
    const xumm = new XummSdk(xummApiKey, xummApiSecret);

    const payloadDetails = await xumm.payload.get(uuid);
    if (!payloadDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Payload not found" });
    }

    if (!payloadDetails.meta.resolved) {
      return res
        .status(200)
        .json({ success: false, status: "pending" });
    }
    if (payloadDetails.meta.signed === false) {
      return res
        .status(200)
        .json({ success: false, status: "rejected" });
    }

    const userAddr = payloadDetails.response.account;

    if (!userAddr) {
      return res.status(500).json({
        success: false,
        message: "No account address found in Xumm response",
      });
    }

    const userRef = adminDb.collection("users").doc(userAddr);

    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        transaction.update(userRef, { lastLogin: new Date() });
      } else {
        transaction.set(userRef, {
          address: userAddr,
          lastLogin: new Date(),
          totalXqnLocked: 0, 
          commitsCount: 0,    
        });
      }
    });

    return res.status(200).json({ success: true, address: userAddr });
  } catch (error: any) {
    console.error("xumm-verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying Xumm payload",
    });
  }
}
