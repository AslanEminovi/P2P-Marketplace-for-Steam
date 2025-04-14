import React from 'react';
import { FaShieldAlt, FaLock, FaCookieBite, FaUserShield, FaGlobe } from 'react-icons/fa';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  // Function to scroll to a specific section
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        <div className="privacy-content">
          <aside className="privacy-toc">
            <h2>Table of Contents</h2>
            <ul>
              <li onClick={() => scrollToSection('information-collection')}><FaUserShield /> Information We Collect</li>
              <li onClick={() => scrollToSection('information-use')}><FaShieldAlt /> How We Use Your Information</li>
              <li onClick={() => scrollToSection('information-sharing')}><FaGlobe /> Information Sharing</li>
              <li onClick={() => scrollToSection('data-security')}><FaLock /> Data Security</li>
              <li onClick={() => scrollToSection('cookies')}><FaCookieBite /> Cookies and Tracking</li>
              <li onClick={() => scrollToSection('rights')}><FaUserShield /> Your Rights</li>
              <li onClick={() => scrollToSection('changes')}><FaShieldAlt /> Changes to This Policy</li>
              <li onClick={() => scrollToSection('contact')}><FaGlobe /> Contact Us</li>
            </ul>
          </aside>

          <main className="privacy-main">
            <section id="information-collection" className="privacy-section">
              <h2><FaUserShield /> Information We Collect</h2>
              <div className="section-content">
                <h3>Personal Information</h3>
                <p>We may collect the following types of personal information when you use our CS2 Marketplace:</p>
                <ul>
                  <li><strong>Account Information:</strong> When you create an account, we collect your Steam ID, username, email address, and profile picture.</li>
                  <li><strong>Transaction Information:</strong> We collect information about the items you list, buy, or trade on our platform, including item descriptions, prices, and transaction dates.</li>
                  <li><strong>Communication Information:</strong> If you contact our support team or communicate with other users, we collect the content of those communications.</li>
                  <li><strong>Steam Inventory Information:</strong> With your permission, we access your Steam inventory data to facilitate trading and listing of items.</li>
                </ul>

                <h3>Automatically Collected Information</h3>
                <p>When you access our platform, we automatically collect:</p>
                <ul>
                  <li><strong>Device Information:</strong> We collect information about your device, including IP address, browser type, operating system, and device identifiers.</li>
                  <li><strong>Usage Information:</strong> We collect information about how you interact with our platform, including pages visited, time spent, and actions taken.</li>
                  <li><strong>Location Information:</strong> We may collect approximate location information based on your IP address.</li>
                </ul>
              </div>
            </section>

            <section id="information-use" className="privacy-section">
              <h2><FaShieldAlt /> How We Use Your Information</h2>
              <div className="section-content">
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide, maintain, and improve our platform</li>
                  <li>Process transactions and facilitate trades</li>
                  <li>Authenticate your identity and maintain account security</li>
                  <li>Communicate with you about your account, transactions, and platform updates</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Monitor and analyze usage patterns to improve user experience</li>
                  <li>Prevent fraudulent activity and ensure compliance with our terms of service</li>
                  <li>Personalize your experience by showing content tailored to your interests</li>
                </ul>
              </div>
            </section>

            <section id="information-sharing" className="privacy-section">
              <h2><FaGlobe /> Information Sharing</h2>
              <div className="section-content">
                <p>We may share your information with:</p>
                <ul>
                  <li><strong>Other Users:</strong> Certain information, such as your username and profile picture, is visible to other users to facilitate transactions.</li>
                  <li><strong>Service Providers:</strong> We share information with third-party vendors who provide services on our behalf, such as payment processing, data analysis, and customer support.</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law, legal process, or governmental request.</li>
                  <li><strong>Business Transfers:</strong> If our company is acquired or merged with another company, your information may be transferred as part of that transaction.</li>
                </ul>
                <p>We do not sell your personal information to third parties.</p>
              </div>
            </section>

            <section id="data-security" className="privacy-section">
              <h2><FaLock /> Data Security</h2>
              <div className="section-content">
                <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
                <ul>
                  <li>Encryption of sensitive data both in transit and at rest</li>
                  <li>Regular security assessments and vulnerability testing</li>
                  <li>Access controls and authentication procedures</li>
                  <li>Regular backups to prevent data loss</li>
                  <li>Employee training on data security best practices</li>
                </ul>
                <p>However, no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
              </div>
            </section>

            <section id="cookies" className="privacy-section">
              <h2><FaCookieBite /> Cookies and Tracking</h2>
              <div className="section-content">
                <p>We use cookies and similar tracking technologies to collect and store information about your interactions with our platform. Cookies are small data files stored on your device that help us improve your experience. We use cookies to:</p>
                <ul>
                  <li>Remember your login status and preferences</li>
                  <li>Understand how you interact with our platform</li>
                  <li>Detect and prevent fraudulent activity</li>
                  <li>Analyze the effectiveness of our features</li>
                </ul>
                <p>You can control cookies through your browser settings. However, disabling cookies may limit your ability to use some features of our platform.</p>
              </div>
            </section>

            <section id="rights" className="privacy-section">
              <h2><FaUserShield /> Your Rights</h2>
              <div className="section-content">
                <p>Depending on your location, you may have certain rights regarding your personal information:</p>
                <ul>
                  <li><strong>Access:</strong> You can request access to the personal information we hold about you.</li>
                  <li><strong>Correction:</strong> You can request that we correct inaccurate or incomplete information.</li>
                  <li><strong>Deletion:</strong> You can request that we delete your personal information in certain circumstances.</li>
                  <li><strong>Restriction:</strong> You can request that we restrict the processing of your information.</li>
                  <li><strong>Data Portability:</strong> You can request a copy of your information in a structured, commonly used, and machine-readable format.</li>
                  <li><strong>Objection:</strong> You can object to our processing of your information in certain circumstances.</li>
                </ul>
                <p>To exercise these rights, please contact us through the methods described in the "Contact Us" section.</p>
              </div>
            </section>

            <section id="changes" className="privacy-section">
              <h2><FaShieldAlt /> Changes to This Policy</h2>
              <div className="section-content">
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. When we make changes, we will update the "Last updated" date at the top of the policy.</p>
                <p>We encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.</p>
              </div>
            </section>

            <section id="contact" className="privacy-section">
              <h2><FaGlobe /> Contact Us</h2>
              <div className="section-content">
                <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:</p>
                <p className="contact-info">
                  <strong>Email:</strong> privacy@cs2marketplace.com<br />
                  <strong>Address:</strong> 123 Gaming Street, Valve City, 94000
                </p>
                <p>We will respond to your inquiry as soon as possible and within the timeframe required by applicable law.</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 