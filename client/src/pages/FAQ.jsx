import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import './FAQ.css';

const FAQ = () => {
  // State to track which FAQ items are open
  const [openItems, setOpenItems] = useState({});

  // Toggle function for FAQ accordion
  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // FAQ data structure - each item has a question and answer
  const faqItems = [
    {
      question: "What is CS2 Marketplace?",
      answer: "CS2 Marketplace is the leading platform for buying and selling Counter-Strike 2 items in Georgia. We provide a secure environment for trading CS2 skins, keys, and other items at fair market prices with lower fees than other marketplaces."
    },
    {
      question: "How do I sell my CS2 items?",
      answer: "To sell your items, first sign in with Steam. Then navigate to your Inventory page, select the items you want to sell, set your price, and list them on the marketplace. Our system will handle the trade offers and transactions securely."
    },
    {
      question: "How do I buy items?",
      answer: "Browse the marketplace, find items you're interested in, add funds to your wallet, and purchase directly. The system will automatically send a trade offer to complete the exchange once payment is confirmed."
    },
    {
      question: "Is it safe to trade on CS2 Marketplace?",
      answer: "Yes, we use secure Steam authentication and a trusted trading system. All transactions are monitored, and our escrow system ensures both buyers and sellers are protected. We never ask for your Steam credentials or sensitive information."
    },
    {
      question: "What fees does CS2 Marketplace charge?",
      answer: "We charge a competitive 5% fee on successful sales. This is lower than many other marketplaces and helps us maintain the platform and provide secure trading services. There are no fees to list items or to make purchases."
    },
    {
      question: "How long does it take to receive my money after a sale?",
      answer: "Once your item is sold and the trade is completed, the funds (minus our commission) are immediately available in your CS2 Marketplace wallet. You can use these funds for future purchases or request a withdrawal."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We currently support credit/debit cards, bank transfers, and popular e-wallets for adding funds to your account. For withdrawals, we support bank transfers and e-wallets, with processing times varying by method."
    },
    {
      question: "What happens if a trade fails?",
      answer: "If a trade fails for technical reasons, the transaction is automatically cancelled and any funds are returned to the buyer. If there are issues with a specific trade, our support team can investigate and help resolve the situation."
    },
    {
      question: "Can I trade with users from other countries?",
      answer: "Yes, CS2 Marketplace supports international trading. However, please be aware of any region restrictions that Valve may impose on certain items or trades. Our platform will notify you if there are any restrictions on specific trades."
    },
    {
      question: "How do I contact customer support?",
      answer: "You can reach our customer support team through the Contact Us page on our website. We aim to respond to all inquiries within 24 hours. For faster assistance, please provide detailed information about your issue."
    }
  ];

  return (
    <div className="faq-container">
      <div className="faq-header">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to the most common questions about CS2 Marketplace</p>
      </div>

      <div className="faq-content">
        {faqItems.map((item, index) => (
          <div 
            key={index} 
            className={`faq-item ${openItems[index] ? 'open' : ''}`}
            onClick={() => toggleItem(index)}
          >
            <div className="faq-question">
              <h3>{item.question}</h3>
              <div className="faq-icon">
                {openItems[index] ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            
            <div className={`faq-answer ${openItems[index] ? 'show' : ''}`}>
              <p>{item.answer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="faq-footer">
        <h3>Still have questions?</h3>
        <p>If you couldn't find the answer to your question, please contact our support team.</p>
        <a href="/contact" className="faq-contact-button">Contact Support</a>
      </div>
    </div>
  );
};

export default FAQ; 