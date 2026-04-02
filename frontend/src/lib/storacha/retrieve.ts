import type { EncryptedVaultPayload } from "@/lib/utils/vaultSchema";

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://w3s.link/ipfs";

export async function retrieveVaultByCID(cid: string): Promise<EncryptedVaultPayload> {
  const url = `${IPFS_GATEWAY}/${cid}`;
  console.log("[Storacha] Fetching vault from IPFS:", url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to retrieve vault from IPFS: ${response.status} ${response.statusText}`);
  }

  const data: EncryptedVaultPayload = await response.json();
  return data;
}

export async function checkCIDAvailable(cid: string): Promise<boolean> {
  try {
    const url = `${IPFS_GATEWAY}/${cid}`;
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
