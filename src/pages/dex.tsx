// pages/dex.tsx
import React, { useEffect, useState, ChangeEvent, useMemo } from "react";
import { useRouter } from "next/router";
import DexChart from "@/components/DexChart";
import MyMagnifyingGlass from "@/components/Search";
import Bars3Icon from "@/components/MyBarsIcon";
import XMarkIcon from "@/components/MyCloseIcon";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import LaunchpadPanel from "@/components/LaunchpadPanel";

// =======================
// Type & Interface Definitions
// =======================
interface Pair {
  id: string;
  baseToken: string;
  quoteToken: string;
  baseIssuer?: string;
  poolAccount?: string;
  createdBy: string;
  status: string;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}

interface Balances {
  [key: string]: number;
}

type NavTab = "dashboard" | "trade" | "launchpad" | "farming" | "analytics" | "nft";
type TradeAction = "buy-limit" | "sell-limit";

interface TrustLine {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
}

interface PoolInfo {
  pair?: string;
  asset1?: { currency: string; issuer: string | null; amount: number };
  asset2?: { currency: string; issuer: string | null; amount: number };
  lpSupply: number;
  currentFee: number;
  totalAssetA: number;
  totalAssetB: number;
  tvl: number;
  marketCap: number;
  account?: string;
}

interface PoolTransaction {
  type: string;
  amount: string;
  wallet: string;
  time: string;
  timestamp?: number;
  raw?: string;
}

interface TvlPoint {
  time: number;
  tvl: number;
}

const POLL_INTERVAL = 180000; // 3 minutes

// =======================
// StatCard Component
// =======================
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-lg shadow-lg transition-transform hover:scale-105 hover:bg-white/10">
      <span className="text-xs text-gray-300 uppercase tracking-wide block mb-1">{label}</span>
      <span className="text-base md:text-xl font-bold text-white">{value}</span>
    </div>
  );
}

// =======================
// Main DexPage Component
// =======================
export default function DexPage() {
  const router = useRouter();

  // User & Layout States
  const [userAddr, setUserAddr] = useState<string | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Trading Pairs & Search States
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<Pair[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);

  // Add Pair States
  const [issuerAddress, setIssuerAddress] = useState("");
  const [poolAccount, setPoolAccount] = useState("");
  const [issuedTokens, setIssuedTokens] = useState<string[]>([]);
  const [selectedBaseToken, setSelectedBaseToken] = useState("");
  const [selectedQuoteToken, setSelectedQuoteToken] = useState("XRP");
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingPair, setLoadingPair] = useState(false);

  // Balances & Trustlines
  const [userBalance, setUserBalance] = useState<Balances>({ XRP: 0 });
  const [userTrustlines, setUserTrustlines] = useState<TrustLine[]>([]);

  // Pool Info & Transactions
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [poolTransactions, setPoolTransactions] = useState<PoolTransaction[]>([]);
  const [loadingPoolInfo, setLoadingPoolInfo] = useState(false);
  const [errorPoolInfo, setErrorPoolInfo] = useState("");
  const [loadingTx, setLoadingTx] = useState(false);

  // Chart Data
  const [chartData, setChartData] = useState<TvlPoint[]>([]);
  const [timeRange, setTimeRange] = useState<"7D" | "1M" | "3M" | "1Y" | "ALL">("ALL");

  // Trade Panel (Limit Order)
  const [tradeAction, setTradeAction] = useState<TradeAction>("buy-limit");
  const [limitBaseAmount, setLimitBaseAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const computedQuote = useMemo(() => {
    const base = parseFloat(limitBaseAmount);
    const price = parseFloat(limitPrice);
    if (!isNaN(base) && base > 0 && !isNaN(price) && price > 0) {
      return (base * price).toFixed(6);
    }
    return "";
  }, [limitBaseAmount, limitPrice]);
  const impliedPrice = useMemo(() => {
    const price = parseFloat(limitPrice);
    return !isNaN(price) && price > 0 ? price.toFixed(6) : "";
  }, [limitPrice]);

  // AMM (Deposit/Withdraw)
  const [ammAction, setAmmAction] = useState<"deposit" | "withdraw">("deposit");
  const [depositBaseAmount, setDepositBaseAmount] = useState("");
  const [depositQuoteAmount, setDepositQuoteAmount] = useState("");
  const [withdrawLPAmount, setWithdrawLPAmount] = useState("");
  const [expectedWithdrawBase, setExpectedWithdrawBase] = useState("");
  const [expectedWithdrawQuote, setExpectedWithdrawQuote] = useState("");

  // Navigation Tabs
  // Reordered so that launchpad is near trade
  const [activeTab, setActiveTab] = useState<NavTab>("trade");
  const allTabs: NavTab[] = ["dashboard", "trade", "launchpad", "farming", "analytics", "nft"];
  const tabLabel: Record<NavTab, string> = {
    dashboard: "Dashboard",
    trade: "Trade & AMM",
    launchpad: "Launchpad",
    farming: "Farming",
    analytics: "Analytics",
    nft: "NFT Launchpad",
  };

  // Vesting Sale (Deposit) States
  const [showSaleWallet, setShowSaleWallet] = useState(false);
  const SALE_WALLET_ADDRESS = "rnvkQrPFRXNRXSV3w1babxHKyuMXiCSDNN";
  const [vestingTotalXRP, setVestingTotalXRP] = useState(0);

  // Helper: Handle decimal input
  const handleDecimalInput = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setter(val);
    }
  };

  // Particles Setup
  const particlesInit = async (engine: any) => {
    await loadSlim(engine);
  };
  const particleOptions = {
    fpsLimit: 60,
    particles: {
      number: { value: 60, density: { enable: true, area: 800 } },
      color: { value: "#00ffff" },
      shape: { type: "circle" },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 4 } },
      move: { enable: true, speed: 2 },
      links: { enable: true, distance: 120, color: "#00ffff", opacity: 0.3, width: 1 },
    },
  };

  // Fetch vesting sale balance from API
  async function fetchVestingBalance() {
    try {
      const resp = await fetch("/api/dex/get-vesting-balance");
      const data = await resp.json();
      if (data.success && typeof data.totalXRP === "number") {
        setVestingTotalXRP(data.totalXRP);
      } else {
        setVestingTotalXRP(0);
      }
    } catch (err) {
      console.error("Error fetching vesting balance:", err);
      setVestingTotalXRP(0);
    }
  }
  useEffect(() => {
    fetchVestingBalance();
    const interval = setInterval(fetchVestingBalance, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Session & Initial Data Fetching
  useEffect(() => {
    const storedUser = localStorage.getItem("xummUser");
    if (!storedUser) {
      router.push("/");
      return;
    }
    setUserAddr(storedUser);
    fetchTradingPairs();
    fetchUserBalances(storedUser);
    fetchUserTrustlines(storedUser);
  }, [router]);

  async function fetchTradingPairs() {
    try {
      const resp = await fetch("/api/dex/get-pairs");
      const data = await resp.json();
      if (data.success && data.pairs) {
        setPairs(data.pairs);
        setFilteredPairs(data.pairs);
        // Set default pair if available
        const xqnPair = data.pairs.find(
          (p: Pair) => p.baseToken === "XQN" || p.quoteToken === "XQN"
        );
        if (xqnPair) setSelectedPair(xqnPair);
      }
    } catch (err) {
      console.error("Error fetching pairs:", err);
    }
  }

  async function fetchUserBalances(addr: string) {
    try {
      const resp = await fetch("/api/dex/get-user-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: addr }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.success && data.balances) setUserBalance(data.balances);
    } catch (err) {
      console.error("Error fetching user balances:", err);
    }
  }

  async function fetchUserTrustlines(addr: string) {
    try {
      const resp = await fetch(`/api/dex/get-user-trustlines?userAddress=${addr}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.success && data.lines) setUserTrustlines(data.lines);
    } catch (err) {
      console.error("Error fetching trustlines:", err);
    }
  }

  // Add Pair Functions
  async function fetchIssuedTokens() {
    if (!issuerAddress) return;
    setLoadingTokens(true);
    try {
      const resp = await fetch("/api/dex/get-issued-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerAddress }),
      });
      const data = await resp.json();
      if (data.success && data.tokens) {
        const mapped = data.tokens.map((t: any) => t.currency);
        setIssuedTokens(Array.from(new Set(mapped)));
      }
    } catch (err) {
      console.error("Error fetching tokens:", err);
    } finally {
      setLoadingTokens(false);
    }
  }

  async function handleAddPair() {
    if (!selectedBaseToken || !selectedQuoteToken || !issuerAddress || !poolAccount) {
      alert("All fields are required.");
      return;
    }
    if (selectedBaseToken === selectedQuoteToken) {
      alert("Base & Quote cannot be the same!");
      return;
    }
    setLoadingPair(true);
    try {
      const resp = await fetch("/api/dex/add-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseToken: selectedBaseToken,
          quoteToken: selectedQuoteToken,
          baseIssuer: issuerAddress,
          poolAccount,
          userAddress: userAddr,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        fetchTradingPairs();
        setIssuerAddress("");
        setPoolAccount("");
        setIssuedTokens([]);
        setSelectedBaseToken("");
        setSelectedQuoteToken("XRP");
      } else {
        alert(data.message || "Failed to add pair");
      }
    } catch (err) {
      console.error("Error adding pair:", err);
    } finally {
      setLoadingPair(false);
    }
  }

  // Pool Info & Transactions Functions
  useEffect(() => {
    if (!selectedPair) {
      setPoolInfo(null);
      setPoolTransactions([]);
      setChartData([]);
      return;
    }
    const fetchPool = async () => {
      try {
        setLoadingPoolInfo(true);
        setErrorPoolInfo("");
        const resp = await fetch(`/api/amm/get-pool?pairId=${selectedPair.id}`);
        const data = await resp.json();
        if (!data.success || !data.pool) {
          setErrorPoolInfo(data.message || "Pool data not found");
          setPoolInfo(null);
          setPoolTransactions([]);
          setChartData([]);
          return;
        }
        setPoolInfo(data.pool);
        if (data.pool.account) {
          fetchPoolTransactions(data.pool.account);
        } else {
          setPoolTransactions([]);
        }
      } catch (err) {
        console.error("Error fetching pool info:", err);
        setErrorPoolInfo("Error fetching pool info.");
        setPoolInfo(null);
        setPoolTransactions([]);
        setChartData([]);
      } finally {
        setLoadingPoolInfo(false);
      }
    };
    fetchPool();
    fetchHistoryForChart(selectedPair.id);
    const interval = setInterval(fetchPool, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedPair]);

  useEffect(() => {
    if (!poolInfo?.account) return;
    const interval = setInterval(() => fetchPoolTransactions(poolInfo.account!), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [poolInfo?.account]);

  async function fetchPoolTransactions(poolAccount: string) {
    try {
      setLoadingTx(true);
      const resp = await fetch(`/api/amm/get-transactions?poolAccount=${poolAccount}&_=${Date.now()}`);
      const data = await resp.json();
      if (data.success && Array.isArray(data.transactions)) {
        setPoolTransactions(
          data.transactions
            .map((item: any) => {
              const tx = item.tx_json || item;
              const txType = tx.TransactionType || "Unknown";
              if (!["AMMDeposit", "AMMWithdraw", "OfferCreate"].includes(txType))
                return null;
              const typeLabel = txType === "OfferCreate" ? "Exchange" : txType;
              let amount = "N/A";
              if (txType === "OfferCreate") {
                let gets = "", pays = "";
                if (tx.TakerGets) {
                  if (typeof tx.TakerGets === "string") {
                    gets = (parseFloat(tx.TakerGets) / 1e6).toFixed(6) + " XRP";
                  } else if (tx.TakerGets.value) {
                    gets = `${tx.TakerGets.value} ${tx.TakerGets.currency}`;
                  }
                }
                if (tx.TakerPays) {
                  if (typeof tx.TakerPays === "string") {
                    pays = (parseFloat(tx.TakerPays) / 1e6).toFixed(6) + " XRP";
                  } else if (tx.TakerPays.value) {
                    pays = `${tx.TakerPays.value} ${tx.TakerPays.currency}`;
                  }
                }
                amount = `+${gets} / -${pays}`;
              } else {
                if (tx.Amount) {
                  if (typeof tx.Amount === "string") {
                    amount = (parseFloat(tx.Amount) / 1e6).toFixed(6) + " XRP";
                  } else if (tx.Amount.value) {
                    amount = `${tx.Amount.value} ${tx.Amount.currency}`;
                  }
                }
              }
              const wallet = tx.Account || "N/A";
              let dateRaw = tx.date || tx.TransactionDate;
              let tstr = "N/A";
              if (dateRaw) {
                const unixTime = Number(dateRaw) + 946684800;
                tstr = new Date(unixTime * 1000).toLocaleString();
              }
              return { type: typeLabel, amount, wallet, time: tstr };
            })
            .filter(Boolean)
        );
      } else {
        setPoolTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching pool transactions:", err);
      setPoolTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }

  async function fetchHistoryForChart(pairId: string) {
    try {
      const defaultDays = 30;
      const resp = await fetch(`/api/dex/get-history?pairId=${pairId}&days=${defaultDays}`);
      const data = await resp.json();
      if (data.success && Array.isArray(data.tvlData)) {
        setChartData(data.tvlData);
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error("Error fetching daily TVL:", err);
      setChartData([]);
    }
  }

  useEffect(() => {
    if (poolInfo) {
      const price = poolInfo.totalAssetA === 0 ? 0 : poolInfo.totalAssetB / poolInfo.totalAssetA;
      setCurrentPrice(price);
    }
  }, [poolInfo]);

  async function addTrustLine(tokenCurrency: string, issuer: string) {
    try {
      const resp = await fetch("/api/dex/trustset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: userAddr,
          tokenCurrency,
          issuer,
          limit: 1000000,
        }),
      });
      const data = await resp.json();
      if (data.success && data.payloadUuid) {
        window.open(`https://xumm.app/sign/${data.payloadUuid}`, "_blank");
        alert("Please sign the TrustSet in Xumm!");
      }
    } catch (err) {
      console.error("Error setting trust line:", err);
    }
  }

  async function handleTrade() {
    if (!selectedPair) return;
    const baseVal = parseFloat(limitBaseAmount);
    const priceVal = parseFloat(limitPrice);
    if (isNaN(baseVal) || baseVal <= 0 || isNaN(priceVal) || priceVal <= 0) {
      alert("Please enter valid amounts for both quantity and price.");
      return;
    }
    const quoteVal = baseVal * priceVal;
    const payload = {
      pairId: selectedPair.id,
      action: tradeAction === "buy-limit" ? "sell" : "buy",
      amountBase: baseVal,
      amountQuote: quoteVal,
      userAddress: userAddr,
    };

    try {
      const resp = await fetch("/api/dex/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        console.error("Limit order creation failed with status:", resp.status);
        return;
      }
      const data = await resp.json();
      if (data.success && data.payloadUuid) {
        window.open(`https://xumm.app/sign/${data.payloadUuid}`, "_blank");
        alert("Limit order created. Please sign in Xumm.");
      } else {
        alert(data.message || "Limit order creation failed.");
      }
      setLimitBaseAmount("");
      setLimitPrice("");
    } catch (err) {
      console.error("Error handling trade:", err);
    }
  }

  async function handleDeposit() {
    if (!selectedPair) return;
    const depositBase = parseFloat(depositBaseAmount);
    const depositQuote = parseFloat(depositQuoteAmount);
    if (isNaN(depositBase) || depositBase <= 0 || isNaN(depositQuote) || depositQuote <= 0) {
      alert("Please enter valid deposit amounts.");
      return;
    }
    if (!selectedPair.baseIssuer || !selectedPair.baseToken) {
      alert("Base issuer or base token is missing.");
      return;
    }
    const payload = {
      baseIssuer: selectedPair.baseIssuer,
      baseToken: selectedPair.baseToken,
      userAddress: userAddr,
      amountA: depositBase,
      amountB: depositQuote,
    };
    try {
      const resp = await fetch("/api/amm/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success && data.payloadUuid) {
        window.open(`https://xumm.app/sign/${data.payloadUuid}`, "_blank");
        alert("Deposit transaction created. Please sign in Xumm.");
        if (userAddr) fetchUserBalances(userAddr);
      } else {
        alert(data.message || "Deposit failed.");
      }
    } catch (err) {
      console.error("Error in deposit:", err);
    }
  }

  async function handleWithdraw() {
    if (!selectedPair) return;
    const lpAmount = parseFloat(withdrawLPAmount);
    if (isNaN(lpAmount) || lpAmount <= 0) {
      alert("Please enter a valid LP amount.");
      return;
    }
    if (!selectedPair.baseIssuer || !selectedPair.baseToken) {
      alert("Base issuer or base token is missing.");
      return;
    }
    if (!expectedWithdrawBase || !expectedWithdrawQuote) {
      alert("Expected withdrawal amounts are not computed.");
      return;
    }
    const numericExpectedQuote = parseFloat(expectedWithdrawQuote);
    const withdrawQuoteDrops = (numericExpectedQuote * 1e6).toFixed(0);
    const payload = {
      baseIssuer: selectedPair.baseIssuer,
      baseToken: selectedPair.baseToken,
      userAddress: userAddr,
      withdrawBase: expectedWithdrawBase,
      withdrawQuote: withdrawQuoteDrops,
      pairId: selectedPair.id,
    };

    try {
      const resp = await fetch("/api/amm/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success && data.payloadUuid) {
        window.open(`https://xumm.app/sign/${data.payloadUuid}`, "_blank");
        alert("Withdraw transaction created. Please sign in Xumm.");
        if (userAddr) fetchUserBalances(userAddr);
      } else {
        alert(data.message || "Withdraw failed.");
      }
    } catch (err) {
      console.error("Error in withdraw:", err);
    }
  }

  function handleTabClick(tab: NavTab) {
    setActiveTab(tab);
  }
  function handleLogout() {
    localStorage.removeItem("xummUser");
    router.push("/");
  }
  const tabClasses = (tab: NavTab) =>
    `px-4 py-2 rounded-md font-semibold transition-all ${
      activeTab === tab
        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
        : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
    }`;
  function renderTxTypeBadge(type: string) {
    let colorClass = "bg-blue-600";
    if (type === "Exchange") colorClass = "bg-green-600";
    else if (type === "AMMDeposit") colorClass = "bg-purple-600";
    else if (type === "AMMWithdraw") colorClass = "bg-red-600";
    return (
      <span className={`text-xs px-2 py-1 rounded-full text-white font-semibold ${colorClass}`}>
        {type}
      </span>
    );
  }
  const filteredChartData = useMemo(() => {
    if (!chartData) return [];
    const now = Date.now();
    return chartData.filter((item) => {
      const diff = now - item.time;
      switch (timeRange) {
        case "7D":
          return diff <= 7 * 864e5;
        case "1M":
          return diff <= 30 * 864e5;
        case "3M":
          return diff <= 90 * 864e5;
        case "1Y":
          return diff <= 365 * 864e5;
        default:
          return true;
      }
    });
  }, [chartData, timeRange]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-[#0d0d0d] to-black text-gray-100 overflow-hidden">
      {/* Particles */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full z-[998]">
        <Particles init={particlesInit} options={particleOptions} />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-[999] bg-black/70 border-b border-gray-700 backdrop-blur-md shadow-xl">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            XQNode
          </h1>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            {allTabs.map((tab) => (
              <button key={tab} onClick={() => handleTabClick(tab)} className={tabClasses(tab)}>
                {tabLabel[tab]}
              </button>
            ))}
          </nav>
          {/* Hamburger Menu for Mobile */}
          <button
            className="md:hidden p-2 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-white transition-colors"
            onClick={() => setDrawerOpen(true)}
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          {/* Wallet Info (Desktop) */}
          {userAddr && (
            <div
              className="hidden md:flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full shadow-lg cursor-pointer relative"
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
            >
              <span className="text-sm text-gray-300">Wallet:</span>
              <span className="text-purple-400 font-semibold truncate max-w-[120px] text-sm">
                {userAddr}
              </span>
              {showLogoutMenu && (
                <div className="absolute top-full right-4 mt-2 bg-gray-900 border border-gray-700 rounded shadow-lg text-sm min-w-[120px]">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[999] flex">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-gray-900 w-64 h-full p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-300 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col space-y-4">
              {allTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    handleTabClick(tab);
                    setDrawerOpen(false);
                  }}
                  className="px-4 py-2 rounded-md text-white font-semibold bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  {tabLabel[tab]}
                </button>
              ))}
            </nav>
            {userAddr && (
              <div className="mt-auto pt-4 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded hover:bg-red-600 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="relative z-[997] max-w-[1400px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-3 bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700 flex flex-col">
          <div>
            <h2 className="text-xl font-bold mb-4 text-white">Trading Pairs</h2>
            <div className="relative mb-4">
              <input
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  setSearchQuery(q);
                  setFilteredPairs(
                    q
                      ? pairs.filter(
                          (p) =>
                            p.baseToken.toLowerCase().includes(q) ||
                            p.quoteToken.toLowerCase().includes(q)
                        )
                      : pairs
                  );
                }}
                placeholder="Search pair..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <MyMagnifyingGlass className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <ul className="max-h-80 overflow-y-auto space-y-2">
              {filteredPairs.map((p) => (
                <li
                  key={p.id}
                  onClick={() => {
                    setSelectedPair(p);
                    setActiveTab("trade");
                  }}
                  className="cursor-pointer rounded-lg px-4 py-2 bg-gray-800 hover:bg-gray-700 transition-colors flex justify-between items-center"
                >
                  <span className="text-white">
                    {p.baseToken} / {p.quoteToken}
                  </span>
                  <span className="text-sm text-blue-300">Select</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold text-white mb-2">Add a New Pair</h3>
            <div className="space-y-3 text-sm">
              <input
                type="text"
                placeholder="Issuer address"
                value={issuerAddress}
                onChange={(e) => setIssuerAddress(e.target.value)}
                className="w-full rounded-lg bg-gray-800 text-gray-100 px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Pool account address (optional)"
                value={poolAccount}
                onChange={(e) => setPoolAccount(e.target.value)}
                className="w-full rounded-lg bg-gray-800 text-gray-100 px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={fetchIssuedTokens}
                disabled={loadingTokens}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-2 rounded-lg transition-transform transform hover:scale-105"
              >
                {loadingTokens ? "Fetching..." : "Get Issued Tokens"}
              </button>
              {issuedTokens.length > 0 && (
                <select
                  value={selectedBaseToken}
                  onChange={(e) => setSelectedBaseToken(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 text-gray-100 px-3 py-2 border border-gray-700"
                >
                  <option value="">-- Choose Base Token --</option>
                  {issuedTokens.map((tk) => (
                    <option key={tk} value={tk}>
                      {tk}
                    </option>
                  ))}
                </select>
              )}
              {selectedBaseToken && (
                <select
                  value={selectedQuoteToken}
                  onChange={(e) => setSelectedQuoteToken(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 text-gray-100 px-3 py-2 border border-gray-700"
                >
                  <option value="XRP">XRP</option>
                </select>
              )}
              {selectedBaseToken && (
                <button
                  onClick={handleAddPair}
                  disabled={loadingPair}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-transform transform hover:scale-105"
                >
                  {loadingPair ? "Adding..." : "Add Trading Pair"}
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <section className="lg:col-span-9 flex flex-col gap-6">
          {/* Vesting Sale Section
          <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
            <h2 className="text-3xl font-bold mb-4 text-white">Vesting Sale</h2>
            <p className="text-gray-300 mb-4">
              To build a stronger ecosystem and stabilize our token price, we are conducting a
              vesting sale. Your XRP deposit will directly support our liquidity pool, ensuring
              price stability and long-term growth. In return, you will receive XQNode tokens and
              exclusive rare NFTs as rewards.
            </p>
            {!showSaleWallet ? (
              <button
                onClick={() => setShowSaleWallet(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-transform transform hover:scale-105"
              >
                Show Deposit Address
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <p className="text-lg text-gray-300">
                    Please send your XRP deposit to the following wallet address:
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-white">{SALE_WALLET_ADDRESS}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(SALE_WALLET_ADDRESS);
                        alert("Wallet address copied to clipboard!");
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Once you have sent your XRP, the total collected will update automatically below.
                </p>
              </div>
            )}
            <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="text-lg text-gray-300">
                Total XRP Collected:{" "}
                <span className="font-bold text-white">{vestingTotalXRP.toFixed(2)}</span> XRP
              </p>
            </div>
          </div> */}

          {/* Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
              <h2 className="text-3xl font-bold mb-4 text-white">Dashboard Overview</h2>
              <p className="text-gray-300 mb-4">
                View your portfolio, XRP balance, and recent activities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
                  <h3 className="font-semibold text-xl text-white mb-2">Your Portfolio</h3>
                  <p className="text-lg text-gray-300">
                    XRP: {userBalance["XRP"]?.toFixed(2) ?? 0}
                  </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-inner md:col-span-2">
                  <h3 className="font-semibold text-xl text-white mb-2">Latest Activities</h3>
                  <ul className="text-gray-300 list-disc pl-4">
                    <li>Limit order created 15 minutes ago</li>
                    <li>Liquidity added 2 hours ago</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Trade Panel (Limit Order) */}
          {activeTab === "trade" && (
            <div className="flex flex-col gap-6">
              {/* AMM Pool Overview */}
              <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
                <h2 className="text-3xl font-bold mb-4 text-white">AMM Pool Overview</h2>
                {selectedPair && (
                  <p className="text-sm text-gray-300">
                    Historical TVL & stats for{" "}
                    <span className="font-semibold text-white">
                      {selectedPair.baseToken}/{selectedPair.quoteToken}
                    </span>
                  </p>
                )}
                {loadingPoolInfo && (
                  <p className="text-blue-400 text-sm mt-2">Loading pool info...</p>
                )}
                <div className="flex justify-end space-x-2 mt-4">
                  {(["7D", "1M", "3M", "1Y", "ALL"] as const).map((rangeKey) => (
                    <button
                      key={rangeKey}
                      onClick={() => setTimeRange(rangeKey)}
                      className={`px-3 py-1 rounded border border-gray-600 text-sm transition-colors ${
                        timeRange === rangeKey
                          ? "bg-gradient-to-r from-green-500 to-blue-500 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {rangeKey}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
                  <div className="lg:col-span-3 bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-inner min-h-[300px] overflow-x-auto">
                    <DexChart chartData={filteredChartData} />
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard
                        label="TVL"
                        value={poolInfo ? `$${poolInfo.tvl.toLocaleString()}` : "-"}
                      />
                      <StatCard
                        label="LP Supply"
                        value={poolInfo ? poolInfo.lpSupply.toLocaleString() : "-"}
                      />
                      <StatCard
                        label="Fee"
                        value={poolInfo ? `${(poolInfo.currentFee * 100).toFixed(2)}%` : "-"}
                      />
                      <StatCard
                        label="Price"
                        value={
                          poolInfo
                            ? poolInfo.totalAssetA === 0
                              ? "-"
                              : (
                                  poolInfo.totalAssetB / poolInfo.totalAssetA
                                ).toFixed(6) +
                              " " +
                              selectedPair?.quoteToken
                            : "-"
                        }
                      />
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-sm text-gray-300">
                      <p>
                        <strong>Total {selectedPair?.quoteToken}:</strong>{" "}
                        {poolInfo ? poolInfo.totalAssetB.toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Panel (Limit Order) */}
              {selectedPair && (
                <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
                  <h2 className="text-3xl font-bold mb-4 text-white">Trade Panel (Limit Order)</h2>
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2 text-gray-300">Your Balances</h3>
                    <ul className="space-y-2 text-lg text-gray-300">
                      {Object.entries(userBalance).map(([token, bal]) => (
                        <li
                          key={token}
                          className="flex justify-between border-b border-gray-700 py-1"
                        >
                          <span>{token}</span>
                          <span>{bal.toFixed(4)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {selectedPair &&
                    selectedPair.baseToken !== "XRP" &&
                    !userTrustlines.find(
                      (line) =>
                        line.currency === selectedPair.baseToken &&
                        line.issuer === selectedPair.baseIssuer
                    ) && (
                      <div className="bg-red-800 bg-opacity-50 p-4 rounded mb-4 text-lg">
                        <p className="text-yellow-400 font-semibold mb-2">Trust line required!</p>
                        <button
                          onClick={() =>
                            addTrustLine(selectedPair.baseToken, selectedPair.baseIssuer!)
                          }
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold"
                        >
                          Add TrustLine
                        </button>
                      </div>
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-lg">
                    <div className="flex flex-col">
                      <label className="mb-1 text-gray-300">
                        {selectedPair.baseToken} Amount
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter ${selectedPair.baseToken} amount`}
                        value={limitBaseAmount}
                        onChange={handleDecimalInput(setLimitBaseAmount)}
                        className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-gray-300">
                        Price ({selectedPair.quoteToken} per {selectedPair.baseToken})
                      </label>
                      <input
                        type="text"
                        placeholder="Enter unit price"
                        value={limitPrice}
                        onChange={handleDecimalInput(setLimitPrice)}
                        className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-lg mb-4 text-gray-300">
                    <p>Total Quote: {computedQuote || "-"}</p>
                    <p className="mt-2">Implied Price: {impliedPrice || "-"}</p>
                    {currentPrice && (
                      <p className="mt-2">
                        Current Price: {currentPrice.toFixed(6)} {selectedPair.quoteToken}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tradeAction}
                      onChange={(e) => setTradeAction(e.target.value as TradeAction)}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                    >
                      <option value="buy-limit">Buy (Limit)</option>
                      <option value="sell-limit">Sell (Limit)</option>
                    </select>
                    <button
                      onClick={handleTrade}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-transform transform hover:scale-105"
                    >
                      {tradeAction === "buy-limit" ? "Place Buy Limit" : "Place Sell Limit"}
                    </button>
                  </div>
                </div>
              )}

              {/* Liquidity Management */}
              {selectedPair && (
                <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
                  <h2 className="text-3xl font-bold mb-4 text-white">Liquidity Management</h2>
                  <div className="flex space-x-4 mb-4">
                    <button
                      onClick={() => setAmmAction("deposit")}
                      className={`px-4 py-2 rounded-md font-semibold transition-all ${
                        ammAction === "deposit"
                          ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setAmmAction("withdraw")}
                      className={`px-4 py-2 rounded-md font-semibold transition-all ${
                        ammAction === "withdraw"
                          ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>
                  {ammAction === "deposit" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="mb-1 text-gray-300">
                          Deposit {selectedPair.baseToken} Amount
                        </label>
                        <input
                          type="text"
                          value={depositBaseAmount}
                          onChange={handleDecimalInput(setDepositBaseAmount)}
                          placeholder="Enter amount"
                          className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-1 text-gray-300">
                          Deposit {selectedPair.quoteToken} Amount
                        </label>
                        <input
                          type="text"
                          value={depositQuoteAmount}
                          onChange={handleDecimalInput(setDepositQuoteAmount)}
                          placeholder="Calculated amount"
                          className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
                          readOnly={!!(poolInfo && poolInfo.totalAssetA > 0)}
                        />
                      </div>
                      <button
                        onClick={handleDeposit}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-transform transform hover:scale-105 mt-4"
                      >
                        Deposit Liquidity
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="mb-1 text-gray-300">LP Tokens to Withdraw</label>
                        <input
                          type="text"
                          value={withdrawLPAmount}
                          onChange={handleDecimalInput(setWithdrawLPAmount)}
                          placeholder="Enter LP token amount"
                          className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
                        />
                      </div>
                      {poolInfo && poolInfo.lpSupply > 0 && (
                        <div className="flex flex-col">
                          <label className="mb-1 text-gray-300">Expected Return</label>
                          <div className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white">
                            {expectedWithdrawBase} {selectedPair.baseToken} / {expectedWithdrawQuote}{" "}
                            {selectedPair.quoteToken}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleWithdraw}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg transition-transform transform hover:scale-105 mt-4"
                      >
                        Withdraw Liquidity
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pool Transactions */}
              <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
                <h2 className="text-3xl font-bold mb-4 text-white">Pool Transactions</h2>
                {selectedPair ? (
                  <>
                    <div className="mb-4 text-lg text-gray-300">
                      <span>
                        Pair:{" "}
                        <span className="font-semibold text-white">
                          {selectedPair.baseToken}/{selectedPair.quoteToken}
                        </span>
                      </span>
                      {currentPrice !== null && (
                        <span className="ml-4 text-yellow-400 font-semibold">
                          (Price: {currentPrice.toFixed(6)} {selectedPair.quoteToken})
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto border border-gray-700">
                      {loadingTx ? (
                        <p className="text-blue-400 mb-2">Loading transactions...</p>
                      ) : poolTransactions.length === 0 ? (
                        <p className="text-gray-400">No transactions found.</p>
                      ) : (
                        <table className="w-full text-sm text-gray-100">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="py-2 text-left">Type</th>
                              <th className="py-2 text-left">Amount</th>
                              <th className="py-2 text-left">Wallet</th>
                              <th className="py-2 text-left">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {poolTransactions.map((tx, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-700 hover:bg-gray-700 transition-colors"
                              >
                                <td className="py-2 pr-4">{renderTxTypeBadge(tx.type)}</td>
                                <td className="py-2 pr-4 whitespace-pre-wrap">{tx.amount}</td>
                                <td className="py-2 pr-4">{tx.wallet}</td>
                                <td className="py-2 pr-4 whitespace-pre-wrap">{tx.time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-lg">
                    Please select a pair to view pool transactions.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "farming" && (
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
              <h2 className="text-3xl font-bold mb-6 text-white">Farming</h2>
              <p className="text-gray-300 text-lg">
                Stake LP tokens to earn yield. (Placeholder)
              </p>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
              <h2 className="text-3xl font-bold mb-6 text-white">Analytics</h2>
              <p className="text-gray-300 text-lg">
                Advanced stats and real-time data (Placeholder).
              </p>
            </div>
          )}

          {activeTab === "nft" && (
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700">
              <h2 className="text-3xl font-bold mb-6 text-white">NFT Launchpad</h2>
              <p className="text-gray-300 text-lg">
                XLS-20 has introduced NFTs on XRPL. (Placeholder)
              </p>
            </div>
          )}

          {activeTab === "launchpad" && (
            <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-gray-700 w-full max-w-full mx-auto">
              {/* 
                Pastikan di LaunchpadPanel nantinya Anda atur modal atau pop-up 
                agar punya z-index tinggi dan auto-focus saat ditampilkan.
              */}
              <LaunchpadPanel popupFocus />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
