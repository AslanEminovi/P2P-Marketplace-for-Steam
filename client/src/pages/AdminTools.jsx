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
        params: { page, search: tradeSearch },
        withCredentials: true 
      });
      
      if (Array.isArray(response.data)) {
        setTrades(response.data);
        setTradesPagination({ 
          page: page, 
          pages: Math.ceil(response.data.length / 10),
          total: response.data.length 
        });
      } else {
        console.error('Invalid response format:', response.data);
        setTrades([]);
        setMessage({
          type: 'danger',
          text: `Error fetching trades: ${response.data?.error || 'Invalid data format received from server'}`
        });
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching trades: ${error.response?.data?.error || error.message}`
      });
      setTrades([]);
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
      <>
        <Row className="mb-4">
          <Col>
            <Card bg="dark" text="white">
              <Card.Header>
                <h5 className="mb-0">Trade Management</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleTradeSearch} className="mb-4">
                  <InputGroup>
                    <FormControl
                      placeholder="Search by trade ID, item name, or user..."
                      value={tradeSearch}
                      onChange={(e) => setTradeSearch(e.target.value)}
                    />
                    <Button variant="primary" type="submit">
                      Search
                    </Button>
                  </InputGroup>
                </Form>

                {tradesLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : trades.length === 0 ? (
                  <Alert variant="info">No trades found</Alert>
                ) : (
                  <>
                    <Table variant="dark" striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Trade ID</th>
                          <th>Item</th>
                          <th>Price</th>
                          <th>Buyer</th>
                          <th>Seller</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map(trade => (
                          <tr key={trade._id}>
                            <td>{trade._id}</td>
                            <td>
                              {trade.item?.marketHashName || trade.itemName || 'Unknown Item'}
                            </td>
                            <td>{((trade.price || 0) / 100).toFixed(2)} GEL</td>
                            <td>
                              {trade.buyer?.displayName || 'Unknown'}
                            </td>
                            <td>
                              {trade.seller?.displayName || 'Unknown'}
                            </td>
                            <td>
                              <Badge
                                bg={
                                  trade.status === 'completed' ? 'success' :
                                  trade.status === 'cancelled' || trade.status === 'failed' ? 'danger' :
                                  'primary'
                                }
                              >
                                {trade.status}
                              </Badge>
                            </td>
                            <td>{new Date(trade.createdAt).toLocaleString()}</td>
                            <td>
                              <Button 
                                variant="info" 
                                size="sm" 
                                onClick={() => viewTradeDetails(trade._id)}
                                className="me-1"
                              >
                                Details
                              </Button>
                              {!['completed', 'cancelled', 'failed'].includes(trade.status) && (
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedTrade(trade);
                                    setTradeDetailModalOpen(true);
                                    setCancelReason('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>

                    {renderPagination(tradesPagination, fetchTrades)}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Trade Detail Modal */}
        <Modal
          show={tradeDetailModalOpen}
          onHide={() => setTradeDetailModalOpen(false)}
          size="lg"
          centered
          backdrop="static"
        >
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>Trade Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            {!selectedTrade ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
            ) : (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <h5>General Information</h5>
                    <Table variant="dark" size="sm" borderless>
                      <tbody>
                        <tr>
                          <td><strong>Trade ID:</strong></td>
                          <td>{selectedTrade._id}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <Badge
                              bg={
                                selectedTrade.status === 'completed' ? 'success' :
                                selectedTrade.status === 'cancelled' || selectedTrade.status === 'failed' ? 'danger' :
                                'primary'
                              }
                            >
                              {selectedTrade.status}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Item:</strong></td>
                          <td>{selectedTrade.item?.marketHashName || selectedTrade.itemName || 'Unknown Item'}</td>
                        </tr>
                        <tr>
                          <td><strong>Price:</strong></td>
                          <td>{((selectedTrade.price || 0) / 100).toFixed(2)} GEL</td>
                        </tr>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{new Date(selectedTrade.createdAt).toLocaleString()}</td>
                        </tr>
                        {selectedTrade.completedAt && (
                          <tr>
                            <td><strong>Completed:</strong></td>
                            <td>{new Date(selectedTrade.completedAt).toLocaleString()}</td>
                          </tr>
                        )}
                        {selectedTrade.cancelledAt && (
                          <tr>
                            <td><strong>Cancelled:</strong></td>
                            <td>{new Date(selectedTrade.cancelledAt).toLocaleString()}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h5>Participants</h5>
                    <Table variant="dark" size="sm" borderless>
                      <tbody>
                        <tr>
                          <td><strong>Buyer:</strong></td>
                          <td>
                            {selectedTrade.buyer?.displayName || 'Unknown'}
                            {selectedTrade.buyer && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => viewUserDetails(selectedTrade.buyer._id)}
                                className="p-0 ms-2"
                              >
                                View Profile
                              </Button>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Buyer ID:</strong></td>
                          <td>{selectedTrade.buyer?._id || 'Unknown'}</td>
                        </tr>
                        <tr>
                          <td><strong>Seller:</strong></td>
                          <td>
                            {selectedTrade.seller?.displayName || 'Unknown'}
                            {selectedTrade.seller && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => viewUserDetails(selectedTrade.seller._id)}
                                className="p-0 ms-2"
                              >
                                View Profile
                              </Button>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Seller ID:</strong></td>
                          <td>{selectedTrade.seller?._id || 'Unknown'}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>

                {/* Trade Actions */}
                {!['completed', 'cancelled', 'failed'].includes(selectedTrade.status) && (
                  <Card bg="secondary" text="white" className="mb-4">
                    <Card.Header>
                      <h5 className="mb-0">Cancel Trade</h5>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Reason for Cancellation</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Explain why this trade is being cancelled..."
                        />
                      </Form.Group>
                      <Button
                        variant="danger"
                        onClick={() => handleCancelTrade(selectedTrade._id)}
                        disabled={tradeActionLoading}
                      >
                        {tradeActionLoading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Processing...
                          </>
                        ) : (
                          'Cancel Trade'
                        )}
                      </Button>
                    </Card.Body>
                  </Card>
                )}

                {/* Fund Transfer */}
                <Card bg="secondary" text="white" className="mb-4">
                  <Card.Header>
                    <h5 className="mb-0">Transfer Funds</h5>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-warning">
                      Use this feature to compensate users in case of issues or fraud. The amount 
                      will be added to the selected user's account balance.
                    </p>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount (GEL)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="Enter amount to transfer"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          label={`Buyer (${selectedTrade.buyer?.displayName || 'Unknown'})`}
                          name="refundTarget"
                          id="refund-buyer"
                          checked={refundTarget === 'buyer'}
                          onChange={() => setRefundTarget('buyer')}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label={`Seller (${selectedTrade.seller?.displayName || 'Unknown'})`}
                          name="refundTarget"
                          id="refund-seller"
                          checked={refundTarget === 'seller'}
                          onChange={() => setRefundTarget('seller')}
                        />
                      </div>
                    </Form.Group>
                    <Button
                      variant="success"
                      onClick={() => handleTransferFunds(selectedTrade._id)}
                      disabled={tradeActionLoading}
                    >
                      {tradeActionLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Processing...
                        </>
                      ) : (
                        'Transfer Funds'
                      )}
                    </Button>
                  </Card.Body>
                </Card>

                {/* Status History */}
                {selectedTrade.statusHistory && selectedTrade.statusHistory.length > 0 && (
                  <Card bg="dark" text="white">
                    <Card.Header>
                      <h5 className="mb-0">Status History</h5>
                    </Card.Header>
                    <Card.Body>
                      <Table variant="dark" striped bordered responsive>
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Timestamp</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrade.statusHistory.map((status, index) => (
                            <tr key={index}>
                              <td>
                                <Badge
                                  bg={
                                    status.status === 'completed' ? 'success' :
                                    status.status === 'cancelled' || status.status === 'failed' ? 'danger' :
                                    'primary'
                                  }
                                >
                                  {status.status}
                                </Badge>
                              </td>
                              <td>{new Date(status.timestamp).toLocaleString()}</td>
                              <td>{status.message || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-dark text-white">
            <Button variant="secondary" onClick={() => setTradeDetailModalOpen(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  // Apply page-level styles to fix the admin layout issues
  useEffect(() => {
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
    <div 
      className="admin-content-wrapper" 
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 70px)',
        padding: '20px',
        backgroundColor: '#0f172a',
        color: '#f1f5f9'
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="text-white mb-1">Admin Tools</h1>
          <p className="text-white-50 mb-0">Manage users, items, trades and system maintenance</p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-light" 
            className="d-flex align-items-center"
            onClick={() => {
              fetchStats();
              fetchUsers();
              fetchItems();
              fetchTrades();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh Data
          </Button>
          <Button 
            variant="success" 
            as={Link} 
            to="/"
            className="d-flex align-items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 8 8 12 12 16"></polyline>
              <line x1="16" y1="12" x2="8" y2="12"></line>
            </svg>
            Return to Site
          </Button>
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
            {message.text}
          </Alert>
        </div>
      )}

      <Card bg="dark" text="white" className="admin-tabs-card mb-4" style={{ width: '100%' }}>
        <Card.Header className="bg-dark border-bottom border-secondary">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="admin-tabs"
          >
            <Tab 
              eventKey="dashboard" 
              title={
                <div className="d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  Dashboard
                </div>
              }
            />
            <Tab 
              eventKey="users" 
              title={
                <div className="d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Users
                </div>
              }
            />
            <Tab 
              eventKey="items" 
              title={
                <div className="d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Items
                </div>
              }
            />
            <Tab 
              eventKey="trades" 
              title={
                <div className="d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                  Trades
                </div>
              }
            />
            <Tab 
              eventKey="cleanup" 
              title={
                <div className="d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                    <line x1="12" y1="16" x2="12" y2="16"></line>
                    <line x1="12" y1="8" x2="12" y2="8"></line>
                  </svg>
                  Cleanup
                </div>
              }
            />
          </Tabs>
        </Card.Header>
        <Card.Body className="pt-4 pb-4" style={{ width: '100%' }}>
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
        </Card.Body>
      </Card>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, loading }) {
  return (
    <div className="admin-dashboard">
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="light" />
          <p className="mt-3 text-light">Loading dashboard statistics...</p>
        </div>
      ) : !stats ? (
        <Alert variant="warning">
          No statistics available. Try refreshing the page.
        </Alert>
      ) : (
        <>
          <Row className="mb-4">
            <Col lg={3} md={6} className="mb-4">
              <Card bg="dark" text="white" className="h-100 border-primary">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-white-50 text-uppercase mb-0">Total Users</h6>
                      <h2 className="mt-2 mb-0 text-white">{stats.totalUsers || 0}</h2>
                    </div>
                    <div className="stats-icon bg-primary-subtle rounded p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                  </div>
                  <p className="text-white-50 mb-0">
                    <span className={stats.userGrowth >= 0 ? "text-success" : "text-danger"}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                        {stats.userGrowth >= 0 ? (
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        ) : (
                          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                        )}
                      </svg>
                      {Math.abs(stats.userGrowth || 0)}% 
                    </span>
                    &nbsp;since last month
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-4">
              <Card bg="dark" text="white" className="h-100 border-success">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-white-50 text-uppercase mb-0">Active Trades</h6>
                      <h2 className="mt-2 mb-0 text-white">{stats.activeTrades || 0}</h2>
                    </div>
                    <div className="stats-icon bg-success-subtle rounded p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                      </svg>
                    </div>
                  </div>
                  <p className="text-white-50 mb-0">
                    <span className="text-success">
                      Active vs Completed: {stats.tradeRatio || 0}%
                    </span>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-4">
              <Card bg="dark" text="white" className="h-100 border-info">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-white-50 text-uppercase mb-0">Market Items</h6>
                      <h2 className="mt-2 mb-0 text-white">{stats.totalItems || 0}</h2>
                    </div>
                    <div className="stats-icon bg-info-subtle rounded p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>
                  </div>
                  <p className="text-white-50 mb-0">
                    <span className="text-info">
                      Listed items: {stats.listedItems || 0} ({stats.listingRatio || 0}%)
                    </span>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-4">
              <Card bg="dark" text="white" className="h-100 border-warning">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-white-50 text-uppercase mb-0">Total Revenue</h6>
                      <h2 className="mt-2 mb-0 text-white">{stats.totalRevenue ? (stats.totalRevenue / 100).toFixed(2) : "0.00"} GEL</h2>
                    </div>
                    <div className="stats-icon bg-warning-subtle rounded p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                  </div>
                  <p className="text-white-50 mb-0">
                    <span className={stats.revenueChange >= 0 ? "text-success" : "text-danger"}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                        {stats.revenueChange >= 0 ? (
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        ) : (
                          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                        )}
                      </svg>
                      {Math.abs(stats.revenueChange || 0)}% 
                    </span>
                    &nbsp;since last month
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={8}>
              <Card bg="dark" text="white" className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Recent Trades</h5>
                  <Button variant="outline-light" size="sm" as={Link} to="/admin/tools?tab=trades">
                    View All
                  </Button>
                </Card.Header>
                <Card.Body>
                  {stats.recentTrades && stats.recentTrades.length > 0 ? (
                    <Table responsive borderless variant="dark" className="mb-0">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Buyer</th>
                          <th>Seller</th>
                          <th>Status</th>
                          <th>Price</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentTrades.slice(0, 5).map((trade, index) => (
                          <tr key={index}>
                            <td className="text-nowrap">{trade.itemName || 'Unknown Item'}</td>
                            <td>{trade.buyer?.displayName || 'Unknown'}</td>
                            <td>{trade.seller?.displayName || 'Unknown'}</td>
                            <td>
                              <Badge
                                bg={
                                  trade.status === 'completed' ? 'success' :
                                  trade.status === 'cancelled' || trade.status === 'failed' ? 'danger' :
                                  'primary'
                                }
                              >
                                {trade.status}
                              </Badge>
                            </td>
                            <td>{((trade.price || 0) / 100).toFixed(2)} GEL</td>
                            <td className="text-nowrap">{new Date(trade.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted my-4">No recent trades found</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card bg="dark" text="white" className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">System Status</h5>
                  <span className="badge bg-success">Operational</span>
                </Card.Header>
                <Card.Body>
                  <div className="system-status-items">
                    {stats.systemStatus?.components?.map((component, index) => (
                      <div key={index} className="status-item d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <h6 className="mb-0">{component.name}</h6>
                          <small className="text-muted">{component.description}</small>
                        </div>
                        <Badge 
                          bg={component.status === 'operational' ? 'success' : 
                             component.status === 'degraded' ? 'warning' : 'danger'}
                        >
                          {component.status}
                        </Badge>
                      </div>
                    )) || (
                      <>
                        <div className="status-item d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-0">API Services</h6>
                            <small className="text-muted">Backend services status</small>
                          </div>
                          <Badge bg="success">Operational</Badge>
                        </div>
                        <div className="status-item d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-0">Database Services</h6>
                            <small className="text-muted">MongoDB status</small>
                          </div>
                          <Badge bg="success">Operational</Badge>
                        </div>
                        <div className="status-item d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-0">Steam Integration</h6>
                            <small className="text-muted">Steam API connection</small>
                          </div>
                          <Badge bg="success">Operational</Badge>
                        </div>
                        <div className="status-item d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">Payment Gateway</h6>
                            <small className="text-muted">Payment processing status</small>
                          </div>
                          <Badge bg="success">Operational</Badge>
                        </div>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={6}>
              <Card bg="dark" text="white" className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Activity Log</h5>
                </Card.Header>
                <Card.Body>
                  <div className="activity-timeline">
                    <div className="timeline-item d-flex mb-3">
                      <div className="timeline-icon bg-success-subtle me-3 rounded-circle p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div>
                        <p className="mb-0 text-light">New user registered</p>
                        <small className="text-muted">2 minutes ago</small>
                      </div>
                    </div>
                    <div className="timeline-item d-flex mb-3">
                      <div className="timeline-icon bg-primary-subtle me-3 rounded-circle p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="mb-0 text-light">Trade completed successfully</p>
                        <small className="text-muted">15 minutes ago</small>
                      </div>
                    </div>
                    <div className="timeline-item d-flex mb-3">
                      <div className="timeline-icon bg-warning-subtle me-3 rounded-circle p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" y1="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div>
                        <p className="mb-0 text-light">Payment processing delayed</p>
                        <small className="text-muted">1 hour ago</small>
                      </div>
                    </div>
                    <div className="timeline-item d-flex">
                      <div className="timeline-icon bg-info-subtle me-3 rounded-circle p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="mb-0 text-light">System maintenance completed</p>
                        <small className="text-muted">3 hours ago</small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card bg="dark" text="white" className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Top Items</h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive borderless variant="dark" className="mb-0">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Trades</th>
                        <th>Avg. Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-nowrap">
                          <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: 32, height: 32 }}>
                              <div className="rounded bg-secondary" style={{ width: 32, height: 32 }}></div>
                            </div>
                            <span>AK-47 | Asiimov</span>
                          </div>
                        </td>
                        <td>Rifle</td>
                        <td>24</td>
                        <td>85.50 GEL</td>
                      </tr>
                      <tr>
                        <td className="text-nowrap">
                          <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: 32, height: 32 }}>
                              <div className="rounded bg-secondary" style={{ width: 32, height: 32 }}></div>
                            </div>
                            <span>AWP | Dragon Lore</span>
                          </div>
                        </td>
                        <td>Sniper Rifle</td>
                        <td>18</td>
                        <td>1250.00 GEL</td>
                      </tr>
                      <tr>
                        <td className="text-nowrap">
                          <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: 32, height: 32 }}>
                              <div className="rounded bg-secondary" style={{ width: 32, height: 32 }}></div>
                            </div>
                            <span>Butterfly Knife | Fade</span>
                          </div>
                        </td>
                        <td>Knife</td>
                        <td>15</td>
                        <td>450.25 GEL</td>
                      </tr>
                      <tr>
                        <td className="text-nowrap">
                          <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: 32, height: 32 }}>
                              <div className="rounded bg-secondary" style={{ width: 32, height: 32 }}></div>
                            </div>
                            <span>M4A4 | Howl</span>
                          </div>
                        </td>
                        <td>Rifle</td>
                        <td>12</td>
                        <td>325.75 GEL</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
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
      <Row>
        <Col lg={6} className="mb-4">
          <Card bg="dark" text="white" className="h-100">
            <Card.Header className="bg-dark border-danger">
              <h5 className="mb-0 d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-danger">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                System-wide Cleanup
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-light">
                This will check all listings in the system and cleanup any that are no longer valid. 
                Items will be unlisted and trades will be marked as cancelled if:
              </p>
              <ul className="text-light">
                <li>The item no longer exists in the owner's Steam inventory</li>
                <li>The trade has been pending for more than 7 days</li>
                <li>The item has been removed from Steam</li>
              </ul>
              <div className="d-grid gap-2">
                <Button 
                  variant="danger" 
                  size="lg"
                  onClick={cleanupAllListings}
                  disabled={loading}
                  className="mb-3"
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Running System Cleanup...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                      </svg>
                      Run System-wide Cleanup
                    </>
                  )}
                </Button>
                <Alert variant="dark" className="border border-danger text-white-50 mb-0">
                  <Alert.Heading className="fs-6 text-danger">Warning!</Alert.Heading>
                  <p className="mb-0 small">
                    This operation can take a long time and will affect all users. 
                    Use with caution during low-traffic periods.
                  </p>
                </Alert>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-4">
          <Card bg="dark" text="white" className="h-100">
            <Card.Header className="bg-dark border-warning">
              <h5 className="mb-0 d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-warning">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                User-specific Cleanup
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-light">
                Clean up all listings and trades for a specific user. 
                This is useful when a user has reported issues with their listings 
                or when investigating potential fraud.
              </p>
              <Form onSubmit={cleanupUserListings}>
                <Form.Group className="mb-3">
                  <Form.Label className="text-light">User ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter user ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    className="bg-dark text-light border-secondary"
                  />
                  <Form.Text className="text-light">
                    Enter the MongoDB ObjectId or Steam ID of the user.
                  </Form.Text>
                </Form.Group>
                <div className="d-grid">
                  <Button 
                    variant="warning" 
                    size="lg" 
                    type="submit" 
                    disabled={loading || !userId.trim()}
                    className="mb-3"
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Cleaning User Data...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                        </svg>
                        Run User Cleanup
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {results && (
        <Row>
          <Col md={12}>
            <Card bg="dark" text="white" className="mb-4">
              <Card.Header className="bg-dark border-success">
                <h5 className="mb-0 d-flex align-items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 text-success">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Cleanup Results
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="bg-dark text-light p-3 rounded border border-secondary" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Card bg="secondary" className="mb-3">
                        <Card.Body>
                          <h6 className="text-white mb-2">Items Updated</h6>
                          <h3 className="text-white mb-0">{results.itemsUpdated || 0}</h3>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card bg="secondary" className="mb-3">
                        <Card.Body>
                          <h6 className="text-white mb-2">Trades Updated</h6>
                          <h3 className="text-white mb-0">{results.tradesUpdated || 0}</h3>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  
                  {(results.items && results.items.length > 0) && (
                    <div className="mb-4">
                      <h6 className="text-white">Items Details:</h6>
                      <ul className="list-group bg-dark">
                        {results.items.map((item, i) => (
                          <li key={i} className="list-group-item bg-dark text-light border-secondary">
                            Item: {item.marketHashName || 'Unknown'} - {item.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {(results.trades && results.trades.length > 0) && (
                    <div>
                      <h6 className="text-white">Trades Details:</h6>
                      <ul className="list-group bg-dark">
                        {results.trades.map((trade, i) => (
                          <li key={i} className="list-group-item bg-dark text-light border-secondary">
                            Trade {trade._id || i}: {trade.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
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