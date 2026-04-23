"use client";

import { apiFetch } from "@/app/lib/api";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

// Types matching the PerformanceReview model
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewType: string;
  scheduledDate: string;
  completedDate: string | null;
  status: string;
  rating: number | null;
  strengths: string | null;
  areasForImprovement: string | null;
  goalsNextPeriod: string | null;
  managerComments: string | null;
  employeeComments: string | null;
  createdAt: string;
  // Joined data
  employeeName?: string;
  reviewerName?: string;
}

const REVIEW_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual Review",
  SIX_MONTH: "6-Month Review",
  COACHING: "Coaching Session",
  PROBATION: "Probation Review",
};

const REVIEW_TYPE_COLORS: Record<string, string> = {
  ANNUAL: "bg-purple-100 text-purple-800",
  SIX_MONTH: "bg-blue-100 text-blue-800",
  COACHING: "bg-green-100 text-green-800",
  PROBATION: "bg-amber-100 text-amber-800",
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700",
    icon: Calendar,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-700",
    icon: AlertTriangle,
  },
};

function RatingStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          className="focus:outline-none"
          disabled={!onChange}
          key={star}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          type="button"
        >
          <Star
            className={`h-5 w-5 ${
              star <= (hovered || rating)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            } ${onChange ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PerformancePageClient() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedReview, setSelectedReview] =
    useState<PerformanceReview | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    reviewType: "SIX_MONTH",
    scheduledDate: "",
  });
  const [completeForm, setCompleteForm] = useState({
    rating: 0,
    strengths: "",
    areasForImprovement: "",
    goalsNextPeriod: "",
    managerComments: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, employeesRes] = await Promise.all([
        apiFetch("/api/staff/performance/list"),
        apiFetch("/api/staff/performance/employees"),
      ]);
      const reviewsData = await reviewsRes.json();
      const employeesData = await employeesRes.json();
      if (reviewsData.success) setReviews(reviewsData.data.reviews || []);
      if (employeesData.success)
        setEmployees(employeesData.data.employees || []);
    } catch (error) {
      console.error("Failed to load performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(createForm.employeeId && createForm.scheduledDate)) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/staff/performance/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setShowCreateDialog(false);
        setCreateForm({
          employeeId: "",
          reviewType: "SIX_MONTH",
          scheduledDate: "",
        });
      }
    } catch (error) {
      console.error("Failed to create review:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || completeForm.rating === 0) return;
    setCompleting(true);
    try {
      const res = await apiFetch("/api/staff/performance/commands/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          rating: completeForm.rating,
          strengths: completeForm.strengths || null,
          areasForImprovement: completeForm.areasForImprovement || null,
          goalsNextPeriod: completeForm.goalsNextPeriod || null,
          managerComments: completeForm.managerComments || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setShowCompleteDialog(false);
        setSelectedReview(null);
        setCompleteForm({
          rating: 0,
          strengths: "",
          areasForImprovement: "",
          goalsNextPeriod: "",
          managerComments: "",
        });
      }
    } catch (error) {
      console.error("Failed to complete review:", error);
    } finally {
      setCompleting(false);
    }
  };

  const stats = {
    total: reviews.length,
    scheduled: reviews.filter((r) => r.status === "scheduled").length,
    completed: reviews.filter((r) => r.status === "completed").length,
    avgRating:
      reviews.filter((r) => r.rating).length > 0
        ? (
            reviews
              .filter((r) => r.rating)
              .reduce((sum, r) => sum + Number(r.rating), 0) /
            reviews.filter((r) => r.rating).length
          ).toFixed(1)
        : "—",
  };

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming")
      return (
        r.status === "scheduled" &&
        new Date(r.scheduledDate) <=
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      );
    if (activeTab === "overdue")
      return r.status === "scheduled" && new Date(r.scheduledDate) < new Date();
    return r.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Track reviews, ratings, goals, and staff development.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Review
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Pending completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">out of 5.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Reviews List */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="all">All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming (
            {
              reviews.filter(
                (r) =>
                  r.status === "scheduled" &&
                  new Date(r.scheduledDate) <=
                    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue (
            {
              reviews.filter(
                (r) =>
                  r.status === "scheduled" &&
                  new Date(r.scheduledDate) < new Date()
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({stats.completed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No reviews found.</p>
                <p className="text-sm mt-1">
                  Schedule a performance review to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => {
                const statusConfig =
                  STATUS_CONFIG[review.status] || STATUS_CONFIG.scheduled;
                const StatusIcon = statusConfig.icon;
                const isOverdue =
                  review.status === "scheduled" &&
                  new Date(review.scheduledDate) < new Date();
                const isExpanded = expandedReview === review.id;

                return (
                  <Card
                    className={isOverdue ? "border-red-300" : ""}
                    key={review.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Status icon */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {review.employeeName || review.employeeId}
                            </span>
                            <Badge
                              className={
                                REVIEW_TYPE_COLORS[review.reviewType] ||
                                "bg-gray-100"
                              }
                            >
                              {REVIEW_TYPE_LABELS[review.reviewType] ||
                                review.reviewType}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(review.scheduledDate)}
                            </span>
                            {review.reviewerName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {review.reviewerName}
                              </span>
                            )}
                            {review.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {Number(review.rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {review.status === "scheduled" && (
                            <Button
                              onClick={() => {
                                setSelectedReview(review);
                                setShowCompleteDialog(true);
                              }}
                              size="sm"
                            >
                              Complete Review
                            </Button>
                          )}
                          <Button
                            onClick={() =>
                              setExpandedReview(isExpanded ? null : review.id)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <p className="capitalize">{statusConfig.label}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Scheduled</p>
                              <p>{formatDate(review.scheduledDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p>{formatDate(review.completedDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Rating</p>
                              {review.rating ? (
                                <RatingStars rating={Number(review.rating)} />
                              ) : (
                                <p className="text-muted-foreground">
                                  Not rated
                                </p>
                              )}
                            </div>
                          </div>

                          {review.strengths && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Strengths
                              </p>
                              <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/30 rounded-md p-2">
                                {review.strengths}
                              </p>
                            </div>
                          )}
                          {review.areasForImprovement && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Areas for Improvement
                              </p>
                              <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                                {review.areasForImprovement}
                              </p>
                            </div>
                          )}
                          {review.goalsNextPeriod && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Goals for Next Period
                              </p>
                              <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-md p-2">
                                {review.goalsNextPeriod}
                              </p>
                            </div>
                          )}
                          {review.managerComments && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Manager Comments
                              </p>
                              <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                {review.managerComments}
                              </p>
                            </div>
                          )}
                          {review.employeeComments && (
                            <div>
                              <p className="text-sm font-medium mb-1">
                                Employee Comments
                              </p>
                              <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                {review.employeeComments}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Performance Review</DialogTitle>
            <DialogDescription>
              Schedule a new performance review for a team member.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, employeeId: v }))
                }
                value={createForm.employeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Review Type *</Label>
                <Select
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, reviewType: v }))
                  }
                  value={createForm.reviewType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual Review</SelectItem>
                    <SelectItem value="SIX_MONTH">6-Month Review</SelectItem>
                    <SelectItem value="COACHING">Coaching Session</SelectItem>
                    <SelectItem value="PROBATION">Probation Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Input
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      scheduledDate: e.target.value,
                    }))
                  }
                  required
                  type="date"
                  value={createForm.scheduledDate}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowCreateDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !(createForm.employeeId && createForm.scheduledDate) ||
                  creating
                }
                type="submit"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Review Dialog */}
      <Dialog onOpenChange={setShowCompleteDialog} open={showCompleteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Performance Review</DialogTitle>
            <DialogDescription>
              {selectedReview &&
                `Review for ${selectedReview.employeeName || "employee"} (${REVIEW_TYPE_LABELS[selectedReview.reviewType] || selectedReview.reviewType})`}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleComplete}>
            <div className="space-y-2">
              <Label>Rating *</Label>
              <RatingStars
                onChange={(r) => setCompleteForm((p) => ({ ...p, rating: r }))}
                rating={completeForm.rating}
              />
              {completeForm.rating === 0 && (
                <p className="text-xs text-muted-foreground">
                  Click a star to rate (1-5)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                onChange={(e) =>
                  setCompleteForm((p) => ({ ...p, strengths: e.target.value }))
                }
                placeholder="What does this employee do well?"
                rows={3}
                value={completeForm.strengths}
              />
            </div>
            <div className="space-y-2">
              <Label>Areas for Improvement</Label>
              <Textarea
                onChange={(e) =>
                  setCompleteForm((p) => ({
                    ...p,
                    areasForImprovement: e.target.value,
                  }))
                }
                placeholder="Where could this employee grow?"
                rows={3}
                value={completeForm.areasForImprovement}
              />
            </div>
            <div className="space-y-2">
              <Label>Goals for Next Period</Label>
              <Textarea
                onChange={(e) =>
                  setCompleteForm((p) => ({
                    ...p,
                    goalsNextPeriod: e.target.value,
                  }))
                }
                placeholder="What should the employee focus on going forward?"
                rows={3}
                value={completeForm.goalsNextPeriod}
              />
            </div>
            <div className="space-y-2">
              <Label>Manager Comments</Label>
              <Textarea
                onChange={(e) =>
                  setCompleteForm((p) => ({
                    ...p,
                    managerComments: e.target.value,
                  }))
                }
                placeholder="Additional notes from the reviewer..."
                rows={2}
                value={completeForm.managerComments}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowCompleteDialog(false);
                  setSelectedReview(null);
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={completeForm.rating === 0 || completing}
                type="submit"
              >
                {completing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
