// // src/pages/api/dex/nft-launch.ts
// import type { NextApiRequest, NextApiResponse } from "next";
// import { XummSdk } from "xumm-sdk";

// const xumm = new XummSdk(
//   process.env.XUMM_API_KEY || "",
//   process.env.XUMM_API_SECRET || ""
// );

// interface NftLaunchRequest {
//   userAddress: string;
//   collectionName: string;
//   description: string;
// }

// interface NftLaunchResponse {
//   success: boolean;
//   message: string;
//   payloadUuid?: string;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<NftLaunchResponse>
// ) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ success: false, message: "Method not allowed" });
//   }

//   const { userAddress, collectionName, description } = req.body as NftLaunchRequest;
//   if (!userAddress || !collectionName) {
//     return res.status(400).json({ success: false, message: "Missing fields." });
//   }

//   try {
//     // Single TX
//     const payloadBody = {
//       TransactionType: "Payment",
//       Account: userAddress,
//       Destination: userAddress, // dummy
//       Amount: "10",
//       Fee: "12",
//       Memos: [
//         {
//           Memo: {
//             MemoData: Buffer.from(
//               `NFT Launch: ${collectionName} - ${description}`
//             ).toString("hex"),
//             MemoType: Buffer.from("NFT_LAUNCH").toString("hex"),
//           },
//         },
//       ],
//       options: {
//         submit: true,
//       },
//     };

//     const subscription = await xumm.payload.createAndSubscribe(
//       payloadBody,
//       (ev) => {
//         console.log("nft-launch =>", ev.data);
//         if (ev.data?.signed === true) return { resolved: true };
//         if (ev.data?.signed === false) return { resolved: true };
//         return {};
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "NFT Launch TX created, sign in Xumm.",
//       payloadUuid: subscription.created.uuid,
//     });
//   } catch (err: any) {
//     console.error("nft-launch error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// }
