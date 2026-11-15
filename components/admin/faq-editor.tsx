'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FaqItem } from '@/lib/settings-defaults';

type Props = {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
};

export function FaqEditor({ items, onChange }: Props) {
  const patch = (index: number, part: Partial<FaqItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...part } : item)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(target, 0, moved);
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), q: '', a: '' }]);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-content-muted">Belum ada FAQ. Tambahkan pertanyaan pertama.</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus aria-hidden size={14} />
          Tambah FAQ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="label-mono">FAQ {index + 1}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[36px]"
                aria-label={`Pindahkan FAQ ${index + 1} ke atas`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp aria-hidden size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[36px]"
                aria-label={`Pindahkan FAQ ${index + 1} ke bawah`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown aria-hidden size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[36px] text-red-500"
                aria-label={`Hapus FAQ ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden size={16} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`faq-q-${item.id}`}>Pertanyaan</Label>
            <Input
              id={`faq-q-${item.id}`}
              value={item.q}
              onChange={(e) => patch(index, { q: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`faq-a-${item.id}`}>Jawaban</Label>
            <Textarea
              id={`faq-a-${item.id}`}
              value={item.a}
              onChange={(e) => patch(index, { a: e.target.value })}
              maxLength={2000}
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
        <Plus aria-hidden size={14} />
        Tambah FAQ
      </Button>
    </div>
  );
}
