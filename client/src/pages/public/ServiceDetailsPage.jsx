import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Monitor, Wallet } from 'lucide-react';
import { api } from '../../services/api';
import ServiceCard from '../../components/services/ServiceCard';
import ServiceInquiryForm from '../../components/services/ServiceInquiryForm';
import NewsImage from '../../components/news/NewsImage';

const priceText = (service) => {
  if (service.pricingType === 'free_consultation') return 'Free consultation';
  if (service.pricingType === 'quotation' || service.price === null || service.price === undefined) return 'Contact for pricing';
  return `${service.pricingType === 'starting_from' ? 'Starting from ' : ''}${service.currency || 'INR'} ${Number(service.price).toLocaleString('en-IN')}`;
};

function ListSection({ title, items }) {
  if (!items?.length) return null;
  return <section><h2 className="text-xl font-bold text-heading">{title}</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-body"><CheckCircle2 size={17} className="mt-1 shrink-0 text-primary" />{item}</li>)}</ul></section>;
}

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [related, setRelated] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    api.get(`/v1/services/${encodeURIComponent(id)}`).then(({ data }) => {
      if (!active) return;
      setService(data.item);
      setRelated(data.related || []);
      document.title = `${data.item.seoTitle || data.item.title} | Aloka`;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = data.item.seoDescription || data.item.shortDescription || '';
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.href = `https://aloka.co.in/services/${encodeURIComponent(data.item.slug)}`;
      let og = document.querySelector('meta[property="og:image"]');
      if (!og) {
        og = document.createElement('meta');
        og.setAttribute('property', 'og:image');
        document.head.appendChild(og);
      }
      og.content = data.item.coverImage?.url || '';
    }).catch((error) => {
      if (active) setErrorMessage(error.response?.data?.message || 'This service could not be loaded.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <main className="container-shell min-h-[60vh] py-12"><div className="card-surface mx-auto max-w-5xl animate-pulse p-8"><div className="aspect-[16/7] rounded-2xl bg-secondary" /><div className="mt-6 h-10 rounded bg-secondary" /></div></main>;
  if (!service) return <main className="container-shell grid min-h-[55vh] place-items-center py-12"><section className="card-surface max-w-xl p-8 text-center"><h1 className="text-2xl font-black text-heading">Service unavailable</h1><p role="alert" className="mt-3 text-sm text-muted">{errorMessage}</p><Link to="/services" className="primary-btn mt-6">Back to services</Link></section></main>;

  return (
    <main className="container-shell py-8 sm:py-12">
      <Link to="/services" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} /> All services</Link>
      <article className="card-surface mx-auto max-w-6xl overflow-hidden">
        <NewsImage src={service.coverImage?.url} alt={service.coverImage?.alt || service.title} category={service.categoryId?.name || 'Professional services'} className="aspect-[16/7] w-full" />
        {service.gallery?.length > 0 && <div className="grid gap-2 p-3 sm:grid-cols-3">{service.gallery.map((image) => <NewsImage key={image.publicId || image.url} src={image.url} alt={image.alt || service.title} category={service.categoryId?.name} className="aspect-video w-full rounded-lg" />)}</div>}
        <div className="p-6 sm:p-10">
          <Link to={`/services?category=${encodeURIComponent(service.categoryId?.slug || '')}`} className="rounded-full bg-soft-blue px-3 py-1 text-xs font-bold uppercase text-primary">{service.categoryId?.name}</Link>
          <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-heading sm:text-5xl">{service.title}</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-body">{service.shortDescription}</p>
          <div className="mt-6 flex flex-wrap gap-5 border-y border-border py-5 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-heading"><Wallet size={17} className="text-primary" />{priceText(service)}</span>
            {service.estimatedDeliveryTime && <span className="inline-flex items-center gap-2 text-body"><Clock3 size={17} className="text-primary" />{service.estimatedDeliveryTime}</span>}
            <span className="inline-flex items-center gap-2 text-body"><Monitor size={17} className="text-primary" />{service.serviceFormat === 'both' ? 'Online and offline' : service.serviceFormat}</span>
          </div>
          {service.pricingNotes && <p className="mt-4 text-sm text-muted">{service.pricingNotes}</p>}
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
            <div className="space-y-9">
              <section><h2 className="text-xl font-bold text-heading">About this service</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-body">{service.description}</p></section>
              <ListSection title="What’s included" items={service.whatsIncluded} />
              <ListSection title="Who this service is for" items={service.targetAudience} />
              <ListSection title="Documents required" items={service.requiredDocuments} />
              {service.eligibility && <section><h2 className="text-xl font-bold text-heading">Eligibility and requirements</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-body">{service.eligibility}</p></section>}
              <ListSection title="Service process" items={service.processSteps} />
              {(service.requiredQualifications?.length || service.licenseRequirements?.length || service.professionalVerificationNotes) > 0 && <section><h2 className="text-xl font-bold text-heading">Professional requirements</h2><div className="mt-3 space-y-3 text-sm text-body">{service.requiredQualifications?.length > 0 && <p><strong>Qualifications:</strong> {service.requiredQualifications.join(', ')}</p>}{service.licenseRequirements?.length > 0 && <p><strong>Registration/license:</strong> {service.licenseRequirements.join(', ')}</p>}{service.professionalVerificationNotes && <p>{service.professionalVerificationNotes}</p>}</div></section>}
              {service.faqs?.length > 0 && <section><h2 className="text-xl font-bold text-heading">Frequently asked questions</h2><div className="mt-4 space-y-3">{service.faqs.map((faq) => <details key={faq.question} className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-semibold text-heading">{faq.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-body">{faq.answer}</p></details>)}</div></section>}
            </div>
            <aside className="h-fit rounded-2xl bg-secondary p-5 lg:sticky lg:top-6">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Need assistance?</p>
              <h2 className="mt-2 text-xl font-bold text-heading">Discuss your requirements</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Send an enquiry to our team. We’ll review it and follow up; submitting does not confirm professional acceptance.</p>
              <a href="#enquire" className="primary-btn mt-5 w-full">Enquire now <ArrowRight size={16} /></a>
            </aside>
          </div>
          {service.tags?.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{service.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-muted">{tag}</span>)}</div>}
        </div>
      </article>
      <section id="enquire" className="card-surface mx-auto mt-8 max-w-4xl scroll-mt-8 p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Service enquiry</p>
        <h2 className="mt-2 text-2xl font-black text-heading">Tell us what you need</h2>
        <p className="mt-2 mb-6 text-sm text-muted">Request: {service.title}</p>
        <ServiceInquiryForm service={service} />
      </section>
      {related.length > 0 && <section className="mx-auto mt-12 max-w-6xl"><h2 className="text-2xl font-black text-heading">Related services</h2><div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{related.map((item) => <ServiceCard key={item._id} service={item} />)}</div></section>}
    </main>
  );
}
