import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSteamLogin = async () => {
    try {
      window.location.href = `${process.env.REACT_APP_API_URL}/auth/steam`;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-white bg-opacity-10 p-8 rounded-lg shadow-xl backdrop-blur-md">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Sign In</h2>
        <button
          onClick={handleSteamLogin}
          className="flex items-center justify-center w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
        >
          <img
            src="/steam-icon.png"
            alt="Steam"
            className="w-6 h-6 mr-2"
          />
          Sign in with Steam
        </button>
      </div>
    </div>
  );
};

export default Login; 