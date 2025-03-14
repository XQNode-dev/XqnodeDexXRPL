// import type { NextApiRequest, NextApiResponse } from "next";
// import { adminDb } from "../../../../lib/firebaseAdmin";
// import { Client, Wallet } from "xrpl";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== "POST") {
//     res.setHeader("Allow", "POST");
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { commitId } = req.body;
//   console.log("Received commitId:", commitId);

//   if (!commitId) {
//     return res.status(400).json({ error: "commitId is required" });
//   }

//   let client: Client | undefined;

//   try {
//     // 1) Ambil data Firestore
//     const commitDoc = await adminDb.collection("commits").doc(commitId).get();
//     if (!commitDoc.exists) {
//       return res.status(404).json({ error: "Commit not found" });
//     }

//     const commitData = commitDoc.data();
//     if (!commitData) {
//       return res.status(404).json({ error: "Commit data is empty" });
//     }

//     // 2) Cek status
//     if (commitData.status === "distributed") {
//       return res.status(400).json({ error: "Token already distributed" });
//     }

//     const userAddress = commitData.userAddress;
//     const xqnLocked = commitData.xqnLocked;

//     console.log("userAddress:", userAddress);
//     console.log("xqnLocked:", xqnLocked);

//     if (!userAddress || !xqnLocked) {
//       return res.status(400).json({ error: "Incomplete commit data" });
//     }

//     // 3) XRPL
//     const networkUrl = process.env.XRPL_NETWORK || "wss://xrplcluster.com";
//     const distributionSecret = process.env.IDO_DISTRIBUTION_SECRET;
//     const distributionAddress = process.env.IDO_DISTRIBUTION_ADDRESS;

//     console.log("distributionAddress:", distributionAddress);
//     console.log("distributionSecret:", distributionSecret);

//     if (!distributionSecret || !distributionAddress) {
//       return res
//         .status(500)
//         .json({ error: "Distribution account not configured" });
//     }

//     client = new Client(networkUrl);
//     await client.connect();

//     // 4) Buat wallet
//     const wallet = Wallet.fromSeed(distributionSecret);

//     // 5) Payment
//     //    Pastikan issuer XQN misal: "rahuJ7WNoKBATKEDDhx5t3Tj3f2jGhbNjd"
//     const ISSUER_ADDRESS = "rahuJ7WNoKBATKEDDhx5t3Tj3f2jGhbNjd";

//     const paymentTx = {
//       TransactionType: "Payment",
//       Account: distributionAddress,
//       Destination: userAddress,
//       Amount: {
//         currency: "XQN",
//         value: String(xqnLocked),
//         issuer: ISSUER_ADDRESS,
//       },
//     };

//     const prepared = await client.autofill(paymentTx);
//     const signed = wallet.sign(prepared);

//     // 6) Submit
//     const submitResult = await client.submitAndWait(signed.tx_blob);

//     if (submitResult.result.meta) {
//       const txResult = submitResult.result.meta.TransactionResult;
//       console.log("TX Result:", txResult);

//       // Jika XRPL menolak
//       if (txResult !== "tesSUCCESS") {
//         return res.status(500).json({
//           error: "Transaction failed",
//           details: submitResult.result.meta,
//         });
//       }
//     } else if (submitResult.result.engine_result !== "tesSUCCESS") {
//       console.log("Engine result:", submitResult.result.engine_result);
//       return res.status(500).json({
//         error: "Transaction failed",
//         details: submitResult.result,
//       });
//     }

//     // 7) Update Firestore => distributed
//     await adminDb.collection("commits").doc(commitId).update({
//       status: "distributed",
//       distributionTx: submitResult.result.tx_json.hash,
//       distributedAt: new Date(),
//     });

//     // 8) Return success
//     console.log("Distribution success, hash:", submitResult.result.tx_json.hash);
//     res.status(200).json({
//       success: true,
//       distributionTx: submitResult.result.tx_json.hash,
//       result: submitResult.result,
//     });

//     // 9) Disconnect XRPL (try/catch)
//     try {
//       await client.disconnect();
//     } catch (disconnectError) {
//       console.error("Error disconnecting XRPL client:", disconnectError);
//     }

//     return;
//   } catch (error: any) {
//     console.error("Error in token distribution:", error);
//     return res.status(500).json({ error: error.message });
//   }
// }
