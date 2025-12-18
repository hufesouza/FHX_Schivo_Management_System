import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Link2, Unlink, FileText, Target } from 'lucide-react';

interface NPIJob {
  id: string;
  part: string | null;
  customer: string | null;
  status: string | null;
  mc_cell: string | null;
  npi_project_id: string | null;
}

interface BlueReview {
  id: string;
  blue_review_number: number;
  work_order_number: string | null;
  part_and_rev: string | null;
  customer: string | null;
  status: string;
  npi_project_id: string | null;
}

interface LinkItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onLinkNPIJob: (jobId: string) => Promise<boolean>;
  onUnlinkNPIJob: (jobId: string) => Promise<boolean>;
  onLinkBlueReview: (reviewId: string) => Promise<boolean>;
  onUnlinkBlueReview: (reviewId: string) => Promise<boolean>;
}

export function LinkItemsDialog({
  open,
  onOpenChange,
  projectId,
  onLinkNPIJob,
  onUnlinkNPIJob,
  onLinkBlueReview,
  onUnlinkBlueReview,
}: LinkItemsDialogProps) {
  const [npiJobs, setNpiJobs] = useState<NPIJob[]>([]);
  const [blueReviews, setBlueReviews] = useState<BlueReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, projectId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [jobsRes, reviewsRes] = await Promise.all([
        supabase
          .from('npi_jobs')
          .select('id, part, customer, status, mc_cell, npi_project_id')
          .order('part'),
        supabase
          .from('work_orders')
          .select('id, blue_review_number, work_order_number, part_and_rev, customer, status, npi_project_id')
          .order('blue_review_number', { ascending: false }),
      ]);

      setNpiJobs(jobsRes.data || []);
      setBlueReviews(reviewsRes.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    action: () => Promise<boolean>,
    itemId: string
  ) => {
    setActionLoading(itemId);
    await action();
    await fetchItems();
    setActionLoading(null);
  };

  const filteredJobs = npiJobs.filter(
    (job) =>
      job.part?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.customer?.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const filteredReviews = blueReviews.filter(
    (review) =>
      review.work_order_number?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      review.part_and_rev?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      review.customer?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      `BR-${review.blue_review_number.toString().padStart(5, '0')}`.toLowerCase().includes(reviewSearch.toLowerCase())
  );

  const linkedJobs = filteredJobs.filter((j) => j.npi_project_id === projectId);
  const unlinkedJobs = filteredJobs.filter((j) => !j.npi_project_id);
  const linkedReviews = filteredReviews.filter((r) => r.npi_project_id === projectId);
  const unlinkedReviews = filteredReviews.filter((r) => !r.npi_project_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Link Items to Project</DialogTitle>
          <DialogDescription>
            Link NPI Pipeline jobs and Blue Reviews to this project
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="pipeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pipeline" className="gap-2">
                <Target className="h-4 w-4" />
                NPI Pipeline ({linkedJobs.length})
              </TabsTrigger>
              <TabsTrigger value="bluereview" className="gap-2">
                <FileText className="h-4 w-4" />
                Blue Reviews ({linkedReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by part or customer..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {linkedJobs.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Linked to this project
                    </h4>
                    <div className="space-y-2">
                      {linkedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20"
                        >
                          <div>
                            <p className="font-medium text-sm">{job.part || 'No Part'}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.customer || 'No Customer'} • {job.status || 'No Status'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(() => onUnlinkNPIJob(job.id), job.id)}
                            disabled={actionLoading === job.id}
                          >
                            {actionLoading === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unlinkedJobs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Available to link
                    </h4>
                    <div className="space-y-2">
                      {unlinkedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium text-sm">{job.part || 'No Part'}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.customer || 'No Customer'} • {job.status || 'No Status'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(() => onLinkNPIJob(job.id), job.id)}
                            disabled={actionLoading === job.id}
                          >
                            {actionLoading === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredJobs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No NPI Pipeline jobs found
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="bluereview" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by BR number, W/O, part, or customer..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {linkedReviews.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Linked to this project
                    </h4>
                    <div className="space-y-2">
                      {linkedReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                BR-{review.blue_review_number.toString().padStart(5, '0')}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {review.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {review.work_order_number || 'No W/O'} • {review.part_and_rev || 'No Part'} • {review.customer || 'No Customer'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(() => onUnlinkBlueReview(review.id), review.id)}
                            disabled={actionLoading === review.id}
                          >
                            {actionLoading === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unlinkedReviews.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Available to link
                    </h4>
                    <div className="space-y-2">
                      {unlinkedReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                BR-{review.blue_review_number.toString().padStart(5, '0')}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {review.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {review.work_order_number || 'No W/O'} • {review.part_and_rev || 'No Part'} • {review.customer || 'No Customer'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(() => onLinkBlueReview(review.id), review.id)}
                            disabled={actionLoading === review.id}
                          >
                            {actionLoading === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredReviews.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No Blue Reviews found
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
