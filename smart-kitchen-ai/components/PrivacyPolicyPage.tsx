import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 animate-in fade-in duration-500">
      <header className="mb-12 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Cookies & Privacy Notice</h1>
        <p className="text-secondary text-sm">Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <div className="prose prose-slate max-w-none text-primary space-y-10">
        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">1. Who we are</h2>
          <p className="text-secondary leading-relaxed text-sm">
            This application (“Smart Kitchen AI”) is designed to help hospitality businesses and kitchen teams manage their inventory, staff schedules and menu planning. In this notice, “we”, “our” and “us” refer to the operator of this application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">2. What data we collect</h2>
          <p className="text-secondary leading-relaxed text-sm mb-3">Depending on how you use this application, we may process the following types of information:</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
            <li>Account and profile details (such as your name, email address and role).</li>
            <li>Business and store information (such as store name, location and opening hours).</li>
            <li>Operational data that you choose to input (such as inventory items, recipes, menus, sales receipts and staff schedules).</li>
            <li>Technical information about how you access the app (such as browser type, approximate region and basic usage logs).</li>
          </ul>
          <p className="text-secondary leading-relaxed text-sm mt-3">We do not intentionally collect sensitive personal data through this app.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">3. How we use your data</h2>
          <p className="text-secondary leading-relaxed text-sm mb-3">We use the information you provide in order to:</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
            <li>Operate and improve the core features of the app (inventory, menu, staff and analytics).</li>
            <li>Generate insights and reports for you about your stores and operations.</li>
            <li>Maintain the security and reliability of our service.</li>
          </ul>
          <p className="text-secondary leading-relaxed text-sm mt-3">We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">4. Cookies and similar technologies</h2>
          <p className="text-secondary leading-relaxed text-sm mb-3">This app may use cookies or similar technologies to:</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
            <li>Remember that you are logged in and keep your session active.</li>
            <li>Store your basic preferences (such as language or view settings).</li>
            <li>Collect anonymous analytics about how the app is used, so we can improve its performance and user experience.</li>
          </ul>
          <p className="text-secondary leading-relaxed text-sm mt-3">
            You can usually control or disable cookies via your browser settings. Please note that blocking essential cookies may affect how the app works.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">5. Legal basis and data retention</h2>
          <p className="text-secondary leading-relaxed text-sm mb-3">Where applicable, we process your data because it is necessary:</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
            <li>To provide the services you have requested (performance of a contract), and/or</li>
            <li>For our legitimate business interests in running and improving the app, provided these are not overridden by your rights.</li>
          </ul>
          <p className="text-secondary leading-relaxed text-sm mt-3">
            We keep operational data (such as inventory, menus, receipts and schedules) for as long as your account or business uses the app, or as required by law or good business practice. We may retain aggregated or anonymised data for statistical and analytical purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">6. Your rights</h2>
          <p className="text-secondary leading-relaxed text-sm mb-3">Depending on your location, you may have rights over your personal data, such as:</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
            <li>The right to access a copy of the data we hold about you.</li>
            <li>The right to request correction of inaccurate information.</li>
            <li>The right to request deletion of certain data, or to object to some types of processing.</li>
          </ul>
          <p className="text-secondary leading-relaxed text-sm mt-3">If you wish to exercise these rights, please contact us using the details below.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">7. Contact</h2>
          <p className="text-secondary leading-relaxed text-sm">
            If you have any questions about this notice or how we handle data, you can contact us at:<br/>
            <span className="font-mono bg-background px-2 py-1 rounded text-primary mt-1 inline-block">privacy@smartkitchen.ai</span>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-primary">8. Changes to this notice</h2>
          <p className="text-secondary leading-relaxed text-sm">
            We may update this Cookies & Privacy Notice from time to time. We will indicate the date of the latest version at the top of the page. If the changes are significant, we will take reasonable steps to inform you.
          </p>
        </section>
        
        <div className="border-t border-border pt-8 mt-12">
           <p className="text-xs text-secondary italic">
             Disclaimer: This notice is intended as a general, privacy-friendly template and does not constitute legal advice. Depending on your jurisdiction and business model, you may need to obtain professional legal advice and adapt this text accordingly.
           </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;