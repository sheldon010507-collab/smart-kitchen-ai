import { useState } from 'react';
import { ChefHat, Check, Clock, AlertCircle } from 'lucide-react';

export function PrepList() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: 'Chop vegetables for soup',
      ingredients: ['Carrots', 'Celery', 'Onions'],
      quantity: '2kg total',
      time: '30 min',
      priority: 'high',
      completed: false,
    },
    {
      id: 2,
      name: 'Marinate chicken breast',
      ingredients: ['Chicken breast', 'Olive oil', 'Herbs'],
      quantity: '3kg',
      time: '15 min + 2h rest',
      priority: 'high',
      completed: false,
    },
    {
      id: 3,
      name: 'Prepare pastry dough',
      ingredients: ['Flour', 'Butter', 'Water'],
      quantity: '2kg',
      time: '45 min',
      priority: 'medium',
      completed: false,
    },
    {
      id: 4,
      name: 'Wash and portion salad',
      ingredients: ['Lettuce', 'Tomatoes', 'Cucumber'],
      quantity: '20 portions',
      time: '20 min',
      priority: 'medium',
      completed: true,
    },
    {
      id: 5,
      name: 'Prepare stock',
      ingredients: ['Chicken bones', 'Vegetables', 'Herbs'],
      quantity: '5L',
      time: '3 hours',
      priority: 'low',
      completed: false,
    },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="pb-24 px-4 pt-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Prep List</h1>
        <p className="text-gray-600">Daily kitchen preparation tasks</p>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Today's Progress</span>
          <span className="text-sm text-gray-600">
            {completedTasks.length} of {tasks.length} completed
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(completedTasks.length / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">To Do ({activeTasks.length})</h2>
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-6 h-6 rounded-md border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-1 hover:border-green-500 transition-colors"
                  >
                    {task.completed && <Check className="w-4 h-4 text-green-500" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{task.name}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ml-2 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {task.ingredients.join(', ')}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <ChefHat className="w-4 h-4" />
                        <span>{task.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{task.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Completed ({completedTasks.length})</h2>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div key={task.id} className="bg-green-50 rounded-2xl p-4 border border-green-200">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-6 h-6 rounded-md bg-green-500 border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-1"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-500 line-through mb-1">{task.name}</h3>
                    <div className="text-sm text-gray-500">{task.ingredients.join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <span className="font-semibold">Prep Tip:</span> Prep lists are generated based on your menu and expected service. Mark tasks as complete to track progress.
        </div>
      </div>
    </div>
  );
}
