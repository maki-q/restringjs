import { useRestring, useRegisterSection } from 'restringjs';

function PricingSection() {
  const title = useRestring({ path: 'highlight.pricing.title', defaultValue: 'Simple, transparent pricing', section: 'highlight', description: 'Pricing section title' });
  const subtitle = useRestring({ path: 'highlight.pricing.subtitle', defaultValue: 'No hidden fees. Cancel anytime.', section: 'highlight', description: 'Pricing subtitle' });

  return (
    <section>
      <h2 style={{ fontSize: 24, marginTop: 24 }}>{title}</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>{subtitle}</p>
      <div className="highlight-grid">
        <PlanCard nameKey="highlight.pricing.plan1.name" nameDefault="Starter" priceKey="highlight.pricing.plan1.price" priceDefault="$9/month" descKey="highlight.pricing.plan1.desc" descDefault="Perfect for individuals and small projects." />
        <PlanCard nameKey="highlight.pricing.plan2.name" nameDefault="Professional" priceKey="highlight.pricing.plan2.price" priceDefault="$29/month" descKey="highlight.pricing.plan2.desc" descDefault="For growing teams that need more power." />
        <PlanCard nameKey="highlight.pricing.plan3.name" nameDefault="Enterprise" priceKey="highlight.pricing.plan3.price" priceDefault="Custom" descKey="highlight.pricing.plan3.desc" descDefault="Dedicated support and custom integrations." />
      </div>
    </section>
  );
}

function PlanCard({ nameKey, nameDefault, priceKey, priceDefault, descKey, descDefault }: {
  nameKey: string; nameDefault: string; priceKey: string; priceDefault: string; descKey: string; descDefault: string;
}) {
  const name = useRestring({ path: nameKey, defaultValue: nameDefault, section: 'highlight' });
  const price = useRestring({ path: priceKey, defaultValue: priceDefault, section: 'highlight' });
  const desc = useRestring({ path: descKey, defaultValue: descDefault, section: 'highlight' });

  return (
    <div className="highlight-card">
      <h3>{name}</h3>
      <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>{price}</p>
      <p>{desc}</p>
    </div>
  );
}

function TestimonialSection() {
  const quote = useRestring({ path: 'highlight.testimonial.quote', defaultValue: 'restringjs saved our team hours of back-and-forth on copy changes.', section: 'highlight', description: 'Testimonial quote' });
  const author = useRestring({ path: 'highlight.testimonial.author', defaultValue: '— Sarah Chen, Product Lead', section: 'highlight', description: 'Testimonial author' });

  return (
    <section style={{ margin: '32px 0', padding: 24, background: '#f8f9fa', borderRadius: 8 }}>
      <blockquote style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>
        &ldquo;{quote}&rdquo;
      </blockquote>
      <p style={{ fontSize: 14, color: '#666' }}>{author}</p>
    </section>
  );
}

function BannerSection() {
  const text = useRestring({ path: 'highlight.banner.text', defaultValue: 'Try it free for 14 days — no credit card required', section: 'highlight', description: 'Banner text' });

  return (
    <section style={{ textAlign: 'center', padding: 20, background: '#4a6cf7', color: '#fff', borderRadius: 8 }}>
      <p style={{ fontSize: 16, fontWeight: 600 }}>{text}</p>
    </section>
  );
}

function StatsSection() {
  const stat1 = useRestring({ path: 'highlight.stats.stat1', defaultValue: '10,000+ strings edited', section: 'highlight', description: 'Stat 1' });
  const stat2 = useRestring({ path: 'highlight.stats.stat2', defaultValue: '500+ teams', section: 'highlight', description: 'Stat 2' });
  const stat3 = useRestring({ path: 'highlight.stats.stat3', defaultValue: '99.9% uptime', section: 'highlight', description: 'Stat 3' });

  return (
    <section style={{ display: 'flex', justifyContent: 'space-around', margin: '24px 0' }}>
      {[stat1, stat2, stat3].map((stat) => (
        <div key={stat} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{stat}</p>
        </div>
      ))}
    </section>
  );
}

export function HighlightPage() {
  useRegisterSection({ id: 'highlight', label: 'Highlight Demo', order: 1 });

  return (
    <div className="highlight-demo">
      <h2 className="page-title">Visual Highlight Demo</h2>
      <p className="page-subtitle">
        This page is packed with editable text. Toggle highlight mode to see it in action.
      </p>

      <div className="highlight-instructions">
        <strong>👉 Try it:</strong> Open the Restring sidebar (click the ✏️ tab on the right), 
        then look for the <code>RestringHighlight</code> overlays on this page. 
        Hover over highlighted elements to see their paths, and click to jump to the field in the sidebar.
      </div>

      {/* Pricing section */}
      <PricingSection />

      {/* Testimonial */}
      <TestimonialSection />

      {/* Banner */}
      <BannerSection />

      {/* Stats */}
      <StatsSection />
    </div>
  );
}
