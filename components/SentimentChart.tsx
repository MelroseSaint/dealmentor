import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentDataPoint } from '../types';

interface SentimentChartProps {
  data: SentimentDataPoint[];
}

const SentimentChart: React.FC<SentimentChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-lg h-full">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Sentiment & Engagement Graph</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="turn" stroke="#94a3b8" />
          <YAxis yAxisId="left" domain={[-1, 1]} stroke="#94a3b8" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 1]} stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                borderColor: '#475569',
                borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          <Line yAxisId="left" type="monotone" dataKey="sentiment" stroke="#34d399" strokeWidth={2} name="Sentiment" dot={{ r: 4 }} activeDot={{ r: 8 }} />
          <Line yAxisId="right" type="monotone" dataKey="engagement" stroke="#60a5fa" strokeWidth={2} name="Engagement" dot={{ r: 4 }} activeDot={{ r: 8 }}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;