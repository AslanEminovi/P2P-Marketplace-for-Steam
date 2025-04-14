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
  FaTimesCircle
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
  const handleUserClick = async (user) => {
    try {
      console.log('User clicked:', user);
      
      if (!user || typeof user !== 'object' || !user._id) {
        console.error('Invalid user data for details view:', user);
        toast.error('Invalid user data');
        return;
      }

      setDetailsLoading(true);
      setIsUserModalOpen(true);
      
      console.log(`Fetching details for user ID: ${user._id}`);
      
      // Log user data for debugging
      console.log('User data before fetch:', {
        id: user._id,
        displayName: user.displayName,
        steamId: user.steamId,
        isBanned: user.isBanned
      });

      try {
        // Fetch detailed user information with simplified endpoint
        const response = await axios.get(`${API_URL}/admin/users/${user._id}`, { 
          withCredentials: true,
          timeout: 15000 // 15 second timeout
        });
        
        console.log('User details response received:', response.status);
        console.log('User details data:', response.data);

        if (response.data && response.data.user) {
          const userData = response.data.user;
          const items = response.data.items || [];
          const trades = response.data.trades || [];

          console.log('Processing user data:', {
            id: userData._id,
            displayName: userData.displayName,
            itemsCount: items.length,
            tradesCount: trades.length
          });

          // Create enhanced user object with all necessary data
          const enhancedUser = {
            ...userData,
            items,
            trades,
            lastActive: userData.lastLoginAt || userData.lastLogin || userData.createdAt,
            isOnline: userStatus[user._id]?.isOnline || false,
            lastSeen: userStatus[user._id]?.lastSeen || userData.lastLoginAt
          };

          setUserDetails(enhancedUser);
          setSelectedUser(enhancedUser);
          console.log('User details successfully processed and modal should be displaying data');
        } else {
          console.error('User details not found in response');
          toast.error('User details not found in server response');
          // Don't close modal yet - show error in the modal
        }
      } catch (fetchError) {
        console.error('Error fetching user details:', fetchError);
        toast.error('Failed to load user details: ' + (fetchError.message || 'Network error'));
        // Don't close modal - show error in the modal
      }
    } catch (error) {
      console.error('Error handling user click:', error);
      toast.error('Failed to process user details');
      setIsUserModalOpen(false);
    } finally {
      setDetailsLoading(false);
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
          onRequestClose={() => {
            setIsUserModalOpen(false);
            setUserDetails(null);
          }}
          className="user-details-modal"
          overlayClassName="user-details-overlay"
        >
          {detailsLoading ? (
            <div className="loading-container">
              <ClipLoader color="#007bff" size={50} />
              <p>Loading user details...</p>
            </div>
          ) : selectedUser ? (
            <div className="user-details">
              <div className="user-details-header">
                <button 
                  className="back-button"
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setUserDetails(null);
                  }}
                >
                  <FaArrowLeft /> Back
                </button>
                <h2>User Details</h2>
              </div>

              <div className="user-profile">
                <div className="user-avatar-large">
                  {selectedUser.avatarFull ? (
                    <img src={selectedUser.avatarFull} alt={selectedUser.displayName} />
                  ) : (
                    <FaUserAltSlash size={50} />
                  )}
                </div>
                <div className="user-info-main">
                  <h3>{selectedUser.displayName || 'Anonymous User'}</h3>
                  <p className="steam-id">Steam ID: {selectedUser.steamId || 'N/A'}</p>
                  <div className="user-status-indicator">
                    <FaCircle 
                      className={selectedUser.isOnline ? 'status-online' : 'status-offline'} 
                      size={12} 
                    />
                    <span>{selectedUser.isOnline ? 'Online' : 'Offline'}</span>
                    {!selectedUser.isOnline && selectedUser.lastSeen && (
                      <span className="last-seen">
                        Last seen: {new Date(selectedUser.lastSeen).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-stats">
                <div className="stat-item">
                  <FaBoxOpen />
                  <span>{selectedUser.items?.length || 0} Items</span>
                </div>
                <div className="stat-item">
                  <FaExchangeAlt />
                  <span>{selectedUser.trades?.length || 0} Trades</span>
                </div>
                <div className="stat-item">
                  <FaCalendarCheck />
                  <span>Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
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

              <div className="user-history">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {selectedUser?.trades?.slice(0, 5).map(trade => (
                    <div key={trade._id} className="activity-item">
                      <FaHistory />
                      <span>
                        {trade.status === 'completed' ? 'Completed' : 'Pending'} trade
                        {trade.status === 'completed' ? ` for $${trade.price}` : ''}
                      </span>
                      <span className="activity-date">
                        {new Date(trade.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {(!selectedUser?.trades || selectedUser.trades.length === 0) && (
                    <div className="no-activity">
                      <FaInfoCircle />
                      <span>No recent activity</span>
                    </div>
                  )}
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
                onClick={() => setIsUserModalOpen(false)}
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