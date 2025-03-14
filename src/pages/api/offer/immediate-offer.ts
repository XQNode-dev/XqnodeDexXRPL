// import type { NextApiRequest, NextApiResponse } from 'next'
// import { XummSdk } from 'xumm-sdk'
// import { adminDb } from '../../../../lib/firebaseAdmin'

// interface ImmediateOfferRequest {
//   pairId: string;
//   userAddress: string;
//   takerGetsValue: number;  // Jumlah aset yang dijual (misalnya, XRP dalam unit)
//   fillOrKill?: boolean;    // Opsional: true jika ingin tfFillOrKill, false (default) untuk tfImmediateOrCancel
// }

// interface ImmediateOfferResponse {
//   success: boolean;
//   message: string;
//   payloadUuid?: string;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<ImmediateOfferResponse | { error: string }>
// ) {
//   if (req.method !== 'POST') {
//     res.setHeader("Allow", ["POST"]);
//     return res.status(405).json({ error: "Method not allowed" });
//   }
//   try {
//     const { pairId, userAddress, takerGetsValue, fillOrKill } = req.body as ImmediateOfferRequest;
//     if (!pairId || !userAddress || !takerGetsValue || takerGetsValue <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid input parameters."
//       });
//     }

//     // Ambil data pair dari Firestore (sama seperti API get-pool Anda)
//     const pairDoc = await adminDb.collection("pairs").doc(String(pairId)).get();
//     if (!pairDoc.exists) {
//       return res.status(404).json({
//         success: false,
//         message: "Pair tidak ditemukan."
//       });
//     }
//     const pairData = pairDoc.data();
//     if (!pairData || !pairData.baseToken || !pairData.quoteToken) {
//       return res.status(400).json({
//         success: false,
//         message: "Data pair tidak lengkap."
//       });
//     }

//     // Asumsikan: 
//     // - baseToken adalah token issued (misalnya XQN) dan quoteToken adalah XRP.
//     // - Dalam contoh ini, user ingin menukar XRP (quote) untuk mendapatkan XQN (base).
//     // Jadi:
//     //   TakerGets: XRP yang dijual (dikonversi ke drops)
//     //   TakerPays: { currency: "XQN", issuer: <baseIssuer> } – aset yang dibeli.
//     const baseToken = String(pairData.baseToken).trim().toUpperCase();
//     const baseIssuer = baseToken === "XRP" ? null : (pairData.baseIssuer ? String(pairData.baseIssuer).trim() : null);
//     const quoteToken = String(pairData.quoteToken).trim().toUpperCase();
//     const quoteIssuer = quoteToken === "XRP" ? null : null;

//     // Validasi: jika baseToken bukan XRP, pastikan baseIssuer tersedia.
//     if (baseToken !== "XRP" && !baseIssuer) {
//       return res.status(400).json({
//         success: false,
//         message: "Issuer untuk baseToken tidak ditemukan."
//       });
//     }

//     // Dalam contoh, kita asumsikan user menjual XRP untuk mendapatkan baseToken.
//     const takerGets = quoteToken === "XRP" 
//       ? (takerGetsValue * 1_000_000).toFixed(0)   // XRP diubah ke drops
//       : { currency: quoteToken, issuer: quoteIssuer, value: takerGetsValue.toString() };

//     const takerPays = baseToken === "XRP" 
//       ? "XRP" 
//       : { currency: baseToken, issuer: baseIssuer };

//     // Susun transaksi OfferCreate
//     const tx = {
//       TransactionType: "OfferCreate",
//       Account: userAddress,
//       TakerGets: takerGets,
//       TakerPays: takerPays,
//       // Flag: tfFillOrKill (0x00010000) jika fillOrKill true, atau tfImmediateOrCancel (0x00020000) jika false
//       Flags: fillOrKill ? 0x00010000 : 0x00020000,
//     };

//     console.log("Final OfferCreate TX:", JSON.stringify(tx, null, 2));

//     const xumm = new XummSdk(
//       process.env.XUMM_API_KEY as string,
//       process.env.XUMM_API_SECRET as string
//     );
//     const payload = await xumm.payload.create(tx, true);
//     if (!payload || !payload.uuid) {
//       return res.status(500).json({
//         success: false,
//         message: "Failed to create XUMM payload."
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "Offer created successfully.",
//       payloadUuid: payload.uuid,
//     });
//   } catch (err: any) {
//     console.error("Error in immediate-offer:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// }
