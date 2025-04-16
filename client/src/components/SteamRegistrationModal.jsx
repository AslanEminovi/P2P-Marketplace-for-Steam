import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config/constants';
import '../styles/SteamRegistrationModal.css';

const SteamRegistrationModal = ({ user, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validateStep = (stepNum) => {
    const newErrors = {};
    
    if (stepNum === 1) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
    }
    
    if (stepNum === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  
  const prevStep = () => {
    setStep(step - 1);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(step)) {
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Submitting profile data:", formData);
      const response = await axios.post(`${API_URL}/user/complete-profile`, formData, {
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Profile completed successfully!');
        
        // Log the response for debugging
        console.log("Profile completion response:", response.data);
        
        if (onComplete && response.data.user) {
          // Use the user data returned from the server
          console.log("Updating user data with:", response.data.user);
          onComplete(response.data.user);
        } else if (onComplete) {
          // Fallback to the local user update
          const updatedUser = {
            ...user,
            ...formData,
            profileComplete: true
          };
          console.log("Fallback: Updating user data with:", updatedUser);
          onComplete(updatedUser);
        }
        
        // Double check profile completion status
        setTimeout(async () => {
          try {
            const userCheck = await axios.get(`${API_URL}/auth/user`, {
              withCredentials: true
            });
            console.log("User data after profile completion:", userCheck.data);
          } catch (err) {
            console.error("Error checking user data after profile completion:", err);
          }
        }, 1000);
      } else {
        console.error("Profile completion failed:", response.data);
        toast.error(response.data.message || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'An error occurred while saving your profile');
    } finally {
      setLoading(false);
    }
  };
  
  const renderStep1 = () => (
    <div className="steam-reg-step">
      <h2>Welcome to CS2 Marketplace!</h2>
      <p className="steam-reg-info">
        Please complete your profile to get started. This information helps us provide a secure trading experience.
      </p>
      
      <div className="steam-reg-fields">
        <div className="steam-reg-field">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Your first name"
            className={errors.firstName ? 'error' : ''}
          />
          {errors.firstName && <span className="steam-reg-error">{errors.firstName}</span>}
        </div>
        
        <div className="steam-reg-field">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Your last name"
            className={errors.lastName ? 'error' : ''}
          />
          {errors.lastName && <span className="steam-reg-error">{errors.lastName}</span>}
        </div>
      </div>
      
      <div className="steam-reg-buttons">
        <button 
          type="button" 
          className="steam-reg-btn steam-reg-btn-next"
          onClick={nextStep}
        >
          Next
        </button>
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="steam-reg-step">
      <h2>Contact Information</h2>
      <p className="steam-reg-info">
        Please provide your contact details. We'll use these to notify you about trades and important account updates.
      </p>
      
      <div className="steam-reg-fields">
        <div className="steam-reg-field">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Your email address"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="steam-reg-error">{errors.email}</span>}
        </div>
        
        <div className="steam-reg-field">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Your phone number"
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="steam-reg-error">{errors.phone}</span>}
        </div>
      </div>
      
      <div className="steam-reg-buttons">
        <button 
          type="button" 
          className="steam-reg-btn steam-reg-btn-back"
          onClick={prevStep}
        >
          Back
        </button>
        <button 
          type="button" 
          className="steam-reg-btn steam-reg-btn-next"
          onClick={nextStep}
        >
          Next
        </button>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="steam-reg-step">
      <h2>Additional Information</h2>
      <p className="steam-reg-info">
        Please provide your location. This information helps us tailor our services to your region.
      </p>
      
      <div className="steam-reg-fields">
        <div className="steam-reg-field">
          <label htmlFor="country">Country</label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Your country"
            className={errors.country ? 'error' : ''}
          />
          {errors.country && <span className="steam-reg-error">{errors.country}</span>}
        </div>
        
        <div className="steam-reg-field">
          <label htmlFor="city">City</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Your city"
            className={errors.city ? 'error' : ''}
          />
          {errors.city && <span className="steam-reg-error">{errors.city}</span>}
        </div>
      </div>
      
      <div className="steam-reg-buttons">
        <button 
          type="button" 
          className="steam-reg-btn steam-reg-btn-back"
          onClick={prevStep}
        >
          Back
        </button>
        <button 
          type="submit" 
          className="steam-reg-btn steam-reg-btn-submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Complete Registration'}
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="steam-reg-modal-overlay">
      <div className="steam-reg-modal">
        <div className="steam-reg-header">
          <div className="steam-reg-steam-info">
            <img 
              src={user?.avatar || 'https://via.placeholder.com/40'} 
              alt="Steam Profile" 
              className="steam-reg-avatar"
            />
            <div className="steam-reg-steam-name">
              <span>Steam Account</span>
              <strong>{user?.displayName}</strong>
            </div>
          </div>
          
          <div className="steam-reg-steps">
            <div className={`steam-reg-step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`steam-reg-step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`steam-reg-step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`steam-reg-step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`steam-reg-step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </form>
      </div>
    </div>
  );
};

export default SteamRegistrationModal; 