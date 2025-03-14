// // pages/api/admin/issue-token.ts
// import type { NextApiRequest, NextApiResponse } from "next";
// import { adminDb } from "../../../../lib/firebaseAdmin";
// import { issueTokenOnXRPL } from "../../../../lib/issueTokenXRPL"; 
// // Fungsi issueTokenOnXRPL adalah logika XRPL: Payment dari issuer ke distribution, dsb.

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ success: false, message: "Method not allowed." });
//   }

//   try {
//     const { campaignId } = req.body;
//     if (!campaignId) {
//       return res.status(400).json({ success: false, message: "Missing campaignId." });
//     }

//     // Ambil data campaign
//     const campaignRef = adminDb.collection("campaigns").doc(campaignId);
//     const docSnap = await campaignRef.get();
//     if (!docSnap.exists) {
//       return res.status(404).json({ success: false, message: "Campaign not found." });
//     }
//     const campData = docSnap.data();
//     if (campData?.status !== "processing") {
//       return res.status(400).json({ success: false, message: "Campaign not in processing status." });
//     }

//     // Panggil fungsi penerbitan token di XRPL
//     // misalnya:
//     const result = await issueTokenOnXRPL({
//       tokenSymbol: campData.tokenSymbol,
//       totalSupply: campData.totalSupply,
//       // ... parameter lain
//     });
//     if (!result.success) {
//       return res.status(500).json({ success: false, message: "Issue token failed." });
//     }

//     // Update status campaign -> "listed"
//     await campaignRef.update({
//       status: "listed",
//       updatedAt: new Date(),
//     });

//     return res.status(200).json({ success: true, message: "Token issuance successful." });
//   } catch (error: any) {
//     console.error("Error issuing token:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// }
