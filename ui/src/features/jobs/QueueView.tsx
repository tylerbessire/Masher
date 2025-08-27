import React from 'react';
import { useJobs } from '../../lib/api';

export const QueueView: React.FC = () => {
  const { data } = useJobs();

  return (
    <div className="space-y-2">
      {(data || []).map(job => (
        <div key={job.id} className="border p-2 flex justify-between">
          <span>{job.stage}</span>
          <span>{job.status}</span>
        </div>
      ))}
    </div>
  );
};
