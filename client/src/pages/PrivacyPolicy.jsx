import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaLock, FaCookieBite, FaUserShield, FaGlobe, FaExclamationTriangle, FaChild, FaServer, FaGlobeAmericas } from 'react-icons/fa';
import { Helmet } from 'react-helmet';
import TableOfContents from '../components/TableOfContents';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const tocItems = [
    { id: 'information-collection', title: 'Information We Collect', icon: <FaUserShield /> },
    { id: 'information-use', title: 'How We Use Your Information', icon: <FaShieldAlt /> },
    { id: 'information-sharing', title: 'Information Sharing', icon: <FaGlobe /> },
    { id: 'data-security', title: 'Data Security', icon: <FaLock /> },
    { id: 'cookies', title: 'Cookies and Tracking', icon: <FaCookieBite /> },
    { id: 'third-party', title: 'Third-Party Services', icon: <FaServer /> },
    { id: 'international', title: 'International Data Transfers', icon: <FaGlobeAmericas /> },
    { id: 'children', title: 'Children\'s Privacy', icon: <FaChild /> },
    { id: 'risks', title: 'Privacy Risks', icon: <FaExclamationTriangle /> },
    { id: 'rights', title: 'Your Rights', icon: <FaUserShield /> },
    { id: 'changes', title: 'Changes to This Policy', icon: <FaShieldAlt /> },
    { id: 'contact', title: 'Contact Us', icon: <FaGlobe /> }
  ];

  return (
    <div className="privacy-page">
      <Helmet>
        <title>Privacy Policy | CS2 Marketplace</title>
        <meta name="description" content="Privacy Policy for CS2 Marketplace - Learn how we collect, use, and protect your personal information." />
      </Helmet>
      
      <div className="privacy-container">
        <header className="privacy-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <div className="privacy-intro">
            <p>At CS2 Marketplace, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
            <p>Please read this Privacy Policy carefully. By accessing or using our platform, you acknowledge that you have read, understood, and agree to be bound by all the terms outlined in this policy.</p>
          </div>
        </header>

        <div className="privacy-content">
          <aside className="privacy-sidebar">
            <TableOfContents items={tocItems} offset={120} />
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
                  <li><strong>Log Information:</strong> Our servers automatically record information including your IP address, browser type, referring/exit pages, operating system, date/time stamps, and clickstream data.</li>
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
                  <li>Detect and troubleshoot problems with our platform</li>
                  <li>Send you promotional communications about new features, offers, and events (with your consent)</li>
                  <li>Conduct research and analytics to improve our services</li>
                </ul>
                
                <h3>Legal Basis for Processing (EU/EEA Users)</h3>
                <p>If you are located in the European Union or European Economic Area, we collect and process your personal information based on the following legal grounds:</p>
                <ul>
                  <li><strong>Contract Performance:</strong> Processing your information to provide the services you've requested and fulfill our contractual obligations to you.</li>
                  <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate interests, such as fraud prevention, network security, and marketing our services.</li>
                  <li><strong>Consent:</strong> Processing based on your specific consent, such as sending marketing communications.</li>
                  <li><strong>Legal Compliance:</strong> Processing necessary to comply with applicable laws and regulations.</li>
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
                  <li><strong>With Your Consent:</strong> We may share information with third parties when you have given us your consent to do so.</li>
                </ul>
                <p>We do not sell your personal information to third parties.</p>
                
                <h3>Sharing with Trading Partners</h3>
                <p>When you engage in trades or transactions with other users on our platform, certain information is shared with your trading partners, including:</p>
                <ul>
                  <li>Steam username and profile picture</li>
                  <li>Trade history and reputation scores</li>
                  <li>Steam Trade URL (only when actively engaging in a trade)</li>
                </ul>
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
                  <li>Secure server infrastructure with monitoring and intrusion detection</li>
                  <li>Regular security updates and patches to all systems</li>
                </ul>
                <p>However, no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
                
                <h3>Data Retention</h3>
                <p>We retain your personal information for as long as necessary to provide you with our services and for legitimate and essential business purposes, such as complying with legal obligations, resolving disputes, and enforcing our agreements. When we no longer need to use your data, we will either securely delete it or anonymize it so that it can no longer be associated with you.</p>
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
                  <li>Provide personalized content and recommendations</li>
                  <li>Measure the performance of our website and services</li>
                </ul>
                <p>You can control cookies through your browser settings. However, disabling cookies may limit your ability to use some features of our platform.</p>
                
                <h3>Types of Cookies We Use</h3>
                <ul>
                  <li><strong>Essential Cookies:</strong> Necessary for the platform to function properly. These cannot be disabled.</li>
                  <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization.</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform.</li>
                  <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements and track ad campaign effectiveness.</li>
                </ul>
              </div>
            </section>
            
            <section id="third-party" className="privacy-section">
              <h2><FaServer /> Third-Party Services</h2>
              <div className="section-content">
                <p>Our platform may integrate third-party services or contain links to other websites or applications. These third parties have their own privacy policies, and we do not accept any responsibility or liability for their policies or processing of your personal information. We encourage you to read the privacy policies of any third-party services you use in connection with our platform.</p>
                
                <h3>Third-Party Services We Use</h3>
                <p>We may use the following types of third-party services:</p>
                <ul>
                  <li><strong>Payment Processors:</strong> To process purchases and transactions</li>
                  <li><strong>Analytics Providers:</strong> To understand user behavior and improve our platform</li>
                  <li><strong>Hosting Services:</strong> To store data and host our platform</li>
                  <li><strong>Customer Support Tools:</strong> To provide assistance to users</li>
                  <li><strong>Steam API:</strong> To access and verify Steam account information and inventory</li>
                </ul>
              </div>
            </section>
            
            <section id="international" className="privacy-section">
              <h2><FaGlobeAmericas /> International Data Transfers</h2>
              <div className="section-content">
                <p>We may transfer, store, and process your information in countries other than your own. Our servers are primarily located in the European Union, but we may transfer data to countries outside the EU. When we transfer personal information outside of the EU, we ensure that appropriate safeguards are in place to protect your information and comply with applicable data protection laws.</p>
                
                <p>If you are located in the European Economic Area (EEA), your personal information may be transferred to countries that do not have the same data protection laws as the country in which you initially provided the information. When we transfer your information to other countries, we will protect that information as described in this Privacy Policy and in accordance with applicable law.</p>
              </div>
            </section>
            
            <section id="children" className="privacy-section">
              <h2><FaChild /> Children's Privacy</h2>
              <div className="section-content">
                <p>Our platform is not intended for individuals under the age of 18. We do not knowingly collect or solicit personal information from anyone under the age of 18. If we learn that we have collected personal information from a child under 18, we will promptly delete that information. If you believe we might have any information from or about a child under 18, please contact us immediately.</p>
              </div>
            </section>
            
            <section id="risks" className="privacy-section">
              <h2><FaExclamationTriangle /> Privacy Risks</h2>
              <div className="section-content">
                <p>While we take significant measures to protect your information, using our platform and engaging in online trading activities involves inherent privacy risks, including:</p>
                
                <ul>
                  <li><strong>Security Breaches:</strong> Despite our security measures, unauthorized access to our systems could potentially expose user information.</li>
                  <li><strong>Phishing Attempts:</strong> Bad actors may attempt to impersonate our platform to steal your information. Always verify the authenticity of communications claiming to be from CS2 Marketplace.</li>
                  <li><strong>User-to-User Interactions:</strong> When trading with other users, certain information is shared between parties. Be cautious about sharing additional personal information with other users outside our platform.</li>
                  <li><strong>Public Information:</strong> Certain profile information and trading history is publicly viewable. Consider this when setting up your profile and conducting activities on our platform.</li>
                </ul>
                
                <p>We recommend taking additional steps to protect your privacy, such as using strong, unique passwords, enabling two-factor authentication on your accounts where available, and being cautious about the information you share in communications with other users.</p>
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
                  <li><strong>Withdraw Consent:</strong> Where we rely on your consent to process your personal information, you can withdraw that consent at any time.</li>
                </ul>
                <p>To exercise these rights, please contact us through the methods described in the "Contact Us" section.</p>
                
                <h3>Response Timeframe</h3>
                <p>We will respond to all legitimate requests within 30 days. Occasionally, it may take us longer if your request is particularly complex or you have made several requests. In this case, we will notify you and keep you updated on the progress.</p>
              </div>
            </section>

            <section id="changes" className="privacy-section">
              <h2><FaShieldAlt /> Changes to This Policy</h2>
              <div className="section-content">
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. When we make changes, we will update the "Last updated" date at the top of the policy.</p>
                <p>We encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.</p>
                
                <h3>Notification of Changes</h3>
                <p>For significant changes to this Privacy Policy, we will make reasonable efforts to provide notice, such as by displaying a prominent notice on our platform or by sending you an email. Your continued use of our platform after any changes to this Privacy Policy constitutes your acceptance of the revised policy.</p>
              </div>
            </section>

            <section id="contact" className="privacy-section">
              <h2><FaGlobe /> Contact Us</h2>
              <div className="section-content">
                <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:</p>
                <p className="contact-info">
                  <strong>Email:</strong> spectervale1@gmail.com<br />
                  <strong>Steam:</strong> <a href="https://steamcommunity.com/profiles/76561199831663438" target="_blank" rel="noopener noreferrer">AlexanderTheGreat</a><br />
                  <strong>Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61575170342758" target="_blank" rel="noopener noreferrer">CS2 Marketplace</a><br />
                  <strong>Discord:</strong> <a href="https://discord.com/channels/1361407438670139442/1361407439575974100" target="_blank" rel="noopener noreferrer">Join our Discord</a>
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