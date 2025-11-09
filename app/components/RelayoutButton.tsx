'use client';

import { LayoutGrid } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface RelayoutButtonProps {
  onRelayout: () => void;
}

export function RelayoutButton({ onRelayout }: RelayoutButtonProps) {
  const handleClick = () => {
    onRelayout();
    toast.success('Layout recalculated');
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        onClick={handleClick}
        size="sm"
        variant="outline"
        className="bg-[#1a1a1a] border-[#3a3a3a] text-[#ccc] hover:bg-[#2a2a2a] hover:text-white hover:border-[#7ed321] font-mono"
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        Re-layout
      </Button>
    </div>
  );
}

