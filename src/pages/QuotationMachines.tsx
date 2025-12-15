import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Cog,
  Save,
  X
} from 'lucide-react';
import fhxLogoFull from '@/assets/fhx-logo-full.png';

const MACHINE_TYPES = [
  '3-axis mill',
  '5-axis mill',
  'horizontal mill',
  'lathe',
  'sliding head',
  'mill-turn',
  'deburr',
  'other'
];

interface Machine {
  id: string;
  resource: string;
  description: string;
  group_name: string;
  machine_type: string;
  max_spindle_rpm: number;
  max_cutting_feedrate: number;
  rapid_rate_x: number;
  rapid_rate_y: number;
  rapid_rate_z: number;
  tool_change_time: number;
  probing_time: number;
  load_unload_time: number;
  performance_factor: number;
  suitable_for_prismatic: boolean;
  suitable_for_turned: boolean;
  suitable_for_small_detailed: boolean;
  suitable_for_5axis: boolean;
  is_active: boolean;
}

const emptyMachine: Partial<Machine> = {
  resource: '',
  description: '',
  group_name: '',
  machine_type: '3-axis mill',
  max_spindle_rpm: 10000,
  max_cutting_feedrate: 5000,
  rapid_rate_x: 30000,
  rapid_rate_y: 30000,
  rapid_rate_z: 20000,
  tool_change_time: 5,
  probing_time: 30,
  load_unload_time: 60,
  performance_factor: 1.0,
  suitable_for_prismatic: false,
  suitable_for_turned: false,
  suitable_for_small_detailed: false,
  suitable_for_5axis: false,
  is_active: true,
};

const QuotationMachines = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin';

  const [editingMachine, setEditingMachine] = useState<Partial<Machine> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('group_name', { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (machine: Partial<Machine>) => {
      if (machine.id) {
        const { error } = await supabase
          .from('machines')
          .update(machine)
          .eq('id', machine.id);
        if (error) throw error;
      } else {
        const { resource, description, group_name, machine_type, ...rest } = machine;
        const { error } = await supabase
          .from('machines')
          .insert({
            resource: resource!,
            description: description!,
            group_name: group_name!,
            machine_type: machine_type || 'other',
            ...rest
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine saved successfully');
      setIsDialogOpen(false);
      setEditingMachine(null);
    },
    onError: (error) => {
      toast.error('Failed to save machine: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMachine({ ...emptyMachine });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingMachine?.resource || !editingMachine?.description || !editingMachine?.group_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(editingMachine);
  };

  const updateField = (field: keyof Machine, value: any) => {
    setEditingMachine(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="Machine Resources" subtitle="CNC Smart Quoter" showBackButton backTo="/npi/quotation">

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              Machine Database ({machines.length} machines)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>RPM</TableHead>
                    <TableHead>Feedrate</TableHead>
                    <TableHead>Perf Factor</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => (
                    <TableRow key={machine.id}>
                      <TableCell className="font-medium">{machine.resource}</TableCell>
                      <TableCell>{machine.description}</TableCell>
                      <TableCell>{machine.group_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{machine.machine_type}</Badge>
                      </TableCell>
                      <TableCell>{machine.max_spindle_rpm?.toLocaleString()}</TableCell>
                      <TableCell>{machine.max_cutting_feedrate?.toLocaleString()}</TableCell>
                      <TableCell>{machine.performance_factor}</TableCell>
                      <TableCell>
                        <Badge variant={machine.is_active ? 'default' : 'secondary'}>
                          {machine.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(machine)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this machine?')) {
                                  deleteMutation.mutate(machine.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMachine?.id ? 'Edit Machine' : 'Add New Machine'}
              </DialogTitle>
            </DialogHeader>
            
            {editingMachine && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resource ID *</Label>
                    <Input 
                      value={editingMachine.resource || ''} 
                      onChange={(e) => updateField('resource', e.target.value)}
                      placeholder="e.g., Hurco1"
                    />
                  </div>
                  <div>
                    <Label>Group Name *</Label>
                    <Input 
                      value={editingMachine.group_name || ''} 
                      onChange={(e) => updateField('group_name', e.target.value)}
                      placeholder="e.g., Hurco"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Input 
                    value={editingMachine.description || ''} 
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="e.g., Hurco Machine Centre 1"
                  />
                </div>

                <div>
                  <Label>Machine Type</Label>
                  <Select 
                    value={editingMachine.machine_type || '3-axis mill'} 
                    onValueChange={(v) => updateField('machine_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MACHINE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Max Spindle RPM</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.max_spindle_rpm || 0} 
                      onChange={(e) => updateField('max_spindle_rpm', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Max Feedrate (mm/min)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.max_cutting_feedrate || 0} 
                      onChange={(e) => updateField('max_cutting_feedrate', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Performance Factor</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={editingMachine.performance_factor || 1} 
                      onChange={(e) => updateField('performance_factor', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tool Change Time (s)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.tool_change_time || 0} 
                      onChange={(e) => updateField('tool_change_time', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Probing Time (s)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.probing_time || 0} 
                      onChange={(e) => updateField('probing_time', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Load/Unload Time (s)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.load_unload_time || 0} 
                      onChange={(e) => updateField('load_unload_time', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rapid Rate X (mm/min)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.rapid_rate_x || 0} 
                      onChange={(e) => updateField('rapid_rate_x', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Rapid Rate Y (mm/min)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.rapid_rate_y || 0} 
                      onChange={(e) => updateField('rapid_rate_y', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Rapid Rate Z (mm/min)</Label>
                    <Input 
                      type="number" 
                      value={editingMachine.rapid_rate_z || 0} 
                      onChange={(e) => updateField('rapid_rate_z', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-medium">Suitability Tags</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingMachine.suitable_for_prismatic || false}
                        onCheckedChange={(v) => updateField('suitable_for_prismatic', v)}
                      />
                      <Label>Prismatic Parts</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingMachine.suitable_for_turned || false}
                        onCheckedChange={(v) => updateField('suitable_for_turned', v)}
                      />
                      <Label>Turned Parts</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingMachine.suitable_for_small_detailed || false}
                        onCheckedChange={(v) => updateField('suitable_for_small_detailed', v)}
                      />
                      <Label>Small Detailed Parts</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingMachine.suitable_for_5axis || false}
                        onCheckedChange={(v) => updateField('suitable_for_5axis', v)}
                      />
                      <Label>5-Axis Geometry</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t pt-4">
                  <Switch 
                    checked={editingMachine.is_active ?? true}
                    onCheckedChange={(v) => updateField('is_active', v)}
                  />
                  <Label>Machine Active</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Machine
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
};

export default QuotationMachines;
