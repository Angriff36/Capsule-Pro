import { useState } from 'react';
import WizardShell from './components/wizard/WizardShell';
import type { WizardMode } from './components/wizard/WizardShell';
import { MockCostDataProvider } from './providers/CostDataProvider';
import { UtensilsCrossed, BookOpen, ArrowRight } from 'lucide-react';

const costProvider = new MockCostDataProvider();

function ModePicker({ onSelect }: { onSelect: (mode: WizardMode) => void }) {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-stone-800 rounded-2xl mb-6">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight">
            Capsule Pro
          </h1>
          <p className="text-stone-400 mt-2">
            How can we help today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('intake')}
            className="group relative bg-white rounded-2xl border border-stone-200 p-8 text-left
              hover:border-stone-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mb-4
              group-hover:bg-stone-800 transition-colors duration-300">
              <UtensilsCrossed className="w-5 h-5 text-stone-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h2 className="text-lg font-medium text-stone-800 mb-1.5">
              Event Inquiry
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed mb-4">
              Tell us about your event and receive a personalized catering estimate with a follow-up from our team.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 group-hover:text-stone-800 transition-colors">
              Start inquiry
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          <button
            onClick={() => onSelect('menu')}
            className="group relative bg-white rounded-2xl border border-stone-200 p-8 text-left
              hover:border-stone-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mb-4
              group-hover:bg-stone-800 transition-colors duration-300">
              <BookOpen className="w-5 h-5 text-stone-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h2 className="text-lg font-medium text-stone-800 mb-1.5">
              Menu Composer
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed mb-4">
              Build a custom menu from our seasonal catalog. Filter by dietary needs, preview, and export.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 group-hover:text-stone-800 transition-colors">
              Build a menu
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-stone-300 mt-8">
          Questions? Reach out to our events team anytime.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<WizardMode | null>(null);

  if (!mode) {
    return <ModePicker onSelect={setMode} />;
  }

  return (
    <WizardShell
      mode={mode}
      costProvider={costProvider}
      menuPricingConfig={{ enabled: true, showPerPerson: true }}
      ownerViewConfig={{ enabled: true }}
    />
  );
}

export default App;
