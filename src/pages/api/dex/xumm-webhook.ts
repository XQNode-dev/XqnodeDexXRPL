// pages/api/dex/xumm-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";
import { adminDb } from "../../../../lib/firebaseAdmin";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY || "",
  process.env.XUMM_API_SECRET || ""
);

// ...
export default async function xummWebhookHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { payloadResponse } = req.body || {};
    if (!payloadResponse) {
      return res.status(400).json({ error: "No payloadResponse" });
    }

    const { payload_uuidv4, signed } = payloadResponse;
    if (!payload_uuidv4) {
      return res.status(400).json({ error: "Missing payload_uuidv4" });
    }

    // Jika user menolak => hapus doc dari pendingCampaigns
    if (signed === false) {
      const pendingSnap = await adminDb
        .collection("pendingCampaigns")
        .where("payloadUuid", "==", payload_uuidv4)
        .get();
      pendingSnap.forEach((doc) => doc.ref.delete());

      return res.status(200).json({ success: true, message: "User rejected payment" });
    }

    // Jika signed === true => cek detail payload
    const details = await xumm.payload.get(payload_uuidv4);
    const userAddr = details?.response?.account;
    const txid = details?.response?.txid;

    // Ambil doc dari "pendingCampaigns" yg punya payloadUuid = payload_uuidv4
    const snapshot = await adminDb
      .collection("pendingCampaigns")
      .where("payloadUuid", "==", payload_uuidv4)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No matching pending campaign doc => skip");
      return res.status(200).json({ success: true });
    }

    const docRef = snapshot.docs[0].ref;
    const pendingData = snapshot.docs[0].data();

    // Pindahkan (atau update) doc ke "campaigns" collection dengan status "processing"
    // misalnya ID doc pakai docRef.id agar konsisten
    const newDoc = {
      ...pendingData,
      status: "processing",
      updatedAt: new Date(),
      txHash: txid || "",
    };

    // Buat / update doc di "campaigns"
    await adminDb.collection("campaigns").doc(docRef.id).set(newDoc);

    // Hapus doc dari "pendingCampaigns"
    await docRef.delete();

    console.log(`=> Campaign ${docRef.id} moved from pending to campaigns with status=processing`);

    return res.status(200).json({ success: true, message: "Payment signed, campaign is now processing" });
  } catch (err: any) {
    console.error("xumm-webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
