import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchTrades } from '../redux/slices/tradesSlice';
import { formatDate } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';
import '../styles/TradesList.css';

const TradesList = () => {
  const dispatch = useDispatch();
  const { trades, loading, error } = useSelector((state) => state.trades);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchTrades());
  }, [dispatch]);

  const filteredTrades = filter === 'all' 
    ? trades 
    : trades.filter(trade => trade.status === filter);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="error-container">Error loading trades: {error}</div>;
  }

  return (
    <div className="trades-container">
      <h1>My Trades</h1>
      <div className="filter-container">
        <label htmlFor="filter">Filter by status:</label>
        <select id="filter" value={filter} onChange={handleFilterChange}>
          <option value="all">All Trades</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="empty-trades">No trades found.</div>
      ) : (
        <div className="trades-list">
          {filteredTrades.map((trade) => (
            <Link to={`/trades/${trade._id}`} key={trade._id} className="trade-card">
              <div className="trade-header">
                <span className={`trade-status status-${trade.status}`}>
                  {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                </span>
                <span className="trade-date">{formatDate(trade.createdAt)}</span>
              </div>
              <div className="trade-parties">
                <div className="trade-party">
                  <img 
                    src={trade.sender.avatar || '/default-avatar.png'} 
                    alt={trade.sender.username} 
                    className="trade-avatar" 
                  />
                  <span>{trade.sender.username}</span>
                </div>
                <div className="trade-direction">↔️</div>
                <div className="trade-party">
                  <img 
                    src={trade.receiver.avatar || '/default-avatar.png'} 
                    alt={trade.receiver.username} 
                    className="trade-avatar" 
                  />
                  <span>{trade.receiver.username}</span>
                </div>
              </div>
              <div className="trade-items-preview">
                <div className="trade-items-count">
                  <span>{trade.senderItems.length} items</span>
                  <span>for</span>
                  <span>{trade.receiverItems.length} items</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TradesList; 