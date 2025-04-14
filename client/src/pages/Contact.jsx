import React, { useState } from 'react';
import { FaEnvelope, FaDiscord, FaMapMarkerAlt, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 20) {
      newErrors.message = 'Message should be at least 20 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset submission states
    setSubmitSuccess(false);
    setSubmitError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real implementation, you would send the form data to your server
      // For demonstration, we'll simulate a successful submission after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful submission
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setSubmitError('Failed to send message. Please try again later.');
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>Get in touch with our team for any questions or support needs</p>
      </div>
      
      <div className="contact-content">
        <div className="contact-info">
          <div className="contact-card">
            <div className="contact-icon">
              <FaEnvelope />
            </div>
            <h3>Email Us</h3>
            <p>Our friendly team is here to help</p>
            <a href="mailto:support@cs2marketplace.com">support@cs2marketplace.com</a>
          </div>
          
          <div className="contact-card">
            <div className="contact-icon">
              <FaDiscord />
            </div>
            <h3>Join Our Discord</h3>
            <p>For community support and updates</p>
            <a href="https://discord.gg/cs2market" target="_blank" rel="noopener noreferrer">discord.gg/cs2market</a>
          </div>
          
          <div className="contact-card">
            <div className="contact-icon">
              <FaMapMarkerAlt />
            </div>
            <h3>Our Location</h3>
            <p>Based in Tbilisi, Georgia</p>
            <span>Supporting users worldwide</span>
          </div>
        </div>
        
        <div className="contact-form-container">
          <h2>Send Us a Message</h2>
          
          {submitSuccess ? (
            <div className="contact-success">
              <div className="success-icon">✓</div>
              <h3>Message Sent Successfully!</h3>
              <p>Thank you for contacting us. We'll get back to you as soon as possible.</p>
              <button onClick={() => setSubmitSuccess(false)}>Send Another Message</button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              {submitError && (
                <div className="error-message global-error">
                  {submitError}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="What is this regarding?"
                  className={errors.subject ? 'error' : ''}
                />
                {errors.subject && <div className="error-message">{errors.subject}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help you"
                  rows="5"
                  className={errors.message ? 'error' : ''}
                ></textarea>
                {errors.message && <div className="error-message">{errors.message}</div>}
              </div>
              
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <div className="contact-faq-section">
        <h2>Frequently Asked Questions</h2>
        <p>Can't find what you're looking for? Check our FAQ section for more information.</p>
        <a href="/faq" className="faq-button">Visit FAQ</a>
      </div>
    </div>
  );
};

export default Contact; 