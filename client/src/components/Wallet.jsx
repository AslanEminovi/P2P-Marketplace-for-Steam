import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001';

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
  
  // Exchange form state
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('GEL');
  const [exchangeRate, setExchangeRate] = useState(1.8); // Default exchange rate
  
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
      setTransactions(response.data.transactions);
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
      }
      
      // Reset form
      setDepositAmount('');
      
      // Switch to transaction history
      setActiveTab('transactions');
      fetchTransactions();
      
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.error || 'Failed to process deposit');
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
    } finally {
      setLoading(false);
    }
  };
  
  const handleExchange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/wallet/exchange`,
        {
          fromCurrency,
          toCurrency,
          amount: parseFloat(exchangeAmount),
          rate: parseFloat(exchangeRate)
        },
        { withCredentials: true }
      );
      
      // Update balance on success
      if (response.data.success && onBalanceUpdate) {
        onBalanceUpdate();
      }
      
      // Reset form
      setExchangeAmount('');
      
      // Switch to transaction history
      setActiveTab('transactions');
      fetchTransactions();
      
    } catch (err) {
      console.error('Exchange error:', err);
      setError(err.response?.data?.error || 'Failed to process currency exchange');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle currency flip in exchange form
  const handleFlipCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setExchangeRate(1 / exchangeRate);
  };
  
  // Format transaction timestamp
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div style={{
      backgroundColor: '#242424',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{ color: '#f1f1f1', marginBottom: '20px' }}>Wallet</h2>
      
      {/* Wallet Balance Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#333',
        borderRadius: '8px'
      }}>
        <div>
          <h3 style={{ color: '#4ade80', marginBottom: '5px' }}>USD Balance</h3>
          <span style={{ fontSize: '24px', color: '#f1f1f1' }}>${user?.walletBalance?.toFixed(2) || '0.00'}</span>
        </div>
        <div>
          <h3 style={{ color: '#4ade80', marginBottom: '5px' }}>GEL Balance</h3>
          <span style={{ fontSize: '24px', color: '#f1f1f1' }}>{user?.walletBalanceGEL?.toFixed(2) || '0.00'} ₾</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #444',
        marginBottom: '20px'
      }}>
        {['balance', 'deposit', 'withdraw', 'exchange', 'transactions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? '#4ade80' : 'transparent',
              color: activeTab === tab ? '#242424' : '#f1f1f1',
              border: 'none',
              padding: '10px 15px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderRadius: activeTab === tab ? '4px 4px 0 0' : '0'
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#570303',
          color: '#fca5a5',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
      {/* Tab Content */}
      <div style={{ minHeight: '300px' }}>
        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <div>
            <p style={{ color: '#f1f1f1', marginBottom: '15px' }}>
              Your wallet allows you to list and purchase items on our marketplace.
              You can deposit funds, withdraw to your bank account, or exchange between currencies.
            </p>
            
            <div style={{
              backgroundColor: '#333',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <h3 style={{ color: '#4ade80', marginBottom: '10px' }}>Currency Exchange Rate</h3>
              <p style={{ color: '#f1f1f1' }}>
                1 USD = {exchangeRate.toFixed(4)} GEL<br />
                1 GEL = {(1 / exchangeRate).toFixed(4)} USD
              </p>
              <p style={{ color: '#aaa', fontSize: '14px', marginTop: '10px' }}>
                * Exchange rates are updated daily
              </p>
            </div>
          </div>
        )}
        
        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <form onSubmit={handleDeposit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Amount
              </label>
              <div style={{ display: 'flex' }}>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '4px 0 0 4px'
                  }}
                  placeholder="Enter amount"
                />
                <select
                  value={depositCurrency}
                  onChange={(e) => setDepositCurrency(e.target.value)}
                  style={{
                    backgroundColor: '#555',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '0 4px 4px 0',
                    width: '80px'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="GEL">GEL</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  padding: '10px',
                  color: '#f1f1f1',
                  borderRadius: '4px'
                }}
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
              style={{
                backgroundColor: '#4ade80',
                color: '#242424',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              {loading ? 'Processing...' : 'Deposit Funds'}
            </button>
          </form>
        )}
        
        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <form onSubmit={handleWithdraw}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Amount
              </label>
              <div style={{ display: 'flex' }}>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '4px 0 0 4px'
                  }}
                  placeholder="Enter amount"
                />
                <select
                  value={withdrawCurrency}
                  onChange={(e) => setWithdrawCurrency(e.target.value)}
                  style={{
                    backgroundColor: '#555',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '0 4px 4px 0',
                    width: '80px'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="GEL">GEL</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Withdrawal Method
              </label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  padding: '10px',
                  color: '#f1f1f1',
                  borderRadius: '4px'
                }}
              >
                <option value="bankTransfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Account Details
              </label>
              <textarea
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  padding: '10px',
                  color: '#f1f1f1',
                  borderRadius: '4px',
                  minHeight: '80px'
                }}
                placeholder="Enter your account details for withdrawal"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#4ade80',
                color: '#242424',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              {loading ? 'Processing...' : 'Withdraw Funds'}
            </button>
          </form>
        )}
        
        {/* Exchange Tab */}
        {activeTab === 'exchange' && (
          <form onSubmit={handleExchange}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Amount
              </label>
              <div style={{ display: 'flex' }}>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '4px 0 0 4px'
                  }}
                  placeholder="Enter amount"
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  style={{
                    backgroundColor: '#555',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '0 4px 4px 0',
                    width: '80px'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="GEL">GEL</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
              <button
                type="button"
                onClick={handleFlipCurrencies}
                style={{
                  backgroundColor: '#555',
                  color: '#f1f1f1',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px'
                }}
              >
                ⇅
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                To Currency
              </label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  padding: '10px',
                  color: '#f1f1f1',
                  borderRadius: '4px'
                }}
              >
                <option value="USD">USD</option>
                <option value="GEL">GEL</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                Exchange Rate
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    padding: '10px',
                    color: '#f1f1f1',
                    borderRadius: '4px'
                  }}
                />
                <span style={{ color: '#f1f1f1', marginLeft: '10px' }}>
                  1 {fromCurrency} = {exchangeRate} {toCurrency}
                </span>
              </div>
            </div>
            
            {/* Preview Conversion */}
            {exchangeAmount && (
              <div style={{
                backgroundColor: '#333',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <p style={{ color: '#4ade80', textAlign: 'center' }}>
                  {parseFloat(exchangeAmount).toFixed(2)} {fromCurrency} = 
                  {' '}
                  {(fromCurrency === 'USD' && toCurrency === 'GEL'
                    ? parseFloat(exchangeAmount) * parseFloat(exchangeRate)
                    : parseFloat(exchangeAmount) / parseFloat(exchangeRate)
                  ).toFixed(2)} {toCurrency}
                </p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#4ade80',
                color: '#242424',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              {loading ? 'Processing...' : 'Exchange Currency'}
            </button>
          </form>
        )}
        
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  borderTopColor: '#4ade80',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : transactions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ color: '#f1f1f1', textAlign: 'left', padding: '10px', borderBottom: '1px solid #444' }}>Date</th>
                      <th style={{ color: '#f1f1f1', textAlign: 'left', padding: '10px', borderBottom: '1px solid #444' }}>Type</th>
                      <th style={{ color: '#f1f1f1', textAlign: 'right', padding: '10px', borderBottom: '1px solid #444' }}>Amount</th>
                      <th style={{ color: '#f1f1f1', textAlign: 'left', padding: '10px', borderBottom: '1px solid #444' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ color: '#f1f1f1', padding: '10px' }}>
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td style={{ color: '#f1f1f1', padding: '10px', textTransform: 'capitalize' }}>
                          {transaction.type}
                        </td>
                        <td style={{
                          color: transaction.amount > 0 ? '#4ade80' : '#f87171',
                          padding: '10px',
                          textAlign: 'right'
                        }}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} {transaction.currency}
                        </td>
                        <td style={{
                          color: transaction.status === 'completed' ? '#4ade80' : '#f1f1f1',
                          padding: '10px'
                        }}>
                          {transaction.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#f1f1f1', textAlign: 'center', padding: '20px' }}>
                No transaction history found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;