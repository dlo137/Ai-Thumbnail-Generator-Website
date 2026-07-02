import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Filter = 'All' | 'Saved';

interface HistoryItem {
  id: number;
  title: string;
  version: string;
  date: string;
  resolution: string;
  image: string;
  favorited: boolean;
}

const ALL_ITEMS: HistoryItem[] = [
  {
    id: 1,
    title: 'Neon Flow Exploration',
    version: 'V2.4',
    date: 'Oct 24, 2023',
    resolution: '4K Resolution',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBGuHikQtnwHFAHZ2Gj7DlbAEtY9ef2dvs4_W133HSmq3ohZKXqbOw8V7NeHeFKl7LXRBve6qGsWqt856LQgBp9T8n2vUnl2D3b5ITCKZxaXOre08McHXQnBfEaDuzo1WtV8q2BAEdE_doculV7R3CS5WGEfhNb-8sCrHgz3QL8z_Tsyo45sGhWhPHugCreozRSW23ScpTSisJBFmcpaGk11MmZrktWTKHxsIfOvCM1go9swR2r83NW382z3gZtxE2b-HtTVABsMd0',
    favorited: true,
  },
  {
    id: 2,
    title: 'Minimalist Brutalism',
    version: 'V1.0',
    date: 'Oct 22, 2023',
    resolution: 'HD Portrait',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDYZrDuJcUI6OQe9dlTGEtHpP6Jh04p_pD6hc1N2jMnRKWqLSU9LQyx4uN5QPd2WUDRpZFdDzH0NW2E1x0ZxtGrB_Jku6IdsHmtbYzTtdNcv1_5hD2f2vjSqWBZT1aSH7E5pimgYQql1ZVP5gakAWQMevo3S8VvMYqpz1Dcho_ylmA9CfaHSQ2UKNeBJfG1ZTDzDUFLg13_ElO1_Sg_DXq_DSnHhoC8wJrXT_GVk7YYqOVe-w5UbTwyHcDwpN02-cQPpKak-1QnTPk',
    favorited: false,
  },
  {
    id: 3,
    title: 'Global Connectivity',
    version: 'V3.1',
    date: 'Oct 19, 2023',
    resolution: '4K Cinematic',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDtXkr-fQ_-Jdg5ArZyTxWqgfHRJOFePBctdyQs_WeUVIOh5_HhLe7XjvVodpGX3z1TrM9HQuZm2yyGjrBMVZO6ozyxzw3CNetUmWbXCL_n-_F0IUGqwwHAfVQiOlsPzLPPymWYKVKmWZF13y9QeU2V0MOTq6RcBig0RHiGozIY1yOPrylA8UZY-msd2aquCDYRde_njsqi1WK6-WYB4I4vZUtpzpWfc5ksN3wqsDePNdhijvgDyNP-dwXYV9-AQduooXufWPJnDlo',
    favorited: false,
  },
  {
    id: 4,
    title: 'Microscopic Nebula',
    version: 'V2.0',
    date: 'Oct 15, 2023',
    resolution: '8K Textures',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAFXMRnFdmi1RrgSXOl9YsMzA71nu3qUgSOFh3Vp7ltVaJDTvTlRUdnnjGMYwxJjs5VdFj7THhvAd4yi2yM8KNWWvqN-EF8jRb1iWUkUhA7MCRo7-K79EzhTsIPpLHBDcDAcTJ4sQpA4vfCGHHGkWF4xDwZxhqpf-5uwOFioDaCqgufCRzxBlvNilRZP4TUVYl7atgWxmjmkFjqeVKfFeQBpxSrv7XUZ1sH9_VNuLhmZ25xlM7hRz2bPSgfZP-27IrQb36dnWJ1tO8',
    favorited: true,
  },
  {
    id: 5,
    title: 'Silent Pine Morning',
    version: 'V1.5',
    date: 'Oct 12, 2023',
    resolution: 'Film Grain',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBs8aSm-Fqb5F4DXuLtjZb3WNedi1lq7CUg3kuIAq9tUb8QSjzgSFVV2DL4QrV1DYn_4VJFGqaooUGxcpOGkDMIkqDJDXItKAUphZ0ysoaZJM2Z6vz4K1J62iNM6QNC8soCxiFbCWGy09LZdywIByHFQiOUPPQbmeQ9kNNXUiG71pjj2jJn0zOsGPCW77yuj-HwI9XMIjDwJJkTr3SeMemYTqBDzb4H5yCGuHviv1R7hHlRhiGzuNABfeznsPqniJp4EPog6kwXCM8',
    favorited: false,
  },
];

function HistoryCard({
  item,
  onToggleFavorite,
  onDelete,
}: {
  item: HistoryItem;
  onToggleFavorite: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="group relative bg-[#151a21] rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-[#232932] shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
      <div className="aspect-video relative overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          src={item.image}
          alt={item.title}
        />

        {item.favorited && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-tertiary/20 backdrop-blur-md p-2 rounded-full shadow-[0_0_15px_rgba(249,189,34,0.3)] border border-tertiary/30">
              <span
                className="material-symbols-outlined text-tertiary text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all active:scale-90">
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
          <button
            onClick={() => onToggleFavorite(item.id)}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-90"
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{ fontVariationSettings: item.favorited ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all active:scale-90">
            <span className="material-symbols-outlined text-lg">share</span>
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center hover:bg-error hover:text-on-error transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-2 py-1 rounded">
            {item.version}
          </span>
        </div>
        <p className="text-sm text-outline font-medium">
          {item.date} • {item.resolution}
        </p>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [items, setItems] = useState<HistoryItem[]>(ALL_ITEMS);

  const filters: Filter[] = ['All', 'Saved'];

  const displayed = items.filter((item) => {
    if (activeFilter === 'Saved') return item.favorited;
    return true; // 'All' and 'Drafts' show all for now
  });

  function toggleFavorite(id: number) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, favorited: !item.favorited } : item)));
  }

  function deleteItem(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="pt-16 min-h-screen flex flex-col">
      <div className="p-10 flex-1">
        {/* Page header + filter bar */}
        <section className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">
              Thumbnail History
            </h2>
            <p className="text-on-surface-variant text-base font-medium">Track and manage your generated content</p>
          </div>

          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-surface-container-highest text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {displayed.map((item) => (
            <HistoryCard key={item.id} item={item} onToggleFavorite={toggleFavorite} onDelete={deleteItem} />
          ))}

          {/* Generate new card */}
          <button
            onClick={() => navigate('/')}
            className="group rounded-lg border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center min-h-[320px] hover:border-primary/50 hover:bg-surface-container-low transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">add</span>
            </div>
            <p className="font-headline font-bold text-on-surface">Generate New</p>
            <p className="text-xs text-on-surface-variant mt-1">Start a fresh project</p>
          </button>
        </div>

        {/* Load more */}
        <div className="mt-16 flex justify-center">
          <button className="group px-12 py-4 bg-surface-container-high text-on-surface rounded-full border border-outline-variant/10 text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest hover:border-primary/30 transition-all flex items-center">
            Load Older Generations
            <span className="material-symbols-outlined ml-2 text-sm group-hover:translate-y-1 transition-transform">
              arrow_downward
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
