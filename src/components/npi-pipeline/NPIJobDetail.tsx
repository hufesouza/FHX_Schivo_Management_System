import { NPIJobWithRelations, getPrereqStatusColor } from '@/types/npi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  Wrench,
  Package
} from 'lucide-react';
import { format } from 'date-fns';

interface NPIJobDetailProps {
  job: NPIJobWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ value, label }: { value: string | null; label: string }) {
  const color = getPrereqStatusColor(value);
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className={colorClasses[color]}>
        {value || 'N/S'}
      </Badge>
    </div>
  );
}

export function NPIJobDetail({ job, open, onOpenChange }: NPIJobDetailProps) {
  if (!job) return null;

  const prereqFields = [
    { key: 'doc_control', label: 'Doc Control' },
    { key: 'po_printed', label: 'PO Printed' },
    { key: 'packaging', label: 'Packaging' },
    { key: 'material', label: 'Material' },
    { key: 'tooling', label: 'Tooling' },
    { key: 'mc_prep', label: 'MC Prep' },
    { key: 'metr_prg', label: 'Metr Prg' },
    { key: 'metr_fix', label: 'Metr Fix' },
    { key: 'gauges', label: 'Gauges' },
    { key: 'additional_reqs', label: 'Additional Req\'s' }
  ];

  const postMcFields = [
    { key: 'work_instructions', label: 'Work Instructions' },
    { key: 'production_ims', label: 'Production IMS' },
    { key: 'qc_ims', label: 'QC IMS' },
    { key: 'fair', label: 'FAIR' },
    { key: 're_rev_closure', label: 'Re-REV Closure' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{job.part || job.dp1 || 'NPI Job'}</span>
            {job.ready_for_mc ? (
              <Badge className="bg-green-500">Ready for MC</Badge>
            ) : (
              <Badge variant="destructive">Not Ready</Badge>
            )}
            {job.fully_released && (
              <Badge className="bg-primary">Released</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">NPI PM</span>
                  <p className="font-medium">{job.npi_pm || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{job.customer || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">MC Cell</span>
                  <p className="font-medium">{job.mc_cell || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Machine</span>
                  <p className="font-medium">{job.mc || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">{job.status || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">% Complete</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${job.percent_complete || 0}%` }}
                      />
                    </div>
                    <span className="font-medium">{job.percent_complete || 0}%</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Description</span>
                  <p className="font-medium">{job.description || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date</span>
                  <p className="font-medium">
                    {job.start_date ? format(new Date(job.start_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date</span>
                  <p className="font-medium">
                    {job.end_date ? format(new Date(job.end_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days</span>
                  <p className="font-medium">{job.days || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gate Commit Date</span>
                  <p className="font-medium">
                    {job.gate_commit_date ? format(new Date(job.gate_commit_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prerequisites Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Pre-requisites to Start MC
                {job.ready_for_mc ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive ml-2" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0">
                {prereqFields.map((field) => (
                  <StatusBadge
                    key={field.key}
                    label={field.label}
                    value={job.prereq?.[field.key as keyof typeof job.prereq] as string | null}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Post-MC Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Post MC Activities
                {job.fully_released ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500 ml-2" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0">
                {postMcFields.map((field) => (
                  <StatusBadge
                    key={field.key}
                    label={field.label}
                    value={job.post_mc?.[field.key as keyof typeof job.post_mc] as string | null}
                  />
                ))}
                <div className="flex items-center justify-between py-2 col-span-2 border-t mt-2 pt-3">
                  <span className="text-sm font-medium">Aging Days</span>
                  <Badge variant="outline" className="text-lg px-4">
                    {job.post_mc?.aging_days ?? '-'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
