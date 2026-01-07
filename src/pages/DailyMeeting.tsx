import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Mail,
  Circle,
  Trash2,
  Edit2,
  Check,
  X,
  Award,
  CloudOff,
  Cloud,
  ArrowRightToLine
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

type FlagStatus = 'none' | 'green' | 'amber' | 'red';
type ActionPriority = 'low' | 'medium' | 'high' | 'critical';
type ActionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface Topic {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

interface Customer {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

interface FlagData {
  [key: string]: { status: FlagStatus; comment: string };
}

interface Participant {
  user_id: string;
  full_name: string;
  email: string;
  attended: boolean;
}

interface ActionItem {
  id: string;
  action: string;
  owner_id: string | null;
  owner_name: string | null;
  priority: ActionPriority;
  due_date: string | null;
  status: ActionStatus;
  comments: string | null;
}

interface Recognition {
  id: string;
  recognized_user_id: string | null;
  recognized_user_name: string;
  recognized_by_id: string | null;
  recognized_by_name: string;
  reason: string;
  created_at: string;
}

const DailyMeeting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Initialize date from URL params or default to today
  const getInitialDate = () => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [flags, setFlags] = useState<FlagData>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  
  // Track if initial load is complete to avoid auto-saving on mount
  const isInitialLoadComplete = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Action items state
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [showAddAction, setShowAddAction] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [newAction, setNewAction] = useState<Partial<ActionItem>>({
    action: '',
    owner_id: null,
    owner_name: null,
    priority: 'medium',
    due_date: null,
    status: 'open',
    comments: null
  });

  // Recognition state
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [showAddRecognition, setShowAddRecognition] = useState(false);
  const [newRecognition, setNewRecognition] = useState<Partial<Recognition>>({
    recognized_user_id: null,
    recognized_user_name: '',
    recognized_by_id: null,
    recognized_by_name: '',
    reason: ''
  });

  // Filter topics and customers based on current date
  // For today/future: show active items only
  // For past: show items that were active on that date (created before/on and not deactivated yet or deactivated after)
  const { topics, customers, isPastDate } = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const viewingDateStr = format(currentDate, 'yyyy-MM-dd');
    // Use string comparison to avoid timezone issues
    const isPast = viewingDateStr < todayStr;
    
    console.log('Date filter debug:', { todayStr, viewingDateStr, isPast });

    const filteredTopics = allTopics.filter(topic => {
      // Get just the date part from created_at (first 10 chars: YYYY-MM-DD)
      const createdDateStr = topic.created_at.substring(0, 10);
      
      if (isPast) {
        // For past dates: show if created on/before that date AND (still active OR deactivated after that date)
        if (createdDateStr > viewingDateStr) return false;
        
        if (topic.is_active) return true;
        if (topic.deactivated_at) {
          const deactivatedDateStr = topic.deactivated_at.substring(0, 10);
          return deactivatedDateStr > viewingDateStr;
        }
        return false;
      } else {
        // For today/future: show only active topics created on/before today
        if (createdDateStr > todayStr) return false;
        return topic.is_active;
      }
    });

    const filteredCustomers = allCustomers.filter(customer => {
      const createdDateStr = customer.created_at.substring(0, 10);
      
      if (isPast) {
        if (createdDateStr > viewingDateStr) return false;
        
        if (customer.is_active) return true;
        if (customer.deactivated_at) {
          const deactivatedDateStr = customer.deactivated_at.substring(0, 10);
          return deactivatedDateStr > viewingDateStr;
        }
        return false;
      } else {
        if (createdDateStr > todayStr) return false;
        return customer.is_active;
      }
    });

    return { 
      topics: filteredTopics, 
      customers: filteredCustomers, 
      isPastDate: isPast 
    };
  }, [allTopics, allCustomers, currentDate]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      isInitialLoadComplete.current = false; // Reset before loading new date
      loadMeetingData();
    }
  }, [isAuthenticated, currentDate]);

  const loadMeetingData = async () => {
    setLoading(true);
    try {
      // Load ALL topics and customers (including inactive for historical view)
      const [topicsRes, customersRes, usersRes] = await Promise.all([
        supabase.from('meeting_topics').select('*').order('display_order'),
        supabase.from('meeting_customers').select('*').order('display_order'),
        supabase.from('profiles').select('user_id, full_name, email')
      ]);

      if (topicsRes.data) setAllTopics(topicsRes.data);
      if (customersRes.data) setAllCustomers(customersRes.data);
      if (usersRes.data) setAllUsers(usersRes.data);

      // Load or create meeting for current date
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const { data: existingMeeting } = await supabase
        .from('daily_meetings')
        .select('*')
        .eq('meeting_date', dateStr)
        .maybeSingle();

      if (existingMeeting) {
        setMeetingId(existingMeeting.id);
        
        // Load flags for this meeting
        const { data: flagsData } = await supabase
          .from('meeting_flags')
          .select('*')
          .eq('meeting_id', existingMeeting.id);

        if (flagsData) {
          const flagMap: FlagData = {};
          flagsData.forEach(f => {
            const key = `${f.topic_id}|${f.customer_id}`;
            flagMap[key] = { status: f.status as FlagStatus, comment: f.comment || '' };
          });
          setFlags(flagMap);
        }

        // Load participants
        const { data: participantsData } = await supabase
          .from('meeting_participants')
          .select('user_id, attended')
          .eq('meeting_id', existingMeeting.id);

        if (participantsData && usersRes.data) {
          const participantList = participantsData.map(p => {
            const userInfo = usersRes.data.find(u => u.user_id === p.user_id);
            return {
              user_id: p.user_id,
              full_name: userInfo?.full_name || '',
              email: userInfo?.email || '',
              attended: p.attended
            };
          });
          setParticipants(participantList);
        }

        // Load actions for this meeting
        const { data: actionsData } = await supabase
          .from('meeting_actions')
          .select('*')
          .eq('meeting_id', existingMeeting.id)
          .order('created_at');

        if (actionsData) {
          setActions(actionsData.map(a => ({
            id: a.id,
            action: a.action,
            owner_id: a.owner_id,
            owner_name: a.owner_name,
            priority: a.priority as ActionPriority,
            due_date: a.due_date,
            status: a.status as ActionStatus,
            comments: a.comments
          })));
        }

        // Load recognitions for this meeting
        const { data: recognitionsData } = await supabase
          .from('meeting_recognitions')
          .select('*')
          .eq('meeting_id', existingMeeting.id)
          .order('created_at');

        if (recognitionsData) {
          setRecognitions(recognitionsData.map(r => ({
            id: r.id,
            recognized_user_id: r.recognized_user_id,
            recognized_user_name: r.recognized_user_name,
            recognized_by_id: r.recognized_by_id,
            recognized_by_name: r.recognized_by_name,
            reason: r.reason,
            created_at: r.created_at
          })));
        }
      } else {
        setMeetingId(null);
        setFlags({});
        setParticipants([]);
        setActions([]);
        setRecognitions([]);
      }
    } catch (error) {
      console.error('Error loading meeting data:', error);
      toast({ title: 'Error loading meeting data', variant: 'destructive' });
    }
    setLoading(false);
    // Mark initial load as complete after a short delay to avoid immediate auto-save
    setTimeout(() => {
      isInitialLoadComplete.current = true;
    }, 500);
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!user || loading) return;
    
    setAutoSaveStatus('saving');
    try {
      let mId = meetingId;
      
      // Create meeting if needed
      if (!mId) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('daily_meetings')
          .insert({ meeting_date: dateStr, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        mId = data.id;
        setMeetingId(data.id);
      }

      // Upsert all flags
      const flagRecords = Object.entries(flags).map(([key, value]) => {
        const [topic_id, customer_id] = key.split('|');
        return {
          meeting_id: mId,
          topic_id,
          customer_id,
          status: value.status,
          comment: value.comment,
          updated_by: user?.id
        };
      });

      if (flagRecords.length > 0) {
        const { error } = await supabase
          .from('meeting_flags')
          .upsert(flagRecords, { onConflict: 'meeting_id,topic_id,customer_id' });
        if (error) throw error;
      }

      // Upsert participants
      const participantRecords = participants.map(p => ({
        meeting_id: mId,
        user_id: p.user_id,
        attended: p.attended
      }));

      if (participantRecords.length > 0) {
        await supabase.from('meeting_participants').delete().eq('meeting_id', mId);
        const { error } = await supabase.from('meeting_participants').insert(participantRecords);
        if (error) throw error;
      }

      // Save actions
      for (const action of actions) {
        if (action.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('meeting_actions')
            .insert({
              meeting_id: mId,
              action: action.action,
              owner_id: action.owner_id,
              owner_name: action.owner_name,
              priority: action.priority,
              due_date: action.due_date,
              status: action.status,
              comments: action.comments,
              created_by: user?.id
            })
            .select()
            .single();
          if (error) throw error;
          setActions(prev => prev.map(a => a.id === action.id ? { ...a, id: data.id } : a));
        } else {
          const { error } = await supabase
            .from('meeting_actions')
            .update({
              action: action.action,
              owner_id: action.owner_id,
              owner_name: action.owner_name,
              priority: action.priority,
              due_date: action.due_date,
              status: action.status,
              comments: action.comments
            })
            .eq('id', action.id);
          if (error) throw error;
        }
      }

      // Save recognitions
      for (const recognition of recognitions) {
        if (recognition.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('meeting_recognitions')
            .insert({
              meeting_id: mId,
              recognized_user_id: recognition.recognized_user_id,
              recognized_user_name: recognition.recognized_user_name,
              recognized_by_id: recognition.recognized_by_id,
              recognized_by_name: recognition.recognized_by_name,
              reason: recognition.reason
            })
            .select()
            .single();
          if (error) throw error;
          setRecognitions(prev => prev.map(r => r.id === recognition.id ? { ...r, id: data.id } : r));
        }
      }

      setAutoSaveStatus('saved');
      // Clear status after 2 seconds
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
    }
  }, [user, loading, meetingId, currentDate, flags, participants, actions, recognitions]);

  // Auto-save effect - debounced
  useEffect(() => {
    if (!isInitialLoadComplete.current || loading) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (1.5 second debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [flags, participants, actions, recognitions]);

  const ensureMeetingExists = async (): Promise<string> => {
    if (meetingId) return meetingId;

    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_meetings')
      .insert({ meeting_date: dateStr, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    setMeetingId(data.id);
    return data.id;
  };

  const handleFlagClick = (topicId: string, customerId: string) => {
    const key = `${topicId}|${customerId}`;
    const current = flags[key]?.status || 'none';
    const nextStatus: FlagStatus = current === 'none' ? 'green' : current === 'green' ? 'amber' : current === 'amber' ? 'red' : 'none';
    
    setFlags(prev => ({
      ...prev,
      [key]: { ...prev[key], status: nextStatus, comment: prev[key]?.comment || '' }
    }));
  };

  const handleCommentChange = (topicId: string, customerId: string, comment: string) => {
    const key = `${topicId}|${customerId}`;
    setFlags(prev => ({
      ...prev,
      [key]: { ...prev[key], status: prev[key]?.status || 'none', comment }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mId = await ensureMeetingExists();

      // Upsert all flags
      const flagRecords = Object.entries(flags).map(([key, value]) => {
        const [topic_id, customer_id] = key.split('|');
        return {
          meeting_id: mId,
          topic_id,
          customer_id,
          status: value.status,
          comment: value.comment,
          updated_by: user?.id
        };
      });

      if (flagRecords.length > 0) {
        const { error } = await supabase
          .from('meeting_flags')
          .upsert(flagRecords, { onConflict: 'meeting_id,topic_id,customer_id' });
        if (error) throw error;
      }

      // Upsert participants
      const participantRecords = participants.map(p => ({
        meeting_id: mId,
        user_id: p.user_id,
        attended: p.attended
      }));

      if (participantRecords.length > 0) {
        await supabase.from('meeting_participants').delete().eq('meeting_id', mId);
        const { error } = await supabase.from('meeting_participants').insert(participantRecords);
        if (error) throw error;
      }

      // Save actions - delete removed ones, upsert existing/new
      const existingActionIds = actions.filter(a => a.id && !a.id.startsWith('temp-')).map(a => a.id);
      
      // Delete actions not in current list
      if (meetingId) {
        await supabase
          .from('meeting_actions')
          .delete()
          .eq('meeting_id', mId)
          .not('id', 'in', `(${existingActionIds.join(',') || 'null'})`);
      }

      // Upsert actions
      for (const action of actions) {
        if (action.id.startsWith('temp-')) {
          // Insert new action
          const { data, error } = await supabase
            .from('meeting_actions')
            .insert({
              meeting_id: mId,
              action: action.action,
              owner_id: action.owner_id,
              owner_name: action.owner_name,
              priority: action.priority,
              due_date: action.due_date,
              status: action.status,
              comments: action.comments,
              created_by: user?.id
            })
            .select()
            .single();
          if (error) throw error;
          // Update local state with real ID
          setActions(prev => prev.map(a => a.id === action.id ? { ...a, id: data.id } : a));
        } else {
          // Update existing action
          const { error } = await supabase
            .from('meeting_actions')
            .update({
              action: action.action,
              owner_id: action.owner_id,
              owner_name: action.owner_name,
              priority: action.priority,
              due_date: action.due_date,
              status: action.status,
              comments: action.comments
            })
            .eq('id', action.id);
          if (error) throw error;
        }
      }

      // Save recognitions
      const existingRecognitionIds = recognitions.filter(r => r.id && !r.id.startsWith('temp-')).map(r => r.id);
      
      if (meetingId) {
        await supabase
          .from('meeting_recognitions')
          .delete()
          .eq('meeting_id', mId)
          .not('id', 'in', `(${existingRecognitionIds.join(',') || 'null'})`);
      }

      for (const recognition of recognitions) {
        if (recognition.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('meeting_recognitions')
            .insert({
              meeting_id: mId,
              recognized_user_id: recognition.recognized_user_id,
              recognized_user_name: recognition.recognized_user_name,
              recognized_by_id: recognition.recognized_by_id,
              recognized_by_name: recognition.recognized_by_name,
              reason: recognition.reason
            })
            .select()
            .single();
          if (error) throw error;
          setRecognitions(prev => prev.map(r => r.id === recognition.id ? { ...r, id: data.id } : r));
        }
      }

      toast({ title: 'Meeting saved successfully' });
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast({ title: 'Error saving meeting', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleCreateMinutes = async () => {
    await handleSave();
    
    const dateStr = format(currentDate, 'MMMM d, yyyy');
    let minutes = `Daily Meeting Minutes - ${dateStr}\n\n`;
    const attendees = participants.filter(p => p.attended);
    minutes += `Attendees: ${attendees.map(p => p.full_name || p.email).join(', ')}\n\n`;
    minutes += `STATUS SUMMARY:\n`;
    minutes += `🟢 Good  |  🟡 Need Attention  |  🔴 Under Risk\n\n`;

    topics.forEach(topic => {
      minutes += `\n${topic.name}:\n`;
      customers.forEach(customer => {
        const key = `${topic.id}|${customer.id}`;
        const flag = flags[key];
        if (flag && flag.status !== 'none') {
          const statusIcon = flag.status === 'green' ? '🟢' : flag.status === 'amber' ? '🟡' : '🔴';
          minutes += `  ${statusIcon} ${customer.name}`;
          if (flag.comment) {
            minutes += `: ${flag.comment}`;
          }
          minutes += '\n';
        }
      });
    });

    // Add action items to minutes
    if (actions.length > 0) {
      minutes += `\n\nACTION ITEMS:\n`;
      minutes += `${'─'.repeat(50)}\n`;
      actions.forEach((action, idx) => {
        const priorityEmoji = action.priority === 'critical' ? '🔴' : action.priority === 'high' ? '🟠' : action.priority === 'medium' ? '🟡' : '🟢';
        minutes += `${idx + 1}. ${action.action}\n`;
        minutes += `   Owner: ${action.owner_name || 'Unassigned'}\n`;
        minutes += `   Priority: ${priorityEmoji} ${action.priority.toUpperCase()}\n`;
        minutes += `   Due: ${action.due_date || 'Not set'}\n`;
        minutes += `   Status: ${action.status.replace('_', ' ').toUpperCase()}\n`;
        if (action.comments) {
          minutes += `   Notes: ${action.comments}\n`;
        }
        minutes += '\n';
      });
    }

    // Add recognitions to minutes
    if (recognitions.length > 0) {
      minutes += `\n\nRECOGNITIONS 🏆:\n`;
      minutes += `${'─'.repeat(50)}\n`;
      recognitions.forEach(recognition => {
        minutes += `🌟 ${recognition.recognized_user_name}\n`;
        minutes += `   Reason: ${recognition.reason}\n`;
        minutes += `   Recognized by: ${recognition.recognized_by_name}\n\n`;
      });
    }

    await navigator.clipboard.writeText(minutes);
    
    const attendeeEmails = attendees.map(p => p.email).filter(Boolean).join(';');
    const subject = encodeURIComponent(`Daily Meeting Minutes - ${dateStr}`);
    const mailtoLink = `mailto:${attendeeEmails}?subject=${subject}`;
    
    window.open(mailtoLink, '_blank');
    
    toast({ 
      title: 'Minutes copied to clipboard',
      description: 'Outlook opened - paste the minutes into the email body'
    });
  };

  // Action item management
  const addAction = () => {
    if (!newAction.action?.trim()) return;
    const tempId = `temp-${Date.now()}`;
    setActions(prev => [...prev, {
      id: tempId,
      action: newAction.action || '',
      owner_id: newAction.owner_id || null,
      owner_name: newAction.owner_name || null,
      priority: newAction.priority || 'medium',
      due_date: newAction.due_date || null,
      status: newAction.status || 'open',
      comments: newAction.comments || null
    }]);
    setNewAction({
      action: '',
      owner_id: null,
      owner_name: null,
      priority: 'medium',
      due_date: null,
      status: 'open',
      comments: null
    });
    setShowAddAction(false);
  };

  const updateAction = (id: string, updates: Partial<ActionItem>) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  // Recognition management
  const addRecognition = () => {
    if (!newRecognition.recognized_user_name?.trim() || !newRecognition.reason?.trim() || !newRecognition.recognized_by_name?.trim()) return;
    const tempId = `temp-${Date.now()}`;
    setRecognitions(prev => [...prev, {
      id: tempId,
      recognized_user_id: newRecognition.recognized_user_id || null,
      recognized_user_name: newRecognition.recognized_user_name || '',
      recognized_by_id: newRecognition.recognized_by_id || null,
      recognized_by_name: newRecognition.recognized_by_name || '',
      reason: newRecognition.reason || '',
      created_at: new Date().toISOString()
    }]);
    setNewRecognition({
      recognized_user_id: null,
      recognized_user_name: '',
      recognized_by_id: null,
      recognized_by_name: '',
      reason: ''
    });
    setShowAddRecognition(false);
  };

  const deleteRecognition = (id: string) => {
    setRecognitions(prev => prev.filter(r => r.id !== id));
  };

  const getPriorityColor = (priority: ActionPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-yellow-100 text-yellow-800';
    }
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    try {
      const { data, error } = await supabase
        .from('meeting_topics')
        .insert({ name: newTopic.trim(), display_order: allTopics.length + 1 })
        .select()
        .single();
      if (error) throw error;
      setAllTopics(prev => [...prev, data]);
      setNewTopic('');
      setShowAddTopic(false);
      toast({ title: 'Topic added' });
    } catch (error) {
      toast({ title: 'Error adding topic', variant: 'destructive' });
    }
  };

  const removeTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_topics')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('id', topicId);
      if (error) throw error;
      setAllTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, is_active: false, deactivated_at: new Date().toISOString() } : t
      ));
      toast({ title: 'Topic removed' });
    } catch (error) {
      toast({ title: 'Error removing topic', variant: 'destructive' });
    }
  };

  const addCustomer = async () => {
    if (!newCustomer.trim()) return;
    try {
      const { data, error } = await supabase
        .from('meeting_customers')
        .insert({ name: newCustomer.trim(), display_order: allCustomers.length + 1 })
        .select()
        .single();
      if (error) throw error;
      setAllCustomers(prev => [...prev, data]);
      setNewCustomer('');
      setShowAddCustomer(false);
      toast({ title: 'Customer added' });
    } catch (error) {
      toast({ title: 'Error adding customer', variant: 'destructive' });
    }
  };

  const removeCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_customers')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('id', customerId);
      if (error) throw error;
      setAllCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, is_active: false, deactivated_at: new Date().toISOString() } : c
      ));
      toast({ title: 'Customer removed' });
    } catch (error) {
      toast({ title: 'Error removing customer', variant: 'destructive' });
    }
  };

  const toggleParticipant = (userId: string) => {
    const existing = participants.find(p => p.user_id === userId);
    if (existing) {
      setParticipants(prev => prev.map(p => 
        p.user_id === userId ? { ...p, attended: !p.attended } : p
      ));
    } else {
      const userInfo = allUsers.find(u => u.user_id === userId);
      if (userInfo) {
        setParticipants(prev => [...prev, { ...userInfo, attended: true }]);
      }
    }
  };

  const removeParticipant = (userId: string) => {
    setParticipants(prev => prev.filter(p => p.user_id !== userId));
  };

  const copyFlagsToNextDay = async (customerId: string) => {
    try {
      const nextDate = addDays(currentDate, 1);
      const nextDateStr = format(nextDate, 'yyyy-MM-dd');
      
      // Check if next day meeting exists, create if not
      let { data: nextMeeting } = await supabase
        .from('daily_meetings')
        .select('id')
        .eq('meeting_date', nextDateStr)
        .maybeSingle();
      
      if (!nextMeeting) {
        const { data, error } = await supabase
          .from('daily_meetings')
          .insert({ meeting_date: nextDateStr, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        nextMeeting = data;
      }
      
      // Get all flags for this customer from current meeting
      const flagsToTransfer = Object.entries(flags)
        .filter(([key]) => key.endsWith(`|${customerId}`))
        .filter(([, value]) => value.status !== 'none')
        .map(([key, value]) => {
          const [topic_id] = key.split('|');
          return {
            meeting_id: nextMeeting!.id,
            topic_id,
            customer_id: customerId,
            status: value.status,
            comment: '', // Don't copy comments
            updated_by: user?.id
          };
        });
      
      if (flagsToTransfer.length === 0) {
        toast({ title: 'No flags to transfer', description: 'There are no flags set for this customer.' });
        return;
      }
      
      // Upsert flags to next day
      const { error } = await supabase
        .from('meeting_flags')
        .upsert(flagsToTransfer, { onConflict: 'meeting_id,topic_id,customer_id' });
      
      if (error) throw error;
      
      const customerName = customers.find(c => c.id === customerId)?.name || 'Customer';
      toast({ 
        title: 'Flags transferred', 
        description: `${flagsToTransfer.length} flag(s) for ${customerName} copied to ${format(nextDate, 'MMM d')}.` 
      });
    } catch (error) {
      console.error('Error copying flags:', error);
      toast({ title: 'Error copying flags', variant: 'destructive' });
    }
  };

  const getFlagColor = (status: FlagStatus) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="Daily Meeting" subtitle="RAG Status Tracker" showBackButton backTo="/npi">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Date Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-md font-medium min-w-[180px] text-center">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save status indicator */}
            {autoSaveStatus && (
              <div className={`flex items-center gap-1.5 text-sm ${
                autoSaveStatus === 'saving' ? 'text-muted-foreground' : 
                autoSaveStatus === 'saved' ? 'text-green-600' : 
                'text-destructive'
              }`}>
                {autoSaveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <Cloud className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <CloudOff className="h-3.5 w-3.5" />
                    <span>Save failed</span>
                  </>
                )}
              </div>
            )}
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
            <Button onClick={handleCreateMinutes} disabled={saving}>
              <Mail className="h-4 w-4 mr-2" />
              Create & Send Minutes
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status Matrix</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    <span>Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>Need Attention</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                    <span>Under Risk</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium min-w-[150px]">Topics</th>
                      {customers.map(customer => (
                        <th key={customer.id} className="text-center p-2 font-medium min-w-[180px]">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                              onClick={() => copyFlagsToNextDay(customer.id)}
                              title={`Copy ${customer.name} flags to next day`}
                            >
                              <ArrowRightToLine className="h-3 w-3 mr-1" />
                              Next Day
                            </Button>
                            <span>{customer.name}</span>
                          </div>
                        </th>
                      ))}
                      {!isPastDate && <th className="text-center p-2 font-medium w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map(topic => (
                      <tr key={topic.id} className="border-b">
                        <td className="p-2 font-medium">{topic.name}</td>
                        {customers.map(customer => {
                          const key = `${topic.id}|${customer.id}`;
                          const flag = flags[key];
                          return (
                            <td key={customer.id} className="p-2">
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  onClick={() => handleFlagClick(topic.id, customer.id)}
                                  className={`w-6 h-6 rounded-full ${getFlagColor(flag?.status || 'none')} hover:ring-2 ring-offset-2 ring-primary transition-all`}
                                />
                                <Input
                                  placeholder="Comment..."
                                  className="h-7 text-xs w-full"
                                  value={flag?.comment || ''}
                                  onChange={(e) => handleCommentChange(topic.id, customer.id, e.target.value)}
                                />
                              </div>
                            </td>
                          );
                        })}
                        {!isPastDate && (
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTopic(topic.id)}
                              title="Remove topic"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Topic/Customer buttons - only show for current/future dates */}
              {!isPastDate && (
                <div className="flex gap-4 mt-4">
                  {showAddTopic ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Topic name"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        className="h-8 w-48"
                        onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                      />
                      <Button size="sm" onClick={addTopic}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddTopic(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowAddTopic(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Topic
                    </Button>
                  )}

                  {showAddCustomer ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Customer name"
                        value={newCustomer}
                        onChange={(e) => setNewCustomer(e.target.value)}
                        className="h-8 w-48"
                        onKeyDown={(e) => e.key === 'Enter' && addCustomer()}
                      />
                      <Button size="sm" onClick={addCustomer}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowAddCustomer(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Customer
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants Sidebar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {participants.map(participant => (
                <div key={participant.user_id} className="flex items-center gap-2">
                  <Checkbox
                    checked={participant.attended}
                    onCheckedChange={() => toggleParticipant(participant.user_id)}
                  />
                  <span className="text-sm flex-1">{participant.full_name || participant.email}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeParticipant(participant.user_id)}
                  >
                    ×
                  </Button>
                </div>
              ))}

              {showAddParticipant ? (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Select participant:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allUsers
                      .filter(u => !participants.find(p => p.user_id === u.user_id))
                      .map(user => (
                        <Button
                          key={user.user_id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            toggleParticipant(user.user_id);
                            setShowAddParticipant(false);
                          }}
                        >
                          {user.full_name || user.email}
                        </Button>
                      ))}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddParticipant(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setShowAddParticipant(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Participant
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items - Full Width */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Action Items</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAddAction(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Action
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Action</th>
                    <th className="text-left p-2 font-medium w-32">Owner</th>
                    <th className="text-center p-2 font-medium w-24">Priority</th>
                    <th className="text-center p-2 font-medium w-28">Due Date</th>
                    <th className="text-center p-2 font-medium w-28">Status</th>
                    <th className="text-left p-2 font-medium w-40">Comments</th>
                    <th className="text-center p-2 font-medium w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(action => (
                    <tr key={action.id} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        {editingActionId === action.id ? (
                          <Input
                            value={action.action}
                            onChange={(e) => updateAction(action.id, { action: e.target.value })}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span>{action.action}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Select
                          value={action.owner_id || ''}
                          onValueChange={(value) => {
                            const owner = allUsers.find(u => u.user_id === value);
                            updateAction(action.id, { 
                              owner_id: value || null, 
                              owner_name: owner?.full_name || owner?.email || null 
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <Select
                          value={action.priority}
                          onValueChange={(value: ActionPriority) => updateAction(action.id, { priority: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <Input
                          type="date"
                          value={action.due_date || ''}
                          onChange={(e) => updateAction(action.id, { due_date: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Select
                          value={action.status}
                          onValueChange={(value: ActionStatus) => updateAction(action.id, { status: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={action.comments || ''}
                          onChange={(e) => updateAction(action.id, { comments: e.target.value || null })}
                          placeholder="Notes..."
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteAction(action.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Add new action row */}
                  {showAddAction && (
                    <tr className="border-b bg-primary/5">
                      <td className="p-2">
                        <Input
                          value={newAction.action || ''}
                          onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
                          placeholder="Enter action..."
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={newAction.owner_id || ''}
                          onValueChange={(value) => {
                            const owner = allUsers.find(u => u.user_id === value);
                            setNewAction(prev => ({ 
                              ...prev, 
                              owner_id: value || null,
                              owner_name: owner?.full_name || owner?.email || null
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <Select
                          value={newAction.priority || 'medium'}
                          onValueChange={(value: ActionPriority) => setNewAction(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <Input
                          type="date"
                          value={newAction.due_date || ''}
                          onChange={(e) => setNewAction(prev => ({ ...prev, due_date: e.target.value || null }))}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Select
                          value={newAction.status || 'open'}
                          onValueChange={(value: ActionStatus) => setNewAction(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={newAction.comments || ''}
                          onChange={(e) => setNewAction(prev => ({ ...prev, comments: e.target.value || null }))}
                          placeholder="Notes..."
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                            onClick={addAction}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => {
                              setShowAddAction(false);
                              setNewAction({
                                action: '',
                                owner_id: null,
                                owner_name: null,
                                priority: 'medium',
                                due_date: null,
                                status: 'open',
                                comments: null
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {actions.length === 0 && !showAddAction && (
                <div className="text-center py-8 text-muted-foreground">
                  No action items yet. Click "Add Action" to create one.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recognitions - Full Width */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Recognitions</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAddRecognition(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Recognition
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Person Recognized</th>
                    <th className="text-left p-2 font-medium">Reason</th>
                    <th className="text-left p-2 font-medium w-40">Recognized By</th>
                    <th className="text-left p-2 font-medium w-32">When</th>
                    <th className="text-center p-2 font-medium w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recognitions.map(recognition => (
                    <tr key={recognition.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500">🌟</span>
                          {recognition.recognized_user_name}
                        </div>
                      </td>
                      <td className="p-2">{recognition.reason}</td>
                      <td className="p-2 text-muted-foreground">{recognition.recognized_by_name}</td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {format(new Date(recognition.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteRecognition(recognition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Add new recognition row */}
                  {showAddRecognition && (
                    <tr className="border-b bg-primary/5">
                      <td className="p-2">
                        <Select
                          value={newRecognition.recognized_user_id || ''}
                          onValueChange={(value) => {
                            const selectedUser = allUsers.find(u => u.user_id === value);
                            setNewRecognition(prev => ({
                              ...prev,
                              recognized_user_id: value || null,
                              recognized_user_name: selectedUser?.full_name || selectedUser?.email || ''
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select person..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={newRecognition.reason || ''}
                          onChange={(e) => setNewRecognition(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Reason for recognition..."
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={newRecognition.recognized_by_id || ''}
                          onValueChange={(value) => {
                            const selectedUser = allUsers.find(u => u.user_id === value);
                            setNewRecognition(prev => ({
                              ...prev,
                              recognized_by_id: value || null,
                              recognized_by_name: selectedUser?.full_name || selectedUser?.email || ''
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select person..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">Now</td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                            onClick={addRecognition}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => {
                              setShowAddRecognition(false);
                              setNewRecognition({
                                recognized_user_id: null,
                                recognized_user_name: '',
                                recognized_by_id: null,
                                recognized_by_name: '',
                                reason: ''
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {recognitions.length === 0 && !showAddRecognition && (
                <div className="text-center py-8 text-muted-foreground">
                  No recognitions yet. Click "Add Recognition" to celebrate someone!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
};

export default DailyMeeting;