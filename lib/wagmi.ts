import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/-IjVfzHTO4eTd0oRVn1UHC_HWuGuV_Bw"),
  },
});
