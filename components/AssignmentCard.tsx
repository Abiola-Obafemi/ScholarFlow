
import React from 'react';
import { Assignment, Class } from '../types';
import { Calendar, CheckCircle, Clock, Trash2, Edit2, Circle } from 'lucide-react';

interface AssignmentCardProps {
  assignment: Assignment;
  classInfo?: Class;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ 
  assignment, 
  classInfo, 
  onToggleComplete, 
  onDelete 
}) => {
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const getStatusColor = () => {
    if (assignment.completed) return 'text-slate-400';
    if (diffDays < 0) return 'text-red-500';
    if (diffDays <= 2) return 'text-orange-500 font-bold';
    return 'text-slate-600';
  };

  const getDaysText = () => {
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days left`;
  };

  return (
    <div className={`group glass rounded-xl p-4 transition-all hover:shadow-lg flex items-center gap-4 ${assignment.completed ? 'opacity-60' : ''}`}>
      <button 
        onClick={() => onToggleComplete(assignment.id)}
        className="flex-shrink-0 text-indigo-500 hover:text-indigo-600 transition-colors"
      >
        {assignment.completed ? (
          <CheckCircle className="w-7 h-7 fill-indigo-500 text-white" />
        ) : (
          <Circle className="w-7 h-7" />
        )}
      </button>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: classInfo?.color || '#ccc' }}
          />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
            {classInfo?.name || 'No Class'}
          </p>
        </div>
        <h3 className={`text-base font-semibold truncate ${assignment.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {assignment.name}
        </h3>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          <div className={`flex items-center gap-1.5 text-xs ${getStatusColor()}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{getDaysText()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onDelete(assignment.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AssignmentCard;
