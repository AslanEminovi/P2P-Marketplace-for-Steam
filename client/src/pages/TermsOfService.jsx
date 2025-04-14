import React from 'react';
import { Helmet } from 'react-helmet';
import { FaFileContract, FaUserShield, FaExclamationCircle, FaUserTie, FaMoneyBillWave, FaBan, FaBalanceScale, FaGavel, FaShieldAlt, FaGlobe, FaEdit, FaInfoCircle } from 'react-icons/fa';
import TableOfContents from '../components/TableOfContents';
import './PrivacyPolicy.css'; // Reuse the same styling

const TermsOfService = () => {
  const tocItems = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: <FaFileContract /> },
    { id: 'eligibility', title: 'User Eligibility', icon: <FaUserTie /> },
    { id: 'account', title: 'Account Registration', icon: <FaUserShield /> },
    { id: 'marketplace', title: 'Marketplace Rules', icon: <FaMoneyBillWave /> },
    { id: 'prohibited', title: 'Prohibited Activities', icon: <FaBan /> },
    { id: 'fees', title: 'Fees and Payments', icon: <FaMoneyBillWave /> },
    { id: 'disputes', title: 'Dispute Resolution', icon: <FaBalanceScale /> },
    { id: 'liability', title: 'Limitation of Liability', icon: <FaExclamationCircle /> },
    { id: 'intellectual', title: 'Intellectual Property', icon: <FaShieldAlt /> },
    { id: 'termination', title: 'Termination', icon: <FaBan /> },
    { id: 'governing', title: 'Governing Law', icon: <FaGavel /> },
    { id: 'changes', title: 'Changes to Terms', icon: <FaEdit /> },
    { id: 'contact', title: 'Contact Us', icon: <FaInfoCircle /> }
  ];

  return (
    <div className="privacy-page">
      <Helmet>
        <title>Terms of Service | CS2 Marketplace</title>
        <meta name="description" content="Terms of Service for CS2 Marketplace - Guidelines and rules for using our platform." />
      </Helmet>
      
      <div className="privacy-container">
        <header className="privacy-header">
          <h1>Terms of Service</h1>
          <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="privacy-intro">
            <p>Welcome to CS2 Marketplace. These Terms of Service ("Terms") govern your access to and use of our website, services, and applications (collectively, the "Services"). Please read these Terms carefully before using our Services.</p>
            <p>By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Services.</p>
          </div>
        </header>

        <div className="privacy-content">
          <aside className="privacy-sidebar">
            <TableOfContents items={tocItems} offset={120} />
          </aside>

          <main className="privacy-main">
            <section id="acceptance" className="privacy-section">
              <h2><FaFileContract /> Acceptance of Terms</h2>
              <div className="section-content">
                <p>By accessing our website, registering an account, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy.</p>
                <p>These Terms constitute a legally binding agreement between you and CS2 Marketplace. If you do not agree to these Terms, please do not use our Services.</p>
                <p>We reserve the right to update or modify these Terms at any time without prior notice. Your continued use of the Services following any changes indicates your acceptance of the revised Terms.</p>
              </div>
            </section>

            <section id="eligibility" className="privacy-section">
              <h2><FaUserTie /> User Eligibility</h2>
              <div className="section-content">
                <p>You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that:</p>
                <ul>
                  <li>You are at least 18 years of age;</li>
                  <li>You have the legal capacity to enter into a binding agreement with us;</li>
                  <li>You will comply with these Terms and all applicable local, state, national, and international laws, rules, and regulations;</li>
                  <li>You have not previously been suspended or banned from using our Services.</li>
                </ul>
                <p>If you are accessing or using our Services on behalf of a business or legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.</p>
              </div>
            </section>

            <section id="account" className="privacy-section">
              <h2><FaUserShield /> Account Registration</h2>
              <div className="section-content">
                <p>To access certain features of our Services, you must register for an account.</p>
                <p>When you register for an account, you must:</p>
                <ul>
                  <li>Provide accurate, current, and complete information;</li>
                  <li>Maintain and promptly update your account information;</li>
                  <li>Keep your account credentials secure and confidential;</li>
                  <li>Not share your account with anyone else;</li>
                  <li>Notify us immediately of any unauthorized access to or use of your account.</li>
                </ul>
                <p>You are solely responsible for all activities that occur under your account. We reserve the right to terminate your account if you provide inaccurate, false, or incomplete information, or if you fail to comply with these Terms.</p>
                
                <h3>Steam Account Integration</h3>
                <p>Our Services require integration with your Steam account. By connecting your Steam account, you:</p>
                <ul>
                  <li>Authorize us to access your Steam profile and inventory information;</li>
                  <li>Confirm that you are the owner of the Steam account you are connecting;</li>
                  <li>Acknowledge that your use of Steam is subject to Steam's own terms of service and privacy policy.</li>
                </ul>
              </div>
            </section>

            <section id="marketplace" className="privacy-section">
              <h2><FaMoneyBillWave /> Marketplace Rules</h2>
              <div className="section-content">
                <p>Our platform serves as a marketplace for buying, selling, and trading CS2 items. When using our marketplace, you agree to the following:</p>
                
                <h3>Listings</h3>
                <p>When listing items for sale or trade, you must:</p>
                <ul>
                  <li>Only list items that you legitimately own in your Steam inventory;</li>
                  <li>Provide accurate and complete descriptions of the items;</li>
                  <li>Set reasonable prices in accordance with market value;</li>
                  <li>Not misrepresent the condition, rarity, or any other attribute of the items;</li>
                  <li>Not list any prohibited items (refer to Prohibited Activities section);</li>
                  <li>Fulfill all transactions for items you have listed and sold.</li>
                </ul>
                
                <h3>Purchases</h3>
                <p>When purchasing items, you agree to:</p>
                <ul>
                  <li>Complete the payment for any item you commit to purchase;</li>
                  <li>Not attempt to circumvent our payment or trading systems;</li>
                  <li>Accept the item as described, provided it matches the listing description;</li>
                  <li>Follow our dispute resolution process if there are any issues with your purchase.</li>
                </ul>
                
                <h3>Trades</h3>
                <p>When trading items, you agree to:</p>
                <ul>
                  <li>Honor all trade agreements you enter into on our platform;</li>
                  <li>Only offer items that you own and can legitimately trade;</li>
                  <li>Not mislead other users about the terms of a trade;</li>
                  <li>Complete the trade within the specified timeframe.</li>
                </ul>
              </div>
            </section>

            <section id="prohibited" className="privacy-section">
              <h2><FaBan /> Prohibited Activities</h2>
              <div className="section-content">
                <p>You agree not to engage in any of the following prohibited activities:</p>
                <ul>
                  <li>Using our Services for any illegal purpose or in violation of any local, state, national, or international law;</li>
                  <li>Violating Steam's terms of service or any other third-party terms that may apply;</li>
                  <li>Attempting to buy, sell, or trade items obtained through illegal means (including but not limited to fraud, theft, or hacking);</li>
                  <li>Manipulating prices or engaging in deceptive trading practices;</li>
                  <li>Using multiple accounts to manipulate market prices or feedback ratings;</li>
                  <li>Engaging in money laundering or other financial crimes;</li>
                  <li>Attempting to reverse-engineer, decompile, or disassemble any portion of our Services;</li>
                  <li>Attempting to bypass or circumvent any security features of our Services;</li>
                  <li>Harassing, threatening, or intimidating other users;</li>
                  <li>Engaging in any activity that disrupts or interferes with our Services;</li>
                  <li>Creating fake listings or engaging in "bait and switch" tactics;</li>
                  <li>Using our Services to distribute malware, viruses, or other harmful code;</li>
                  <li>Impersonating another person or entity, or falsely stating or misrepresenting your affiliation with a person or entity.</li>
                </ul>
                <p>We reserve the right to investigate and take appropriate action against anyone who, in our sole discretion, violates this provision, including removing prohibited content, suspending or terminating accounts, and reporting you to law enforcement authorities.</p>
              </div>
            </section>

            <section id="fees" className="privacy-section">
              <h2><FaMoneyBillWave /> Fees and Payments</h2>
              <div className="section-content">
                <p>Our platform charges fees for certain transactions. By using our Services, you agree to pay all applicable fees.</p>
                
                <h3>Transaction Fees</h3>
                <p>We charge a commission on successful sales. The current fee structure is as follows:</p>
                <ul>
                  <li>A marketplace fee of 5% on each completed sale;</li>
                  <li>Additional payment processing fees may apply depending on the payment method.</li>
                </ul>
                <p>Fees are automatically deducted from the sale proceeds before they are credited to your account balance.</p>
                
                <h3>Payment Terms</h3>
                <p>When you make a purchase on our platform:</p>
                <ul>
                  <li>You authorize us to charge your selected payment method;</li>
                  <li>You represent that you have the legal right to use any payment method you provide;</li>
                  <li>You acknowledge that your payment information may be stored by our third-party payment processors;</li>
                  <li>All payments are final and non-refundable, except as required by law or as specifically provided in these Terms.</li>
                </ul>
                
                <h3>Withdrawals</h3>
                <p>You may withdraw funds from your account balance subject to the following conditions:</p>
                <ul>
                  <li>A minimum balance is required to request a withdrawal;</li>
                  <li>Withdrawal processing times vary depending on the withdrawal method;</li>
                  <li>Additional verification may be required for large withdrawals;</li>
                  <li>Withdrawal fees may apply depending on the withdrawal method.</li>
                </ul>
              </div>
            </section>

            <section id="disputes" className="privacy-section">
              <h2><FaBalanceScale /> Dispute Resolution</h2>
              <div className="section-content">
                <p>If a dispute arises between you and another user regarding a transaction:</p>
                <ul>
                  <li>You agree to first attempt to resolve the dispute directly with the other user through our messaging system;</li>
                  <li>If you cannot resolve the dispute directly, you may submit a formal dispute through our platform;</li>
                  <li>Our support team will review the evidence provided by both parties and make a determination;</li>
                  <li>You agree to provide all requested information needed to resolve the dispute;</li>
                  <li>You agree to accept our decision regarding the dispute as final.</li>
                </ul>
                
                <h3>Disputes with CS2 Marketplace</h3>
                <p>For any dispute you have with CS2 Marketplace, you agree to first contact us and attempt to resolve the dispute informally. If we cannot resolve the dispute informally, you and CS2 Marketplace agree to the following dispute resolution process:</p>
                <ul>
                  <li>The dispute will be resolved by binding arbitration, conducted on a confidential basis by a neutral arbitrator;</li>
                  <li>The arbitration will take place online or in Tbilisi, Georgia, unless we both agree otherwise;</li>
                  <li>Each party will bear its own costs of arbitration;</li>
                  <li>The arbitrator's decision will be final and binding on both parties.</li>
                </ul>
                <p>You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.</p>
              </div>
            </section>

            <section id="liability" className="privacy-section">
              <h2><FaExclamationCircle /> Limitation of Liability</h2>
              <div className="section-content">
                <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CS2 MARKETPLACE, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:</strong></p>
                <ul>
                  <li>Your access to or use of or inability to access or use the Services;</li>
                  <li>Any conduct or content of any third party on the Services;</li>
                  <li>Any content obtained from the Services;</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content;</li>
                  <li>Transactions between users, including fraud, misrepresentation, or unsafe or illegal items;</li>
                  <li>Any bugs, viruses, trojan horses, or the like that may be transmitted to or through our Services;</li>
                  <li>Any interruption or cessation of transmission to or from the Services.</li>
                </ul>
                <p>Our liability to you for any cause whatsoever and regardless of the form of the action, will at all times be limited to the amount you have paid us in transaction fees in the 6 months prior to any cause of action arising.</p>
              </div>
            </section>

            <section id="intellectual" className="privacy-section">
              <h2><FaShieldAlt /> Intellectual Property</h2>
              <div className="section-content">
                <p>The Service and its original content, features, and functionality are and will remain the exclusive property of CS2 Marketplace and its licensors. The Service is protected by copyright, trademark, and other laws of both Georgia and foreign countries.</p>
                <p>Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of CS2 Marketplace.</p>
                
                <h3>User Content</h3>
                <p>By posting content on our platform (including but not limited to item listings, profile information, and communications), you grant us a non-exclusive, worldwide, royalty-free, irrevocable, sub-licensable, perpetual license to use, modify, publicly perform, publicly display, reproduce, and distribute such content on and through the Service.</p>
                <p>You represent and warrant that:</p>
                <ul>
                  <li>You own the content you post on or through the Service or otherwise have the right to grant the rights and licenses set forth in these Terms;</li>
                  <li>The posting and use of your content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights, intellectual property rights, or any other rights of any person.</li>
                </ul>
              </div>
            </section>

            <section id="termination" className="privacy-section">
              <h2><FaBan /> Termination</h2>
              <div className="section-content">
                <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>
                <p>If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.</p>
                <p>All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</p>
                
                <h3>Effect of Termination</h3>
                <p>Upon termination of your account:</p>
                <ul>
                  <li>Any ongoing listings will be removed from our marketplace;</li>
                  <li>Any pending transactions may be canceled;</li>
                  <li>You may lose access to your account balance if termination is due to violation of these Terms;</li>
                  <li>You will no longer have access to messaging or other platform features;</li>
                  <li>We may retain certain information as required by law or for legitimate business purposes.</li>
                </ul>
              </div>
            </section>

            <section id="governing" className="privacy-section">
              <h2><FaGavel /> Governing Law</h2>
              <div className="section-content">
                <p>These Terms shall be governed and construed in accordance with the laws of Georgia, without regard to its conflict of law provisions.</p>
                <p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.</p>
              </div>
            </section>

            <section id="changes" className="privacy-section">
              <h2><FaEdit /> Changes to Terms</h2>
              <div className="section-content">
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any material changes through:</p>
                <ul>
                  <li>A notice on our website;</li>
                  <li>An email to the address associated with your account;</li>
                  <li>A notification when you log in to the Services.</li>
                </ul>
                <p>What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.</p>
                <p>We recommend reviewing these Terms periodically for any changes.</p>
              </div>
            </section>

            <section id="contact" className="privacy-section">
              <h2><FaInfoCircle /> Contact Us</h2>
              <div className="section-content">
                <p>If you have any questions about these Terms, please contact us at:</p>
                <div className="contact-info">
                  <p><strong>Email:</strong> <a href="mailto:spectervale1@gmail.com">spectervale1@gmail.com</a></p>
                  <p><strong>Location:</strong> Tbilisi, Georgia</p>
                  <p><strong>Social Media:</strong></p>
                  <ul>
                    <li><strong>Discord:</strong> <a href="https://discord.com/channels/1361407438670139442/1361407439575974100" target="_blank" rel="noopener noreferrer">Join our Discord</a></li>
                    <li><strong>Steam:</strong> <a href="https://steamcommunity.com/profiles/76561199831663438" target="_blank" rel="noopener noreferrer">Steam Profile</a></li>
                    <li><strong>Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61575170342758" target="_blank" rel="noopener noreferrer">Facebook Page</a></li>
                  </ul>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 