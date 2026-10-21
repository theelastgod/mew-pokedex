import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  none,
  percentAmount,
  publicKey,
  signerIdentity,
  some,
  sol,
} from "@metaplex-foundation/umi";
import { createCollection } from "@metaplex-foundation/mpl-core";
import {
  create,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { mplCore } from "@metaplex-foundation/mpl-core";

const ROOT = join(import.meta.dirname, "..");
const META = "https://mew-pokedex.pages.dev/nft/metadata.json";
const COLLECTION_META = "https://mew-pokedex.pages.dev/nft/collection.json";
const SUPPLY = 1000;
const PRICE = 0.01;

const cluster = process.argv.includes("--mainnet")
  ? "mainnet-beta"
  : "devnet";
const rpc =
  cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";

const secret = JSON.parse(
  readFileSync(join(homedir(), ".config/solana/id.json"), "utf8")
);
const umi = createUmi(rpc).use(mplCore()).use(mplCandyMachine());
const keypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secret));
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

const treasury = umi.identity.publicKey;
console.log("authority", treasury);
console.log("cluster", cluster);

const collection = generateSigner(umi);
await createCollection(umi, {
  collection,
  name: "MEW Video Cards",
  uri: COLLECTION_META,
}).sendAndConfirm(umi);
console.log("collection", collection.publicKey);

const candyMachine = generateSigner(umi);
const hash = new Uint8Array(
  createHash("sha256").update(readFileSync(join(ROOT, "nft/metadata.json"))).digest()
);

await create(umi, {
  candyMachine,
  collection: collection.publicKey,
  collectionUpdateAuthority: umi.identity,
  itemsAvailable: SUPPLY,
  isMutable: false,
  sellerFeeBasisPoints: percentAmount(5, 2),
  configLineSettings: none(),
  hiddenSettings: some({
    name: "MEW #$ID+1$",
    uri: META,
    hash,
  }),
  guards: {
    solPayment: some({ lamports: sol(PRICE), destination: treasury }),
    mintLimit: some({ id: 1, limit: 1 }),
  },
}).sendAndConfirm(umi);

const config = {
  network: cluster,
  rpc,
  candyMachine: candyMachine.publicKey,
  collection: collection.publicKey,
  treasury: String(treasury),
  priceSol: PRICE,
  supply: SUPPLY,
  mintLimit: 1,
};

writeFileSync(join(ROOT, "nft-config.json"), JSON.stringify(config, null, 2) + "\n");
console.log("candyMachine", candyMachine.publicKey);
console.log("wrote nft-config.json");
