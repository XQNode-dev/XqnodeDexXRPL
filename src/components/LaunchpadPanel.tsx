// File: /components/LaunchpadPanel.tsx
import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Campaign {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  salePrice: number;

  developerWallet: string; 
  useEscrow: boolean;      
  escrowWallet?: string;   

  liquidityAllocation: number;
  airdropAllocation: number;
  investorLockDuration: number;
  developerAllocation: number;
  developerLockDuration: number;

  projectDescription?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  launchStart?: string;
  launchEnd?: string;
  listingFee?: number;
  status: string;    
  raisedAmount?: number;
  createdAt: string;

  softCap?: number;
  hardCap?: number;
  bannerUrl?: string;
  tokenLogo?: string;
}

interface CampaignsData {
  pending: Campaign[];
  listed: Campaign[];
}

interface LaunchpadPanelProps {
  popupFocus?: boolean;
}

export default function LaunchpadPanel({ popupFocus }: LaunchpadPanelProps) {
  const [activeTab, setActiveTab] = useState<"listed" | "pending">("listed");
  const [campaigns, setCampaigns] = useState<CampaignsData>({ pending: [], listed: [] });
  const [showForm, setShowForm] = useState(false);

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const [developerWallet, setDeveloperWallet] = useState("");
  const [useEscrow, setUseEscrow] = useState(false);
  const [escrowWallet, setEscrowWallet] = useState("");

  const [liquidityAllocation, setLiquidityAllocation] = useState("");
  const [airdropAllocation, setAirdropAllocation] = useState("");
  const [investorLockDuration, setInvestorLockDuration] = useState("");
  const [developerAllocation, setDeveloperAllocation] = useState("");
  const [developerLockDuration, setDeveloperLockDuration] = useState("");

  const [softCap, setSoftCap] = useState("");
  const [hardCap, setHardCap] = useState("");

  const [bannerUrl, setBannerUrl] = useState("");
  const [tokenLogo, setTokenLogo] = useState("");

  const [projectDescription, setProjectDescription] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [launchStart, setLaunchStart] = useState<Date | null>(null);
  const [launchEnd, setLaunchEnd] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const listingFee = 10;

  async function fetchCampaigns() {
    try {
      const resp = await fetch("/api/launchpad/get-campaigns");
      const data = await resp.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  }
  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function handleSubmit() {
    if (!tokenName.trim() || !tokenSymbol.trim() || !totalSupply.trim() || !salePrice.trim() || !developerWallet.trim()) {
      alert("Please fill required fields: (tokenName, tokenSymbol, totalSupply, salePrice, developerWallet).");
      return;
    }

    const finalEscrow = useEscrow ? escrowWallet.trim() : "";

    setSubmitting(true);
    try {
      const payload = {
        tokenName,
        tokenSymbol,
        totalSupply: Number(totalSupply),
        salePrice: Number(salePrice),

        developerWallet,
        useEscrow,
        escrowWallet: finalEscrow, // only used if useEscrow = true

        liquidityAllocation: Number(liquidityAllocation) || 0,
        airdropAllocation: Number(airdropAllocation) || 0,
        investorLockDuration: Number(investorLockDuration) || 0,
        developerAllocation: Number(developerAllocation) || 0,
        developerLockDuration: Number(developerLockDuration) || 0,

        softCap: softCap ? Number(softCap) : 0,
        hardCap: hardCap ? Number(hardCap) : 0,

        bannerUrl: bannerUrl.trim(),
        tokenLogo: tokenLogo.trim(),

        projectDescription: projectDescription.trim(),
        twitterUrl: twitterUrl.trim(),
        websiteUrl: websiteUrl.trim(),

        launchStart: launchStart ? launchStart.toISOString() : "",
        launchEnd: launchEnd ? launchEnd.toISOString() : "",
      };

      const resp = await fetch("/api/launchpad/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        alert("Campaign created. Please sign listing fee in Xumm!");
        if (data.payloadUuid) {
          window.open(`https://xumm.app/sign/${data.payloadUuid}`, "_blank");
        }

        // Reset
        setTokenName("");
        setTokenSymbol("");
        setTotalSupply("");
        setSalePrice("");
        setDeveloperWallet("");
        setUseEscrow(false);
        setEscrowWallet("");
        setLiquidityAllocation("");
        setAirdropAllocation("");
        setInvestorLockDuration("");
        setDeveloperAllocation("");
        setDeveloperLockDuration("");
        setSoftCap("");
        setHardCap("");
        setBannerUrl("");
        setTokenLogo("");
        setProjectDescription("");
        setTwitterUrl("");
        setWebsiteUrl("");
        setLaunchStart(null);
        setLaunchEnd(null);

        setShowForm(false);
        fetchCampaigns();
      } else {
        alert(data.message || "Failed to create campaign.");
      }
    } catch (err) {
      console.error("Error creating campaign:", err);
      alert("Error creating campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  // ----- Modal Detail -----
  function openDetailModal(camp: Campaign) {
    setSelectedCampaign(camp);
    setShowDetailModal(true);
  }
  function closeDetailModal() {
    setSelectedCampaign(null);
    setShowDetailModal(false);
  }

  // ----- Participate (Investor) -----
  async function handleParticipate(camp: Campaign) {
    const amt = prompt(`Enter XRP to invest in ${camp.tokenName}`);
    if (!amt) return;
    try {
      const resp = await fetch("/api/launchpad/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: camp.id, amount: parseFloat(amt) }),
      });
      const data = await resp.json();
      if (data.success) {
        alert(`Success! New raised = ${data.campaign.raisedAmount} XRP`);
        fetchCampaigns();
      } else {
        alert(data.message || "Participation failed.");
      }
    } catch (err) {
      console.error("Error in participate:", err);
      alert("Error in participate.");
    }
  }

  // ----- Filter to separate "listed" from "pending"/"processing" -----
  const trulyListed = campaigns.listed.filter((c) => c.status === "listed");
  const pendingOrProcessing = campaigns.pending.filter(
    (c) => c.status === "pending" || c.status === "processing"
  );

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-black via-[#0d0d0d] to-black text-gray-100 p-4 ${
        popupFocus ? "z-[9999]" : ""
      }`}
    >
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            Launchpad
          </h1>
          <p className="text-gray-300 mt-2 text-sm md:text-base">
            Pay <strong>{listingFee} XRP</strong> listing fee to list your project
            &amp; track the <em>raised</em> funds from investors.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded shadow-lg transition-transform hover:scale-105"
          >
            Create Campaign
          </button>
          <a
            href="/docs"
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded shadow-lg transition-transform hover:scale-105"
          >
            Documentation
          </a>
        </div>
      </header>

      {/* --- CREATE CAMPAIGN FORM --- */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic fields */}
            <div>
              <label className="block text-white mb-1 text-sm">Token Name*</label>
              <input
                type="text"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="MyToken"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Token Symbol*</label>
              <input
                type="text"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="MTK"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Total Supply*</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Sale Price (XRP)*</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.5"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Developer Wallet*</label>
              <input
                type="text"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={developerWallet}
                onChange={(e) => setDeveloperWallet(e.target.value)}
                placeholder="rDeveloperXXXX..."
              />
            </div>

            {/* Toggle escrow */}
            <div className="bg-gray-900 p-2 rounded border border-gray-600 flex items-center space-x-2">
              <input
                id="useEscrow"
                type="checkbox"
                checked={useEscrow}
                onChange={() => setUseEscrow(!useEscrow)}
                className="w-4 h-4"
              />
              <label htmlFor="useEscrow" className="text-sm text-white">
                Use Escrow?
              </label>
            </div>

            {/* Muncul jika useEscrow = true */}
            {useEscrow && (
              <div className="md:col-span-2">
                <label className="block text-white mb-1 text-sm">Escrow Wallet</label>
                <input
                  type="text"
                  className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                  value={escrowWallet}
                  onChange={(e) => setEscrowWallet(e.target.value)}
                  placeholder="rEscrowXXXX..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  If provided, raised XRP will be sent & locked in this escrow address.
                </p>
              </div>
            )}

            {/* tokenomics */}
            <div>
              <label className="block text-white mb-1 text-sm">Liquidity Allocation (%)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={liquidityAllocation}
                onChange={(e) => setLiquidityAllocation(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Airdrop Allocation (%)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={airdropAllocation}
                onChange={(e) => setAirdropAllocation(e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Investor Lock (days)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={investorLockDuration}
                onChange={(e) => setInvestorLockDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Developer Allocation (%)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={developerAllocation}
                onChange={(e) => setDeveloperAllocation(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Developer Lock (days)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={developerLockDuration}
                onChange={(e) => setDeveloperLockDuration(e.target.value)}
                placeholder="180"
              />
            </div>

            {/* Softcap / Hardcap */}
            <div>
              <label className="block text-white mb-1 text-sm">Softcap (XRP)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={softCap}
                onChange={(e) => setSoftCap(e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Hardcap (XRP)</label>
              <input
                type="number"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={hardCap}
                onChange={(e) => setHardCap(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>

            {/* Banner & Token Logo */}
            <div>
              <label className="block text-white mb-1 text-sm">Banner URL</label>
              <input
                type="text"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Token Logo URL</label>
              <input
                type="text"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={tokenLogo}
                onChange={(e) => setTokenLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Additional Info */}
            <div className="md:col-span-2">
              <label className="block text-white mb-1 text-sm">Project Description</label>
              <textarea
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600 h-20"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Explain your project..."
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Twitter URL</label>
              <input
                type="url"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://twitter.com/YourProject"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Website URL</label>
              <input
                type="url"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourproject.com"
              />
            </div>

            {/* Launch Start / End */}
            <div>
              <label className="block text-white mb-1 text-sm">Launch Start</label>
              <DatePicker
                selected={launchStart}
                onChange={(date) => setLaunchStart(date)}
                showTimeSelect
                dateFormat="Pp"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                placeholderText="Select start date & time"
              />
            </div>
            <div>
              <label className="block text-white mb-1 text-sm">Launch End</label>
              <DatePicker
                selected={launchEnd}
                onChange={(date) => setLaunchEnd(date)}
                showTimeSelect
                dateFormat="Pp"
                className="bg-gray-900 text-sm p-2 w-full rounded border border-gray-600"
                placeholderText="Select end date & time"
              />
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex justify-end gap-4 mt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-sm bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded shadow-lg transition-transform hover:scale-105"
            >
              {submitting ? "Submitting..." : "Submit Campaign"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded shadow-lg transition-transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TAB LISTED / PENDING */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
        <div className="mb-4 border-b border-gray-700 flex gap-4">
          <button
            onClick={() => setActiveTab("listed")}
            className={`px-3 py-1 text-sm font-semibold ${
              activeTab === "listed"
                ? "text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Listed Campaigns
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1 text-sm font-semibold ${
              activeTab === "pending"
                ? "text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Pending / Processing
          </button>
        </div>

        {activeTab === "listed" ? (
          <ListedCampaigns
            campaigns={trulyListed}
            onOpenDetail={openDetailModal}
            onParticipate={handleParticipate}
          />
        ) : (
          <PendingCampaigns campaigns={pendingOrProcessing} onOpenDetail={openDetailModal} />
        )}
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedCampaign && (
        <ModalDetail
          campaign={selectedCampaign}
          onClose={closeDetailModal}
          onParticipate={handleParticipate}
        />
      )}
    </div>
  );
}

function ListedCampaigns({
  campaigns,
  onOpenDetail,
  onParticipate,
}: {
  campaigns: Campaign[];
  onOpenDetail: (c: Campaign) => void;
  onParticipate: (c: Campaign) => void;
}) {
  if (!campaigns.length) {
    return <p className="text-gray-400">No listed campaigns yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {campaigns.map((camp) => (
        <div key={camp.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-2">
          {camp.bannerUrl && camp.bannerUrl.trim() && (
            <img
              src={camp.bannerUrl}
              alt="Campaign Banner"
              className="w-full h-32 object-cover rounded mb-2"
            />
          )}
          <div className="flex items-center space-x-2">
            {camp.tokenLogo && camp.tokenLogo.trim() && (
              <img
                src={camp.tokenLogo}
                alt="Token Logo"
                className="w-10 h-10 object-cover rounded-full"
              />
            )}
            <div>
              <h3 className="text-xl font-bold text-white">
                {camp.tokenName} <span className="text-fuchsia-400">({camp.tokenSymbol})</span>
              </h3>
              <p className="text-gray-400 text-sm">
                Created: {new Date(camp.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-300">Supply: {camp.totalSupply}</p>
          <p className="text-gray-300">Raised: {camp.raisedAmount || 0} XRP</p>
          <p className="text-gray-300">Status: {camp.status}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onOpenDetail(camp)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
            >
              View Details
            </button>
            <button
              onClick={() => onParticipate(camp)}
              className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm"
            >
              Participate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingCampaigns({
  campaigns,
  onOpenDetail,
}: {
  campaigns: Campaign[];
  onOpenDetail: (c: Campaign) => void;
}) {
  if (!campaigns.length) {
    return <p className="text-gray-400">No pending or processing campaigns.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {campaigns.map((camp) => (
        <div key={camp.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-2">
          {camp.bannerUrl && camp.bannerUrl.trim() && (
            <img
              src={camp.bannerUrl}
              alt="Campaign Banner"
              className="w-full h-32 object-cover rounded mb-2"
            />
          )}
          <div className="flex items-center space-x-2">
            {camp.tokenLogo && camp.tokenLogo.trim() && (
              <img
                src={camp.tokenLogo}
                alt="Token Logo"
                className="w-10 h-10 object-cover rounded-full"
              />
            )}
            <div>
              <h3 className="text-xl font-bold text-white">
                {camp.tokenName} <span className="text-fuchsia-400">({camp.tokenSymbol})</span>
              </h3>
              <p className="text-gray-400 text-sm">
                Created: {new Date(camp.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-300">Supply: {camp.totalSupply}</p>
          <p className="text-gray-300">Raised: {camp.raisedAmount || 0} XRP</p>
          <p className="text-gray-300">Status: {camp.status}</p>
          <button
            onClick={() => onOpenDetail(camp)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
          >
            View Details
          </button>
        </div>
      ))}
    </div>
  );
}

/** Komponen Modal Detail */
function ModalDetail({
  campaign,
  onClose,
  onParticipate,
}: {
  campaign: Campaign;
  onClose: () => void;
  onParticipate: (c: Campaign) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 max-w-3xl w-full mx-auto p-6 rounded-lg relative border border-gray-700 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        <h3 className="text-2xl font-bold text-white mb-4">
          {campaign.tokenName} ({campaign.tokenSymbol})
        </h3>
        {/* Banner */}
        {campaign.bannerUrl && campaign.bannerUrl.trim() && (
          <img
            src={campaign.bannerUrl}
            alt="Campaign Banner"
            className="w-full h-48 object-cover rounded mb-4"
          />
        )}
        {/* Logo */}
        {campaign.tokenLogo && campaign.tokenLogo.trim() && (
          <img
            src={campaign.tokenLogo}
            alt="Token Logo"
            className="w-16 h-16 object-cover rounded-full mb-4"
          />
        )}
        <div className="space-y-3 text-gray-300">
          <p>Created At: {new Date(campaign.createdAt).toLocaleString()}</p>
          <p>Supply: {campaign.totalSupply}</p>
          <p>Sale Price: {campaign.salePrice} XRP</p>
          <p>Raised: {campaign.raisedAmount || 0} XRP</p>

          {campaign.softCap && campaign.softCap > 0 && <p>Softcap: {campaign.softCap} XRP</p>}
          {campaign.hardCap && campaign.hardCap > 0 && <p>Hardcap: {campaign.hardCap} XRP</p>}

          <p>Developer Wallet: {campaign.developerWallet}</p>
          {/* Tampilkan escrowWallet jika useEscrow = true */}
          {campaign.useEscrow ? (
            <p>Escrow Wallet: {campaign.escrowWallet || "Not Provided"}</p>
          ) : (
            <p>
              Escrow Wallet: <span className="text-yellow-400">No Escrow</span>
            </p>
          )}

          <p>
            Investor Lock: {campaign.investorLockDuration} days | Dev Allocation:{" "}
            {campaign.developerAllocation}% (Lock: {campaign.developerLockDuration} days)
          </p>
          <p>
            Liquidity: {campaign.liquidityAllocation}% | Airdrop: {campaign.airdropAllocation}%
          </p>
          {campaign.projectDescription && (
            <p className="whitespace-pre-wrap">Description: {campaign.projectDescription}</p>
          )}
          {campaign.twitterUrl && (
            <p>
              Twitter:{" "}
              <a
                href={campaign.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                {campaign.twitterUrl}
              </a>
            </p>
          )}
          {campaign.websiteUrl && (
            <p>
              Website:{" "}
              <a
                href={campaign.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                {campaign.websiteUrl}
              </a>
            </p>
          )}
          {campaign.launchStart && campaign.launchEnd && (
            <p>
              Launch Period: {new Date(campaign.launchStart).toLocaleString()} -{" "}
              {new Date(campaign.launchEnd).toLocaleString()}
            </p>
          )}
          <p>Status: {campaign.status}</p>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => onParticipate(campaign)}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded shadow-lg transition-transform hover:scale-105 text-sm"
          >
            Participate
          </button>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded shadow-lg transition-transform hover:scale-105 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
