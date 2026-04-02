'use client';

import React from 'react';
import { X } from 'lucide-react';

interface Sticker {
  id: string;
  url: string;
  name: string;
}

interface StickerPack {
  id: string;
  name: string;
  stickers: Sticker[];
}

const STICKER_PACKS: StickerPack[] = [
  {
    id: 'fluent-emoji',
    name: 'Animated Emojis',
    stickers: [
      { id: '1', name: 'Heart Eyes', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Heart-Eyes.png' },
      { id: '2', name: 'Beaming Face', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Beaming%20Face%20with%20Smiling%20Eyes.png' },
      { id: '3', name: 'Grinning Face', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png' },
      { id: '4', name: 'Face with Tears of Joy', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Tears%20of%20Joy.png' },
      { id: '5', name: 'Thumbs Up', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Thumbs%20Up.png' },
      { id: '6', name: 'Partying Face', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Partying%20Face.png' },
      { id: '7', name: 'Fire', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Fire.png' },
      { id: '8', name: 'Ghost', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ghost.png' },
      { id: '9', name: 'Rocket', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Rocket.png' },
      { id: '10', name: 'Heart', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Heart%20with%20Arrow.png' },
      { id: '11', name: 'Wink', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Winking%20Face.png' },
      { id: '12', name: 'Zzz', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Sleeping%20Face.png' },
    ]
  }
];

interface StickerPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  return (
    <div className="w-[320px] h-[400px] flex flex-col bg-(--bg-secondary) border border-(--border-color) rounded-2xl shadow-2xl overflow-hidden glass animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-color)/50">
        <h3 className="text-sm font-semibold text-(--text-primary)">Nhãn dán</h3>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-(--bg-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {STICKER_PACKS.map(pack => (
          <div key={pack.id} className="mb-4">
            <h4 className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wider mb-3 px-1">
              {pack.name}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {pack.stickers.map(sticker => (
                <button
                  key={sticker.id}
                  onClick={() => onSelect(sticker.url)}
                  className="relative group aspect-square flex items-center justify-center p-2 rounded-xl hover:bg-(--bg-tertiary) transition-all duration-200 active:scale-95"
                  title={sticker.name}
                >
                  <img 
                    src={sticker.url} 
                    alt={sticker.name} 
                    className="w-full h-full object-contain transform transition-transform group-hover:scale-110"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-(--border-color)/50 bg-(--bg-tertiary)/30">
        <div className="flex gap-2">
          {STICKER_PACKS.map(pack => (
            <button 
              key={pack.id}
              className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              <img src={pack.stickers[0].url} className="w-5 h-5 object-contain" alt={pack.name} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
