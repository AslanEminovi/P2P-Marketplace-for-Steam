import React from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  // Get current date for the "Last Updated" section
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="privacy-container">
      <div className="privacy-header">
        <h1>Privacy Policy</h1>
        <p className="privacy-last-updated">Last Updated: {currentDate}</p>
      </div>

      <div className="privacy-content">
        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <p>At CS2 Marketplace, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>
          <p>Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the site or use our services.</p>
        </section>

        <section className="privacy-section">
          <h2>2. Information We Collect</h2>
          <p>We collect several types of information from and about users of our website, including:</p>
          
          <h3>2.1 Personal Data</h3>
          <p>When you create an account, we collect information through your Steam authentication, which may include:</p>
          <ul>
            <li>Your Steam ID and account name</li>
            <li>Your profile picture and display name</li>
            <li>Your email address (if provided to Steam and shared with us)</li>
            <li>Your inventory items related to Counter-Strike 2</li>
          </ul>
          
          <h3>2.2 Transaction Information</h3>
          <p>When you use our marketplace to buy or sell items, we collect information related to those transactions, including:</p>
          <ul>
            <li>Items bought or sold</li>
            <li>Transaction dates and amounts</li>
            <li>Payment methods used</li>
            <li>Transaction history</li>
          </ul>
          
          <h3>2.3 Technical Data</h3>
          <p>We automatically collect certain information when you visit our website, including:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Device information</li>
            <li>Cookies and usage data</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for various purposes, including:</p>
          <ul>
            <li>To create and maintain your account</li>
            <li>To provide and maintain our service</li>
            <li>To process transactions and send related information</li>
            <li>To verify item ownership and facilitate trades</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information to improve our service</li>
            <li>To monitor the usage of our service</li>
            <li>To detect, prevent, and address technical issues</li>
            <li>To protect against fraudulent or unauthorized transactions</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. Data Security</h2>
          <p>The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
          <p>We implement a variety of security measures when a user enters, submits, or accesses their information to maintain the safety of your personal information, including:</p>
          <ul>
            <li>Using secure socket layer technology (SSL)</li>
            <li>Encrypting sensitive information</li>
            <li>Regularly reviewing our information collection, storage, and processing practices</li>
            <li>Restricting access to personal information to our employees and contractors on a need-to-know basis</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>5. Data Retention</h2>
          <p>We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.</p>
          <p>When you request to delete your account, we will delete your personal information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with investigations, and enforce our Terms of Service.</p>
        </section>

        <section className="privacy-section">
          <h2>6. Cookies and Tracking Technologies</h2>
          <p>We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</p>
          <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
          <p>The types of cookies we use include:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Necessary for the website to function properly</li>
            <li><strong>Functionality cookies:</strong> Enable the website to remember choices you make</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website</li>
            <li><strong>Advertising cookies:</strong> Used to deliver advertisements relevant to you</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>7. Third-Party Services</h2>
          <p>Our service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>
          <p>We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.</p>
          <p>Third-party services we may use include:</p>
          <ul>
            <li>Steam API for authentication and inventory access</li>
            <li>Payment processors to handle transactions</li>
            <li>Analytics providers to help us understand website usage</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>8. Your Data Protection Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>The right to access</strong> – You have the right to request copies of your personal data.</li>
            <li><strong>The right to rectification</strong> – You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
            <li><strong>The right to erasure</strong> – You have the right to request that we erase your personal data, under certain conditions.</li>
            <li><strong>The right to restrict processing</strong> – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
            <li><strong>The right to object to processing</strong> – You have the right to object to our processing of your personal data, under certain conditions.</li>
            <li><strong>The right to data portability</strong> – You have the right to request that we transfer the data we have collected to another organization, or directly to you, under certain conditions.</li>
          </ul>
          <p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at <a href="mailto:privacy@cs2marketplace.com">privacy@cs2marketplace.com</a>.</p>
        </section>

        <section className="privacy-section">
          <h2>9. Children's Privacy</h2>
          <p>Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your Child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.</p>
        </section>

        <section className="privacy-section">
          <h2>10. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.</p>
          <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
        </section>

        <section className="privacy-section">
          <h2>11. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <ul>
            <li>By email: <a href="mailto:privacy@cs2marketplace.com">privacy@cs2marketplace.com</a></li>
            <li>Through the contact form on our website: <a href="/contact">Contact Us</a></li>
          </ul>
        </section>
      </div>

      <div className="privacy-footer">
        <p>By using CS2 Marketplace, you acknowledge that you have read and understood this Privacy Policy.</p>
        <a href="/contact" className="privacy-contact-button">Contact Us</a>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 