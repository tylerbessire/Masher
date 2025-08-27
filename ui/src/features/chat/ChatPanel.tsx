import React, { useState } from 'react';
import { patchPlan } from '../../lib/patchPlan';
import type { Operation } from 'fast-json-patch';

interface Props {
  plan: any;
  onPlanChange: (plan: any) => void;
}

export const ChatPanel: React.FC<Props> = ({ plan, onPlanChange }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const send = () => {
    try {
      const ops: Operation[] = JSON.parse(input);
      const next = patchPlan(plan, ops);
      onPlanChange(next);
      setHistory(h => [...h, input]);
      setInput('');
    } catch (e) {
      console.error('Invalid patch', e);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="border p-2" />
      <button onClick={send} className="bg-blue-500 text-white px-2 py-1">Apply Patch</button>
      <ul>
        {history.map((h, i) => (
          <li key={i} className="text-xs font-mono">{h}</li>
        ))}
      </ul>
    </div>
  );
};
