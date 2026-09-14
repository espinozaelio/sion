const toneMap = {
  petrol: { bg: 'bg-petrol-100', text: 'text-petrol-700' },
  stamp: { bg: 'bg-tech-cyan/10', text: 'text-tech-cyan' },
  success: { bg: 'bg-success-100', text: 'text-success-700' },
  danger: { bg: 'bg-danger-100', text: 'text-danger-700' },
};

export default function StatCard({ label, value, sub, icon: Icon, tone = 'petrol' }) {
  const colors = toneMap[tone] || toneMap.petrol;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-petrol-900/50">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
            <Icon size={18} className={colors.text} />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-display font-bold text-petrol-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-petrol-900/50">{sub}</p>}
    </div>
  );
}
