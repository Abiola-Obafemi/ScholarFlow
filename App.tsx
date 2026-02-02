
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck, 
  Settings, 
  Plus, 
  Search, 
  Menu, 
  X, 
  Moon, 
  Sun,
  Sparkles,
  CheckCircle2,
  Bell,
  BellOff
} from 'lucide-react';
import { Assignment, Class, ViewType } from './types';
import { INITIAL_CLASSES, CLASS_COLORS } from './constants';
import AssignmentCard from './components/AssignmentCard';
import { getStudyTips } from './services/geminiService';

const App: React.FC = () => {
  // State initialization with LocalStorage
  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('sf_classes');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('sf_assignments');
    return saved ? JSON.parse(saved) : [];
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('sf_theme') === 'dark';
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('sf_notifications') === 'enabled' && Notification.permission === 'granted';
  });

  const [notifiedIds, setNotifiedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sf_notified_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  
  // AI State
  const [aiTips, setAiTips] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('sf_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('sf_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('sf_notified_ids', JSON.stringify(notifiedIds));
  }, [notifiedIds]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('sf_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Derived State
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assignments]);

  const activeAssignments = sortedAssignments.filter(a => !a.completed);
  const completedAssignments = sortedAssignments.filter(a => a.completed);

  // Notification Logic
  const checkUpcomingDeadlines = useCallback(() => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return;

    const now = new Date();
    // Check for assignments due in the next 24 hours
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    activeAssignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate);
      
      // If due within 24 hours, in the future, and hasn't been notified yet
      if (dueDate > now && dueDate <= twentyFourHoursLater && !notifiedIds.includes(assignment.id)) {
        const cls = classes.find(c => c.id === assignment.classId);
        
        try {
          new Notification("Assignment Due Soon! 📚", {
            body: `${assignment.name} for ${cls?.name || 'your class'} is due within 24 hours.`,
            tag: assignment.id // Use assignment ID as tag to prevent duplicate notifications for the same task
          });

          setNotifiedIds(prev => [...prev, assignment.id]);
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
      }
    });
  }, [activeAssignments, classes, notificationsEnabled, notifiedIds]);

  // Initial and periodic check
  useEffect(() => {
    // Immediate check on mount/updates
    checkUpcomingDeadlines();
    
    // Set up a periodic check every 15 minutes
    const interval = setInterval(checkUpcomingDeadlines, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [checkUpcomingDeadlines]);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('sf_notifications', 'enabled');
          new Notification("ScholarFlow Reminders Active!", {
            body: "You'll receive alerts for assignments due within 24 hours.",
          });
        } else if (permission === 'denied') {
          alert("Notification permission denied. Please enable them in your browser settings to receive reminders.");
        }
      } else if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('sf_notifications', 'enabled');
      } else {
        alert("Notifications are blocked in your browser settings. Please enable them to use this feature.");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('sf_notifications', 'disabled');
    }
  };

  // Handlers
  const toggleAssignment = (id: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const deleteAssignment = (id: string) => {
    if (confirm('Delete this assignment?')) {
      setAssignments(prev => prev.filter(a => a.id !== id));
      setNotifiedIds(prev => prev.filter(notifiedId => notifiedId !== id));
    }
  };

  const addAssignment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAssignment: Assignment = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      classId: formData.get('classId') as string,
      dueDate: formData.get('dueDate') as string,
      completed: false,
      priority: 'medium'
    };
    setAssignments(prev => [...prev, newAssignment]);
    setIsAddingAssignment(false);
  };

  const addClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClass: Class = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      color: formData.get('color') as string
    };
    setClasses(prev => [...prev, newClass]);
    setIsAddingClass(false);
  };

  const handleFetchAiTips = async () => {
    setIsAiLoading(true);
    setCurrentView('ai-buddy');
    const tips = await getStudyTips(assignments, classes);
    setAiTips(tips || "Could not generate tips at this moment.");
    setIsAiLoading(false);
  };

  // Nav items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignments', label: 'Assignments', icon: CalendarCheck },
    { id: 'completed', label: 'Completed', icon: CheckCircle2 },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'ai-buddy', label: 'AI Buddy', icon: Sparkles, onClick: handleFetchAiTips },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col md:flex-row`}>
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass border-r h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ScholarFlow</h1>
        </div>

        <nav className="flex-grow px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.onClick) item.onClick();
                else setCurrentView(item.id as ViewType);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2 border-t">
          <button 
            onClick={handleToggleNotifications}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              notificationsEnabled ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            <span className="font-medium">{notificationsEnabled ? 'Reminders On' : 'Enable Alerts'}</span>
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden glass border-b p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <h1 className="text-lg font-bold">ScholarFlow</h1>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleToggleNotifications} className={`p-2 rounded-lg ${notificationsEnabled ? 'text-indigo-500' : 'text-slate-400'}`}>
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-3/4 bg-white dark:bg-slate-800 p-6 shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
             <nav className="space-y-4 mt-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    else setCurrentView(item.id as ViewType);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                    currentView === item.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-500'
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-lg font-medium">{item.label}</span>
                </button>
              ))}
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-4" />
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-slate-500"
              >
                {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                <span className="text-lg font-medium">Switch Theme</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          
          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Welcome back! 👋</h2>
                  <p className="text-slate-500 mt-1">You have {activeAssignments.length} pending assignments.</p>
                </div>
                <button 
                  onClick={() => {
                    if (classes.length === 0) {
                      alert('Please add a class first!');
                      setCurrentView('classes');
                    } else {
                      setIsAddingAssignment(true);
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Add Assignment
                </button>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-2xl border-l-4 border-indigo-500">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Upcoming</p>
                  <h3 className="text-3xl font-bold mt-1">{activeAssignments.length}</h3>
                </div>
                <div className="glass p-6 rounded-2xl border-l-4 border-emerald-500">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Completed</p>
                  <h3 className="text-3xl font-bold mt-1">{completedAssignments.length}</h3>
                </div>
                <div className="glass p-6 rounded-2xl border-l-4 border-amber-500">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Classes</p>
                  <h3 className="text-3xl font-bold mt-1">{classes.length}</h3>
                </div>
              </div>

              {!notificationsEnabled && activeAssignments.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Don't miss a deadline! Enable browser notifications to get automatic reminders.</p>
                  </div>
                  <button onClick={handleToggleNotifications} className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm">Enable Now</button>
                </div>
              )}

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-indigo-500" />
                    Next Up
                  </h3>
                  <button onClick={() => setCurrentView('assignments')} className="text-indigo-600 font-medium text-sm hover:underline">View All</button>
                </div>
                <div className="grid gap-3">
                  {activeAssignments.slice(0, 5).map(assignment => (
                    <AssignmentCard 
                      key={assignment.id} 
                      assignment={assignment} 
                      classInfo={classes.find(c => c.id === assignment.classId)}
                      onToggleComplete={toggleAssignment}
                      onDelete={deleteAssignment}
                    />
                  ))}
                  {activeAssignments.length === 0 && (
                    <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                      <p className="text-slate-400">No upcoming assignments. Enjoy your free time!</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Assignments View */}
          {currentView === 'assignments' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">All Active Assignments</h2>
                <button 
                  onClick={() => {
                    if (classes.length === 0) {
                      alert('Please add a class first!');
                      setCurrentView('classes');
                    } else {
                      setIsAddingAssignment(true);
                    }
                  }}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus />
                </button>
              </div>
              <div className="grid gap-3">
                {activeAssignments.map(assignment => (
                  <AssignmentCard 
                    key={assignment.id} 
                    assignment={assignment} 
                    classInfo={classes.find(c => c.id === assignment.classId)}
                    onToggleComplete={toggleAssignment}
                    onDelete={deleteAssignment}
                  />
                ))}
                {activeAssignments.length === 0 && (
                   <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 italic">Everything is handled! Add something new to stay on track.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed View */}
          {currentView === 'completed' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold">Done & Dusted</h2>
              <div className="grid gap-3">
                {completedAssignments.map(assignment => (
                  <AssignmentCard 
                    key={assignment.id} 
                    assignment={assignment} 
                    classInfo={classes.find(c => c.id === assignment.classId)}
                    onToggleComplete={toggleAssignment}
                    onDelete={deleteAssignment}
                  />
                ))}
                {completedAssignments.length === 0 && (
                   <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 italic">No completed assignments yet. Get to work!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Classes View */}
          {currentView === 'classes' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Classes</h2>
                <button 
                  onClick={() => setIsAddingClass(true)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus />
                </button>
              </div>
              {classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classes.map(cls => (
                    <div key={cls.id} className="glass p-5 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cls.color }}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{cls.name}</h3>
                          <p className="text-sm text-slate-500">{assignments.filter(a => a.classId === cls.id && !a.completed).length} assignments left</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm(`Delete ${cls.name}? This will not delete its assignments.`)) {
                            setClasses(classes.filter(c => c.id !== cls.id));
                          }
                        }}
                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-3xl p-16 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                  <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Classes Found</h3>
                  <p className="text-slate-400 mb-8 max-w-xs mx-auto">Add your first class to start organizing your assignments and study schedule.</p>
                  <button 
                    onClick={() => setIsAddingClass(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Class
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Buddy View */}
          {currentView === 'ai-buddy' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="glass p-8 rounded-3xl overflow-hidden relative border-indigo-200">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sparkles className="w-32 h-32 text-indigo-500" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold flex items-center gap-3 mb-6">
                    <Sparkles className="text-indigo-500" />
                    Scholar Buddy
                  </h2>
                  
                  {isAiLoading ? (
                    <div className="space-y-4 py-8">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 animate-pulse" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2 animate-pulse" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-5/6 animate-pulse" />
                      <p className="text-center text-slate-400 pt-8 animate-bounce">Analyzing your workload...</p>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      {aiTips ? (
                        <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {aiTips}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-slate-500 mb-6">Need a study plan? I can prioritize your work and give you custom tips based on your upcoming deadlines.</p>
                          <button 
                            onClick={handleFetchAiTips}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                          >
                            Generate Study Plan
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Assignment Modal */}
      {isAddingAssignment && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">New Assignment</h2>
              <button onClick={() => setIsAddingAssignment(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X /></button>
            </div>
            <form onSubmit={addAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-500">Assignment Name</label>
                <input required name="name" type="text" placeholder="e.g. History Essay" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-500">Class</label>
                <select required name="classId" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-500">Due Date</label>
                <input required name="dueDate" type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-indigo-100 dark:shadow-none transition-all">
                Save Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isAddingClass && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">New Class</h2>
              <button onClick={() => setIsAddingClass(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X /></button>
            </div>
            <form onSubmit={addClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-500">Class Name</label>
                <input required name="name" type="text" placeholder="e.g. Physics" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-500">Theme Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {CLASS_COLORS.map(color => (
                    <label key={color.value} className="cursor-pointer relative">
                      <input required type="radio" name="color" value={color.value} className="sr-only peer" />
                      <div 
                        className="w-full aspect-square rounded-xl transition-all border-4 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-indigo-500"
                        style={{ backgroundColor: color.value }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-indigo-100 dark:shadow-none transition-all">
                Create Class
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
