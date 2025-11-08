'use client';

import { useState } from 'react';
import { Zap, BookOpen, Database, Lightbulb, Target, Sparkles } from 'lucide-react';
import { DockIcon } from './DockIcon';
import { FeatureModal } from './FeatureModal';
import { TableMascot } from './TableMascot';

interface Feature {
  id: string;
  icon: typeof Zap;
  label: string;
  title: string;
  description: string;
  features: string[];
}

const features: Feature[] = [
  {
    id: 'connect',
    icon: Zap,
    label: 'Connect',
    title: 'Connect to Supabase',
    description: 'Get started by connecting your Supabase or PostgreSQL database in seconds.',
    features: [
      'One-click Supabase integration',
      'Direct PostgreSQL connection support',
      'Automatic schema detection',
      'Real-time sync with your database',
      'Secure connection with credentials encryption',
    ],
  },
  {
    id: 'visualize',
    icon: Database,
    label: 'Visualize',
    title: 'Visual Schema Editor',
    description: 'See your entire database schema in a beautiful, interactive diagram.',
    features: [
      'Drag-and-drop table positioning',
      'Foreign key relationship visualization',
      'Real-time table structure display',
      'Row count and metadata insights',
      'Dark mode optimized design',
    ],
  },
  {
    id: 'optimize',
    icon: Target,
    label: 'Optimize',
    title: 'Smart Optimization',
    description: 'Get actionable insights to make your database faster and more efficient.',
    features: [
      'Missing index detection',
      'Unused column identification',
      'Query performance suggestions',
      'RLS policy recommendations',
      'Composite index opportunities',
    ],
  },
  {
    id: 'insights',
    icon: Lightbulb,
    label: 'Insights',
    title: 'Developer Insights',
    description: 'Real Postgres best practices, not generic advice.',
    features: [
      'Supabase-specific optimizations',
      'Production-ready SQL snippets',
      'Security vulnerability detection',
      'Data modeling suggestions',
      'Performance impact estimates',
    ],
  },
  {
    id: 'navigate',
    icon: Sparkles,
    label: 'Navigate',
    title: 'Keyboard-First',
    description: 'Navigate your schema at the speed of thought with keyboard shortcuts.',
    features: [
      '⌘K command palette for instant search',
      'Tab through tables effortlessly',
      'Quick jump to any column',
      'Keyboard-driven workflow',
      'Notion-like simplicity',
    ],
  },
  {
    id: 'docs',
    icon: BookOpen,
    label: 'Docs',
    title: 'Documentation',
    description: 'Learn how to make the most of your database schema.',
    features: [
      'Quick start guides',
      'Best practices for Postgres',
      'Supabase integration tips',
      'Performance optimization guides',
      'Common patterns and solutions',
    ],
  },
];

interface LandingProps {
  onConnect: () => void;
}

export function Landing({ onConnect }: LandingProps) {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const handleIconClick = (feature: Feature) => {
    if (feature.id === 'connect') {
      onConnect();
    } else {
      setSelectedFeature(feature);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-orange-100 via-pink-100 via-purple-100 to-cyan-100 relative">
      {/* Background Mascot */}
      <TableMascot />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-[30px] shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform relative overflow-hidden">
              {/* Glossy effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
              <Database className="w-12 h-12 text-white relative z-10" />
            </div>
          </div>
          <h1 className="text-6xl mb-3 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            SlopCollector
          </h1>
          <p className="text-xl text-gray-700 max-w-xl mx-auto">
            The raccoon that cleans up your database mess 🦝
          </p>
        </div>

        {/* Dock */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-[28px] shadow-2xl border border-white/60 p-4">
          <div className="flex items-center gap-3">
            {features.map((feature, index) => (
              <div key={feature.id} className="flex items-center">
                <DockIcon
                  icon={feature.icon}
                  label={feature.label}
                  onClick={() => handleIconClick(feature)}
                  primary={feature.id === 'connect'}
                  delay={index * 0.1}
                />
                {feature.id === 'connect' && (
                  <div className="w-px h-14 bg-gray-300 mx-3" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hint Text */}
        <p className="text-sm text-gray-600 mt-8 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-200 shadow-lg">
            <Zap className="w-4 h-4 text-orange-600" />
            Click <strong className="text-orange-600">Connect</strong> to start collecting slop
          </span>
        </p>
      </div>

      {/* Feature Modal */}
      {selectedFeature && (
        <FeatureModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  );
}
