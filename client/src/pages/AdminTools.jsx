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
  const [userDetailTab, setUserDetailTab] = useState('profile');
  const [userInventoryValue, setUserInventoryValue] = useState(0);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);

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
      isAdmin: user.isAdmin || false,
      isModerator: user.isModerator || false,
      email: user.email || 'N/A',
      tradeUrl: user.tradeUrl || 'N/A',
      balance: user.balance || 0,
      isOnline: user.status?.isOnline || false,
      lastSeen: user.status?.lastSeen || user.lastLoginAt || user.lastLogin || user.createdAt,
      itemCount: user.itemCount || 0,
      tradeCount: user.tradeCount || 0
    };

    // Reset data from previous user
    setUserInventoryValue(0);
    setInventoryError(null);
    
    // Set the user details and open modal
    setSelectedUser(simpleUser);
    setIsUserModalOpen(true);
    
    // Fetch inventory value (total value only)
    fetchUserInventoryValue(user.steamId);
  };
  
  // Fetch user's inventory value
  const fetchUserInventoryValue = async (steamId) => {
    if (!steamId) {
      setInventoryError('No Steam ID available');
      return;
    }
    
    try {
      setInventoryLoading(true);
      console.log(`Fetching inventory value for Steam ID: ${steamId}`);
      
      // Use a timeout to prevent blocking the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Call our server endpoint just to get inventory value
      const response = await axios.get(`${API_URL}/admin/user-inventory-value/${steamId}`, { 
        withCredentials: true,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.data && typeof response.data.totalValue === 'number') {
        setUserInventoryValue(response.data.totalValue);
      } else {
        setUserInventoryValue(0);
      }
    } catch (error) {
      console.error('Error fetching inventory value:', error);
      setInventoryError('Failed to fetch inventory value');
      setUserInventoryValue(0);
    } finally {
      setInventoryLoading(false);
    }
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

  // Handle user role changes
  const handleUserRole = async (userId, role, shouldAdd) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }
    
    try {
      setActionLoading(true);
      const action = shouldAdd ? 'add' : 'remove';
      console.log(`${action}ing ${role} role for user ${userId}...`);
      
      await axios.post(`${API_URL}/admin/users/${userId}/role`, {
        role,
        action
      }, { 
        withCredentials: true,
        timeout: 5000
      });
      
      // Update local user state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { 
                ...user, 
                isAdmin: role === 'admin' ? shouldAdd : user.isAdmin,
                isModerator: role === 'moderator' ? shouldAdd : user.isModerator
              } 
            : user
        )
      );
      
      // Update selected user if it's the same one
      if (selectedUser?._id === userId) {
        setSelectedUser(prev => ({
          ...prev,
          isAdmin: role === 'admin' ? shouldAdd : prev.isAdmin,
          isModerator: role === 'moderator' ? shouldAdd : prev.isModerator
        }));
      }
      
      toast.success(`User ${shouldAdd ? 'is now a' : 'is no longer a'} ${role}`);
    } catch (error) {
      console.error(`Error changing user role:`, error);
      toast.error(`Failed to update user role: ${error.message || 'Server error'}`);
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

  // Create a cleanup function 
  const cleanupModal = () => {
    setSelectedUser(null);
    setUserInventoryValue(0);
    setInventoryError(null);
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
              maxWidth: '600px',
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
                    <div className="user-info-label">Email:</div>
                    <div className="user-info-value">{selectedUser.email || 'N/A'}</div>
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
                      {selectedUser.isAdmin && <span className="user-role admin">Admin</span>}
                      {selectedUser.isModerator && <span className="user-role moderator">Moderator</span>}
                    </div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Joined:</div>
                    <div className="user-info-value">{new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Balance:</div>
                    <div className="user-info-value">${selectedUser.balance.toFixed(2)}</div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Trades:</div>
                    <div className="user-info-value">{selectedUser.tradeCount || 0}</div>
                  </div>
                  <div className="user-info-row">
                    <div className="user-info-label">Inventory Value:</div>
                    <div className="user-info-value">
                      {inventoryLoading ? (
                        <ClipLoader size={16} color="#3a6ff7" />
                      ) : inventoryError ? (
                        <span className="error-text">Error loading</span>
                      ) : (
                        `$${userInventoryValue.toFixed(2)}`
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Management Actions */}
              <div className="user-management">
                <h3>User Management</h3>
                
                <div className="action-buttons">
                  {/* Ban/Unban User */}
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
                  
                  {/* Make Admin */}
                  <button
                    className={`action-button ${selectedUser?.isAdmin ? 'remove-admin' : 'make-admin'}`}
                    onClick={() => handleUserRole(selectedUser?._id, 'admin', !selectedUser?.isAdmin)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ClipLoader size={20} color="#fff" />
                    ) : selectedUser?.isAdmin ? (
                      <>
                        <FaUserAltSlash /> Remove Admin
                      </>
                    ) : (
                      <>
                        <FaUserCheck /> Make Admin
                      </>
                    )}
                  </button>
                  
                  {/* Make Moderator */}
                  <button
                    className={`action-button ${selectedUser?.isModerator ? 'remove-mod' : 'make-mod'}`}
                    onClick={() => handleUserRole(selectedUser?._id, 'moderator', !selectedUser?.isModerator)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ClipLoader size={20} color="#fff" />
                    ) : selectedUser?.isModerator ? (
                      <>
                        <FaUserAltSlash /> Remove Moderator
                      </>
                    ) : (
                      <>
                        <FaUserCheck /> Make Moderator
                      </>
                    )}
                  </button>
                </div>
              </div>
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