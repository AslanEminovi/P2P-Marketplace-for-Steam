import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, Row, Col, Card, Button, Form, Alert, Tabs, Tab, 
  Table, Badge, Spinner, InputGroup, FormControl, Pagination,
  Modal
} from 'react-bootstrap';
import { API_URL } from '../config/constants';

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
      const response = await axios.get(`${API_URL}/admin/trades`, { 
        params: { page, search: tradeSearch },
        withCredentials: true 
      });
      setTrades(response.data.trades);
      setTradesPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setMessage({
        type: 'danger',
        text: `Error fetching trades: ${error.response?.data?.error || error.message}`
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

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">Admin Tools</h1>
      
      {message && (
        <Alert 
          variant={message.type} 
          onClose={() => setMessage(null)} 
          dismissible
          className="mb-4"
        >
          {message.text}
        </Alert>
      )}
      
      <Tabs
        activeKey={activeTab}
        onSelect={k => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="dashboard" title="Dashboard">
          <DashboardTab stats={stats} loading={statsLoading} refreshStats={fetchStats} />
        </Tab>
        
        <Tab eventKey="users" title="Users">
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
        </Tab>
        
        <Tab eventKey="items" title="Items">
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
        </Tab>
        
        <Tab eventKey="trades" title="Trades Management">
          {renderTradesTab()}
        </Tab>
        
        <Tab eventKey="cleanup" title="Cleanup Tools">
          <CleanupTab 
            userId={userId}
            setUserId={setUserId}
            loading={loading}
            results={cleanupResults}
            cleanupAllListings={cleanupAllListings}
            cleanupUserListings={cleanupUserListings}
          />
        </Tab>
      </Tabs>
      
      {/* User Detail Modal */}
      <Modal 
        show={userDetailModalOpen} 
        onHide={() => setUserDetailModalOpen(false)}
        size="lg"
      >
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {userDetailLoading ? (
            <div className="text-center my-4">
              <Spinner animation="border" variant="light" />
            </div>
          ) : selectedUser ? (
            <>
              <Row>
                <Col md={3}>
                  <img 
                    src={selectedUser.avatar || 'https://via.placeholder.com/150'} 
                    alt={selectedUser.displayName}
                    className="img-fluid rounded mb-3"
                  />
                </Col>
                <Col md={9}>
                  <h4>{selectedUser.displayName}</h4>
                  <p>
                    <strong>Steam ID:</strong> {selectedUser.steamId}<br/>
                    <strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}<br/>
                    <strong>Balance:</strong> ${selectedUser.balance?.toFixed(2) || '0.00'}<br/>
                    <strong>Status:</strong> {' '}
                    {selectedUser.isBanned ? (
                      <Badge bg="danger">Banned</Badge>
                    ) : selectedUser.isAdmin ? (
                      <Badge bg="success">Admin</Badge>
                    ) : (
                      <Badge bg="primary">User</Badge>
                    )}
                  </p>
                  
                  <div className="d-flex gap-2 mb-3">
                    {selectedUser.isAdmin ? (
                      <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={() => updateUserStatus(selectedUser._id, { isAdmin: false })}
                      >
                        Remove Admin
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => updateUserStatus(selectedUser._id, { isAdmin: true })}
                      >
                        Make Admin
                      </Button>
                    )}
                    
                    {selectedUser.isBanned ? (
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => updateUserStatus(selectedUser._id, { isBanned: false })}
                      >
                        Unban User
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => updateUserStatus(selectedUser._id, { 
                          isBanned: true,
                          banReason: 'Administrative action'
                        })}
                      >
                        Ban User
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
              
              <h5 className="mt-4">Recent Items</h5>
              {userItems.length > 0 ? (
                <Table responsive variant="dark" size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Listed</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userItems.map(item => (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td>
                          {item.isListed ? (
                            <Badge bg="success">Listed</Badge>
                          ) : (
                            <Badge bg="secondary">Not Listed</Badge>
                          )}
                        </td>
                        <td>${item.price?.toFixed(2) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No items found</p>
              )}
              
              <h5 className="mt-4">Recent Trades</h5>
              {userTrades.length > 0 ? (
                <Table responsive variant="dark" size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTrades.map(trade => (
                      <tr key={trade._id}>
                        <td>{trade.itemName || 'Unknown Item'}</td>
                        <td>${trade.price?.toFixed(2) || '0.00'}</td>
                        <td>
                          <Badge bg={trade.status === 'completed' ? 'success' : 
                                     trade.status === 'cancelled' ? 'danger' : 'warning'}>
                            {trade.status}
                          </Badge>
                        </td>
                        <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No trades found</p>
              )}
            </>
          ) : (
            <p className="text-center">No user selected</p>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white">
          <Button variant="secondary" onClick={() => setUserDetailModalOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, loading, refreshStats }) {
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="light" />
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="text-center my-5">
        <p>No statistics available</p>
        <Button variant="primary" onClick={refreshStats}>
          Load Statistics
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <Row>
        <Col md={12} className="mb-4">
          <Button variant="outline-light" size="sm" onClick={refreshStats} className="float-end">
            <i className="fas fa-sync-alt me-1"></i> Refresh
          </Button>
          <p className="text-muted">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </p>
        </Col>
      </Row>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card className="h-100 bg-dark text-white">
            <Card.Body>
              <Card.Title>Users</Card.Title>
              <h2>{stats.users.total.toLocaleString()}</h2>
              <p className="text-success">
                +{stats.users.newLast7Days} new users in the last 7 days
              </p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 bg-dark text-white">
            <Card.Body>
              <Card.Title>Items</Card.Title>
              <h2>{stats.items.total.toLocaleString()}</h2>
              <p>
                {stats.items.listed.toLocaleString()} currently listed 
                ({((stats.items.listed / stats.items.total) * 100).toFixed(1)}%)
              </p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card className="h-100 bg-dark text-white">
            <Card.Body>
              <Card.Title>Trades</Card.Title>
              <h2>{stats.trades.completed.toLocaleString()}</h2>
              <p>
                {stats.trades.pending.toLocaleString()} pending trades<br/>
                <span className="text-success">${stats.trades.volumeLast7Days.toLocaleString()} traded (7 days)</span>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

// Cleanup Tab Component
function CleanupTab({ userId, setUserId, loading, results, cleanupAllListings, cleanupUserListings }) {
  return (
    <Row>
      <Col md={6} className="mb-4">
        <Card className="h-100 bg-dark text-white">
          <Card.Body>
            <Card.Title>Cleanup All Listings</Card.Title>
            <Card.Text>
              This will find all items marked as listed and update them to not listed.
              It will also cancel any trades that are stuck in a non-terminal state.
            </Card.Text>
            <Button 
              variant="danger" 
              onClick={cleanupAllListings} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Run Full Cleanup'}
            </Button>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={6} className="mb-4">
        <Card className="h-100 bg-dark text-white">
          <Card.Body>
            <Card.Title>Cleanup User Listings</Card.Title>
            <Card.Text>
              This will find all items marked as listed for a specific user and update them to not listed.
            </Card.Text>
            <Form onSubmit={cleanupUserListings}>
              <Form.Group className="mb-3">
                <Form.Label>User ID</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter MongoDB User ID" 
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={loading}
                />
                <Form.Text className="text-muted">
                  Enter the MongoDB ObjectId of the user
                </Form.Text>
              </Form.Group>
              <Button 
                variant="warning" 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Cleanup User Listings'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
      
      {results && (
        <Col md={12}>
          <Card className="mt-4 bg-dark text-white">
            <Card.Body>
              <Card.Title>Cleanup Results</Card.Title>
              <pre className="bg-dark text-white p-3 rounded">
                {JSON.stringify(results, null, 2)}
              </pre>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>
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
          />
          <Button variant="primary" type="submit">
            Search
          </Button>
        </InputGroup>
      </Form>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="light" />
        </div>
      ) : users.length > 0 ? (
        <>
          <Table responsive striped hover variant="dark">
            <thead>
              <tr>
                <th>User</th>
                <th>Steam ID</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        src={user.avatar || 'https://via.placeholder.com/32'} 
                        alt={user.displayName}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10 }}
                      />
                      {user.displayName}
                    </div>
                  </td>
                  <td>{user.steamId}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    {user.isBanned ? (
                      <Badge bg="danger">Banned</Badge>
                    ) : user.isAdmin ? (
                      <Badge bg="success">Admin</Badge>
                    ) : (
                      <Badge bg="primary">User</Badge>
                    )}
                  </td>
                  <td>${user.balance?.toFixed(2) || '0.00'}</td>
                  <td>
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => viewUserDetails(user._id)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          <div className="d-flex justify-content-center mt-4">
            {renderPagination(pagination, fetchUsers)}
          </div>
        </>
      ) : (
        <p className="text-center">No users found</p>
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
          <Col md={8}>
            <FormControl
              placeholder="Search by item name"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="mb-2"
            />
          </Col>
          <Col md={4}>
            <div className="d-flex gap-2">
              <Button 
                variant={itemFilter.isListed === true ? "success" : "outline-success"} 
                onClick={() => handleItemFilter({ ...itemFilter, isListed: itemFilter.isListed === true ? null : true })}
              >
                Listed
              </Button>
              <Button 
                variant={itemFilter.isListed === false ? "danger" : "outline-danger"}
                onClick={() => handleItemFilter({ ...itemFilter, isListed: itemFilter.isListed === false ? null : false })}
              >
                Not Listed
              </Button>
              <Button variant="primary" type="submit">
                Search
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="light" />
        </div>
      ) : items.length > 0 ? (
        <>
          <Table responsive striped hover variant="dark">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        src={item.imageUrl || 'https://via.placeholder.com/32'} 
                        alt={item.marketHashName}
                        style={{ width: 32, height: 32, marginRight: 10, objectFit: 'contain' }}
                      />
                      {item.marketHashName}
                    </div>
                  </td>
                  <td>{item.owner?.displayName || 'Unknown'}</td>
                  <td>{item.rarity || 'Unknown'}</td>
                  <td>
                    {item.isListed ? (
                      <Badge bg="success">Listed</Badge>
                    ) : (
                      <Badge bg="secondary">Not Listed</Badge>
                    )}
                  </td>
                  <td>${item.price?.toFixed(2) || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          <div className="d-flex justify-content-center mt-4">
            {renderPagination(pagination, fetchItems)}
          </div>
        </>
      ) : (
        <p className="text-center">No items found</p>
      )}
    </>
  );
}

export default AdminTools; 