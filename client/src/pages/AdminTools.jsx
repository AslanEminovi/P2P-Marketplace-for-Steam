import React, { useState, useEffect } from 'react';
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
  FaArrowLeft
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './AdminTools.css';

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

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/check`, { withCredentials: true });
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
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
      
      if (response.data && response.data.length > 0) {
        console.log('First user data sample:', {
          id: response.data[0]._id,
          displayName: response.data[0].displayName,
          avatar: response.data[0].avatar,
          avatarMedium: response.data[0].avatarMedium,
          avatarFull: response.data[0].avatarFull,
          steamId: response.data[0].steamId
        });
      }
      
      setUsers(response.data);
      setFilteredUsers(response.data);
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
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  // Handle user ban/unban
  const handleUserStatus = async (userId, action) => {
    try {
      setActionLoading(true);
      await axios.post(`${API_URL}/admin/users/${userId}/${action}`, {}, { withCredentials: true });
      toast.success(`User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`);
      
      // Update user in local state
      const updatedUsers = users.map(user => {
        if (user._id === userId) {
          return { ...user, isBanned: action === 'ban' };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.steamId?.includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      
      // Update selected user if modal is open
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, isBanned: action === 'ban' });
      }
    } catch (error) {
      console.error(`Error ${action === 'ban' ? 'banning' : 'unbanning'} user:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
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
        <div className="admin-container">
          <div className="admin-section-header">
            <h2 className="admin-section-title">User Management</h2>
            <div>
              <input 
                type="text" 
                className="admin-search-input" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Steam ID</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {user.avatarFull || user.avatar ? (
                            <img 
                              src={user.avatarFull || user.avatarMedium || user.avatar} 
                              alt={user.displayName} 
                              style={{ width: '30px', height: '30px', borderRadius: '50%' }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '30px', 
                              height: '30px', 
                              borderRadius: '50%', 
                              backgroundColor: '#3a6ff7', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              color: 'white',
                              fontWeight: 'bold' 
                            }}>
                              {user.displayName ? user.displayName[0].toUpperCase() : '?'}
                            </div>
                          )}
                          <span>{user.displayName || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td>{user.steamId || 'N/A'}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        {user.isBanned ? (
                          <span className="admin-badge admin-badge-danger">Banned</span>
                        ) : (
                          <span className="admin-badge admin-badge-success">Active</span>
                        )}
                      </td>
                      <td>{user.itemCount || 0}</td>
                      <td>
                        <button 
                          className="admin-btn admin-btn-outline admin-btn-sm"
                          onClick={() => handleUserClick(user)}
                        >
                          <FaInfoCircle /> Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      {searchTerm ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
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
        onRequestClose={() => setIsUserModalOpen(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        {selectedUser && (
          <>
            <div className="admin-modal-header">
              {selectedUser.avatarFull || selectedUser.avatar ? (
                <img 
                  src={selectedUser.avatarFull || selectedUser.avatarMedium || selectedUser.avatar} 
                  alt={selectedUser.displayName} 
                  className="admin-user-avatar" 
                />
              ) : (
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  backgroundColor: '#3a6ff7', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.25rem' 
                }}>
                  {selectedUser.displayName ? selectedUser.displayName[0].toUpperCase() : '?'}
                </div>
              )}
              <div className="admin-user-info">
                <h4>{selectedUser.displayName || 'Anonymous User'}</h4>
                <p>Member since {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="admin-modal-body">
              <div className="admin-user-detail-section">
                <h5>User Information</h5>
                <div className="admin-stats-grid">
                  <div>
                    <p><strong>Steam ID:</strong></p>
                    <p>{selectedUser.steamId || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Email:</strong></p>
                    <p>{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Status:</strong></p>
                    <p>
                      {selectedUser.isBanned ? (
                        <span className="admin-badge admin-badge-danger">Banned</span>
                      ) : (
                        <span className="admin-badge admin-badge-success">Active</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p><strong>Last Login:</strong></p>
                    <p>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="admin-user-detail-section">
                <h5>Activity</h5>
                <div className="admin-stats-grid">
                  <div>
                    <p><strong>Items:</strong></p>
                    <p>{selectedUser.itemCount || 0}</p>
                  </div>
                  <div>
                    <p><strong>Trades:</strong></p>
                    <p>{selectedUser.tradeCount || 0}</p>
                  </div>
                  <div>
                    <p><strong>Completed:</strong></p>
                    <p>{selectedUser.completedTradeCount || 0}</p>
                  </div>
                  <div>
                    <p><strong>Last Active:</strong></p>
                    <p>{selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  className="admin-btn admin-btn-outline"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Close
                </button>
                {selectedUser.isBanned ? (
                  <button
                    className="admin-btn admin-btn-success"
                    onClick={() => handleUserStatus(selectedUser._id, 'unban')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ClipLoader size={14} color="#ffffff" />
                    ) : (
                      <>
                        <FaUserCheck /> Unban User
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => handleUserStatus(selectedUser._id, 'ban')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ClipLoader size={14} color="#ffffff" />
                    ) : (
                      <>
                        <FaUserAltSlash /> Ban User
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AdminTools; 