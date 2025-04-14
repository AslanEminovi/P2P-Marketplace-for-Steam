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

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get('/api/admin/check');
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Failed to verify admin status');
      }
    };

    checkAdminStatus();

    // Listen for user status updates
    const handleUserStatusUpdate = (data) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === data.userId 
            ? { ...user, status: data.status }
            : user
        )
      );
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
  }, [isAdmin]);

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
      const response = await axios.get(`${API_URL}/admin/users`, { withCredentials: true });
      console.log('Users data received:', response.data);
      
      if (response.data && response.data.users) {
        console.log('First user data sample:', {
          id: response.data.users[0]?._id,
          displayName: response.data.users[0]?.displayName,
          avatar: response.data.users[0]?.avatar,
          avatarMedium: response.data.users[0]?.avatarMedium,
          avatarFull: response.data.users[0]?.avatarFull,
          steamId: response.data.users[0]?.steamId
        });
        
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
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
      const response = await axios.get(`${API_URL}/admin/statistics`, { withCredentials: true });
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
      
      if (!user || typeof user !== 'object') {
        toast.error('Invalid user data');
        return;
      }

      setDetailsLoading(true);
      setIsUserModalOpen(true);

      // Fetch detailed user information
      const response = await axios.get(`${API_URL}/admin/users/${user._id}`, { withCredentials: true });
      console.log('User details received:', response.data);

      const userData = response.data.user;
      const items = response.data.items || [];
      const trades = response.data.trades || [];

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
    } catch (error) {
      console.error('Error showing user details:', error);
      toast.error('Failed to load user details');
      setIsUserModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle user ban/unban
  const handleUserStatus = async (userId, action) => {
    try {
      setActionLoading(true);
      const endpoint = action === 'ban' ? 'ban' : 'unban';
      await axios.post(`${API_URL}/admin/users/${userId}/${endpoint}`, {}, { withCredentials: true });
      
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
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const renderUserStatus = (status) => {
    if (!status) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-gray-600">
          {status.isOnline ? 'Online' : `Last seen: ${new Date(status.lastSeen).toLocaleString()}`}
        </span>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="admin-loading">
        <ClipLoader size={50} color="#3a6ff7" />
        <p>Loading admin tools...</p>
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
            <button className="admin-btn admin-btn-outline">
              <FaCog /> Settings
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
                <div className="admin-stat-number">{statistics.usersCount}</div>
                <div className="admin-stat-change admin-stat-change-positive">
                  +{statistics.newUsers24h} in last 24h
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Active Users</div>
                <div className="admin-stat-number">{statistics.activeUsersCount}</div>
                <div className="admin-stat-change">
                  {Math.round((statistics.activeUsersCount / statistics.usersCount) * 100)}% of total
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Items Listed</div>
                <div className="admin-stat-number">{statistics.itemsCount}</div>
                <div className="admin-stat-change admin-stat-change-positive">
                  +{statistics.newItems24h} in last 24h
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat-label">Trades</div>
                <div className="admin-stat-number">{statistics.tradesCount}</div>
                <div className="admin-stat-change">
                  {statistics.completedTradesCount} completed
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
                        <span className="admin-status-indicator admin-status-warning"></span>
                        WebSocket Service
                      </td>
                      <td>Degraded Performance</td>
                      <td>
                        <span className="admin-badge admin-badge-warning">95.2%</span>
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={user.avatar}
                            alt={user.displayName}
                            className="h-10 w-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                            <div className="text-sm text-gray-500">{user.steamId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderUserStatus(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.balance?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleUserClick(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Items Tab (Placeholder) */}
        {activeTab === 'items' && (
          <div className="admin-placeholder">
            <div className="admin-placeholder-content">
              <FaBoxOpen className="admin-placeholder-icon" />
              <h3>Items Management</h3>
              <p>This feature is under development. Coming soon!</p>
            </div>
          </div>
        )}

        {/* Trades Tab (Placeholder) */}
        {activeTab === 'trades' && (
          <div className="admin-placeholder">
            <div className="admin-placeholder-content">
              <FaExchangeAlt className="admin-placeholder-icon" />
              <h3>Trades Management</h3>
              <p>This feature is under development. Coming soon!</p>
            </div>
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
                  className={`action-button ${selectedUser.isBanned ? 'unban' : 'ban'}`}
                  onClick={() => handleUserStatus(selectedUser._id, selectedUser.isBanned ? 'unban' : 'ban')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ClipLoader size={20} color="#fff" />
                  ) : selectedUser.isBanned ? (
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
                  {selectedUser.trades?.slice(0, 5).map(trade => (
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
                  {(!selectedUser.trades || selectedUser.trades.length === 0) && (
                    <div className="no-activity">
                      <FaInfoCircle />
                      <span>No recent activity</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default AdminTools;