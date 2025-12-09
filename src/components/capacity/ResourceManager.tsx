import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Save, Settings2, Clock, Building2 } from 'lucide-react';
import { useResourceConfigurations, DepartmentType, ResourceConfiguration } from '@/hooks/useResourceConfigurations';
import { toast } from 'sonner';

interface ResourceManagerProps {
  allMachines: string[];
  jobDepartments: Record<string, DepartmentType>; // Machine -> detected department from jobs
  onConfigChange?: () => void;
}

export function ResourceManager({ allMachines, jobDepartments, onConfigChange }: ResourceManagerProps) {
  const {
    configurations,
    isLoading,
    upsertConfiguration,
    bulkUpsertConfigurations,
    departmentOptions,
  } = useResourceConfigurations();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingRows, setEditingRows] = useState<Record<string, { department: DepartmentType; hours: number }>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  // Build a merged list of all resources (from jobs + configurations)
  const allResources = useMemo(() => {
    const configMap = new Map<string, ResourceConfiguration>();
    configurations.forEach(c => configMap.set(c.resource_name, c));

    const resourceNames = new Set([
      ...allMachines,
      ...configurations.map(c => c.resource_name),
    ]);

    return Array.from(resourceNames)
      .map(name => {
        const config = configMap.get(name);
        const detectedDept = jobDepartments[name];
        
        return {
          name,
          department: config?.department || detectedDept || 'misc',
          workingHours: config?.working_hours_per_day ?? 24,
          hasConfig: !!config,
          detectedDepartment: detectedDept,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allMachines, configurations, jobDepartments]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    if (!searchTerm) return allResources;
    const term = searchTerm.toLowerCase();
    return allResources.filter(r => r.name.toLowerCase().includes(term));
  }, [allResources, searchTerm]);

  // Initialize editing state when a resource needs editing
  const getEditState = (resource: typeof allResources[0]) => {
    if (editingRows[resource.name]) {
      return editingRows[resource.name];
    }
    return {
      department: resource.department as DepartmentType,
      hours: resource.workingHours,
    };
  };

  const handleDepartmentChange = (resourceName: string, dept: DepartmentType) => {
    setEditingRows(prev => ({
      ...prev,
      [resourceName]: {
        ...getEditState(allResources.find(r => r.name === resourceName)!),
        department: dept,
      },
    }));
  };

  const handleHoursChange = (resourceName: string, hours: number) => {
    setEditingRows(prev => ({
      ...prev,
      [resourceName]: {
        ...getEditState(allResources.find(r => r.name === resourceName)!),
        hours: Math.max(1, Math.min(24, hours)),
      },
    }));
  };

  const handleSave = async (resourceName: string) => {
    const editState = editingRows[resourceName];
    if (!editState) return;

    setSavingRows(prev => new Set(prev).add(resourceName));
    try {
      await upsertConfiguration(resourceName, editState.department, editState.hours);
      setEditingRows(prev => {
        const next = { ...prev };
        delete next[resourceName];
        return next;
      });
      onConfigChange?.();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSavingRows(prev => {
        const next = new Set(prev);
        next.delete(resourceName);
        return next;
      });
    }
  };

  const hasChanges = (resource: typeof allResources[0]): boolean => {
    const editState = editingRows[resource.name];
    if (!editState) return false;
    return editState.department !== resource.department || editState.hours !== resource.workingHours;
  };

  // Auto-initialize configurations for new resources
  useEffect(() => {
    if (allMachines.length > 0 && !isLoading) {
      const resourcesWithDepts = allMachines.map(name => ({
        name,
        department: jobDepartments[name] || 'misc' as DepartmentType,
      }));
      bulkUpsertConfigurations(resourcesWithDepts);
    }
  }, [allMachines, jobDepartments, isLoading, bulkUpsertConfigurations]);

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'milling': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'turning': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'sliding_head': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'misc': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Resource Management
        </CardTitle>
        <CardDescription>
          Configure department and working hours per day for each resource. Changes will affect capacity calculations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-2">
          {departmentOptions.map(dept => {
            const count = allResources.filter(r => r.department === dept.value).length;
            return (
              <Badge key={dept.value} variant="outline" className={getDepartmentColor(dept.value)}>
                {dept.label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Table */}
        <ScrollArea className="h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Resource</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Department
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Hours/Day
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map(resource => {
                const editState = getEditState(resource);
                const changed = hasChanges(resource);
                const saving = savingRows.has(resource.name);

                return (
                  <TableRow key={resource.name} className={changed ? 'bg-accent/30' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{resource.name}</span>
                        {!resource.hasConfig && (
                          <span className="text-xs text-muted-foreground">
                            (not yet configured)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editState.department}
                        onValueChange={(v) => handleDepartmentChange(resource.name, v as DepartmentType)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          step={0.5}
                          value={editState.hours}
                          onChange={(e) => handleHoursChange(resource.name, parseFloat(e.target.value) || 24)}
                          className="w-[80px]"
                        />
                        <span className="text-sm text-muted-foreground">hrs</span>
                        {editState.hours < 24 && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round((editState.hours / 24) * 100)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {changed && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(resource.name)}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredResources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No resources match your search' : 'No resources found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="text-sm text-muted-foreground">
          <strong>Note:</strong> Working hours per day affects availability calculations. 
          A resource with 8 hours/day will show higher utilization than one with 24 hours/day for the same workload.
        </div>
      </CardContent>
    </Card>
  );
}
