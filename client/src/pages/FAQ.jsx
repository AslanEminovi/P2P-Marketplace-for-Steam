import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './FAQ.css';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="faq-item">
      <div 
        className={`faq-question ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3>{question}</h3>
        <div className="faq-icon">
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
        <p>{answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const faqData = [
    {
      category: "Account & Authentication",
      items: [
        {
          question: "How do I sign up for CS2 Marketplace?",
          answer: "Sign up is simple! Click on 'Sign in with Steam' in the top right corner of our website. You'll be directed to the Steam login page where you can authenticate your account. Once you sign in through Steam, your CS2 Marketplace account is automatically created."
        },
        {
          question: "Is my Steam account secure when I log in?",
          answer: "Yes, your Steam account is completely secure. We use the official Steam OpenID authentication which means we never see your Steam password. This authentication method only shares basic public information that you've allowed to be visible in your Steam profile."
        },
        {
          question: "Why do I need to set up my Steam trade URL?",
          answer: "Your Steam trade URL is required to facilitate trades on our platform. Without it, other users cannot send you trade offers for items. We only use this URL for legitimate trade purposes and never for unauthorized access to your account."
        }
      ]
    },
    {
      category: "Trading & Marketplace",
      items: [
        {
          question: "How do I sell my CS2 items?",
          answer: "To sell your items, navigate to your Inventory page, select the item you wish to sell, click the 'Sell' button, set your desired price, and confirm the listing. Your item will then appear on the marketplace for buyers to see."
        },
        {
          question: "What fees does CS2 Marketplace charge?",
          answer: "We charge a competitive 5% fee on successful sales. This fee helps us maintain the platform, ensure security, and continue improving our services. The fee is automatically calculated when you list your item."
        },
        {
          question: "How long does it take to complete a trade?",
          answer: "Most trades are processed within minutes. However, completion time can vary depending on Steam's API status and both users' availability to confirm the trade. You'll receive notifications throughout the process to keep you updated."
        },
        {
          question: "Can I cancel a listing or trade?",
          answer: "Yes, you can cancel a listing at any time before it's sold by going to your 'My Listings' page and clicking the 'Cancel' button on the item. For trades in progress, cancellation options depend on the current stage of the trade process."
        }
      ]
    },
    {
      category: "Items & Inventory",
      items: [
        {
          question: "Why can't I see my inventory items?",
          answer: "This could be due to several reasons: your Steam inventory might be set to private (needs to be public), Steam servers might be experiencing issues, or your inventory might be taking longer to load. Try refreshing your inventory or checking your Steam privacy settings."
        },
        {
          question: "How often is my inventory updated?",
          answer: "Your inventory is updated every time you visit your Inventory page. We also automatically refresh it when you complete a trade. If you've made changes on Steam and don't see them reflected, try clicking the refresh button on your Inventory page."
        },
        {
          question: "Are there restrictions on what items I can trade?",
          answer: "Yes, there are some restrictions. Items must be tradable according to Steam's rules (not market or trade restricted). Additionally, we only support CS2 items currently. Make sure your items don't have any active trade holds from Steam."
        }
      ]
    },
    {
      category: "Security & Support",
      items: [
        {
          question: "Is it safe to trade on CS2 Marketplace?",
          answer: "Yes, we've built our platform with security as a top priority. We use secure authentication methods, encrypted connections, and automated trade systems to ensure a safe trading environment. Our team also actively monitors for suspicious activity."
        },
        {
          question: "What should I do if I encounter an issue?",
          answer: "If you encounter any problems, please contact our support team through the 'Contact Us' page. Provide as much detail as possible about the issue, including screenshots if applicable. Our team aims to respond to all inquiries within 24 hours."
        },
        {
          question: "How do I report suspicious users?",
          answer: "If you notice suspicious behavior from another user, please report them immediately. You can do this by visiting their profile and clicking the 'Report User' button, or by contacting our support team with details about the incident."
        },
        {
          question: "What measures do you take to prevent scams?",
          answer: "We have multiple security measures in place, including trade verification processes, user reputation systems, and automated monitoring for suspicious activities. We also regularly update our security protocols to address new potential threats."
        }
      ]
    }
  ];

  return (
    <div className="faq-page">
      <div className="faq-container">
        <div className="faq-header">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about using CS2 Marketplace</p>
        </div>

        <div className="faq-content">
          {faqData.map((category, index) => (
            <div key={index} className="faq-category">
              <h2>{category.category}</h2>
              <div className="faq-items">
                {category.items.map((item, itemIndex) => (
                  <FAQItem 
                    key={itemIndex} 
                    question={item.question} 
                    answer={item.answer} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="faq-footer">
          <h3>Still have questions?</h3>
          <p>If you couldn't find the answer to your question, feel free to contact our support team.</p>
          <a href="/contact" className="contact-btn">Contact Us</a>
        </div>
      </div>
    </div>
  );
};

export default FAQ; 