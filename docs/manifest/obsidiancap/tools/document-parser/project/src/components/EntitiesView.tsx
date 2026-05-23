import { UtensilsCrossed, Package, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import type { DomainEntity, UnresolvedEntity } from '../data/mock-pipeline';

interface Props {
  entities: DomainEntity[];
  unresolved: UnresolvedEntity[];
  visible: boolean;
}

const KIND_CONFIG: Record<string, { icon: typeof UtensilsCrossed; label: string; bg: string; border: string; text: string; iconColor: string }> = {
  menu_item: { icon: UtensilsCrossed, label: 'Menu Item', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', iconColor: 'text-teal-600' },
  recipe: { icon: ClipboardList, label: 'Recipe', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', iconColor: 'text-sky-600' },
  prep_task: { icon: ClipboardList, label: 'Prep Task', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-600' },
  inventory_need: { icon: Package, label: 'Inventory', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconColor: 'text-emerald-600' },
  staffing_assignment: { icon: Users, label: 'Staffing', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', iconColor: 'text-slate-600' },
};

export function EntitiesView({ entities, unresolved, visible }: Props) {
  const groups = groupByKind(entities);

  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Stage 4 & 5: Normalized Entities & Review</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([kind, items]) => {
          const config = KIND_CONFIG[kind] || KIND_CONFIG.menu_item;
          const Icon = config.icon;

          return (
            <div key={kind} className={`border ${config.border} rounded-lg overflow-hidden`}>
              <div className={`${config.bg} px-4 py-2.5 flex items-center gap-2 border-b ${config.border}`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
                <span className={`text-xs font-semibold ${config.text} uppercase tracking-wider`}>
                  {config.label}
                </span>
                <span className={`text-[10px] ${config.text} opacity-60`}>({items.length})</span>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {items.map((entity, i) => (
                  <EntityRow key={i} entity={entity} kind={kind} />
                ))}
              </div>
            </div>
          );
        })}

        {unresolved.length > 0 && (
          <div className="border border-orange-300 rounded-lg overflow-hidden">
            <div className="bg-orange-50 px-4 py-2.5 flex items-center gap-2 border-b border-orange-300">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                Needs Human Review
              </span>
              <span className="text-[10px] text-orange-600 opacity-60">({unresolved.length})</span>
            </div>
            <div className="bg-white divide-y divide-orange-100">
              {unresolved.map((item, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm text-slate-700">{item.rawContent}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-orange-600 font-medium">{item.reason}</span>
                    {item.attemptedType && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                        attempted: {item.attemptedType.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntityRow({ entity, kind }: { entity: DomainEntity; kind: string }) {
  if (kind === 'menu_item') {
    return (
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-900">{entity.name}</span>
          {entity.dietaryFlags && entity.dietaryFlags.length > 0 && (
            <div className="flex gap-1">
              {entity.dietaryFlags.map((flag: string) => (
                <span key={flag} className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">{flag}</span>
              ))}
            </div>
          )}
        </div>
        {entity.description && <p className="text-xs text-slate-500 mt-0.5">{entity.description}</p>}
      </div>
    );
  }

  if (kind === 'prep_task') {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-slate-700">{entity.task}</p>
      </div>
    );
  }

  if (kind === 'inventory_need') {
    return (
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-medium text-slate-900">{entity.item}</span>
        {entity.quantity && entity.unit && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-mono">
            {entity.quantity} {entity.unit}
          </span>
        )}
      </div>
    );
  }

  if (kind === 'staffing_assignment') {
    return (
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {entity.station && (
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{entity.station}</span>
        )}
        <span className="text-sm font-medium text-slate-900">{entity.role}</span>
        {entity.person && <span className="text-sm text-slate-600">-- {entity.person}</span>}
        {entity.shift && (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{entity.shift}</span>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="text-sm text-slate-600">{JSON.stringify(entity)}</p>
    </div>
  );
}

function groupByKind(entities: DomainEntity[]): Record<string, DomainEntity[]> {
  const groups: Record<string, DomainEntity[]> = {};
  for (const entity of entities) {
    if (!groups[entity.kind]) groups[entity.kind] = [];
    groups[entity.kind].push(entity);
  }
  return groups;
}
