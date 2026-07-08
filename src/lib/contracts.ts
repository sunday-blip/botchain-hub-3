import { Contract, JsonRpcProvider, type ContractRunner } from "ethers";
import { RPC_URL, getContractAddress, type ContractName } from "@/config/chain";
import {
  AGENT_NFT_ABI,
  AGENT_REGISTRY_ABI,
  VERSION_CONTROL_ABI,
  REPUTATION_ABI,
  PAYMENTS_ABI,
  MARKETPLACE_ABI,
  REVIEW_ABI,
} from "@/lib/abis";

const ABIS: Record<ContractName, readonly string[]> = {
  AgentNFT: AGENT_NFT_ABI,
  AgentRegistry: AGENT_REGISTRY_ABI,
  VersionControl: VERSION_CONTROL_ABI,
  Reputation: REPUTATION_ABI,
  Payments: PAYMENTS_ABI,
  Marketplace: MARKETPLACE_ABI,
  Review: REVIEW_ABI,
};

let _readProvider: JsonRpcProvider | null = null;

/**
 * Read-only provider for server components and any client code that just
 * needs to query state (no wallet required). Safe to call on the server —
 * it never touches `window`.
 */
export function getReadProvider(): JsonRpcProvider {
  if (!_readProvider) {
    _readProvider = new JsonRpcProvider(RPC_URL);
  }
  return _readProvider;
}

/**
 * Get a typed ethers Contract for reads. Pass a signer instead of the
 * default read provider (from `useContracts()` in a client component) to
 * send transactions with the connected wallet.
 */
export function getContract(name: ContractName, runner: ContractRunner = getReadProvider()): Contract {
  const address = getContractAddress(name);
  return new Contract(address, ABIS[name], runner);
}
