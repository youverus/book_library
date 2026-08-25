'use client';

interface TabItem<K extends string> {
  key: K;
  label: string;
}

interface TabsProps<K extends string> {
  tabs: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}

export function Tabs<K extends string>({ tabs, activeKey, onChange }: TabsProps<K>) {
  return (
    <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeKey === tab.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
