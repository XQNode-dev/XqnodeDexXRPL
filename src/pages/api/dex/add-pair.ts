import type { NextApiRequest, NextApiResponse } from "next";
import { admin, adminDb } from "../../../../lib/firebaseAdmin";

interface AddPairRequest {
  baseToken: string;
  quoteToken: string;
  baseIssuer: string;
  poolAccount: string; 
  userAddress: string;
}

interface AddPairResponse {
  success: boolean;
  message: string;
  pairId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddPairResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const { baseToken, quoteToken, baseIssuer, poolAccount, userAddress }: AddPairRequest = req.body;

  if (!baseToken || !quoteToken || !baseIssuer || !poolAccount || !userAddress) {
    return res.status(400).json({
      success: false,
      message: "All fields are required.",
    });
  }

  try {
    const db = adminDb;

    const existingPairSnapshot = await db
      .collection("pairs")
      .where("baseToken", "==", baseToken)
      .where("quoteToken", "==", quoteToken)
      .get();

    if (!existingPairSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "Pair already exists.",
      });
    }

    const pairRef = await db.collection("pairs").add({
      baseToken,
      quoteToken,
      baseIssuer,
      poolAccount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userAddress,
      status: "approved",
    });

    return res.status(200).json({
      success: true,
      message: "Pair created successfully!",
      pairId: pairRef.id,
    });
  } catch (error: any) {
    console.error("Error adding trading pair:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
