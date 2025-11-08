import { X, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  id: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  features: string[];
}

interface FeatureModalProps {
  feature: Feature;
  onClose: () => void;
}

export function FeatureModal({ feature, onClose }: FeatureModalProps) {
  const Icon = feature.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .animate-slideIn {
            animation: slideIn 0.3s ease-out;
          }
        `}</style>

        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl text-white mb-1">{feature.title}</h2>
              <p className="text-orange-100">{feature.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <ul className="space-y-3">
            {feature.features.map((item, index) => (
              <li 
                key={index} 
                className="flex items-start gap-3 text-gray-700"
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`,
                }}
              >
                <style>{`
                  @keyframes fadeIn {
                    from {
                      opacity: 0;
                      transform: translateX(-10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateX(0);
                    }
                  }
                `}</style>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-400 hover:via-pink-400 hover:to-purple-500 text-white py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}