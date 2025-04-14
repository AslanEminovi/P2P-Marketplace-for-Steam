import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaWallet, 
  FaMoneyBillWave, 
  FaHistory, 
  FaExchangeAlt,
  FaPlus,
  FaMinus,
  FaChevronDown,
  FaCreditCard,
  FaPaypal,
  FaUniversity,
  FaBitcoin,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaClock,
  FaChartLine
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './Wallet.css';

const Wallet = ({ user, onBalanceUpdate }) => {
  const [activeTab, setActiveTab] = useState('balance');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  
  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState('USD');
  const [withdrawMethod, setWithdrawMethod] = useState('bankTransfer');
  const [accountDetails, setAccountDetails] = useState('');

  // Ref for currency dropdown
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCurrencyDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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

  const toggleCurrencyDropdown = () => {
    setShowCurrencyDropdown(!showCurrencyDropdown);
  };

  const changeCurrency = (currency) => {
    setSelectedCurrency(currency);
    setShowCurrencyDropdown(false);
  };

  // Get payment method icon
  const getPaymentIcon = (method) => {
    switch(method) {
      case 'creditCard': return <FaCreditCard />;
      case 'paypal': return <FaPaypal />;
      case 'bankTransfer': return <FaUniversity />;
      case 'crypto': return <FaBitcoin />;
      default: return <FaCreditCard />;
    }
  };

  // Get transaction status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <FaCheck />;
      case 'pending': return <FaClock />;
      case 'failed': return <FaTimes />;
      default: return <FaClock />;
    }
  };

  return (
    <div className="wallet-new-container">
      {/* Hero section with balance */}
      <div className="wallet-hero">
        <div className="wallet-hero-content">
          <h1>My Wallet</h1>
          <p>Manage your funds and transactions</p>
          
          <div className="wallet-balance-panel">
            <div className="wallet-balance-card usd">
              <div className="balance-card-header">
                <span className="balance-card-label">USD Balance</span>
                <FaChartLine className="balance-card-icon" />
              </div>
              <div className="balance-card-amount">
                ${user?.walletBalance?.toFixed(2) || '0.00'}
              </div>
            </div>
            
            <div className="wallet-balance-card gel">
              <div className="balance-card-header">
                <span className="balance-card-label">GEL Balance</span>
                <FaChartLine className="balance-card-icon" />
              </div>
              <div className="balance-card-amount">
                {user?.walletBalanceGEL?.toFixed(2) || '0.00'} ₾
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="wallet-body">
        <div className="wallet-actions">
          <button 
            className="wallet-action-button deposit"
            onClick={() => setActiveTab('deposit')}
          >
            <FaPlus className="action-icon" />
            <span className="action-text">Deposit</span>
          </button>
          
          <button 
            className="wallet-action-button withdraw"
            onClick={() => setActiveTab('withdraw')}
          >
            <FaMinus className="action-icon" />
            <span className="action-text">Withdraw</span>
          </button>
          
          <button 
            className="wallet-action-button history"
            onClick={() => setActiveTab('transactions')}
          >
            <FaHistory className="action-icon" />
            <span className="action-text">History</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="wallet-tab-content">
          {error && (
            <div className="wallet-error-message">
              <FaTimes className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="wallet-deposit-section">
              <h2><FaPlus /> Deposit Funds</h2>
              
              <form onSubmit={handleDeposit} className="wallet-form">
                <div className="wallet-form-row">
                  <div className="wallet-form-group">
                    <label>Amount</label>
                    <div className="wallet-input-with-select">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        required
                        placeholder="Enter amount"
                        className="wallet-amount-input"
                      />
                      <select
                        value={depositCurrency}
                        onChange={(e) => setDepositCurrency(e.target.value)}
                        className="wallet-currency-select"
                      >
                        <option value="USD">USD</option>
                        <option value="GEL">GEL</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="wallet-form-row">
                  <div className="wallet-form-group">
                    <label>Payment Method</label>
                    <div className="payment-methods">
                      <div
                        className={`payment-method-option ${paymentMethod === 'creditCard' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('creditCard')}
                      >
                        <FaCreditCard className="payment-icon" />
                        <span>Credit Card</span>
                      </div>
                      <div
                        className={`payment-method-option ${paymentMethod === 'paypal' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('paypal')}
                      >
                        <FaPaypal className="payment-icon" />
                        <span>PayPal</span>
                      </div>
                      <div
                        className={`payment-method-option ${paymentMethod === 'bankTransfer' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('bankTransfer')}
                      >
                        <FaUniversity className="payment-icon" />
                        <span>Bank Transfer</span>
                      </div>
                      <div
                        className={`payment-method-option ${paymentMethod === 'crypto' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('crypto')}
                      >
                        <FaBitcoin className="payment-icon" />
                        <span>Crypto</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="wallet-submit-button"
                >
                  {loading ? (
                    <>
                      <div className="wallet-loading-spinner"></div>
                      Processing...
                    </>
                  ) : 'Deposit Funds'}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'withdraw' && (
            <div className="wallet-withdraw-section">
              <h2><FaMinus /> Withdraw Funds</h2>
              
              <form onSubmit={handleWithdraw} className="wallet-form">
                <div className="wallet-form-row">
                  <div className="wallet-form-group">
                    <label>Amount</label>
                    <div className="wallet-input-with-select">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        required
                        placeholder="Enter amount"
                        className="wallet-amount-input"
                      />
                      <select
                        value={withdrawCurrency}
                        onChange={(e) => setWithdrawCurrency(e.target.value)}
                        className="wallet-currency-select"
                      >
                        <option value="USD">USD</option>
                        <option value="GEL">GEL</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="wallet-form-row">
                  <div className="wallet-form-group">
                    <label>Withdrawal Method</label>
                    <div className="payment-methods">
                      <div
                        className={`payment-method-option ${withdrawMethod === 'bankTransfer' ? 'active' : ''}`}
                        onClick={() => setWithdrawMethod('bankTransfer')}
                      >
                        <FaUniversity className="payment-icon" />
                        <span>Bank Transfer</span>
                      </div>
                      <div
                        className={`payment-method-option ${withdrawMethod === 'paypal' ? 'active' : ''}`}
                        onClick={() => setWithdrawMethod('paypal')}
                      >
                        <FaPaypal className="payment-icon" />
                        <span>PayPal</span>
                      </div>
                      <div
                        className={`payment-method-option ${withdrawMethod === 'crypto' ? 'active' : ''}`}
                        onClick={() => setWithdrawMethod('crypto')}
                      >
                        <FaBitcoin className="payment-icon" />
                        <span>Crypto</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="wallet-form-row">
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
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="wallet-submit-button"
                >
                  {loading ? (
                    <>
                      <div className="wallet-loading-spinner"></div>
                      Processing...
                    </>
                  ) : 'Withdraw Funds'}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'transactions' && (
            <div className="wallet-transactions-section">
              <h2><FaHistory /> Transaction History</h2>
              
              {loading ? (
                <div className="wallet-loading">
                  <div className="wallet-loading-spinner large"></div>
                </div>
              ) : transactions.length > 0 ? (
                <div className="transaction-list">
                  {transactions.map((transaction, index) => (
                    <div key={index} className="transaction-item">
                      <div className="transaction-icon">
                        {transaction.type === 'deposit' ? (
                          <FaPlus className="deposit-icon" />
                        ) : transaction.type === 'withdraw' ? (
                          <FaMinus className="withdraw-icon" />
                        ) : (
                          <FaExchangeAlt className="exchange-icon" />
                        )}
                      </div>
                      
                      <div className="transaction-details">
                        <div className="transaction-title">
                          <span className="transaction-type">{transaction.type}</span>
                          <span className={`transaction-status ${transaction.status}`}>
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                          </span>
                        </div>
                        <div className="transaction-subtitle">
                          <span className="transaction-date">
                            <FaCalendarAlt />
                            {formatDate(transaction.createdAt)}
                          </span>
                          <span className="transaction-method">
                            {getPaymentIcon(transaction.paymentMethod)}
                            {transaction.paymentMethod || "Standard"}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wallet-empty-state">
                  <FaHistory className="empty-icon" />
                  <p>No transaction history found</p>
                  <button 
                    className="wallet-action-button deposit"
                    onClick={() => setActiveTab('deposit')}
                  >
                    <FaPlus className="action-icon" />
                    <span className="action-text">Make Your First Deposit</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTab !== 'deposit' && activeTab !== 'withdraw' && activeTab !== 'transactions' && (
            <div className="wallet-overview-section">
              <div className="wallet-exchange-card">
                <h3><FaExchangeAlt /> Exchange Rates</h3>
                <div className="exchange-rates">
                  <div className="exchange-rate">
                    <span className="from-currency">1 USD</span>
                    <FaExchangeAlt className="exchange-icon" />
                    <span className="to-currency">3.1 GEL</span>
                  </div>
                  <div className="exchange-rate">
                    <span className="from-currency">1 GEL</span>
                    <FaExchangeAlt className="exchange-icon" />
                    <span className="to-currency">0.32 USD</span>
                  </div>
                </div>
                <p className="exchange-note">* Exchange rates are updated daily</p>
              </div>
              
              <div className="recent-transactions">
                <div className="section-header">
                  <h3>Recent Transactions</h3>
                  <button 
                    className="view-all-button"
                    onClick={() => setActiveTab('transactions')}
                  >
                    View All
                  </button>
                </div>
                
                {loading ? (
                  <div className="wallet-loading">
                    <div className="wallet-loading-spinner"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="transaction-list">
                    {transactions.slice(0, 3).map((transaction, index) => (
                      <div key={index} className="transaction-item">
                        <div className="transaction-icon">
                          {transaction.type === 'deposit' ? (
                            <FaPlus className="deposit-icon" />
                          ) : transaction.type === 'withdraw' ? (
                            <FaMinus className="withdraw-icon" />
                          ) : (
                            <FaExchangeAlt className="exchange-icon" />
                          )}
                        </div>
                        
                        <div className="transaction-details">
                          <div className="transaction-title">
                            <span className="transaction-type">{transaction.type}</span>
                            <span className={`transaction-status ${transaction.status}`}>
                              {getStatusIcon(transaction.status)}
                              {transaction.status}
                            </span>
                          </div>
                          <div className="transaction-subtitle">
                            <span className="transaction-date">
                              <FaCalendarAlt />
                              {formatDate(transaction.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="wallet-empty-state small">
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet; 