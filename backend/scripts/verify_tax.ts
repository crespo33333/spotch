
function verifyTaxStrategies() {
    console.log("💰 Verifying Tax Calculation Strategies...\n");

    const ratePerMinute = 60; // 1 point per second
    const taxRatePercent = 5; // 5%
    const heartbeats = 100; // Simulate 100 heartbeats (500 seconds)

    let totalEarned = 0;

    let strategyA_TotalTax = 0; // Current user method (Per transaction floor)
    let strategyB_TotalTax = 0; // Cumulative method

    let strategyB_LastTaxCheckpoint = 0;

    console.log(`Parameters: Rate=${ratePerMinute}/min, Tax=${taxRatePercent}%, Steps=${heartbeats}`);
    console.log("---------------------------------------------------");

    for (let i = 1; i <= heartbeats; i++) {
        const increment = ratePerMinute / 12; // 5 points per heartbeat
        const oldEarned = totalEarned;
        totalEarned += increment;

        // 1. Wallet Update (Integer only)
        const walletAward = Math.floor(totalEarned) - Math.floor(oldEarned);

        if (walletAward > 0) {
            // Strategy A: Current Implementation
            // taxAmount = Math.floor(walletAward * (taxRate / 100));
            const taxA = Math.floor(walletAward * (taxRatePercent / 100));
            strategyA_TotalTax += taxA;

            // Strategy B: Cumulative Implementation
            // taxAmount = Math.floor(newEarned * taxRate) - Math.floor(oldEarned * taxRate)
            // Wait, logic check:
            // floor(total * 0.05) - floor(old * 0.05)
            const cumulativeTaxNew = Math.floor(totalEarned * (taxRatePercent / 100));
            const cumulativeTaxOld = Math.floor(oldEarned * (taxRatePercent / 100));
            const taxB = cumulativeTaxNew - cumulativeTaxOld;
            strategyB_TotalTax += taxB;

            // Logging verification for first few steps
            if (i <= 5) {
                console.log(`Step ${i}: Earned=${totalEarned.toFixed(2)} (+${increment}) | Award=${walletAward}`);
                console.log(`   > Tax A (Floor per Award): ${taxA}`);
                console.log(`   > Tax B (Cumulative Diff): ${taxB} [${cumulativeTaxNew} - ${cumulativeTaxOld}]`);
            }
        }
    }

    console.log("---------------------------------------------------");
    console.log(`Total Earned Points: ${totalEarned.toFixed(2)}`);
    console.log(`Strategy A Total Tax (Current): ${strategyA_TotalTax}`);
    console.log(`Strategy B Total Tax (Proposed): ${strategyB_TotalTax}`);
    console.log(`Expected Tax (~5% of ${Math.floor(totalEarned)}): ${Math.floor(totalEarned) * 0.05}`);

    if (strategyA_TotalTax === 0 && strategyB_TotalTax > 0) {
        console.log("\n❌ Strategy A (Current) failed to collect any tax!");
        console.log("✅ Recommendation: Switch to Strategy B (Cumulative)");
    } else {
        console.log("\nBoth strategies collected something (High rate scenario?)");
    }
}

verifyTaxStrategies();
