import React from 'react';
import './TermsOfService.css';

const TermsOfService = () => {
  // Get current date for the "Last Updated" section
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="tos-container">
      <div className="tos-header">
        <h1>Terms of Service</h1>
        <p className="tos-last-updated">Last Updated: {currentDate}</p>
      </div>

      <div className="tos-content">
        <section className="tos-section">
          <h2>1. Introduction</h2>
          <p>Welcome to CS2 Marketplace ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the CS2 Marketplace website, services, and applications (collectively, the "Service").</p>
          <p>By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.</p>
        </section>

        <section className="tos-section">
          <h2>2. Eligibility</h2>
          <p>You must be at least 18 years old to use our Service. By using our Service, you represent and warrant that you are at least 18 years of age and that your use of the Service does not violate any applicable laws or regulations.</p>
          <p>If you are accessing the Service on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms.</p>
        </section>

        <section className="tos-section">
          <h2>3. User Accounts</h2>
          <p>To use certain features of the Service, you must create an account with Steam authentication. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate and complete information when setting up your account</li>
            <li>Promptly update your account information to keep it accurate and complete</li>
            <li>Notify us immediately of any unauthorized use of your account or any other breach of security</li>
            <li>Accept responsibility for all activities that occur under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.</p>
        </section>

        <section className="tos-section">
          <h2>4. Marketplace Rules and Trading</h2>
          <p>CS2 Marketplace provides a platform for users to buy and sell digital items related to Counter-Strike 2. By using our Service, you agree to the following rules:</p>
          <ul>
            <li>You will only list items that you legitimately own and have the right to sell</li>
            <li>You will not attempt to manipulate prices or engage in fraudulent activities</li>
            <li>You will not use our Service to conduct any illegal activities</li>
            <li>You understand that CS2 Marketplace charges a commission fee on completed transactions</li>
            <li>You agree to complete all transactions initiated through our Service</li>
            <li>You understand that all trades are final once completed</li>
          </ul>
          <p>We reserve the right to remove listings, suspend accounts, or take other appropriate actions if we believe you have violated these rules.</p>
        </section>

        <section className="tos-section">
          <h2>5. Fees and Payments</h2>
          <p>CS2 Marketplace charges a fee for successful transactions completed through our Service. Current fee rates are displayed on our website and may be updated from time to time.</p>
          <p>All payments are processed securely through our platform. When you add funds to your account or receive proceeds from sales, you agree to:</p>
          <ul>
            <li>Provide accurate and complete payment information</li>
            <li>Promptly update your payment information as necessary</li>
            <li>Pay all fees and charges incurred by you or any users of your account at the rates in effect when such fees or charges are incurred</li>
          </ul>
          <p>We reserve the right to change our fees at any time. Any changes to our fees will be posted on our website and will take effect immediately upon posting.</p>
        </section>

        <section className="tos-section">
          <h2>6. Prohibited Activities</h2>
          <p>You agree not to engage in any of the following prohibited activities:</p>
          <ul>
            <li>Violating any laws, rules, or regulations applicable to your use of the Service</li>
            <li>Infringing the intellectual property rights of others</li>
            <li>Interfering with or disrupting the Service or servers or networks connected to the Service</li>
            <li>Attempting to gain unauthorized access to the Service or any accounts, computer systems, or networks connected to the Service</li>
            <li>Circumventing, disabling, or otherwise interfering with security-related features of the Service</li>
            <li>Engaging in any automated use of the system, such as using scripts to send messages or upload content</li>
            <li>Transmitting or uploading any material that contains viruses, trojan horses, worms, or any other harmful or destructive code</li>
            <li>Collecting or harvesting any information from the Service, including account names</li>
            <li>Using the Service for any commercial solicitation purposes without our consent</li>
          </ul>
        </section>

        <section className="tos-section">
          <h2>7. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, CS2 Marketplace shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:</p>
          <ul>
            <li>Your access to or use of or inability to access or use the Service</li>
            <li>Any conduct or content of any third party on the Service</li>
            <li>Any content obtained from the Service</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>
          <p>In no event shall our total liability to you for all claims exceed the amount you have paid us, if any, for accessing or using the Service during the 12 months preceding the claim.</p>
        </section>

        <section className="tos-section">
          <h2>8. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless CS2 Marketplace, its officers, directors, employees, and agents, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees) arising from your use of and access to the Service, your violation of any term of these Terms, or your violation of any third party rights.</p>
        </section>

        <section className="tos-section">
          <h2>9. Termination</h2>
          <p>We reserve the right to terminate or suspend your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.</p>
          <p>Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service, or contact our support team to request account deletion.</p>
        </section>

        <section className="tos-section">
          <h2>10. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of Georgia, without regard to its conflict of law provisions.</p>
          <p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.</p>
        </section>

        <section className="tos-section">
          <h2>11. Changes to Terms</h2>
          <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
          <p>By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.</p>
        </section>

        <section className="tos-section">
          <h2>12. Contact Information</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p><a href="mailto:legal@cs2marketplace.com">legal@cs2marketplace.com</a></p>
        </section>
      </div>

      <div className="tos-footer">
        <p>By using CS2 Marketplace, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        <a href="/contact" className="tos-contact-button">Contact Us</a>
      </div>
    </div>
  );
};

export default TermsOfService; 