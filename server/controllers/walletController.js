const User = require("../models/User");

// GET /wallet/balance
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with wallet balances
    const user = await User.findById(userId).select(
      "walletBalance walletBalanceGEL settings.currency"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return wallet balances
    return res.json({
      balance: {
        USD: user.walletBalance,
        GEL: user.walletBalanceGEL,
      },
      preferredCurrency: user.settings?.currency || "USD",
    });
  } catch (err) {
    console.error("Get wallet balance error:", err);
    return res.status(500).json({ error: "Failed to retrieve wallet balance" });
  }
};

// GET /wallet/transactions
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, offset = 0, type } = req.query;

    // Get user with transactions
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Filter transactions by type if specified
    let transactions = user.transactions || [];

    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedTransactions = transactions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    return res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("Get wallet transactions error:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve wallet transactions" });
  }
};

// POST /wallet/deposit
exports.deposit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, currency = "USD", paymentMethod, paymentId } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!["USD", "GEL"].includes(currency)) {
      return res.status(400).json({ error: "Invalid currency" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    // Format the amount properly
    const depositAmount = parseFloat(parseFloat(amount).toFixed(2));

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a transaction record
    const transaction = {
      type: "deposit",
      amount: depositAmount,
      currency,
      status: "pending",
      reference: paymentId || `deposit_${Date.now()}`,
      createdAt: new Date(),
    };

    // In a real app, you would process the payment with a payment gateway here
    // For demonstration, we'll simulate successful payment

    // Add funds to wallet
    if (currency === "USD") {
      user.walletBalance = parseFloat(
        (user.walletBalance || 0) + depositAmount
      );
    } else if (currency === "GEL") {
      user.walletBalanceGEL = parseFloat(
        (user.walletBalanceGEL || 0) + depositAmount
      );
    }

    // Mark transaction as completed
    transaction.status = "completed";
    transaction.completedAt = new Date();

    // Add transaction to history
    user.transactions.push(transaction);

    // Add notification
    user.notifications.push({
      type: "transaction",
      title: "Deposit Successful",
      message: `You have successfully deposited ${parseFloat(
        depositAmount
      ).toFixed(2)} ${currency} to your wallet.`,
      read: false,
      createdAt: new Date(),
    });

    await user.save();

    return res.json({
      success: true,
      message: `Successfully deposited ${parseFloat(depositAmount).toFixed(
        2
      )} ${currency}`,
      balance: currency === "USD" ? user.walletBalance : user.walletBalanceGEL,
      transaction: {
        id: user.transactions[user.transactions.length - 1]._id,
        type: "deposit",
        amount: depositAmount,
        currency,
        status: "completed",
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Wallet deposit error:", err);
    return res.status(500).json({ error: "Failed to process deposit" });
  }
};

// POST /wallet/withdraw
exports.withdraw = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      amount,
      currency = "USD",
      withdrawalMethod,
      accountDetails,
    } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!["USD", "GEL"].includes(currency)) {
      return res.status(400).json({ error: "Invalid currency" });
    }

    if (!withdrawalMethod) {
      return res.status(400).json({ error: "Withdrawal method is required" });
    }

    if (!accountDetails) {
      return res.status(400).json({ error: "Account details are required" });
    }

    // Format the amount properly
    const withdrawalAmount = parseFloat(parseFloat(amount).toFixed(2));

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has enough balance
    const currentBalance =
      currency === "USD" ? user.walletBalance : user.walletBalanceGEL;

    if (currentBalance < withdrawalAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Create a transaction record
    const transaction = {
      type: "withdrawal",
      amount: -withdrawalAmount, // Negative amount for withdrawals
      currency,
      status: "pending",
      reference: `withdrawal_${Date.now()}`,
      createdAt: new Date(),
    };

    // In a real app, you would process the withdrawal with a payment processor here
    // For demonstration, we'll simulate successful withdrawal

    // Subtract funds from wallet
    if (currency === "USD") {
      user.walletBalance = parseFloat(
        (user.walletBalance || 0) - withdrawalAmount
      );
    } else if (currency === "GEL") {
      user.walletBalanceGEL = parseFloat(
        (user.walletBalanceGEL || 0) - withdrawalAmount
      );
    }

    // Mark transaction as completed
    transaction.status = "completed";
    transaction.completedAt = new Date();

    // Add transaction to history
    user.transactions.push(transaction);

    // Add notification
    user.notifications.push({
      type: "transaction",
      title: "Withdrawal Successful",
      message: `You have successfully withdrawn ${parseFloat(
        withdrawalAmount
      ).toFixed(2)} ${currency} from your wallet.`,
      read: false,
      createdAt: new Date(),
    });

    await user.save();

    return res.json({
      success: true,
      message: `Successfully withdrew ${parseFloat(withdrawalAmount).toFixed(
        2
      )} ${currency}`,
      balance: currency === "USD" ? user.walletBalance : user.walletBalanceGEL,
      transaction: {
        id: user.transactions[user.transactions.length - 1]._id,
        type: "withdrawal",
        amount: -withdrawalAmount,
        currency,
        status: "completed",
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Wallet withdrawal error:", err);
    return res.status(500).json({ error: "Failed to process withdrawal" });
  }
};

// POST /wallet/exchange
exports.exchangeCurrency = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromCurrency, toCurrency, amount, rate } = req.body;

    // Validate input
    if (!fromCurrency || !toCurrency) {
      return res
        .status(400)
        .json({ error: "Source and destination currencies are required" });
    }

    if (
      !["USD", "GEL"].includes(fromCurrency) ||
      !["USD", "GEL"].includes(toCurrency)
    ) {
      return res.status(400).json({ error: "Invalid currency" });
    }

    if (fromCurrency === toCurrency) {
      return res
        .status(400)
        .json({ error: "Source and destination currencies must be different" });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!rate || isNaN(rate) || parseFloat(rate) <= 0) {
      return res.status(400).json({ error: "Valid exchange rate is required" });
    }

    // Format the amount properly
    const exchangeAmount = parseFloat(parseFloat(amount).toFixed(2));
    const exchangeRate = parseFloat(parseFloat(rate).toFixed(4));

    // Calculate conversion amount
    const convertedAmount =
      fromCurrency === "USD" && toCurrency === "GEL"
        ? exchangeAmount * exchangeRate // USD to GEL
        : exchangeAmount / exchangeRate; // GEL to USD

    // Round to 2 decimal places
    const formattedConvertedAmount = parseFloat(
      parseFloat(convertedAmount).toFixed(2)
    );

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has enough balance in source currency
    const sourceBalance =
      fromCurrency === "USD" ? user.walletBalance : user.walletBalanceGEL;

    if (sourceBalance < exchangeAmount) {
      return res
        .status(400)
        .json({ error: "Insufficient balance for exchange" });
    }

    // Create transaction records
    const sourceTransaction = {
      type: "withdrawal",
      amount: -exchangeAmount,
      currency: fromCurrency,
      status: "completed",
      reference: `exchange_${Date.now()}_out`,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    const destinationTransaction = {
      type: "deposit",
      amount: formattedConvertedAmount,
      currency: toCurrency,
      status: "completed",
      reference: `exchange_${Date.now()}_in`,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    // Update balances
    if (fromCurrency === "USD") {
      user.walletBalance = parseFloat(
        (user.walletBalance || 0) - exchangeAmount
      );
      user.walletBalanceGEL = parseFloat(
        (user.walletBalanceGEL || 0) + formattedConvertedAmount
      );
    } else {
      user.walletBalanceGEL = parseFloat(
        (user.walletBalanceGEL || 0) - exchangeAmount
      );
      user.walletBalance = parseFloat(
        (user.walletBalance || 0) + formattedConvertedAmount
      );
    }

    // Add transactions to history
    user.transactions.push(sourceTransaction, destinationTransaction);

    // Add notification
    user.notifications.push({
      type: "transaction",
      title: "Currency Exchange",
      message: `You exchanged ${parseFloat(exchangeAmount).toFixed(
        2
      )} ${fromCurrency} to ${formattedConvertedAmount} ${toCurrency} at rate ${parseFloat(
        exchangeRate
      ).toFixed(4)}.`,
      read: false,
      createdAt: new Date(),
    });

    await user.save();

    return res.json({
      success: true,
      message: `Successfully exchanged ${parseFloat(exchangeAmount).toFixed(
        2
      )} ${fromCurrency} to ${formattedConvertedAmount} ${toCurrency}`,
      balance: {
        USD: user.walletBalance,
        GEL: user.walletBalanceGEL,
      },
    });
  } catch (err) {
    console.error("Currency exchange error:", err);
    return res
      .status(500)
      .json({ error: "Failed to process currency exchange" });
  }
};
