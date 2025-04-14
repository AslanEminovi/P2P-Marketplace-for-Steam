import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaWallet, 
  FaMoneyBillWave, 
  FaHistory, 
  FaExchangeAlt,
  FaPlus,
  FaMinus
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './Wallet.css';

const Wallet = ({ user, onBalanceUpdate }) => {
  const [activeTab, setActiveTab] = useState('balance');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  
  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState('USD');
  const [withdrawMethod, setWithdrawMethod] = useState('bankTransfer');
  const [accountDetails, setAccountDetails] = useState('');
  
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);
  
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/wallet/transactions`, {
        withCredentials: true,
        params: { limit: 20, offset: 0 }
      });
      setTransactions(response.data.transactions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/wallet/deposit`,
        {
          amount: parseFloat(depositAmount),
          currency: depositCurrency,
          paymentMethod,
          paymentId: `demo_${Date.now()}`
        },
        { withCredentials: true }
      );
      
      // Update balance on success
      if (response.data.success && onBalanceUpdate) {
        onBalanceUpdate();
        toast.success('Deposit successful');
      }
      
      // Reset form
      setDepositAmount('');
      
      // Switch to transaction history
      setActiveTab('transactions');
      fetchTransactions();
      
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.error || 'Failed to process deposit');
      toast.error(err.response?.data?.error || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/wallet/withdraw`,
        {
          amount: parseFloat(withdrawAmount),
          currency: withdrawCurrency,
          withdrawalMethod: withdrawMethod,
          accountDetails
        },
        { withCredentials: true }
      );
      
      // Update balance on success
      if (response.data.success && onBalanceUpdate) {
        onBalanceUpdate();
        toast.success('Withdrawal requested successfully');
      }
      
      // Reset form
      setWithdrawAmount('');
      setAccountDetails('');
      
      // Switch to transaction history
      setActiveTab('transactions');
      fetchTransactions();
      
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err.response?.data?.error || 'Failed to process withdrawal');
      toast.error(err.response?.data?.error || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  // Format transaction timestamp
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format currency with symbol
  const formatCurrency = (amount, currency) => {
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    if (currency === 'GEL') return `${amount.toFixed(2)} ₾`;
    return `${amount.toFixed(2)} ${currency}`;
  };

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h1><FaWallet /> My Wallet</h1>
        <p>Manage your funds and transaction history</p>
      </div>

      {/* Wallet Balance Cards */}
      <div className="wallet-balance-cards">
        <div className="wallet-balance-card">
          <div className="wallet-balance-card-header">
            <h3>USD Balance</h3>
          </div>
          <div className="wallet-balance-card-body">
            <span className="wallet-amount">${user?.walletBalance?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
        <div className="wallet-balance-card">
          <div className="wallet-balance-card-header">
            <h3>GEL Balance</h3>
          </div>
          <div className="wallet-balance-card-body">
            <span className="wallet-amount">{user?.walletBalanceGEL?.toFixed(2) || '0.00'} ₾</span>
          </div>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div className="wallet-tabs">
        <button 
          className={`wallet-tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          <FaWallet /> Overview
        </button>
        <button 
          className={`wallet-tab ${activeTab === 'deposit' ? 'active' : ''}`}
          onClick={() => setActiveTab('deposit')}
        >
          <FaPlus /> Deposit
        </button>
        <button 
          className={`wallet-tab ${activeTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdraw')}
        >
          <FaMinus /> Withdraw
        </button>
        <button 
          className={`wallet-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaHistory /> History
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="wallet-error">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="wallet-content">
        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <div className="wallet-overview">
            <p className="wallet-description">
              Your wallet allows you to deposit and withdraw funds for marketplace transactions.
            </p>
            
            <div className="wallet-actions">
              <button 
                className="wallet-action-btn deposit"
                onClick={() => setActiveTab('deposit')}
              >
                <FaPlus /> Deposit Funds
              </button>
              <button 
                className="wallet-action-btn withdraw"
                onClick={() => setActiveTab('withdraw')}
              >
                <FaMinus /> Withdraw Funds
              </button>
            </div>

            <div className="wallet-info-card">
              <h3><FaExchangeAlt /> Currency Exchange Rate</h3>
              <div className="wallet-info-content">
                <p>1 USD = 3.1 GEL</p>
                <p>1 GEL = 0.32 USD</p>
              </div>
              <p className="wallet-info-note">
                * Exchange rates are updated daily
              </p>
            </div>
            
            <div className="wallet-recent-transactions">
              <h3><FaHistory /> Recent Transactions</h3>
              <button 
                className="wallet-view-all" 
                onClick={() => setActiveTab('transactions')}
              >
                View All
              </button>
              {loading ? (
                <div className="wallet-loading">
                  <div className="wallet-spinner"></div>
                </div>
              ) : transactions.length > 0 ? (
                <div className="wallet-transactions-list">
                  {transactions.slice(0, 3).map((transaction, index) => (
                    <div key={index} className="wallet-transaction-item">
                      <div className="wallet-transaction-info">
                        <span className="wallet-transaction-type">{transaction.type}</span>
                        <span className="wallet-transaction-date">{formatDate(transaction.createdAt)}</span>
                      </div>
                      <span className={`wallet-transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="wallet-no-data">No recent transactions</p>
              )}
            </div>
          </div>
        )}
        
        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="wallet-form-container">
            <h2><FaPlus /> Deposit Funds</h2>
            <form onSubmit={handleDeposit} className="wallet-form">
              <div className="wallet-form-group">
                <label>Amount</label>
                <div className="wallet-input-group">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                    className="wallet-input"
                  />
                  <select
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value)}
                    className="wallet-select currency"
                  >
                    <option value="USD">USD</option>
                    <option value="GEL">GEL</option>
                  </select>
                </div>
              </div>
              
              <div className="wallet-form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="wallet-select"
                >
                  <option value="creditCard">Credit/Debit Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="bankTransfer">Bank Transfer</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="wallet-button primary"
              >
                {loading ? (
                  <>
                    <div className="wallet-spinner"></div>
                    Processing...
                  </>
                ) : 'Deposit Funds'}
              </button>
            </form>
          </div>
        )}
        
        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="wallet-form-container">
            <h2><FaMinus /> Withdraw Funds</h2>
            <form onSubmit={handleWithdraw} className="wallet-form">
              <div className="wallet-form-group">
                <label>Amount</label>
                <div className="wallet-input-group">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                    className="wallet-input"
                  />
                  <select
                    value={withdrawCurrency}
                    onChange={(e) => setWithdrawCurrency(e.target.value)}
                    className="wallet-select currency"
                  >
                    <option value="USD">USD</option>
                    <option value="GEL">GEL</option>
                  </select>
                </div>
              </div>
              
              <div className="wallet-form-group">
                <label>Withdrawal Method</label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="wallet-select"
                >
                  <option value="bankTransfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
              
              <div className="wallet-form-group">
                <label>Account Details</label>
                <textarea
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  required
                  placeholder="Enter your account details for withdrawal"
                  className="wallet-textarea"
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="wallet-button primary"
              >
                {loading ? (
                  <>
                    <div className="wallet-spinner"></div>
                    Processing...
                  </>
                ) : 'Withdraw Funds'}
              </button>
            </form>
          </div>
        )}
        
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="wallet-transactions">
            <h2><FaHistory /> Transaction History</h2>
            {loading ? (
              <div className="wallet-loading">
                <div className="wallet-spinner"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="wallet-transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr key={index}>
                        <td>{formatDate(transaction.createdAt)}</td>
                        <td className="transaction-type">{transaction.type}</td>
                        <td className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </td>
                        <td className={`transaction-status ${transaction.status}`}>
                          {transaction.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="wallet-no-data">No transaction history found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet; 