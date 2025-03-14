import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { XummSdk } from "xumm-sdk";

interface CreateCampaignResponse {
  success: boolean;
  message: string;
  payloadUuid?: string;
}

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateCampaignResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const {
      tokenName,
      tokenSymbol,
      totalSupply,
      salePrice,
      developerWallet,
      useEscrow,
      escrowWallet,
      liquidityAllocation,
      airdropAllocation,
      investorLockDuration,
      developerAllocation,
      developerLockDuration,
      softCap,
      hardCap,
      projectDescription,
      twitterUrl,
      websiteUrl,
      bannerUrl,
      tokenLogo,
      launchStart,
      launchEnd,
    } = req.body;

    if (!tokenName || !tokenSymbol || !totalSupply || !salePrice || !developerWallet) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: tokenName, tokenSymbol, totalSupply, salePrice, developerWallet.",
      });
    }

    const listingFee = 10;

    const platformAddress = process.env.PLATFORM_ADDRESS as string;
    if (!platformAddress) {
      throw new Error("Missing PLATFORM_ADDRESS in env");
    }

    const amountDrops = String(listingFee * 1_000_000);
    const tx = {
      TransactionType: "Payment",
      Account: developerWallet,
      Destination: platformAddress,
      Amount: amountDrops,
      Fee: "12",
      Memos: [
        {
          Memo: {
            MemoData: Buffer.from(`Launchpad listing: ${tokenSymbol}`).toString("hex"),
          },
        },
      ],
    };

    const xummResult: any = await xumm.payload.create({ txjson: tx } as any, true);
    const payloadUuid = xummResult?.created?.uuid || xummResult?.uuid;
    if (!payloadUuid) {
      return res.status(500).json({
        success: false,
        message: "Failed to create Xumm payload",
      });
    }

    const finalEscrow = (useEscrow && escrowWallet) ? escrowWallet : "";
    const campaignData = {
      tokenName,
      tokenSymbol,
      totalSupply: Number(totalSupply),
      salePrice: Number(salePrice),
      developerWallet,
      useEscrow: !!useEscrow,
      escrowWallet: finalEscrow,
      liquidityAllocation: Number(liquidityAllocation) || 0,
      airdropAllocation: Number(airdropAllocation) || 0,
      investorLockDuration: Number(investorLockDuration) || 0,
      developerAllocation: Number(developerAllocation) || 0,
      developerLockDuration: Number(developerLockDuration) || 0,
      softCap: softCap ? Number(softCap) : 0,
      hardCap: hardCap ? Number(hardCap) : 0,
      projectDescription: projectDescription || "",
      twitterUrl: twitterUrl || "",
      websiteUrl: websiteUrl || "",
      bannerUrl: bannerUrl || "",
      tokenLogo: tokenLogo || "",
      launchStart: launchStart || "",
      launchEnd: launchEnd || "",
      listingFee,
      status: "pending",
      createdAt: new Date().toISOString(),
      payloadUuid,
      raisedAmount: 0,
    };

    await adminDb.collection("pendingCampaigns").add(campaignData);

    return res.status(200).json({
      success: true,
      message: "Campaign created. Please pay the listing fee via Xumm.",
      payloadUuid,
    });
  } catch (error: any) {
    console.error("Error in create-campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal server error" });
  }
}
