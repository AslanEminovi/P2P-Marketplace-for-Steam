import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { ClipLoader } from 'react-spinners';
import { 
  FaUsers, 
  FaChartLine, 
  FaBoxOpen, 
  FaExchangeAlt, 
  FaCog, 
  FaSearch, 
  FaUserAltSlash, 
  FaUserCheck, 
  FaInfoCircle, 
  FaTools,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaArrowLeft,
  FaCircle,
  FaHistory,
  FaBan,
  FaCheckCircle,
  FaTimesCircle,
  FaUser
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './AdminTools.css';
import socketService from '../services/socketService';

// Add Error Boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Admin tools error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-error">
          <FaExclamationTriangle size={50} color="#dc3545" />
          <h3>Something went wrong</h3>
          <p>An error occurred in the admin dashboard. Try refreshing the page.</p>
          <button 
            className="admin-btn admin-btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize Modal
Modal.setAppElement('#root');

const AdminTools = () => {
  // State variables
  const [activeTab, setActiveTab] = useState('statistics');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState({
    usersCount: 0,
    activeUsersCount: 0,
    itemsCount: 0,
    tradesCount: 0,
    completedTradesCount: 0,
    totalValue: 0,
    newUsers24h: 0,
    newItems24h: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [userStatus, setUserStatus] = useState({}); // Track real-time user status
  const [userDetails, setUserDetails] = useState(null); // Store detailed user info
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // User details state
  const [userDetailTab, setUserDetailTab] = useState('inventory');
  const [userInventory, setUserInventory] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);
  const [tradesError, setTradesError] = useState(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('Checking admin status...');
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_URL}/admin/check`, { withCredentials: true });
        console.log('Admin check response:', response.data);
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError('Failed to verify admin status. Please try refreshing the page.');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();

    // Listen for user status updates
    const handleUserStatusUpdate = (data) => {
      setUserStatus(prev => ({
        ...prev,
        [data.userId]: {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen
        }
      }));
    };

    socketService.on('userStatusUpdate', handleUserStatusUpdate);

    return () => {
      socketService.off('userStatusUpdate', handleUserStatusUpdate);
    };
  }, []);

  // Fetch users and statistics when admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchStatistics();
    }
  }, [isAdmin, page]);

  // Filter users based on search term
  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.steamId?.includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log(`Fetching users for page ${page}...`);
      
      const response = await axios.get(`${API_URL}/admin/users`, { 
        params: { page, limit: 10, search: searchTerm },
        withCredentials: true 
      });
      
      console.log('Users data received:', response.data);
      
      if (response.data && response.data.users) {
        if (response.data.users.length > 0) {
          console.log('First user data sample:', response.data.users[0]);
        }
        
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
        setTotalPages(response.data.pages || 1);
      } else {
        console.log('No users found in response');
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics from API
  const fetchStatistics = async () => {
    try {
      console.log('Fetching admin statistics...');
      const response = await axios.get(`${API_URL}/admin/statistics`, { withCredentials: true });
      console.log('Statistics received:', response.data);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to fetch statistics');
    }
  };

  // Handle user selection for details
  const handleUserClick = (user) => {
    if (!user || typeof user !== 'object' || !user._id) {
      toast.error('Invalid user data');
      return;
    }

    // Just use the data we already have - don't make any API calls for basic info
    const simpleUser = {
      _id: user._id,
      displayName: user.displayName || 'Unknown User',
      steamId: user.steamId || 'N/A',
      avatar: user.avatar || '',
      avatarMedium: user.avatarMedium || '',
      avatarFull: user.avatarFull || user.avatar || '',
      createdAt: user.createdAt || new Date(),
      isBanned: user.isBanned || false,
      email: user.email || 'N/A',
      tradeUrl: user.tradeUrl || 'N/A',
      balance: user.balance || 0,
      isOnline: user.status?.isOnline || false,
      lastSeen: user.status?.lastSeen || user.lastLoginAt || user.lastLogin || user.createdAt,
      itemCount: user.itemCount || 0,
      tradeCount: user.tradeCount || 0
    };

    // Reset data from previous user
    setUserInventory([]);
    setUserTrades([]);
    setInventoryError(null);
    setTradesError(null);
    setUserDetailTab('inventory');
    
    // Set the user details and open modal
    setSelectedUser(simpleUser);
    setIsUserModalOpen(true);
    
    // Only fetch inventory by default - we'll fetch trades on demand
    fetchUserInventory(user.steamId);
  };
  
  // Fetch user's Steam inventory
  const fetchUserInventory = async (steamId) => {
    if (!steamId) {
      setInventoryError('No Steam ID available');
      return;
    }
    
    try {
      setInventoryLoading(true);
      console.log(`Fetching inventory for Steam ID: ${steamId}`);
      
      // Use a timeout to prevent blocking the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      // Call our server endpoint that will make the Steam API call
      const response = await axios.get(`${API_URL}/admin/user-inventory/${steamId}`, { 
        withCredentials: true,
        signal: controller.signal,
        params: {
          limit: 50 // Limit to 50 items for better performance
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Received ${response.data.length || 0} inventory items for ${steamId}`);
      
      if (Array.isArray(response.data)) {
        setUserInventory(response.data);
      } else if (response.data && Array.isArray(response.data.assets)) {
        setUserInventory(response.data.assets);
      } else {
        setInventoryError('Invalid inventory data format');
        setUserInventory([]);
      }
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      if (error.name === 'AbortError') {
        setInventoryError('Request timed out. Please try again.');
      } else {
        setInventoryError(error.response?.data?.error || 'Failed to fetch inventory');
      }
      setUserInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };
  
  // Fetch user's trade history on our platform
  const fetchUserTrades = async (userId) => {
    if (!userId) {
      setTradesError('No user ID available');
      return;
    }
    
    try {
      setTradesLoading(true);
      console.log(`Fetching trades for user ID: ${userId}`);
      
      // Use a timeout to prevent blocking the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await axios.get(`${API_URL}/admin/user-trades/${userId}`, { 
        withCredentials: true,
        signal: controller.signal,
        params: {
          limit: 20 // Limit to 20 most recent trades for better performance
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Received ${response.data.length || 0} trades for user ${userId}`);
      
      if (Array.isArray(response.data)) {
        setUserTrades(response.data);
      } else {
        setTradesError('Invalid trade data format');
        setUserTrades([]);
      }
    } catch (error) {
      console.error('Error fetching user trades:', error);
      if (error.name === 'AbortError') {
        setTradesError('Request timed out. Please try again.');
      } else {
        setTradesError(error.response?.data?.error || 'Failed to fetch trades');
      }
      setUserTrades([]);
    } finally {
      setTradesLoading(false);
    }
  };
  
  // Convert wear code to full name
  const translateWear = (shortWear) => {
    const wearTranslations = {
      'fn': 'Factory New',
      'mw': 'Minimal Wear',
      'ft': 'Field-Tested',
      'ww': 'Well-Worn',
      'bs': 'Battle-Scarred'
    };
    return wearTranslations[shortWear?.toLowerCase()] || shortWear || 'N/A';
  };
  
  // Get color for rarity display
  const getRarityColor = (rarity) => {
    if (!rarity) return '#b0c3d9';
    
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',
      'Industrial Grade': '#5e98d9',
      'Mil-Spec Grade': '#4b69ff',
      'Restricted': '#8847ff',
      'Classified': '#d32ce6',
      'Covert': '#eb4b4b',
      '★': '#e4ae39'
    };
    return rarityColors[rarity] || '#b0c3d9';
  };

  // Handle user ban/unban
  const handleUserStatus = async (userId, action) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }
    
    try {
      setActionLoading(true);
      console.log(`${action}ing user ${userId}...`);
      
      const endpoint = action === 'ban' ? 'ban' : 'unban';
      await axios.post(`${API_URL}/admin/users/${userId}/${endpoint}`, {}, { 
        withCredentials: true,
        timeout: 5000
      });
      
      // Update local user state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { ...user, isBanned: action === 'ban' } 
            : user
        )
      );
      
      if (selectedUser?._id === userId) {
        setSelectedUser(prev => ({ ...prev, isBanned: action === 'ban' }));
      }
      
      toast.success(`User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`);
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user: ${error.message || 'Server error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Render user status indicator
  const renderUserStatus = (user) => {
    const status = user?.status || userStatus[user?._id];
    if (!status) {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span className="text-sm text-gray-600 ml-2">Unknown</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        <span className="text-sm text-gray-600 ml-2">
          {status.isOnline ? 'Online' : status.lastSeen ? 
            `Last seen: ${new Date(status.lastSeen).toLocaleString()}` : 
            'Offline'
          }
        </span>
      </div>
    );
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Effect to load trade data on demand
  useEffect(() => {
    if (userDetailTab === 'trades' && selectedUser && selectedUser._id && userTrades.length === 0 && !tradesLoading) {
      // Only fetch trades when the trades tab is clicked and we don't already have data
      fetchUserTrades(selectedUser._id);
    }
  }, [userDetailTab, selectedUser, userTrades.length, tradesLoading]);

  // Create a cleanup function 
  const cleanupModal = () => {
    setSelectedUser(null);
    setUserInventory([]);
    setUserTrades([]);
    setInventoryError(null);
    setTradesError(null);
    setActionLoading(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsUserModalOpen(false);
    // Delayed cleanup to prevent lag during close animation
    setTimeout(cleanupModal, 300);
  };

  // Render loading state
  if (loading && !users.length) {
    return (
      <div className="admin-loading">
        <ClipLoader size={50} color="#3a6ff7" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="admin-error">
        <FaExclamationTriangle size={50} color="#dc3545" />
        <h3>Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="admin-btn admin-btn-primary"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Render unauthorized state
  if (!isAdmin) {
    return (
      <div className="admin-unauthorized">
        <FaExclamationTriangle size={50} color="#dc3545" />
        <h3>Unauthorized Access</h3>
        <p>You do not have permission to access the admin dashboard.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="admin-btn admin-btn-primary"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="admin-wrapper">
        <div className="admin-header">
          <h1 className="admin-title">Admin Dashboard</h1>
          <div className="admin-actions">
            <button 
              className="admin-btn admin-btn-outline"
              onClick={() => window.location.href = '/'}
            >
              <FaArrowLeft /> Back to App
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'statistics' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <FaChartLine className="admin-tab-icon" /> Statistics
          </button>
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers className="admin-tab-icon" /> Users
          </button>
          <button 
            className={`admin-tab ${activeTab === 'items' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <FaBoxOpen className="admin-tab-icon" /> Items
          </button>
          <button 
            className={`admin-tab ${activeTab === 'trades' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            <FaExchangeAlt className="admin-tab-icon" /> Trades
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div>
            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-stat-label">Total Users</div>
                <div className="admin-stat-number">{statistics.usersCount || 0}</div>
                <div className="admin-stat-change admin-stat-change-positive">
                  +{statistics.newUsers24h || 0} in last 24h
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Active Users</div>
                <div className="admin-stat-number">{statistics.activeUsersCount || 0}</div>
                <div className="admin-stat-change">
                  {statistics.usersCount ? 
                    Math.round((statistics.activeUsersCount / statistics.usersCount) * 100) : 0}% of total
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Items Listed</div>
                <div className="admin-stat-number">{statistics.itemsCount || 0}</div>
                <div className="admin-stat-change admin-stat-change-positive">
                  +{statistics.newItems24h || 0} in last 24h
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Trades</div>
                <div className="admin-stat-number">{statistics.tradesCount || 0}</div>
                <div className="admin-stat-change">
                  {statistics.completedTradesCount || 0} completed
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Total Value</div>
                <div className="admin-stat-number">${(statistics.totalValue || 0).toFixed(2)}</div>
                <div className="admin-stat-change">
                  Avg: ${statistics.itemsCount ? ((statistics.totalValue || 0) / statistics.itemsCount).toFixed(2) : '0.00'}/item
                </div>
              </div>
            </div>

            <div className="admin-container">
              <div className="admin-section-header">
                <h2 className="admin-section-title">System Status</h2>
              </div>
              <div className="admin-table-container">
                <table className="admin-table admin-status-table">
                  <tbody>
                    <tr>
                      <td>
                        <span className="admin-status-indicator admin-status-good"></span>
                        API Server
                      </td>
                      <td>Operational</td>
                      <td>
                        <span className="admin-badge admin-badge-success">100%</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="admin-status-indicator admin-status-good"></span>
                        Database
                      </td>
                      <td>Operational</td>
                      <td>
                        <span className="admin-badge admin-badge-success">99.8%</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="admin-status-indicator admin-status-good"></span>
                        Steam API
                      </td>
                      <td>Operational</td>
                      <td>
                        <span className="admin-badge admin-badge-success">99.5%</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="admin-status-indicator admin-status-good"></span>
                        WebSocket Service
                      </td>
                      <td>Operational</td>
                      <td>
                        <span className="admin-badge admin-badge-success">99.2%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-content">
            <div className="admin-search-bar">
              <FaSearch className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search users by name, Steam ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-search-input"
              />
              <button 
                className="admin-btn admin-btn-primary"
                onClick={() => fetchUsers()}
              >
                Search
              </button>
            </div>
            
            {loading && users.length > 0 ? (
              <div className="admin-loading-overlay">
                <ClipLoader size={30} color="#3a6ff7" />
                <p>Refreshing data...</p>
              </div>
            ) : null}

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className={user.isBanned ? 'admin-row-banned' : ''}>
                        <td>
                          <div className="admin-user-info">
                            <img 
                              src={user.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg'} 
                              alt={user.displayName} 
                              className="admin-user-avatar" 
                            />
                            <div>
                              <div className="admin-user-name">
                                {user.displayName || 'Anonymous User'}
                                {user.isBanned && <span className="admin-banned-badge">Banned</span>}
                              </div>
                              <div className="admin-user-id">{user.steamId || 'No Steam ID'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {renderUserStatus(user)}
                        </td>
                        <td>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td>
                          <div className="admin-actions-inline">
                            <button 
                              className="admin-btn admin-btn-small admin-btn-primary"
                              onClick={() => handleUserClick(user)}
                            >
                              View Details
                            </button>
                            <button 
                              className={`admin-btn admin-btn-small ${user.isBanned ? 'admin-btn-success' : 'admin-btn-danger'}`}
                              onClick={() => handleUserStatus(user._id, user.isBanned ? 'unban' : 'ban')}
                            >
                              {user.isBanned ? 'Unban' : 'Ban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="admin-no-data">
                        <FaInfoCircle size={24} />
                        <p>No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.length > 0 && (
              <div className="admin-pagination">
                <button 
                  className="admin-btn admin-btn-outline"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span className="admin-pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="admin-btn admin-btn-outline"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Items Tab (Placeholder) */}
        {activeTab === 'items' && (
          <div className="admin-placeholder">
            <FaBoxOpen size={64} color="#adb5bd" />
            <h3>Items Management</h3>
            <p>This feature is coming soon!</p>
          </div>
        )}

        {/* Trades Tab (Placeholder) */}
        {activeTab === 'trades' && (
          <div className="admin-placeholder">
            <FaExchangeAlt size={64} color="#adb5bd" />
            <h3>Trades Management</h3>
            <p>This feature is coming soon!</p>
          </div>
        )}

        {/* User Detail Modal */}
        <Modal
          isOpen={isUserModalOpen}
          onRequestClose={handleModalClose}
          className="user-details-modal"
          overlayClassName="user-details-overlay"
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
          ariaHideApp={false} 
          closeTimeoutMS={300}
          style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 9999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            },
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '900px',
              width: '95%',
              maxHeight: '90vh',
              padding: '20px',
              background: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              zIndex: 10000
            }
          }}
        >
          {selectedUser ? (
            <div className="user-details">
              <div className="user-details-header">
                <button 
                  className="back-button"
                  onClick={handleModalClose}
                >
                  <FaArrowLeft /> Back
                </button>
                <h2>User Details: {selectedUser.displayName}</h2>
              </div>

              <div className="user-profile">
                <div className="user-avatar-large">
                  {selectedUser.avatarFull ? (
                    <img 
                      src={selectedUser.avatarFull} 
                      alt={selectedUser.displayName} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg';
                      }}
                    />
                  ) : (
                    <FaUserAltSlash size={50} />
                  )}
                </div>
                <div className="user-info-main">
                  <div className="user-info-row">
                    <div className="user-info-label">Steam ID:</div>
                    <div className="user-info-value">{selectedUser.steamId || 'N/A'}</div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Status:</div>
                    <div className="user-info-value">
                      <span className={`status-dot ${selectedUser.isOnline ? 'online' : 'offline'}`}></span>
                      {selectedUser.isOnline ? 'Online' : 'Offline'}
                      {!selectedUser.isOnline && selectedUser.lastSeen && (
                        <span className="last-seen">
                          (Last seen: {new Date(selectedUser.lastSeen).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Account:</div>
                    <div className="user-info-value">
                      {selectedUser.isBanned ? 
                        <span className="user-banned">BANNED</span> : 
                        <span className="user-active">Active</span>
                      }
                    </div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Joined:</div>
                    <div className="user-info-value">{new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="user-actions">
                    <button
                      className={`action-button ${selectedUser?.isBanned ? 'unban' : 'ban'}`}
                      onClick={() => handleUserStatus(selectedUser?._id, selectedUser?.isBanned ? 'unban' : 'ban')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ClipLoader size={20} color="#fff" />
                      ) : selectedUser?.isBanned ? (
                        <>
                          <FaCheckCircle /> Unban User
                        </>
                      ) : (
                        <>
                          <FaBan /> Ban User
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="user-detail-tabs">
                <button 
                  className={`detail-tab ${userDetailTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setUserDetailTab('inventory')}
                >
                  <FaBoxOpen /> Inventory
                </button>
                <button 
                  className={`detail-tab ${userDetailTab === 'trades' ? 'active' : ''}`}
                  onClick={() => setUserDetailTab('trades')}
                >
                  <FaExchangeAlt /> Trade History
                </button>
              </div>

              {/* Inventory Tab Content */}
              {userDetailTab === 'inventory' && (
                <div className="detail-content inventory-content">
                  {inventoryLoading ? (
                    <div className="loading-container">
                      <ClipLoader color="#3a6ff7" size={40} />
                      <p>Loading inventory...</p>
                    </div>
                  ) : inventoryError ? (
                    <div className="error-message">
                      <FaExclamationTriangle />
                      <p>{inventoryError}</p>
                      <button 
                        className="retry-button"
                        onClick={() => fetchUserInventory(selectedUser.steamId)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : userInventory.length === 0 ? (
                    <div className="empty-state">
                      <FaBoxOpen size={40} />
                      <p>No items found in inventory.</p>
                      <p className="empty-subtitle">The user's inventory may be private or empty.</p>
                    </div>
                  ) : (
                    <div className="inventory-grid">
                      {userInventory.map((item, index) => (
                        <div className="inventory-item" key={item.assetid || item.id || index}>
                          <div className="item-image">
                            <img 
                              src={item.icon_url || item.imageUrl || 'https://community.akamai.steamstatic.com/economy/image/placeholder/360fx360f'} 
                              alt={item.name || item.marketname || 'Item'} 
                            />
                          </div>
                          <div className="item-details">
                            <h4 className="item-name" style={{
                              color: getRarityColor(item.rarity || item.type || '')
                            }}>
                              {item.name || item.marketname || 'Unknown Item'}
                            </h4>
                            <div className="item-meta">
                              <span className="item-wear">{translateWear(item.wear || '')}</span>
                              {item.price && (
                                <span className="item-price">${item.price.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Trades Tab Content */}
              {userDetailTab === 'trades' && (
                <div className="detail-content trades-content">
                  {tradesLoading ? (
                    <div className="loading-container">
                      <ClipLoader color="#3a6ff7" size={40} />
                      <p>Loading trade history...</p>
                    </div>
                  ) : tradesError ? (
                    <div className="error-message">
                      <FaExclamationTriangle />
                      <p>{tradesError}</p>
                      <button 
                        className="retry-button"
                        onClick={() => fetchUserTrades(selectedUser._id)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : userTrades.length === 0 ? (
                    <div className="empty-state">
                      <FaExchangeAlt size={40} />
                      <p>No trades found.</p>
                      <p className="empty-subtitle">The user hasn't made any trades yet.</p>
                    </div>
                  ) : (
                    <div className="trades-list">
                      <table className="trades-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Role</th>
                            <th>Counterparty</th>
                            <th>Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTrades.map((trade) => {
                            // Determine if user is buyer or seller
                            const isSeller = trade.isUserSeller;
                            const counterparty = isSeller 
                              ? (trade.buyer?.displayName || 'Unknown Buyer') 
                              : (trade.seller?.displayName || 'Unknown Seller');
                            const counterpartyAvatar = isSeller
                              ? (trade.buyer?.avatar || null)
                              : (trade.seller?.avatar || null);
                              
                            // Format the trade status for display
                            const getStatusDisplay = (status) => {
                              const statusMap = {
                                'completed': {text: 'Completed', color: '#28a745'},
                                'cancelled': {text: 'Cancelled', color: '#dc3545'},
                                'failed': {text: 'Failed', color: '#dc3545'},
                                'pending': {text: 'Pending', color: '#ffc107'},
                                'awaiting_seller': {text: 'Awaiting Seller', color: '#17a2b8'},
                                'awaiting_confirmation': {text: 'Awaiting Confirmation', color: '#17a2b8'},
                                'offer_sent': {text: 'Offer Sent', color: '#17a2b8'},
                                'created': {text: 'Created', color: '#6c757d'}
                              };
                              return statusMap[status] || {text: status, color: '#6c757d'};
                            };
                            
                            const statusInfo = getStatusDisplay(trade.status);
                            
                            return (
                              <tr key={trade._id} className={`trade-row ${trade.status}`}>
                                <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div className="trade-item">
                                    <img 
                                      src={trade.itemImage || trade.item?.imageUrl || 'https://community.akamai.steamstatic.com/economy/image/placeholder/360fx360f'} 
                                      alt={trade.itemName || trade.item?.marketHashName || 'Item'} 
                                      className="trade-item-img"
                                    />
                                    <span>{trade.itemName || trade.item?.marketHashName || 'Unknown Item'}</span>
                                  </div>
                                </td>
                                <td className={isSeller ? 'seller-role' : 'buyer-role'}>
                                  {isSeller ? 'Seller' : 'Buyer'}
                                </td>
                                <td>
                                  <div className="user-small">
                                    {counterpartyAvatar ? (
                                      <img 
                                        src={counterpartyAvatar} 
                                        alt={counterparty}
                                        className="user-avatar-small" 
                                      />
                                    ) : (
                                      <div className="user-avatar-placeholder-small">
                                        <FaUser size={12} />
                                      </div>
                                    )}
                                    <span>{counterparty}</span>
                                  </div>
                                </td>
                                <td>${(trade.price || 0).toFixed(2)}</td>
                                <td>
                                  <span className="status-badge" style={{backgroundColor: statusInfo.color}}>
                                    {statusInfo.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="error-container">
              <FaExclamationTriangle size={50} color="#dc3545" />
              <h3>Error Loading User</h3>
              <p>Could not load user details. Please try again.</p>
              <button 
                className="admin-btn admin-btn-primary"
                onClick={handleModalClose}
              >
                Close
              </button>
            </div>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default AdminTools;