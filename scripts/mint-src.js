import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  publicKey,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  fetchCandyMachine,
  mintV1,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

const statusEl = () => document.getElementById("mint-status");
const remainEl = () => document.getElementById("mint-remain");
const connectBtn = () => document.getElementById("mint-connect");
const mintBtn = () => document.getElementById("mint-go");

let config = null;
let provider = null;

function say(msg) {
  if (statusEl()) statusEl().textContent = msg;
}

function getProvider() {
  const w = window;
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solflare?.isSolflare) return w.solflare;
  if (w.solana?.isPhantom || w.solana?.isSolflare) return w.solana;
  return w.solana || null;
}

function umiWith(identity) {
  const umi = createUmi(config.rpc).use(mplCore()).use(mplCandyMachine());
  if (identity) umi.use(walletAdapterIdentity(identity));
  return umi;
}

async function refreshSupply() {
  if (!config?.candyMachine) {
    remainEl().textContent = "1000 / 1000";
    say("Collection is packed. Candy Machine goes live once the launch wallet is funded.");
    mintBtn().disabled = true;
    return;
  }
  try {
    const umi = umiWith();
    const cm = await fetchCandyMachine(umi, publicKey(config.candyMachine));
    const left = Number(cm.data.itemsAvailable) - Number(cm.itemsRedeemed);
    remainEl().textContent = `${left} / ${Number(cm.data.itemsAvailable)}`;
    mintBtn().disabled = left <= 0;
    if (left <= 0) say("Sold out.");
  } catch (err) {
    console.error(err);
    remainEl().textContent = `${config.supply} left`;
  }
}

async function connect() {
  provider = getProvider();
  if (!provider) {
    say("Install Phantom or Solflare, then come back.");
    window.open("https://phantom.app/", "_blank", "noreferrer");
    return;
  }
  const res = await provider.connect();
  const pk = res?.publicKey?.toString?.() || provider.publicKey?.toString?.();
  connectBtn().textContent = pk ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : "Connected";
  mintBtn().disabled = !config?.candyMachine;
  say(config?.candyMachine ? "Wallet linked. Catch one." : "Wallet linked. Machine is not live yet.");
}

async function mint() {
  if (!provider?.publicKey) {
    await connect();
    if (!provider?.publicKey) return;
  }
  if (!config?.candyMachine) {
    say("Candy Machine is not live yet.");
    return;
  }
  mintBtn().disabled = true;
  say("Mew is watching the transaction…");
  try {
    const umi = umiWith(provider);
    const asset = generateSigner(umi);
    const sig = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 400_000 }))
      .add(
        mintV1(umi, {
          candyMachine: publicKey(config.candyMachine),
          asset,
          collection: publicKey(config.collection),
          mintArgs: {
            solPayment: some({ destination: publicKey(config.treasury) }),
            mintLimit: some({ id: 1 }),
          },
        })
      )
      .sendAndConfirm(umi);
    const explorer =
      config.network === "mainnet-beta"
        ? `https://solscan.io/token/${asset.publicKey}`
        : `https://solscan.io/token/${asset.publicKey}?cluster=devnet`;
    say(`Caught. ${String(asset.publicKey).slice(0, 8)}…`);
    const link = document.getElementById("mint-link");
    if (link) {
      link.href = explorer;
      link.hidden = false;
    }
    await refreshSupply();
    console.log("sig", sig);
  } catch (err) {
    console.error(err);
    say(err?.message?.slice(0, 180) || "Mint failed. Try again.");
    mintBtn().disabled = false;
  }
}

async function boot() {
  if (!document.getElementById("mint")) return;
  try {
    config = await fetch("./nft-config.json").then((r) => r.json());
  } catch {
    config = { supply: 1000 };
  }
  const price = document.getElementById("mint-price");
  if (price) price.textContent = `${config.priceSol ?? 0.01} SOL`;
  connectBtn()?.addEventListener("click", () => connect().catch((e) => say(e.message)));
  mintBtn()?.addEventListener("click", () => mint().catch((e) => say(e.message)));
  await refreshSupply();
}

boot();
