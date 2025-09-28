import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CalendarIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  Download,
  User,
  Activity,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  task_type: 'follow_up' | 'meeting' | 'email' | 'call' | 'research' | 'other';
  due_date: string;
  completed_date?: string;
  created_at: string;
  created_by: string;
  assigned_to?: string;
  organization?: {
    name: string;
  };
}

export const CRMTaskManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();

  const [taskData, setTaskData] = useState({
    organization_id: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    task_type: 'follow_up' as 'follow_up' | 'meeting' | 'email' | 'call' | 'research' | 'other',
    assigned_to: ''
  });

  // Mock tasks data - in real app, this would come from your database
  const mockTasks: Task[] = [
    {
      id: '1',
      organization_id: '1',
      title: 'Follow up on membership renewal',
      description: 'Contact State University about their membership renewal status and answer any questions.',
      priority: 'high',
      status: 'pending',
      task_type: 'follow_up',
      due_date: '2024-01-20T09:00:00Z',
      created_at: '2024-01-15T10:30:00Z',
      created_by: 'admin',
      organization: { name: 'State University' }
    },
    {
      id: '2',
      organization_id: '2',
      title: 'Schedule quarterly review meeting',
      description: 'Set up meeting with Community College to discuss their experience and gather feedback.',
      priority: 'medium',
      status: 'in_progress',
      task_type: 'meeting',
      due_date: '2024-01-25T14:00:00Z',
      created_at: '2024-01-14T14:15:00Z',
      created_by: 'admin',
      organization: { name: 'Community College' }
    },
    {
      id: '3',
      organization_id: '3',
      title: 'Send invoice reminder',
      description: 'Email invoice reminder to Tech Institute for their overdue payment.',
      priority: 'urgent',
      status: 'completed',
      task_type: 'email',
      due_date: '2024-01-16T10:00:00Z',
      completed_date: '2024-01-16T09:30:00Z',
      created_at: '2024-01-13T09:00:00Z',
      created_by: 'admin',
      organization: { name: 'Tech Institute' }
    },
    {
      id: '4',
      organization_id: '4',
      title: 'Research new software integration',
      description: 'Investigate potential integration opportunities for University Alliance.',
      priority: 'low',
      status: 'pending',
      task_type: 'research',
      due_date: '2024-01-30T17:00:00Z',
      created_at: '2024-01-12T11:00:00Z',
      created_by: 'admin',
      organization: { name: 'University Alliance' }
    }
  ];

  // Fetch organizations for task creation
  const { data: organizations = [] } = useQuery({
    queryKey: ['task-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name
        `)
        .eq('membership_status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Filter tasks
  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.organization?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesType = filterType === "all" || task.task_type === filterType;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesType;
  });

  const handleCreateTask = async () => {
    try {
      // Validate form
      if (!taskData.organization_id || !taskData.title || !dueDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // In a real app, you would save this to your database
      console.log('Creating task:', { ...taskData, due_date: dueDate });

      toast({
        title: "Task Created",
        description: "Task has been successfully created.",
      });

      // Reset form
      setTaskData({
        organization_id: '',
        title: '',
        description: '',
        priority: 'medium',
        task_type: 'follow_up',
        assigned_to: ''
      });
      setDueDate(undefined);
      setCreateTaskOpen(false);

    } catch (error) {
      console.error('Task creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create the task.",
        variant: "destructive",
      });
    }
  };

  const handleToggleTaskComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      // In a real app, you would update this in your database
      console.log('Toggling task status:', taskId, newStatus);

      toast({
        title: "Task Updated",
        description: `Task marked as ${newStatus}.`,
      });

    } catch (error) {
      console.error('Task update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update the task.",
        variant: "destructive",
      });
    }
  };

  const handleExportTasks = async () => {
    try {
      const csvHeaders = "Title,Organization,Priority,Status,Type,Due Date,Created Date,Description\n";
      const csvRows = filteredTasks.map(task => 
        `"${task.title}","${task.organization?.name || ''}","${task.priority}","${task.status}","${task.task_type}","${new Date(task.due_date).toLocaleDateString()}","${new Date(task.created_at).toLocaleDateString()}","${task.description.replace(/"/g, '""')}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `crm_tasks_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredTasks.length} tasks to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export tasks.",
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      urgent: { variant: "destructive", className: "bg-red-500 text-white" },
      high: { variant: "destructive", className: "bg-orange-500 text-white" },
      medium: { variant: "default", className: "bg-yellow-500 text-white" },
      low: { variant: "secondary", className: "bg-green-500 text-white" },
    };
    
    const config = variants[priority] || variants.medium;
    return (
      <Badge variant={config.variant} className={config.className}>
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Circle className="h-3 w-3" /> },
      in_progress: { variant: "default", icon: <Clock className="h-3 w-3" /> },
      completed: { variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <Archive className="h-3 w-3" /> },
    };
    
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed';
  };

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{mockTasks.length}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-semibold">{mockTasks.filter(t => t.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-semibold">{mockTasks.filter(t => t.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-lg font-semibold">{mockTasks.filter(t => isOverdue(t.due_date, t.status)).length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportTasks} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export ({filteredTasks.length})
          </Button>
          <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization *</Label>
                    <Select value={taskData.organization_id} onValueChange={(value) => setTaskData(prev => ({ ...prev, organization_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Task Title *</Label>
                  <Input
                    value={taskData.title}
                    onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={taskData.priority} onValueChange={(value: any) => setTaskData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <Select value={taskData.task_type} onValueChange={(value: any) => setTaskData(prev => ({ ...prev, task_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={taskData.description}
                    onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task description..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Task Management ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className={isOverdue(task.due_date, task.status) ? 'bg-red-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTaskComplete(task.id, task.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={cn("font-medium", task.status === 'completed' && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      <Badge variant="outline" className="mt-1">
                        {task.task_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{task.organization?.name}</p>
                  </TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    <div className={cn("text-sm", isOverdue(task.due_date, task.status) && "text-red-600 font-medium")}>
                      <p>{new Date(task.due_date).toLocaleDateString()}</p>
                      {isOverdue(task.due_date, task.status) && (
                        <p className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setTaskDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Task Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {selectedTask.title}</p>
                    <p><span className="font-medium">Organization:</span> {selectedTask.organization?.name}</p>
                    <p><span className="font-medium">Type:</span> {selectedTask.task_type.replace('_', ' ')}</p>
                    <p><span className="font-medium">Priority:</span> {selectedTask.priority}</p>
                    <p><span className="font-medium">Status:</span> {selectedTask.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Created:</span> {new Date(selectedTask.created_at).toLocaleDateString()}</p>
                    <p><span className="font-medium">Due Date:</span> {new Date(selectedTask.due_date).toLocaleDateString()}</p>
                    {selectedTask.completed_date && (
                      <p><span className="font-medium">Completed:</span> {new Date(selectedTask.completed_date).toLocaleDateString()}</p>
                    )}
                    {isOverdue(selectedTask.due_date, selectedTask.status) && (
                      <p className="text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold">Description</h4>
                <p className="text-sm bg-muted p-3 rounded-md mt-2">{selectedTask.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};