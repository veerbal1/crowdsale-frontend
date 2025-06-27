"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContracts,
  useWriteContract,
  useBalance,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useEffect, useState } from "react";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { crowdsaleAbi } from "@/lib/abi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";

const crowdsaleContractAddress = "0x845Cace640aEE655698fEe57A1eA5a3a4AF00db7"; // Your Crowdsale contract address
const tokenContractAddress = "0xB890258C3c64D289D7b4bBC5785064D2A12E7fFE";

export default function Home() {
  const [ethAmount, setEthAmount] = useState("0.01");
  const [crowdsaleGoal, setCrowdsaleGoal] = useState(() => {
    // Try to get the goal from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedGoal = localStorage.getItem('crowdsaleGoal');
      return savedGoal ? parseFloat(savedGoal) : 100;
    }
    return 100;
  });
  const [isAdmin, setIsAdmin] = useState(false); // Toggle for admin view
  const [newGoal, setNewGoal] = useState(crowdsaleGoal.toString()); // For updating the goal
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ethBalance } = useBalance({ address });

  const { data: awsmBalance, refetch: refetchAwsmBalance } = useBalance({
    address,
    token: tokenContractAddress,
  });

  const {
    data: hash,
    writeContract,
    isPending: isPurchasePending,
    error: purchaseError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const crowdsaleContract = {
    address: crowdsaleContractAddress,
    abi: crowdsaleAbi,
  } as const;

  const { data: crowdsaleData, refetch: refetchCrowdsaleData } =
    useReadContracts({
      contracts: [
        {
          ...crowdsaleContract,
          functionName: "rate",
        },
        {
          ...crowdsaleContract,
          functionName: "weiRaised",
        },
      ],
    });

  const rate =
    crowdsaleData?.[0].status === "success" ? crowdsaleData[0].result : 0;
  const weiRaised =
    crowdsaleData?.[1].status === "success" ? crowdsaleData[1].result : BigInt(0);
  
  // Calculate progress percentage
  const raisedEth = parseFloat(formatEther(weiRaised));
  const progressPercentage = Math.min(Math.round((raisedEth / crowdsaleGoal) * 100), 100);

  useEffect(() => {
    if (isConfirmed) {
      refetchCrowdsaleData();
      refetchAwsmBalance();
      toast.success("Purchase successful! Your new balance should update shortly.");
    }
  }, [isConfirmed, refetchCrowdsaleData, refetchAwsmBalance]);

  useEffect(() => {
    if (purchaseError) {
      toast.error(`Error: ${purchaseError.message || "Transaction failed"}`);
    }
  }, [purchaseError]);

  const handlePurchase = async () => {
    const amountToBuy = parseFloat(ethAmount);
    if (isNaN(amountToBuy) || amountToBuy <= 0) {
      toast.error("Please enter a valid ETH amount");
      return;
    }

    writeContract({
      ...crowdsaleContract,
      functionName: "buyTokens",
      args: [address!],
      value: parseEther(ethAmount),
    });
  };

  const tokensToReceive =
    rate > 0 && ethAmount ? parseEther(ethAmount) * BigInt(rate) : BigInt(0);

  // Function to handle goal update
  const handleGoalUpdate = () => {
    const goalValue = parseFloat(newGoal);
    if (isNaN(goalValue) || goalValue <= 0) {
      toast.error("Please enter a valid goal amount");
      return;
    }
    
    // Update state and save to localStorage
    setCrowdsaleGoal(goalValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crowdsaleGoal', goalValue.toString());
    }
    
    toast.success(`Crowdsale goal updated to ${goalValue} ETH`);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-muted/50 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AwesomeDAO Crowdsale
            </h1>
            <p className="text-muted-foreground mt-1">Purchase AWSM tokens for your wallet</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isConnected ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Badge variant="outline" className="px-3 py-1 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => disconnect()}>
                  Disconnect
                </Button>
                {/* Admin toggle button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={isAdmin ? "bg-primary/10" : ""}
                >
                  Admin
                </Button>
              </div>
            ) : (
              <Button onClick={() => connect({ connector: injected() })}>
                Connect Wallet
              </Button>
            )}
          </div>
        </header>

        {/* Admin Panel */}
        {isAdmin && isConnected && (
          <Card className="mb-8 border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>Configure crowdsale parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <label htmlFor="goal" className="text-sm font-medium">
                    Crowdsale Goal (ETH)
                  </label>
                  <Input
                    id="goal"
                    type="number"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    step="1"
                    min="1"
                  />
                </div>
                <Button onClick={handleGoalUpdate}>Update Goal</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8 border-muted/40 shadow-sm">
          <CardHeader>
            <CardTitle>Sale Status</CardTitle>
            <CardDescription>Current crowdsale metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exchange Rate:</span>
              <span className="font-medium">1 ETH = {rate.toString()} AWSM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Raised:</span>
              <span className="font-medium">{formatEther(weiRaised)} ETH</span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0 ETH</span>
                <span>Goal: {crowdsaleGoal} ETH</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isConnected ? (
          <Card className="border-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle>Your Wallet</CardTitle>
              <CardDescription>Current balance and purchase options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-muted/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Your ETH Balance</p>
                      <p className="text-2xl font-bold">
                        {ethBalance
                          ? `${parseFloat(ethBalance.formatted).toFixed(4)} ETH`
                          : "Loading..."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-muted/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Your AWSM Balance</p>
                      <p className="text-2xl font-bold">
                        {awsmBalance ? `${parseFloat(awsmBalance.formatted).toFixed(2)}` : "Loading..."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Make a Purchase</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Input
                    type="number"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="max-w-[200px]"
                  />
                  <span className="font-medium">ETH</span>
                </div>

                <Card className="bg-muted/30 border-dashed border-muted mb-6">
                  <CardContent className="py-4 text-center">
                    <p className="text-muted-foreground">You will receive approximately</p>
                    <p className="text-xl font-bold">{formatEther(tokensToReceive)} AWSM</p>
                  </CardContent>
                </Card>

                <Button 
                  className="w-full" 
                  onClick={handlePurchase}
                  disabled={isPurchasePending || isConfirming}
                >
                  {isPurchasePending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Check Wallet
                    </>
                  ) : isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    "Buy AWSM Tokens"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted/40 shadow-sm text-center p-8">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <p className="text-xl">Please connect your wallet to participate in the sale.</p>
              <Button onClick={() => connect({ connector: injected() })}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
