"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, formatEther } from "ethers";
import type { WalletState } from "@/types";
import { EXPECTED_CHAIN_ID, EXPECTED_CHAIN_NAME, RPC_URL } from "@/config/chain";

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Prompts the wallet to switch (or add) the network BotChain expects. */
  switchToExpectedNetwork: () => Promise<void>;
  /** Read-write signer for the connected wallet — null until connected. */
  getSigner: () => Promise<Awaited<ReturnType<BrowserProvider["getSigner"]>> | null>;
  isWrongNetwork: boolean;
}

const initialState: WalletState = {
  address: null,
  chainId: null,
  balanceEth: null,
  connecting: false,
  hasProvider: false,
  error: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);

function getEthereum(): any {
  if (typeof window === "undefined") return undefined;
  return (window as any).ethereum;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initialState);
  const providerRef = useRef<BrowserProvider | null>(null);

  const refreshBalance = useCallback(async (address: string) => {
    const eth = getEthereum();
    if (!eth) return;
    const provider = providerRef.current ?? new BrowserProvider(eth);
    providerRef.current = provider;
    try {
      const balance = await provider.getBalance(address);
      setState((s) => (s.address === address ? { ...s, balanceEth: formatEther(balance) } : s));
    } catch {
      // non-fatal — balance is a nice-to-have, not required for the rest of the app to work
    }
  }, []);

  const syncFromProvider = useCallback(
    async (accounts: string[]) => {
      const eth = getEthereum();
      if (!eth) return;
      if (accounts.length === 0) {
        setState((s) => ({ ...initialState, hasProvider: s.hasProvider }));
        return;
      }
      const provider = providerRef.current ?? new BrowserProvider(eth);
      providerRef.current = provider;
      const network = await provider.getNetwork();
      const address = accounts[0];
      setState((s) => ({
        ...s,
        address,
        chainId: Number(network.chainId),
        connecting: false,
        hasProvider: true,
        error: null,
      }));
      void refreshBalance(address);
    },
    [refreshBalance]
  );

  // Detect an already-connected wallet on load, without prompting a popup.
  useEffect(() => {
    const eth = getEthereum();
    setState((s) => ({ ...s, hasProvider: Boolean(eth) }));
    if (!eth) return;

    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => syncFromProvider(accounts))
      .catch(() => {});

    const onAccountsChanged = (accounts: string[]) => syncFromProvider(accounts);
    const onChainChanged = () => window.location.reload(); // ethers.js recommendation — provider state is otherwise stale

    eth.on?.("accountsChanged", onAccountsChanged);
    eth.on?.("chainChanged", onChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [syncFromProvider]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      setState((s) => ({
        ...s,
        error: "No wallet found. Install MetaMask (or another injected wallet) to continue.",
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const provider = new BrowserProvider(eth);
      providerRef.current = provider;
      const accounts: string[] = await provider.send("eth_requestAccounts", []);
      await syncFromProvider(accounts);
    } catch (err: any) {
      const message =
        err?.code === 4001 ? "Connection request rejected." : err?.message || "Failed to connect wallet.";
      setState((s) => ({ ...s, connecting: false, error: message }));
    }
  }, [syncFromProvider]);

  const disconnect = useCallback(() => {
    providerRef.current = null;
    setState((s) => ({ ...initialState, hasProvider: s.hasProvider }));
  }, []);

  const switchToExpectedNetwork = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    const hexChainId = `0x${EXPECTED_CHAIN_ID.toString(16)}`;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch (err: any) {
      if (err?.code === 4902) {
        // Chain not added to the wallet yet.
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: EXPECTED_CHAIN_NAME,
              rpcUrls: [RPC_URL],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      }
    }
  }, []);

  const getSigner = useCallback(async () => {
    const eth = getEthereum();
    if (!eth || !state.address) return null;
    const provider = providerRef.current ?? new BrowserProvider(eth);
    providerRef.current = provider;
    return provider.getSigner();
  }, [state.address]);

  const isWrongNetwork = Boolean(state.address && state.chainId !== EXPECTED_CHAIN_ID);

  const value = useMemo(
    () => ({ ...state, connect, disconnect, switchToExpectedNetwork, getSigner, isWrongNetwork }),
    [state, connect, disconnect, switchToExpectedNetwork, getSigner, isWrongNetwork]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
