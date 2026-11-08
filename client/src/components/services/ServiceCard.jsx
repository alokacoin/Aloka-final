import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Monitor, Wallet } from 'lucide-react';
import { useState } from 'react';
import NewsImage from '../news/NewsImage';

const priceLabel = (service) => {
  if (service.pricingType === 'free_consultation') return 'Free consultation';
  if (service.pricingType === 'quotation') return 'Contact for pricing';
  if (service.price === null || service.price === undefined) return 'Contact for pricing';
  return `${service.pricingType === 'starting_from' ? 'From ' : ''}${service.currency || 'INR'} ${Number(service.price).toLocaleString('en-IN')}`;
};

export default function ServiceCard({ service }) {
  return (
    <article className="card-surface flex h-full flex-col overflow-hidden">
      <Link to={`/services/${encodeURIComponent(service.slug || service._id)}`} aria-label={`View ${service.title}`}>
        <NewsImage src={service.coverImage?.url} alt={service.coverImage?.alt || service.title} category={service.categoryId?.name || 'Professional services'} className="aspect-[16/9] w-full" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{service.categoryId?.name || 'Aloka service'}</p>
        <h2 className="mt-2 text-xl font-bold text-heading"><Link to={`/services/${encodeURIComponent(service.slug || service._id)}`} className="hover:text-primary">{service.title || service.name}</Link></h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted">{service.shortDescription || service.description}</p>
        <div className="mt-5 grid gap-2 border-t border-border pt-4 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-heading"><Wallet size={15} className="text-primary" />{priceLabel(service)}</span>
          {service.estimatedDeliveryTime && <span className="inline-flex items-center gap-2 text-muted"><Clock3 size={15} />{service.estimatedDeliveryTime}</span>}
          <span className="inline-flex items-center gap-2 text-muted"><Monitor size={15} />{service.serviceFormat === 'both' ? 'Online & offline' : service.serviceFormat}</span>
        </div>
        {service.requiredQualifications?.length > 0 && <p className="mt-3 text-xs text-muted">Qualification: {service.requiredQualifications.join(', ')}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to={`/services/${encodeURIComponent(service.slug || service._id)}`} className="secondary-btn">View details</Link>
          <Link to={`/services/${encodeURIComponent(service.slug || service._id)}#enquire`} className="primary-btn">Enquire now <ArrowRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
