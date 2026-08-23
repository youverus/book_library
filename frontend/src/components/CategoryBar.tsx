'use client';

export function CategoryBar({ categories, active, onChange }: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
      <button
        onClick={() => onChange('')}
        className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
          active === '' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >全部</button>
      {categories.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
            active === c ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >{c}</button>
      ))}
    </div>
  );
}
