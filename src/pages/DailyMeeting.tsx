import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { 
  Loader2, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Mail,
  Circle
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

type FlagStatus = 'none' | 'green' | 'amber' | 'red';

interface Topic {
  id: string;
  name: string;
  display_order: number;
}

interface Customer {
  id: string;
  name: string;
  display_order: number;
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

const DailyMeeting = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [topics, setTopics] = useState<Topic[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [flags, setFlags] = useState<FlagData>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMeetingData();
    }
  }, [isAuthenticated, currentDate]);

  const loadMeetingData = async () => {
    setLoading(true);
    try {
      // Load topics and customers
      const [topicsRes, customersRes, usersRes] = await Promise.all([
        supabase.from('meeting_topics').select('*').eq('is_active', true).order('display_order'),
        supabase.from('meeting_customers').select('*').eq('is_active', true).order('display_order'),
        supabase.from('profiles').select('user_id, full_name, email')
      ]);

      if (topicsRes.data) setTopics(topicsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
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
      } else {
        setMeetingId(null);
        setFlags({});
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error loading meeting data:', error);
      toast({ title: 'Error loading meeting data', variant: 'destructive' });
    }
    setLoading(false);
  };

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
        // Delete existing and re-insert
        await supabase.from('meeting_participants').delete().eq('meeting_id', mId);
        const { error } = await supabase.from('meeting_participants').insert(participantRecords);
        if (error) throw error;
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
    
    // Generate minutes text
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

    // Copy to clipboard
    await navigator.clipboard.writeText(minutes);
    
    // Get attendee emails and open mailto link
    const attendeeEmails = attendees.map(p => p.email).filter(Boolean).join(';');
    const subject = encodeURIComponent(`Daily Meeting Minutes - ${dateStr}`);
    const mailtoLink = `mailto:${attendeeEmails}?subject=${subject}`;
    
    window.open(mailtoLink, '_blank');
    
    toast({ 
      title: 'Minutes copied to clipboard',
      description: 'Outlook opened - paste the minutes into the email body'
    });
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    try {
      const { data, error } = await supabase
        .from('meeting_topics')
        .insert({ name: newTopic.trim(), display_order: topics.length + 1 })
        .select()
        .single();
      if (error) throw error;
      setTopics(prev => [...prev, data]);
      setNewTopic('');
      setShowAddTopic(false);
      toast({ title: 'Topic added' });
    } catch (error) {
      toast({ title: 'Error adding topic', variant: 'destructive' });
    }
  };

  const addCustomer = async () => {
    if (!newCustomer.trim()) return;
    try {
      const { data, error } = await supabase
        .from('meeting_customers')
        .insert({ name: newCustomer.trim(), display_order: customers.length + 1 })
        .select()
        .single();
      if (error) throw error;
      setCustomers(prev => [...prev, data]);
      setNewCustomer('');
      setShowAddCustomer(false);
      toast({ title: 'Customer added' });
    } catch (error) {
      toast({ title: 'Error adding customer', variant: 'destructive' });
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
    <AppLayout>
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/npi')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={fhxLogoFull} alt="FHX Engineering" className="h-10" />
            <div>
              <h1 className="font-heading font-semibold text-lg">Daily Meeting</h1>
              <p className="text-sm text-primary-foreground/80">RAG Status Tracker</p>
            </div>
          </div>
        </div>
      </header>

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

          <div className="flex items-center gap-2">
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
                        <th key={customer.id} className="text-center p-2 font-medium min-w-[100px]">
                          {customer.name}
                        </th>
                      ))}
                      <th className="text-left p-2 font-medium min-w-[200px]">Comments</th>
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
                            <td key={customer.id} className="text-center p-2">
                              <button
                                onClick={() => handleFlagClick(topic.id, customer.id)}
                                className={`w-6 h-6 rounded-full ${getFlagColor(flag?.status || 'none')} hover:ring-2 ring-offset-2 ring-primary transition-all`}
                              />
                            </td>
                          );
                        })}
                        <td className="p-2">
                          <Input
                            placeholder="Add comment..."
                            className="h-8 text-sm"
                            value={Object.entries(flags)
                              .filter(([k]) => k.startsWith(topic.id))
                              .map(([_, v]) => v.comment)
                              .filter(Boolean)
                              .join('; ') || ''}
                            onChange={(e) => {
                              // Apply comment to first customer with a flag
                              const firstCustomer = customers[0];
                              if (firstCustomer) {
                                handleCommentChange(topic.id, firstCustomer.id, e.target.value);
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Topic/Customer buttons */}
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
      </main>
    </AppLayout>
  );
};

export default DailyMeeting;