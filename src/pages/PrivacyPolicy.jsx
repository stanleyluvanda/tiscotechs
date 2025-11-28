// src/pages/PrivacyPolicy.jsx
export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-slate-800">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-6">
        Last updated: {new Date().getFullYear()}
      </p>

      <p className="mb-4">
        ScholarsKnowledge (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website
        <span className="font-semibold"> www.scholarsknowledge.com</span> and provides tools for
        academic networking, student–lecturer engagement, scholarship discovery, and a
        student marketplace (the &quot;Services&quot;). We are committed to protecting
        your privacy. This Privacy Policy explains how we collect, use, store, and
        share information when you use our Services.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
      <p className="mb-2 font-semibold">Information you provide to us</p>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>Name, email address, password, and role (student, lecturer, partner, etc.).</li>
        <li>
          Academic details such as country, university, college/faculty, program, and year
          of study.
        </li>
        <li>
          Profile information, messages, posts, comments, marketplace listings, scholarship
          submissions, and any files or academic materials you upload.
        </li>
        <li>Content you send to us when you request support or contact us.</li>
      </ul>

      <p className="mb-2 font-semibold">Information collected automatically</p>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>IP address, browser type, device information, and operating system.</li>
        <li>Pages viewed, links clicked, time spent, and general usage statistics.</li>
        <li>
          Cookie and local-storage identifiers used to keep you logged in and secure the
          platform (including human-verification tools such as Cloudflare Turnstile).
        </li>
      </ul>

      <p className="mb-2 font-semibold">Information from third parties</p>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>Analytics, security, and hosting providers.</li>
        <li>Scholarship and partner organizations when you apply or connect.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>Create and manage your account and profile.</li>
        <li>
          Provide academic networking, messaging, and marketplace functionality customized
          to your program and role.
        </li>
        <li>Recommend scholarships, content, or features that may be relevant to you.</li>
        <li>Monitor platform safety, prevent abuse, and detect fraud or spam.</li>
        <li>Send transactional emails (verification codes, security alerts, updates).</li>
        <li>Improve and develop the Services, including analytics and performance.</li>
        <li>Comply with legal obligations and enforce our Terms of Use.</li>
      </ul>

      <p className="mb-4">
        We do <span className="font-semibold">not sell</span> your personal information.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. How We Share Information</h2>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>
          <span className="font-semibold">Service providers</span> that host, store, or
          process data on our behalf (for example, cloud hosting, email delivery,
          analytics, and security vendors).
        </li>
        <li>
          <span className="font-semibold">Other users</span> when you post content publicly
          (e.g., academic discussions, marketplace listings, comments).
        </li>
        <li>
          <span className="font-semibold">Scholarship partners</span> when you apply or
          explicitly submit information to them through our platform.
        </li>
        <li>
          <span className="font-semibold">Legal and safety</span>, if required by law or
          to protect our rights, users, or the public.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Cookies and Local Storage</h2>
      <p className="mb-4">
        We use cookies and local storage to keep you signed in, remember preferences,
        secure accounts, and understand how the Service is used. You may disable cookies in
        your browser, but some features may not function correctly.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Your Choices and Rights</h2>
      <ul className="list-disc list-inside space-y-1 mb-4">
        <li>Update your profile information in your account settings.</li>
        <li>Delete or edit posts and content that you have shared.</li>
        <li>Request deletion of your account and associated personal data.</li>
        <li>Opt out of non-essential email communications.</li>
      </ul>
      <p className="mb-4">
        To exercise these rights, contact us at{" "}
        <a href="mailto:support@scholarsknowledge.com" className="text-blue-600 underline">
          support@scholarsknowledge.com
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Data Security</h2>
      <p className="mb-4">
        We use reasonable technical and organizational measures to protect your data,
        including HTTPS encryption, hashed passwords, access controls, and security
        monitoring. However, no method of transmission or storage is completely secure, and
        we cannot guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Data Retention</h2>
      <p className="mb-4">
        We retain personal data for as long as necessary to provide the Services, comply
        with legal obligations, resolve disputes, and enforce agreements. You may request
        account deletion at any time.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Children&apos;s Privacy</h2>
      <p className="mb-4">
        The Services are intended for individuals at colleges and universities. If we learn
        that a user is not a college or university student or lecturer has created an account, we will take steps to delete it.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. International Transfers</h2>
      <p className="mb-4">
        Your information may be transferred to and processed in countries other than your
        own, including the United States. By using the Services, you consent to these
        transfers, subject to applicable data protection laws.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Changes to This Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. If we make material changes,
        we will notify you by updating the &quot;Last updated&quot; date and, where
        appropriate, by additional notice within the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">11. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy or our data practices, please
        contact us at{" "}
        <a href="mailto:support@scholarsknowledge.com" className="text-blue-600 underline">
          support@scholarsknowledge.com
        </a>
        .
      </p>
    </div>
  );
}