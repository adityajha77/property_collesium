class LiquidityPool {
  private reserveA: number;
  private reserveB: number;
  private k: number; // Constant product
  private totalLiquidityShares: number;
  private liquidityProviders: Map<string, number>; // Map of provider address to their shares

  constructor(initialAmountA: number, initialAmountB: number) {
    if (initialAmountA <= 0 || initialAmountB <= 0) {
      throw new Error("Initial reserves must be greater than zero.");
    }
    this.reserveA = initialAmountA;
    this.reserveB = initialAmountB;
    this.k = this.reserveA * this.reserveB;
    this.totalLiquidityShares = 0;
    this.liquidityProviders = new Map();
  }

  /**
   * Adds liquidity to the pool.
   * @param amountA The amount of TOKEN_A to add.
   * @param amountB The amount of TOKEN_B to add.
   * @param providerAddress An identifier for the liquidity provider.
   * @returns The number of liquidity shares minted.
   */
  addLiquidity(amountA: number, amountB: number, providerAddress: string): number {
    if (amountA <= 0 || amountB <= 0) {
      throw new Error("Amounts to add must be greater than zero.");
    }

    // Calculate the ratio of current reserves
    const currentRatio = this.reserveA / this.reserveB;
    const providedRatio = amountA / amountB;

    // To maintain the pool's ratio, liquidity providers should add tokens in the current ratio.
    // For simplicity in this simulation, we'll allow adding any amounts, but in a real AMM,
    // one of the tokens might be returned if the ratio is off, or a price impact occurs.
    // Here, we'll assume the user provides amounts that roughly match the current price,
    // or we'll adjust one of the amounts to match the ratio for share calculation.
    // For a simple simulation, let's assume the user provides in the correct ratio or accepts price impact.
    // A more robust simulation would calculate how much of each token is actually accepted.

    // For initial liquidity, shares are proportional to the total liquidity provided.
    // For subsequent liquidity, shares are calculated based on the proportion of new liquidity
    // to the existing liquidity, maintaining the constant product.

    let mintedShares: number;
    if (this.totalLiquidityShares === 0) {
      // Initial liquidity provision
      mintedShares = Math.sqrt(amountA * amountB); // A common way to calculate initial shares
    } else {
      // Subsequent liquidity provision
      // Calculate shares based on the amount of TOKEN_A provided relative to its reserve
      // or TOKEN_B provided relative to its reserve. Both should yield the same shares
      // if added in the correct ratio.
      const sharesFromA = amountA * (this.totalLiquidityShares / this.reserveA);
      const sharesFromB = amountB * (this.totalLiquidityShares / this.reserveB);
      
      // In a real AMM, you'd take the minimum of sharesFromA and sharesFromB to prevent
      // one token from being over-supplied relative to the other.
      // For this simulation, we'll assume balanced addition for share calculation.
      mintedShares = Math.min(sharesFromA, sharesFromB);
    }

    this.reserveA += amountA;
    this.reserveB += amountB;
    this.k = this.reserveA * this.reserveB; // Update k, though it should remain constant if ratio is maintained
    this.totalLiquidityShares += mintedShares;

    const currentShares = this.liquidityProviders.get(providerAddress) || 0;
    this.liquidityProviders.set(providerAddress, currentShares + mintedShares);

    return mintedShares;
  }

  /**
   * Removes liquidity from the pool.
   * @param share The percentage of total liquidity shares to remove (0 to 1).
   * @param providerAddress The identifier for the liquidity provider.
   * @returns The amounts of TOKEN_A and TOKEN_B removed.
   */
  removeLiquidity(sharePercentage: number, providerAddress: string): { amountA: number; amountB: number } {
    if (sharePercentage <= 0 || sharePercentage > 1) {
      throw new Error("Share percentage must be between 0 and 1 (exclusive of 0).");
    }

    const providerShares = this.liquidityProviders.get(providerAddress);
    if (!providerShares || providerShares <= 0) {
      throw new Error("Liquidity provider has no shares or invalid address.");
    }

    const sharesToRemove = this.totalLiquidityShares * sharePercentage;
    if (sharesToRemove > providerShares) {
        throw new Error("Cannot remove more shares than the provider owns.");
    }

    const ratio = sharesToRemove / this.totalLiquidityShares;
    const amountA = this.reserveA * ratio;
    const amountB = this.reserveB * ratio;

    this.reserveA -= amountA;
    this.reserveB -= amountB;
    this.k = this.reserveA * this.reserveB;
    this.totalLiquidityShares -= sharesToRemove;

    this.liquidityProviders.set(providerAddress, providerShares - sharesToRemove);

    return { amountA, amountB };
  }

  /**
   * Swaps TOKEN_A for TOKEN_B.
   * @param amountAIn The amount of TOKEN_A to swap.
   * @returns The amount of TOKEN_B received.
   */
  swapAforB(amountAIn: number): number {
    if (amountAIn <= 0) {
      throw new Error("Amount to swap must be greater than zero.");
    }

    // Calculate the new reserveA after adding amountAIn
    const newReserveA = this.reserveA + amountAIn;
    // Calculate the new reserveB to maintain k
    const newReserveB = this.k / newReserveA;
    // The amount of TOKEN_B received is the difference between the old and new reserveB
    const amountBOut = this.reserveB - newReserveB;

    if (amountBOut <= 0) {
        throw new Error("Insufficient liquidity for this swap or invalid amount.");
    }

    this.reserveA = newReserveA;
    this.reserveB = newReserveB;

    return amountBOut;
  }

  /**
   * Swaps TOKEN_B for TOKEN_A.
   * @param amountBIn The amount of TOKEN_B to swap.
   * @returns The amount of TOKEN_A received.
   */
  swapBforA(amountBIn: number): number {
    if (amountBIn <= 0) {
      throw new Error("Amount to swap must be greater than zero.");
    }

    const newReserveB = this.reserveB + amountBIn;
    const newReserveA = this.k / newReserveB;
    const amountAOut = this.reserveA - newReserveA;

    if (amountAOut <= 0) {
        throw new Error("Insufficient liquidity for this swap or invalid amount.");
    }

    this.reserveA = newReserveA;
    this.reserveB = newReserveB;

    return amountAOut;
  }

  /**
   * Returns the current state of the pool.
   * @returns An object containing current balances, total liquidity, and token price.
   */
  getPoolState(): { reserveA: number; reserveB: number; k: number; totalLiquidityShares: number; priceA_per_B: number; priceB_per_A: number } {
    const priceA_per_B = this.reserveB / this.reserveA; // How much B you get for 1 A
    const priceB_per_A = this.reserveA / this.reserveB; // How much A you get for 1 B
    return {
      reserveA: this.reserveA,
      reserveB: this.reserveB,
      k: this.k,
      totalLiquidityShares: this.totalLiquidityShares,
      priceA_per_B: priceA_per_B,
      priceB_per_A: priceB_per_A,
    };
  }

  /**
   * Returns the shares held by a specific liquidity provider.
   * @param providerAddress The identifier for the liquidity provider.
   * @returns The number of shares held by the provider.
   */
  getProviderShares(providerAddress: string): number {
    return this.liquidityProviders.get(providerAddress) || 0;
  }
}

// --- Demo ---
console.log("--- Liquidity Pool Simulation Demo ---");

// 1. Initialize the pool
const pool = new LiquidityPool(1000, 1000); // 1000 TOKEN_A, 1000 TOKEN_B
console.log("\nInitial Pool State:");
console.log(pool.getPoolState());

// 2. Add liquidity
const provider1 = "0xProvider1";
const provider2 = "0xProvider2";

try {
  const sharesMinted1 = pool.addLiquidity(100, 100, provider1);
  console.log(`\nProvider ${provider1} added 100 TOKEN_A and 100 TOKEN_B. Minted ${sharesMinted1.toFixed(2)} shares.`);
  console.log("Pool State after Provider1 adds liquidity:");
  console.log(pool.getPoolState());
  console.log(`Provider ${provider1} shares: ${pool.getProviderShares(provider1).toFixed(2)}`);

  const sharesMinted2 = pool.addLiquidity(200, 200, provider2);
  console.log(`\nProvider ${provider2} added 200 TOKEN_A and 200 TOKEN_B. Minted ${sharesMinted2.toFixed(2)} shares.`);
  console.log("Pool State after Provider2 adds liquidity:");
  console.log(pool.getPoolState());
  console.log(`Provider ${provider2} shares: ${pool.getProviderShares(provider2).toFixed(2)}`);
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error adding liquidity:", error.message);
  } else {
    console.error("An unknown error occurred while adding liquidity.");
  }
}

// 3. Swap A for B
try {
  const amountAtoSwap = 50;
  const amountBReceived = pool.swapAforB(amountAtoSwap);
  console.log(`\nSwapped ${amountAtoSwap} TOKEN_A for ${amountBReceived.toFixed(2)} TOKEN_B.`);
  console.log("Pool State after swapping A for B:");
  console.log(pool.getPoolState());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error swapping A for B:", error.message);
  } else {
    console.error("An unknown error occurred while swapping A for B.");
  }
}

// 4. Swap B for A
try {
  const amountBtoSwap = 75;
  const amountAReceived = pool.swapBforA(amountBtoSwap);
  console.log(`\nSwapped ${amountBtoSwap} TOKEN_B for ${amountAReceived.toFixed(2)} TOKEN_A.`);
  console.log("Pool State after swapping B for A:");
  console.log(pool.getPoolState());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error swapping B for A:", error.message);
  } else {
    console.error("An unknown error occurred while swapping B for A.");
  }
}

// 5. Remove liquidity
try {
  const removeSharePercentage = 0.5; // Remove 50% of Provider1's shares
  const provider1SharesBefore = pool.getProviderShares(provider1);
  const sharesToRemove = provider1SharesBefore * removeSharePercentage;

  const { amountA: removedA, amountB: removedB } = pool.removeLiquidity(removeSharePercentage, provider1);
  console.log(`\nProvider ${provider1} removed ${sharesToRemove.toFixed(2)} shares (${(removeSharePercentage * 100).toFixed(0)}% of their holdings).`);
  console.log(`Received ${removedA.toFixed(2)} TOKEN_A and ${removedB.toFixed(2)} TOKEN_B.`);
  console.log("Pool State after Provider1 removes liquidity:");
  console.log(pool.getPoolState());
  console.log(`Provider ${provider1} shares: ${pool.getProviderShares(provider1).toFixed(2)}`);
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error removing liquidity:", error.message);
  } else {
    console.error("An unknown error occurred while removing liquidity.");
  }
}

// Export the class for potential use in other modules
export { LiquidityPool };
