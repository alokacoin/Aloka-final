import ServiceCategory from '../models/ServiceCategory.js';

export const defaultServiceCategories = [
  ['Accounting & Bookkeeping', 'accounting-bookkeeping', 'Manage accounting records, reconciliations, and financial reporting.', 'calculator'],
  ['Income Tax Services', 'income-tax-services', 'Plan, prepare, and file income tax returns and related submissions.', 'receipt-indian-rupee'],
  ['GST & Indirect Tax', 'gst-indirect-tax', 'GST registration, returns, reconciliation, and indirect tax support.', 'landmark'],
  ['Company & Business Compliance', 'company-business-compliance', 'Ongoing company secretarial and statutory compliance assistance.', 'building-2'],
  ['Audit & Assurance', 'audit-assurance', 'Independent audit, assurance, and internal control services.', 'shield-check'],
  ['Payroll & Employee Compliance', 'payroll-employee-compliance', 'Payroll processing and employee-related statutory compliance.', 'users'],
  ['Financial Advisory', 'financial-advisory', 'Financial planning and business advisory for informed decisions.', 'chart-no-axes-combined'],
  ['Business Setup & Registration', 'business-setup-registration', 'Support with business formation, registrations, and launch compliance.', 'briefcase-business'],
  ['Specialised Tax Services', 'specialised-tax-services', 'Specialised tax matters and advisory services.', 'file-check-2']
].map(([name, slug, description, icon], displayOrder) => ({
  name, slug, description, icon, displayOrder: displayOrder + 1
}));

export const ensureServiceCategories = async () => {
  await Promise.all(defaultServiceCategories.map(({ slug, ...category }) => ServiceCategory.updateOne(
    { slug },
    { $setOnInsert: { ...category, slug, isActive: true } },
    { upsert: true }
  )));
};

export const listActiveServiceCategories = async () => {
  await ensureServiceCategories();
  return ServiceCategory.aggregate([
    { $match: { isActive: true } },
    { $sort: { displayOrder: 1, name: 1 } },
    {
      $lookup: {
        from: 'services',
        let: { categoryId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$categoryId', '$$categoryId'] }, { $eq: ['$status', 'published'] }, { $eq: ['$deletedAt', null] }] } } },
          { $count: 'count' }
        ],
        as: 'serviceCounts'
      }
    },
    { $addFields: { serviceCount: { $ifNull: [{ $arrayElemAt: ['$serviceCounts.count', 0] }, 0] } } },
    { $project: { serviceCounts: 0 } }
  ]);
};
