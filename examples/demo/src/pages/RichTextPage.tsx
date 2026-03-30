import { useRestring, useRegisterSection } from 'restringjs';

export function RichTextPage() {
  useRegisterSection({ id: 'richtext', label: 'Rich Text', order: 1 });

  const announcement = useRestring({
    path: 'richtext.announcement',
    defaultValue:
      '<h3>🚀 New Release: v2.0</h3><p>We are <strong>thrilled</strong> to announce the latest version with <em>incredible</em> new features:</p><ul><li>Live editing sidebar</li><li>ICU MessageFormat support</li><li>Visual highlight mode</li></ul>',
    section: 'richtext',
    richText: true,
    description: 'Announcement banner (HTML)',
  });

  const bio = useRestring({
    path: 'richtext.bio',
    defaultValue:
      '<p>Hi, I\'m <strong>Jane Doe</strong>, a software engineer passionate about <em>developer tools</em> and <a href="#">open source</a>.</p><p>Currently building tools that make teams more productive.</p>',
    section: 'richtext',
    richText: true,
    description: 'Author bio (HTML)',
  });

  const terms = useRestring({
    path: 'richtext.terms',
    defaultValue:
      '<h4>Terms of Service</h4><p>By using this service, you agree to the following:</p><ol><li>You will not misuse the service</li><li>You are responsible for your account</li><li>We reserve the right to modify these terms</li></ol><p><small>Last updated: March 2026</small></p>',
    section: 'richtext',
    richText: true,
    description: 'Terms of service (HTML)',
  });

  return (
    <div>
      <h2 className="page-title">Rich Text</h2>
      <p className="page-subtitle">
        Fields with <code>richText: true</code> are edited as raw HTML in the sidebar, so you can see and control the exact markup.
      </p>

      <div className="rich-text-demo">
        <RichTextCard label="Announcement" html={announcement} />
        <RichTextCard label="Author Bio" html={bio} />
        <RichTextCard label="Terms of Service" html={terms} />
      </div>
    </div>
  );
}

function RichTextCard({ label, html }: { label: string; html: string }) {
  return (
    <div className="rich-text-card">
      <div className="rich-text-label">{label} — Rendered</div>
      <div className="rich-text-rendered" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="rich-text-label">Source</div>
      <div className="rich-text-source">{html}</div>
    </div>
  );
}
