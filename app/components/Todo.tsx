import React, { useState, useEffect } from 'react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: Date;
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export const Todo = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [filter, setFilter] = useState('all');

  // Load todos from localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem('openpay-todos');
    if (savedTodos) {
      try {
        const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
        }));
        setTodos(parsedTodos);
      } catch (error) {
        console.error('Error parsing todos:', error);
      }
    }
  }, []);

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem('openpay-todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = () => {
    if (newTodoText.trim() === '') return;

    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      priority: selectedPriority,
      category: selectedCategory,
      createdAt: new Date(),
    };

    setTodos([...todos, newTodo]);
    setNewTodoText('');
  };

  const handleToggleComplete = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    if (filter === 'high') return todo.priority === 'high';
    if (filter === 'medium') return todo.priority === 'medium';
    if (filter === 'low') return todo.priority === 'low';
    if (filter.startsWith('category:')) return todo.category === filter.split(':')[1];
    return true;
  });

  const categories = Array.from(new Set(todos.map((todo) => todo.category)));

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">OpenPay Tasks</h2>
      
      {/* Add new todo */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow border rounded-md px-3 py-2"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value as any)}
          className="border rounded-md px-3 py-2"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="general">General</option>
          <option value="development">Development</option>
          <option value="design">Design</option>
          <option value="security">Security</option>
          <option value="testing">Testing</option>
        </select>
        
        <button
          onClick={handleAddTodo}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Task
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md ${
            filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded-md ${
            filter === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 rounded-md ${
            filter === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-3 py-1 rounded-md ${
            filter === 'high' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
          }`}
        >
          High Priority
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(`category:${category}`)}
            className={`px-3 py-1 rounded-md ${
              filter === `category:${category}` ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Todo list */}
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tasks found</p>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center justify-between p-3 border rounded-md ${
                todo.completed ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleComplete(todo.id)}
                  className="mr-3 h-5 w-5"
                />
                <div>
                  <p className={todo.completed ? 'line-through text-gray-500' : ''}>
                    {todo.text}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-md ${PRIORITY_COLORS[todo.priority]}`}>
                      {todo.priority}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100">
                      {todo.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {todo.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Summary */}
      <div className="mt-6 text-sm text-gray-500">
        <p>Total: {todos.length} tasks</p>
        <p>Completed: {todos.filter((t) => t.completed).length} tasks</p>
        <p>Pending: {todos.filter((t) => !t.completed).length} tasks</p>
      </div>
    </div>
  );
};

export default Todo; 