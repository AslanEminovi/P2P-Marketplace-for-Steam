const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const requireAuth = require("../middleware/requireAuth");

// All wallet routes require authentication
router.use(requireAuth);

// Get wallet balance and transaction history
router.get("/balance", walletController.getBalance);
router.get("/transactions", walletController.getTransactions);

// Add funds to wallet
router.post("/deposit", walletController.deposit);

// Withdraw funds from wallet
router.post("/withdraw", walletController.withdraw);

// Transfer funds between currencies
router.post("/exchange", walletController.exchangeCurrency);

module.exports = router;