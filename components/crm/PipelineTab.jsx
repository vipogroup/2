'use client';

const pipelineStages = [
  { id: 'lead', label: 'ליד', color: '#3b82f6' },
  { id: 'contact', label: 'יצירת קשר', color: '#8b5cf6' },
  { id: 'meeting', label: 'פגישה', color: '#f59e0b' },
  { id: 'proposal', label: 'הצעה', color: '#10b981' },
  { id: 'negotiation', label: 'משא ומתן', color: '#f97316' },
  { id: 'won', label: 'נסגר', color: '#22c55e' },
  { id: 'lost', label: 'אבוד', color: '#ef4444' },
];

export default function PipelineTab({ 
  leads = [], 
  onSelectLead,
}) {
  // Group leads by pipeline stage
  const pipelineLeads = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(lead => (lead.pipelineStage || 'lead') === stage.id);
    return acc;
  }, {});

  // Calculate total value per stage
  const stageValues = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = pipelineLeads[stage.id]?.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0) || 0;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h2 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>Pipeline</h2>
        <p className="text-sm text-gray-500 mt-1">גרור ושחרר לידים בין שלבים</p>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max pb-4">
          {pipelineStages.map(stage => (
            <div 
              key={stage.id} 
              className="w-64 md:w-72 bg-gray-100 rounded-xl flex flex-col max-h-full"
            >
              {/* Stage Header */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-700">{stage.label}</h3>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ background: stage.color }}
                  >
                    {pipelineLeads[stage.id]?.length || 0}
                  </span>
                </div>
                {stageValues[stage.id] > 0 && (
                  <p className="text-xs text-gray-500">
                    סה״כ: ₪{stageValues[stage.id].toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stage Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {pipelineLeads[stage.id]?.map(lead => (
                  <div 
                    key={lead._id} 
                    onClick={() => onSelectLead?.(lead)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      >
                        {lead.name?.substring(0, 2) || '??'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </div>
                    </div>
                    
                    {lead.estimatedValue > 0 && (
                      <p className="text-xs font-medium" style={{ color: '#0891b2' }}>
                        ₪{lead.estimatedValue.toLocaleString()}
                      </p>
                    )}
                    
                    {lead.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.tags.slice(0, 2).map((tag, idx) => (
                          <span 
                            key={idx}
                            className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {(!pipelineLeads[stage.id] || pipelineLeads[stage.id].length === 0) && (
                  <div className="text-center text-gray-400 text-xs py-8">
                    אין לידים
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-bold" style={{ color: '#1e3a8a' }}>{leads.length}</p>
            <p className="text-xs text-gray-500">סה״כ לידים</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-lg font-bold text-green-600">{pipelineLeads.won?.length || 0}</p>
            <p className="text-xs text-gray-500">נסגרו</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-lg font-bold" style={{ color: '#0891b2' }}>
              ₪{Object.values(stageValues).reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">ערך כולל</p>
          </div>
        </div>
      </div>
    </div>
  );
}
