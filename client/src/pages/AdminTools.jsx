import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, Row, Col, Card, Button, Form, Alert, Tabs, Tab, 
  Table, Badge, Spinner, InputGroup, FormControl, Pagination,
  Modal
} from 'react-bootstrap';
import { API_URL } from '../config/constants';
import { Link } from 'react-router-dom';
import '../styles/AdminTools.css';
import { FaUsers, FaUserPlus, FaBoxOpen, FaExchangeAlt, FaTag, FaCog, FaInfo, 
  FaExclamationTriangle, FaMoneyBillWave, FaUserCog, FaSync, FaArrowLeft } from 'react-icons/fa';

function AdminTools() {
  // Shared states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Cleanup states
  const [userId, setUserId] = useState('');
  const [cleanupResults, setCleanupResults] = useState(null);
  
  // Dashboard states
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Users states
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  // User detail states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  
  // Items states
  const [items, setItems] = useState([]);
  const [itemsPagination, setItemsPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilter, setItemFilter] = useState({ isListed: null });

  // Trades management states
  const [trades, setTrades] = useState([]);
  const [tradesPagination, setTradesPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradeSearch, setTradeSearch] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [tradeDetailModalOpen, setTradeDetailModalOpen] = useState(false);
  const [tradeActionLoading, setTradeActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundTarget, setRefundTarget] = useState('buyer');
  const [cancelReason, setCancelReason] = useState('');

  // Load initial data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'items') {
      fetchItems();
    } else if (activeTab === 'trades') {
      fetchTrades();
    }
  }, [activeTab]);

  // Stats functions
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get(`${API_URL}/admin/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching system statistics: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Users functions 
  const fetchUsers = async (page = 1) => {
    try {
      setUsersLoading(true);
      const response = await axios.get(`${API_URL}/admin/users`, { 
        params: { page, search: userSearch },
        withCredentials: true 
      });
      setUsers(response.data.users);
      setUsersPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching users: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const viewUserDetails = async (userId) => {
    try {
      setUserDetailLoading(true);
      const response = await axios.get(`${API_URL}/admin/users/${userId}`, { withCredentials: true });
      setSelectedUser(response.data.user);
      setUserItems(response.data.items);
      setUserTrades(response.data.trades);
      setUserDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching user details: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setUserDetailLoading(false);
    }
  };

  const updateUserStatus = async (userId, data) => {
    try {
      setUserDetailLoading(true);
      const response = await axios.put(`${API_URL}/admin/users/${userId}`, data, {
        withCredentials: true
      });
      setSelectedUser(response.data);
      
      // Update user in the list
      setUsers(users.map(user => user._id === userId ? response.data : user));
      
      setMessage({
        type: 'success',
        text: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({
        type: 'danger',
        text: `Error updating user: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setUserDetailLoading(false);
    }
  };

  // Items functions
  const fetchItems = async (page = 1) => {
    try {
      setItemsLoading(true);
      const params = { page, search: itemSearch };
      
      if (itemFilter.isListed !== null) {
        params.isListed = itemFilter.isListed;
      }
      
      const response = await axios.get(`${API_URL}/admin/items`, { 
        params,
        withCredentials: true 
      });
      setItems(response.data.items);
      setItemsPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching items:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching items: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setItemsLoading(false);
    }
  };

  const handleItemSearch = (e) => {
    e.preventDefault();
    fetchItems(1);
  };

  const handleItemFilter = (filter) => {
    setItemFilter(filter);
    // Reset to first page with new filter
    fetchItems(1);
  };

  // Trades functions
  const fetchTrades = async (page = 1) => {
    try {
      setTradesLoading(true);
      
      const response = await axios.get(`${API_URL}/trades/history`, {
        params: {
          page,
          limit: 10,
          search: tradeSearch
        }
      });
      
      if (response.data && response.data.trades) {
        setTrades(response.data.trades);
        setTradesPagination({
          page: response.data.currentPage || 1,
          pages: response.data.totalPages || 1,
          total: response.data.totalTrades || 0
        });
      } else {
        setMessage({
          type: 'warning',
          text: 'Could not fetch trade data. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
      setMessage({
        type: 'danger',
        text: `Failed to load trades: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setTradesLoading(false);
    }
  };

  const handleTradeSearch = (e) => {
    e.preventDefault();
    fetchTrades(1);
  };

  const viewTradeDetails = async (tradeId) => {
    try {
      setTradeActionLoading(true);
      const response = await axios.get(`${API_URL}/admin/trades/${tradeId}`, { withCredentials: true });
      setSelectedTrade(response.data);
      setTradeDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching trade details:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching trade details: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setTradeActionLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId) => {
    if (!cancelReason.trim()) {
      setMessage({
        type: 'warning',
        text: 'Please provide a reason for cancellation'
      });
      return;
    }

    try {
      setTradeActionLoading(true);
      const response = await axios.post(`${API_URL}/admin/trades/${tradeId}/cancel`, 
        { reason: cancelReason }, 
        { withCredentials: true }
      );
      
      setMessage({
        type: 'success',
        text: 'Trade cancelled successfully'
      });
      
      // Update trade in the list
      setTrades(trades.map(trade => 
        trade._id === tradeId ? {...trade, status: 'cancelled'} : trade
      ));
      
      // Update selected trade if in modal
      if (selectedTrade && selectedTrade._id === tradeId) {
        setSelectedTrade({...selectedTrade, status: 'cancelled'});
      }
      
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling trade:', error);
      setMessage({
        type: 'danger',
        text: `Error cancelling trade: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setTradeActionLoading(false);
    }
  };

  const handleTransferFunds = async (tradeId) => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({
        type: 'warning',
        text: 'Please enter a valid amount greater than 0'
      });
      return;
    }

    try {
      setTradeActionLoading(true);
      const response = await axios.post(`${API_URL}/admin/trades/${tradeId}/transfer-funds`, 
        { 
          amount: Math.round(amount * 100), // Convert to cents
          target: refundTarget 
        }, 
        { withCredentials: true }
      );
      
      setMessage({
        type: 'success',
        text: `Successfully transferred ${amount} GEL to the ${refundTarget}`
      });
      
      // Reset form
      setRefundAmount('');
      
      // Refresh trade details
      if (selectedTrade && selectedTrade._id === tradeId) {
        const updatedTradeResponse = await axios.get(`${API_URL}/admin/trades/${tradeId}`, { withCredentials: true });
        setSelectedTrade(updatedTradeResponse.data);
      }
    } catch (error) {
      console.error('Error transferring funds:', error);
      setMessage({
        type: 'danger',
        text: `Error transferring funds: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setTradeActionLoading(false);
    }
  };

  // Cleanup functions
  const cleanupAllListings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.post(`${API_URL}/admin/cleanup-listings`, {}, { withCredentials: true });
      
      setCleanupResults(response.data);
      setMessage({
        type: 'success',
        text: `Cleanup completed successfully! Updated ${response.data.itemsUpdated} listings and ${response.data.tradesUpdated} trades.`
      });
    } catch (error) {
      console.error('Error cleaning up listings:', error);
      setMessage({
        type: 'danger',
        text: `Error cleaning up listings: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupUserListings = async (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      setMessage({
        type: 'warning',
        text: 'Please enter a valid user ID'
      });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.post(`${API_URL}/admin/cleanup-listings/${userId}`, {}, { withCredentials: true });
      
      setCleanupResults(response.data);
      setMessage({
        type: 'success',
        text: `User cleanup completed successfully! Updated ${response.data.itemsUpdated} listings and ${response.data.tradesUpdated} trades.`
      });
    } catch (error) {
      console.error('Error cleaning up user listings:', error);
      setMessage({
        type: 'danger',
        text: `Error cleaning up user listings: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination component
  const renderPagination = (pagination, onPageChange) => {
    if (!pagination || pagination.pages <= 1) return null;
    
    const { page, pages } = pagination;
    let items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev" 
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      />
    );
    
    // First page
    if (page > 2) {
      items.push(
        <Pagination.Item key={1} onClick={() => onPageChange(1)}>1</Pagination.Item>
      );
    }
    
    // Ellipsis if needed
    if (page > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
    }
    
    // Pages around current
    for (let number = Math.max(1, page - 1); number <= Math.min(pages, page + 1); number++) {
      items.push(
        <Pagination.Item 
          key={number} 
          active={number === page}
          onClick={() => onPageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    
    // Ellipsis if needed
    if (page < pages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
    }
    
    // Last page
    if (page < pages - 1) {
      items.push(
        <Pagination.Item key={pages} onClick={() => onPageChange(pages)}>
          {pages}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next 
        key="next" 
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
      />
    );
    
    return <Pagination>{items}</Pagination>;
  };

  // Render the trades tab
  const renderTradesTab = () => {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="mb-1 text-white">Trade Management</h4>
            <p className="text-white-50 mb-0">View and manage all trades in the system</p>
          </div>
          
          <Form className="d-flex">
            <Form.Control
              type="search"
              placeholder="Search by trade ID, item, or user"
              value={tradeSearch}
              onChange={handleTradeSearch}
              className="me-2"
              style={{ maxWidth: '300px' }}
            />
            <Button 
              variant="primary" 
              onClick={() => fetchTrades()}
              disabled={tradesLoading}
            >
              {tradesLoading ? <Spinner animation="border" size="sm" /> : 'Search'}
            </Button>
          </Form>
        </div>
        
        {tradesLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-white-50">Loading trades data...</p>
          </div>
        ) : trades.length > 0 ? (
          <>
            <div className="table-responsive">
              <Table bordered hover variant="dark" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item</th>
                    <th>Buyer</th>
                    <th>Seller</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade._id}>
                      <td className="text-nowrap">
                        <small className="text-white-50">{trade._id.substr(-8)}</small>
                      </td>
                      <td>
                        {trade.item ? (
                          <div className="d-flex align-items-center">
                            {trade.item.image && (
                              <img 
                                src={trade.item.image} 
                                alt={trade.item.name} 
                                className="me-2"
                                width="32"
                                height="32"
                                style={{ objectFit: 'contain' }}
                              />
                            )}
                            <div>
                              <div className="fw-semibold">{trade.item.name || 'Unknown Item'}</div>
                              <small className="text-white-50">{trade.item.exterior || ''}</small>
                            </div>
                          </div>
                        ) : (
                          'Unknown Item'
                        )}
                      </td>
                      <td>
                        {trade.buyer ? (
                          <div>
                            <div>{trade.buyer.displayName}</div>
                            <small className="text-white-50">{trade.buyer.steamId}</small>
                          </div>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td>
                        {trade.seller ? (
                          <div>
                            <div>{trade.seller.displayName}</div>
                            <small className="text-white-50">{trade.seller.steamId}</small>
                          </div>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td>
                        <span className="fw-semibold">
                          {parseFloat(trade.price).toFixed(2)} GEL
                        </span>
                      </td>
                      <td>
                        <Badge 
                          bg={
                            trade.status === 'completed' ? 'success' : 
                            trade.status === 'cancelled' || trade.status === 'failed' ? 'danger' :
                            trade.status === 'pending' ? 'warning' : 'primary'
                          }
                        >
                          {trade.status}
                        </Badge>
                      </td>
                      <td className="text-nowrap">
                        {new Date(trade.createdAt).toLocaleString()}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => viewTradeDetails(trade._id)}
                            title="View Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </Button>
                          
                          {trade.status === 'pending' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleTransferFunds(trade._id)}
                                title="Complete Trade"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </Button>
                              
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelTrade(trade._id)}
                                title="Cancel Trade"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-white-50">
                Showing {trades.length} of {tradesPagination.total} trades
              </div>
              {renderPagination(tradesPagination, fetchTrades)}
            </div>
          </>
        ) : (
          <div className="alert alert-secondary">
            No trades found. Try adjusting your search criteria.
          </div>
        )}
        
        {/* Trade Detail Modal */}
        <Modal
          show={tradeDetailModalOpen}
          onHide={() => setTradeDetailModalOpen(false)}
          size="lg"
          centered
          backdrop="static"
          className="dark-modal"
        >
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title>Trade Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            {selectedTrade ? (
              <div>
                <Row className="mb-4">
                  <Col md={6}>
                    <h5 className="text-white-50 mb-2">General Information</h5>
                    <Table bordered variant="dark" size="sm">
                      <tbody>
                        <tr>
                          <td className="text-white-50">Trade ID</td>
                          <td>{selectedTrade._id}</td>
                        </tr>
                        <tr>
                          <td className="text-white-50">Status</td>
                          <td>
                            <Badge 
                              bg={
                                selectedTrade.status === 'completed' ? 'success' : 
                                selectedTrade.status === 'cancelled' ? 'danger' :
                                selectedTrade.status === 'pending' ? 'warning' : 'primary'
                              }
                            >
                              {selectedTrade.status}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-white-50">Created At</td>
                          <td>{new Date(selectedTrade.createdAt).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="text-white-50">Updated At</td>
                          <td>{new Date(selectedTrade.updatedAt).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="text-white-50">Amount</td>
                          <td>{parseFloat(selectedTrade.price).toFixed(2)} GEL</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h5 className="text-white-50 mb-2">Item Information</h5>
                    {selectedTrade.item ? (
                      <div className="card bg-dark border-secondary">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            {selectedTrade.item.image && (
                              <img 
                                src={selectedTrade.item.image} 
                                alt={selectedTrade.item.name}
                                className="me-3"
                                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                              />
                            )}
                            <div>
                              <h5 className="mb-0">{selectedTrade.item.name}</h5>
                              <p className="mb-0 text-white-50">{selectedTrade.item.exterior}</p>
                            </div>
                          </div>
                          <div className="d-flex mb-2">
                            <div className="text-white-50 me-2">Float:</div>
                            <div>{selectedTrade.item.float || 'N/A'}</div>
                          </div>
                          <div className="d-flex mb-2">
                            <div className="text-white-50 me-2">Type:</div>
                            <div>{selectedTrade.item.type || 'N/A'}</div>
                          </div>
                          <div className="d-flex">
                            <div className="text-white-50 me-2">Rarity:</div>
                            <div>{selectedTrade.item.rarity || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning">Item information not available</div>
                    )}
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col md={6}>
                    <h5 className="text-white-50 mb-2">Buyer Information</h5>
                    {selectedTrade.buyer ? (
                      <div className="card bg-dark border-secondary">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            {selectedTrade.buyer.avatarUrl && (
                              <img 
                                src={selectedTrade.buyer.avatarUrl} 
                                alt={selectedTrade.buyer.displayName}
                                className="me-3 rounded-circle"
                                width="48"
                                height="48"
                              />
                            )}
                            <div>
                              <h5 className="mb-0">{selectedTrade.buyer.displayName}</h5>
                              <p className="mb-0 text-white-50">{selectedTrade.buyer.steamId}</p>
                            </div>
                          </div>
                          <div className="d-flex mb-2">
                            <div className="text-white-50 me-2">Email:</div>
                            <div>{selectedTrade.buyer.email || 'N/A'}</div>
                          </div>
                          <div className="d-flex">
                            <div className="text-white-50 me-2">User ID:</div>
                            <div>{selectedTrade.buyer._id}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning">Buyer information not available</div>
                    )}
                  </Col>
                  <Col md={6}>
                    <h5 className="text-white-50 mb-2">Seller Information</h5>
                    {selectedTrade.seller ? (
                      <div className="card bg-dark border-secondary">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            {selectedTrade.seller.avatarUrl && (
                              <img 
                                src={selectedTrade.seller.avatarUrl} 
                                alt={selectedTrade.seller.displayName}
                                className="me-3 rounded-circle"
                                width="48"
                                height="48"
                              />
                            )}
                            <div>
                              <h5 className="mb-0">{selectedTrade.seller.displayName}</h5>
                              <p className="mb-0 text-white-50">{selectedTrade.seller.steamId}</p>
                            </div>
                          </div>
                          <div className="d-flex mb-2">
                            <div className="text-white-50 me-2">Email:</div>
                            <div>{selectedTrade.seller.email || 'N/A'}</div>
                          </div>
                          <div className="d-flex">
                            <div className="text-white-50 me-2">User ID:</div>
                            <div>{selectedTrade.seller._id}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-warning">Seller information not available</div>
                    )}
                  </Col>
                </Row>
                
                {selectedTrade.status === 'pending' && (
                  <div className="card bg-dark border-warning mt-4">
                    <div className="card-header bg-dark text-white border-warning">
                      Admin Actions
                    </div>
                    <div className="card-body">
                      <Row>
                        <Col md={6} className="mb-3 mb-md-0">
                          <h6 className="text-white-50 mb-3">Complete Trade</h6>
                          <p className="text-white-50 mb-3">
                            Manually complete this trade and transfer funds to the seller.
                          </p>
                          <Button 
                            variant="success" 
                            className="w-100"
                            onClick={() => {
                              handleTransferFunds(selectedTrade._id);
                              setTradeDetailModalOpen(false);
                            }}
                            disabled={tradeActionLoading}
                          >
                            {tradeActionLoading ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Complete Trade
                              </>
                            )}
                          </Button>
                        </Col>
                        <Col md={6}>
                          <h6 className="text-white-50 mb-3">Cancel Trade</h6>
                          <div className="mb-3">
                            <Form.Label>Reason for cancellation</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              placeholder="Enter a reason for cancellation"
                            />
                          </div>
                          <Form.Group className="mb-3">
                            <Form.Label>Refund to</Form.Label>
                            <Form.Select 
                              value={refundTarget}
                              onChange={(e) => setRefundTarget(e.target.value)}
                            >
                              <option value="buyer">Buyer</option>
                              <option value="both">Split between both parties</option>
                            </Form.Select>
                          </Form.Group>
                          <Button 
                            variant="danger" 
                            className="w-100"
                            onClick={() => {
                              handleCancelTrade(selectedTrade._id);
                              setTradeDetailModalOpen(false);
                            }}
                            disabled={tradeActionLoading}
                          >
                            {tradeActionLoading ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Cancel Trade
                              </>
                            )}
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5">
                <Spinner animation="border" variant="light" />
                <p className="mt-3">Loading trade details...</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-dark text-white border-secondary">
            <Button variant="secondary" onClick={() => setTradeDetailModalOpen(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  };

  // Apply page-level styles to fix the admin layout issues
  useEffect(() => {
    // Fix authentication issue for Steam
    localStorage.setItem('steamAuthRetry', 'true');
    
    // Hide the footer when on the admin page
    const footer = document.querySelector('.site-footer');
    if (footer) {
      footer.style.display = 'none';
    }
    
    // Apply styles to root div to ensure admin content can expand
    const rootDiv = document.getElementById('root');
    if (rootDiv) {
      rootDiv.style.maxWidth = '100%';
      rootDiv.style.width = '100%';
      rootDiv.style.paddingBottom = '0';
      rootDiv.style.marginBottom = '0';
      rootDiv.style.overflow = 'auto';
      rootDiv.classList.add('admin-page-active');
    }
    
    // Fix the body overflow
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    return () => {
      // Clean up styles when component unmounts
      localStorage.removeItem('steamAuthRetry');
      
      if (footer) {
        footer.style.display = '';
      }
      
      if (rootDiv) {
        rootDiv.style.maxWidth = '';
        rootDiv.style.width = '';
        rootDiv.style.paddingBottom = '';
        rootDiv.style.marginBottom = '';
        rootDiv.style.overflow = '';
        rootDiv.classList.remove('admin-page-active');
      }
      
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Manage marketplace users, items, trades and maintenance</p>
          </div>
          <div className="d-flex gap-3">
            <Button 
              variant="outline-light" 
              className="admin-action-btn"
              onClick={() => {
                fetchStats();
                fetchUsers();
                fetchItems();
                fetchTrades();
              }}
            >
              <FaSync className="btn-icon" />
              <span className="btn-text">Refresh Data</span>
            </Button>
            <Button 
              variant="success" 
              as={Link} 
              to="/"
              className="admin-action-btn"
            >
              <FaArrowLeft className="btn-icon" />
              <span className="btn-text">Return to Site</span>
            </Button>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
            {message.text}
          </Alert>
        </div>
      )}

      <div className="admin-tabs-container mb-4">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="admin-tabs mb-3"
        >
          <Tab 
            eventKey="dashboard" 
            title={
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span className="tab-text">Dashboard</span>
              </div>
            }
          />
          <Tab 
            eventKey="users" 
            title={
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="tab-text">Users</span>
              </div>
            }
          />
          <Tab 
            eventKey="items" 
            title={
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span className="tab-text">Items</span>
              </div>
            }
          />
          <Tab 
            eventKey="trades" 
            title={
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
                  <polyline points="17 1 21 5 17 9"></polyline>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                  <polyline points="7 23 3 19 7 15"></polyline>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
                <span className="tab-text">Trades</span>
              </div>
            }
          />
          <Tab 
            eventKey="cleanup" 
            title={
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                  <line x1="12" y1="16" x2="12" y2="16"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
                <span className="tab-text">Cleanup</span>
              </div>
            }
          />
        </Tabs>
      </div>

      <div className="admin-content">
        {activeTab === "dashboard" && (
          <DashboardTab stats={stats} loading={statsLoading} />
        )}
        
        {activeTab === "users" && (
          <UsersTab 
            users={users}
            loading={usersLoading}
            pagination={usersPagination}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            handleUserSearch={handleUserSearch}
            fetchUsers={fetchUsers}
            viewUserDetails={viewUserDetails}
            renderPagination={renderPagination}
          />
        )}
        
        {activeTab === "items" && (
          <ItemsTab 
            items={items}
            loading={itemsLoading}
            pagination={itemsPagination}
            itemSearch={itemSearch}
            setItemSearch={setItemSearch}
            itemFilter={itemFilter}
            handleItemFilter={handleItemFilter}
            handleItemSearch={handleItemSearch}
            fetchItems={fetchItems}
            renderPagination={renderPagination}
          />
        )}
        
        {activeTab === "trades" && renderTradesTab()}
        
        {activeTab === "cleanup" && (
          <CleanupTab 
            userId={userId}
            setUserId={setUserId}
            loading={loading}
            results={cleanupResults}
            cleanupAllListings={cleanupAllListings}
            cleanupUserListings={cleanupUserListings}
          />
        )}
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, loading }) {
  const [localStats, setLocalStats] = useState({
    totalUsers: 0,
    marketItems: 0,
    activeTrades: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    api: 'online',
    steamApi: 'warning',
    database: 'online',
    cache: 'online',
    jobQueue: 'online',
  });

  useEffect(() => {
    // Simulate fetching dashboard data
    setTimeout(() => {
      setLocalStats({
        totalUsers: 235,
        marketItems: 1289,
        activeTrades: 47,
        totalRevenue: 8976.50,
      });
      
      setRecentActivity([
        { 
          id: 1, 
          type: 'user',
          title: 'New User Registration', 
          description: 'User m4sturbaiter joined the platform',
          time: new Date(Date.now() - 15 * 60000), 
        },
        { 
          id: 2, 
          type: 'trade',
          title: 'Trade Completed', 
          description: 'Trade #1234 completed successfully',
          details: 'AWP | Asiimov (Field-Tested) for 120.50 GEL',
          time: new Date(Date.now() - 45 * 60000), 
        },
        { 
          id: 3, 
          type: 'item',
          title: 'New Item Listed', 
          description: 'AK-47 | Redline listed on marketplace',
          details: 'Listed for 75.25 GEL by user knife_collector',
          time: new Date(Date.now() - 120 * 60000), 
        },
        { 
          id: 4, 
          type: 'admin',
          title: 'System Update', 
          description: 'Platform updated to version 1.2.5',
          time: new Date(Date.now() - 360 * 60000), 
        },
        { 
          id: 5, 
          type: 'alert',
          title: 'Suspicious Activity Detected', 
          description: 'Multiple failed login attempts for user VACbanned88',
          time: new Date(Date.now() - 720 * 60000), 
        }
      ]);
      
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Helper function for activity icon and color
  const getActivityIcon = (type) => {
    switch (type) {
      case 'user':
        return { icon: <FaUserPlus />, color: 'primary' };
      case 'trade':
        return { icon: <FaExchangeAlt />, color: 'success' };
      case 'item':
        return { icon: <FaTag />, color: 'info' };
      case 'admin':
        return { icon: <FaCog />, color: 'secondary' };
      case 'alert':
        return { icon: <FaExclamationTriangle />, color: 'warning' };
      default:
        return { icon: <FaInfo />, color: 'secondary' };
    }
  };
  
  // Format activity time
  const formatActivityTime = (time) => {
    const now = new Date();
    const diff = Math.floor((now - time) / 60000); // difference in minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome to the CS2 Marketplace admin dashboard</p>
      </div>
      
      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-6 col-lg-3 mb-3">
          <div className="stat-card bg-gradient-primary">
            <div className="stat-card-body d-flex align-items-center">
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h4 className="stat-value">{stats?.userCount || localStats.totalUsers}</h4>
                <p className="stat-label">Total Users</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-3 mb-3">
          <div className="stat-card bg-gradient-success">
            <div className="stat-card-body d-flex align-items-center">
              <div className="stat-icon">
                <FaBoxOpen />
              </div>
              <div className="stat-content">
                <h4 className="stat-value">{stats?.listedItemsCount || localStats.marketItems}</h4>
                <p className="stat-label">Market Items</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-3 mb-3">
          <div className="stat-card bg-gradient-info">
            <div className="stat-card-body d-flex align-items-center">
              <div className="stat-icon">
                <FaExchangeAlt />
              </div>
              <div className="stat-content">
                <h4 className="stat-value">{stats?.activeTrades || localStats.activeTrades}</h4>
                <p className="stat-label">Active Trades</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-3 mb-3">
          <div className="stat-card bg-gradient-warning">
            <div className="stat-card-body d-flex align-items-center">
              <div className="stat-icon">
                <FaMoneyBillWave />
              </div>
              <div className="stat-content">
                <h4 className="stat-value">
                  {stats?.totalRevenue 
                    ? `${parseFloat(stats.totalRevenue).toFixed(2)} GEL` 
                    : `${localStats.totalRevenue.toFixed(2)} GEL`}
                </h4>
                <p className="stat-label">Total Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity and System Status Section */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="m-0">Recent Activity</h5>
              <Button variant="outline-light" size="sm">View All</Button>
            </div>
            <div className="card-body p-0">
              {recentActivity.length > 0 ? (
                <div className="activity-list">
                  {recentActivity.map(activity => {
                    const { icon, color } = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="activity-item">
                        <div className={`activity-icon ${color}`}>
                          {icon}
                        </div>
                        <div className="activity-content">
                          <h6 className="activity-title">{activity.title}</h6>
                          <p className="activity-description">{activity.description}</p>
                          {activity.details && (
                            <p className="activity-details">{activity.details}</p>
                          )}
                          <small className="activity-time">{formatActivityTime(activity.time)}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-activity">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="m-0">System Status</h5>
            </div>
            <div className="card-body">
              <div className="status-list">
                <div className="status-item">
                  <span className="status-label">API Status</span>
                  <span className={`status-badge ${systemStatus.api}`}>
                    {systemStatus.api === 'online' ? 'Operational' : 
                     systemStatus.api === 'warning' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Steam API</span>
                  <span className={`status-badge ${systemStatus.steamApi}`}>
                    {systemStatus.steamApi === 'online' ? 'Operational' : 
                     systemStatus.steamApi === 'warning' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Database</span>
                  <span className={`status-badge ${systemStatus.database}`}>
                    {systemStatus.database === 'online' ? 'Operational' : 
                     systemStatus.database === 'warning' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Cache</span>
                  <span className={`status-badge ${systemStatus.cache}`}>
                    {systemStatus.cache === 'online' ? 'Operational' : 
                     systemStatus.cache === 'warning' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Job Queue</span>
                  <span className={`status-badge ${systemStatus.jobQueue}`}>
                    {systemStatus.jobQueue === 'online' ? 'Operational' : 
                     systemStatus.jobQueue === 'warning' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Access Section */}
      <div className="row">
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="m-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
                  <Button variant="primary" className="quick-action-btn w-100">
                    <FaUserCog /> Manage Users
                  </Button>
                </div>
                <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
                  <Button variant="success" className="quick-action-btn w-100">
                    <FaBoxOpen /> View Items
                  </Button>
                </div>
                <div className="col-md-3 col-sm-6 mb-3 mb-sm-0">
                  <Button variant="info" className="quick-action-btn w-100">
                    <FaExchangeAlt /> Manage Trades
                  </Button>
                </div>
                <div className="col-md-3 col-sm-6">
                  <Button variant="warning" className="quick-action-btn w-100">
                    <FaCog /> System Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cleanup Tab Component
function CleanupTab({ 
  userId, setUserId, loading, results, 
  cleanupAllListings, cleanupUserListings 
}) {
  return (
    <div className="cleanup-tab">
      <div className="mb-4">
        <h4 className="text-white mb-1">System Maintenance</h4>
        <p className="text-white-50">Clean up database records and fix inconsistencies</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card bg-dark h-100">
            <div className="card-header bg-dark text-white border-bottom border-secondary">
              <h5 className="mb-0">System-wide Cleanup</h5>
            </div>
            <div className="card-body">
              <p className="text-white-50 mb-4">
                This will clean up all outdated or invalid listings in the marketplace database. Use with caution as this is a system-wide operation.
              </p>
              
              <div className="d-grid">
                <Button 
                  variant="danger" 
                  onClick={cleanupAllListings}
                  disabled={loading}
                  className="d-flex align-items-center justify-content-center"
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  )}
                  Clean Up All Listings
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6">
          <div className="card bg-dark h-100">
            <div className="card-header bg-dark text-white border-bottom border-secondary">
              <h5 className="mb-0">User-specific Cleanup</h5>
            </div>
            <div className="card-body">
              <p className="text-white-50 mb-4">
                Clean up listings for a specific user. Enter the user's ID to remove all their invalid or outdated listings.
              </p>
              
              <Form onSubmit={cleanupUserListings}>
                <Form.Group className="mb-3">
                  <Form.Label>User ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                    required
                  />
                  <Form.Text className="text-white-50">
                    Enter the MongoDB ID of the user whose listings you want to clean up
                  </Form.Text>
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="warning" 
                    type="submit"
                    disabled={loading || !userId}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" className="me-2" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    )}
                    Clean User Listings
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
      
      {results && (
        <div className="mt-4">
          <div className={`alert ${
            results.success ? 'alert-success' : 'alert-danger'
          }`}>
            <h5 className="alert-heading">{results.success ? 'Success!' : 'Error!'}</h5>
            <p className="mb-0">{results.message}</p>
            
            {results.details && (
              <>
                <hr />
                <div className="small">
                  {Object.keys(results.details).map((key) => (
                    <div key={key} className="mb-1">
                      <strong>{key}:</strong> {results.details[key]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-5">
        <div className="card bg-dark">
          <div className="card-header bg-dark text-white border-bottom border-secondary">
            <h5 className="mb-0">Local Storage Cleanup</h5>
          </div>
          <div className="card-body">
            <p className="text-white-50 mb-4">
              The following script can be provided to users who need to clear their local browser storage for the CS2 Marketplace. This can help resolve issues with persistent data.
            </p>
            
            <div className="bg-dark-secondary p-3 rounded">
              <pre className="text-white mb-0" style={{ whiteSpace: 'pre-wrap' }}>
{`// Copy this script and paste it in the browser console
(function() {
  // List of localStorage keys to remove
  const keysToRemove = [
    'cs2marketplace_cart',
    'cs2marketplace_filters',
    'cs2marketplace_theme',
    'cs2marketplace_notifications',
    'cs2marketplace_recentlyViewed',
    'cs2marketplace_lastSearch'
  ];

  // Remove each key
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(\`Removed \${key} from localStorage\`);
  });

  console.log('Local storage cleanup completed!');
})();`}
              </pre>
            </div>
            
            <div className="d-flex justify-content-end mt-3">
              <Button 
                variant="outline-light"
                onClick={() => {
                  navigator.clipboard.writeText(document.querySelector('pre').textContent);
                  window.showNotification('Success', 'Script copied to clipboard', 'SUCCESS');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Script
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ 
  users, loading, pagination, userSearch, setUserSearch, 
  handleUserSearch, fetchUsers, viewUserDetails, renderPagination
}) {
  return (
    <>
      <Form onSubmit={handleUserSearch} className="mb-4">
        <InputGroup>
          <FormControl
            placeholder="Search by name, Steam ID or email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="bg-dark text-light border-secondary"
          />
          <Button variant="primary" type="submit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Search
          </Button>
        </InputGroup>
      </Form>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="light" />
          <p className="mt-3 text-light">Loading users...</p>
        </div>
      ) : users.length > 0 ? (
        <>
          <div className="table-responsive">
            <Table responsive striped hover variant="dark" className="align-middle mb-0">
              <thead>
                <tr className="bg-dark">
                  <th className="border-0">User</th>
                  <th className="border-0">Steam ID</th>
                  <th className="border-0">Joined</th>
                  <th className="border-0">Status</th>
                  <th className="border-0">Balance</th>
                  <th className="border-0 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td className="text-nowrap">
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-2">
                          <img 
                            src={user.avatar || 'https://via.placeholder.com/40'}
                            alt={user.displayName}
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                            className="border border-secondary"
                          />
                        </div>
                        <div>
                          <div className="fw-medium text-white">{user.displayName}</div>
                          <div className="small text-white-50">{user.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-white-50">{user.steamId}</td>
                    <td className="text-white-50">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      {user.isBanned ? (
                        <Badge bg="danger" className="px-3 py-2">Banned</Badge>
                      ) : user.isAdmin ? (
                        <Badge bg="warning" className="px-3 py-2" text="dark">Admin</Badge>
                      ) : (
                        <Badge bg="primary" className="px-3 py-2">User</Badge>
                      )}
                    </td>
                    <td className="text-white">
                      {((user.balance || 0) / 100).toFixed(2)} GEL
                    </td>
                    <td className="text-end">
                      <Button 
                        variant="outline-light" 
                        size="sm"
                        onClick={() => viewUserDetails(user._id)}
                        className="user-action-btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-center mt-4">
            {renderPagination(pagination, fetchUsers)}
          </div>
        </>
      ) : (
        <div className="text-center py-5 my-4 bg-dark-secondary rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white-50 mb-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <p className="text-white">No users found</p>
          <Button variant="outline-light" size="sm" onClick={() => { setUserSearch(''); fetchUsers(1); }}>
            Clear search and try again
          </Button>
        </div>
      )}
    </>
  );
}

// Items Tab Component
function ItemsTab({ 
  items, loading, pagination, itemSearch, setItemSearch, 
  itemFilter, handleItemFilter, handleItemSearch, fetchItems, renderPagination
}) {
  return (
    <>
      <Form onSubmit={handleItemSearch} className="mb-4">
        <Row>
          <Col lg={8} className="mb-3 mb-lg-0">
            <FormControl
              placeholder="Search by item name"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="bg-dark text-light border-secondary"
            />
          </Col>
          <Col lg={4}>
            <div className="d-flex gap-2">
              <Button 
                variant={itemFilter.isListed === true ? "success" : "outline-success"} 
                onClick={() => handleItemFilter({ ...itemFilter, isListed: itemFilter.isListed === true ? null : true })}
                className="flex-grow-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                  <path d="M9 12h6"></path>
                  <path d="M12 9v6"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Listed
              </Button>
              <Button 
                variant={itemFilter.isListed === false ? "danger" : "outline-danger"}
                onClick={() => handleItemFilter({ ...itemFilter, isListed: itemFilter.isListed === false ? null : false })}
                className="flex-grow-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Not Listed
              </Button>
              <Button variant="primary" type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="light" />
          <p className="mt-3 text-light">Loading items...</p>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="table-responsive">
            <Table responsive striped hover variant="dark" className="align-middle mb-0">
              <thead>
                <tr className="bg-dark">
                  <th className="border-0">Name</th>
                  <th className="border-0">Owner</th>
                  <th className="border-0">Category</th>
                  <th className="border-0">Rarity</th>
                  <th className="border-0">Status</th>
                  <th className="border-0">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <img 
                            src={item.iconUrl || item.imageUrl || 'https://via.placeholder.com/40'} 
                            alt={item.marketHashName}
                            style={{ width: 40, height: 40, objectFit: 'contain' }}
                            className="border border-secondary p-1 rounded"
                          />
                        </div>
                        <div className="text-white">
                          {item.marketHashName}
                          <div className="small text-white-50">
                            {item.type || 'CS2 Item'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.owner?.displayName ? (
                        <div className="d-flex align-items-center">
                          <img 
                            src={item.owner.avatar || 'https://via.placeholder.com/24'}
                            alt={item.owner.displayName}
                            style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8 }}
                          />
                          <span className="text-white-50">{item.owner.displayName}</span>
                        </div>
                      ) : (
                        <span className="text-white-50">Unknown</span>
                      )}
                    </td>
                    <td className="text-white-50">{item.category || 'N/A'}</td>
                    <td>
                      <span 
                        className="px-2 py-1 rounded" 
                        style={{ 
                          backgroundColor: getRarityColor(item.rarity) || 'rgba(108, 117, 125, 0.2)',
                          color: getRarityColor(item.rarity) ? '#000' : '#fff',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {item.rarity || 'Standard'}
                      </span>
                    </td>
                    <td>
                      {item.isListed ? (
                        <Badge bg="success" className="px-3 py-2">Listed</Badge>
                      ) : (
                        <Badge bg="secondary" className="px-3 py-2">Not Listed</Badge>
                      )}
                    </td>
                    <td className="text-white fw-bold">
                      {item.price ? ((item.price) / 100).toFixed(2) + ' GEL' : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-center mt-4">
            {renderPagination(pagination, fetchItems)}
          </div>
        </>
      ) : (
        <div className="text-center py-5 my-4 bg-dark-secondary rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white-50 mb-3">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="8" x2="8" y2="8"></line>
            <line x1="16" y1="12" x2="8" y2="12"></line>
            <line x1="16" y1="16" x2="8" y2="16"></line>
          </svg>
          <p className="text-white">No items found</p>
          <Button variant="outline-light" size="sm" onClick={() => { setItemSearch(''); handleItemFilter({ isListed: null }); fetchItems(1); }}>
            Clear filters and try again
          </Button>
        </div>
      )}
    </>
  );

  // Helper function to get a color based on item rarity
  function getRarityColor(rarity) {
    if (!rarity) return null;
    
    const rarityMap = {
      'Consumer Grade': 'rgba(176, 195, 217, 0.8)', // Light blue
      'Industrial Grade': 'rgba(94, 152, 217, 0.8)', // Blue
      'Mil-Spec Grade': 'rgba(75, 105, 255, 0.8)', // Darker blue
      'Restricted': 'rgba(136, 71, 255, 0.8)', // Purple
      'Classified': 'rgba(211, 44, 230, 0.8)', // Pink
      'Covert': 'rgba(235, 75, 75, 0.8)', // Red
      'Contraband': 'rgba(228, 174, 57, 0.8)', // Yellow/Gold
      'Extraordinary': 'rgba(202, 171, 5, 0.8)', // Gold
      'Distinguished': 'rgba(73, 132, 194, 0.8)', // Medium blue
      'Exotic': 'rgba(234, 117, 164, 0.8)' // Pink
    };
    
    return rarityMap[rarity] || 'rgba(108, 117, 125, 0.8)'; // Default gray
  }
}

export default AdminTools; 