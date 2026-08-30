import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  QrCode,
  FlaskConical,
  Plus,
  Download,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboard } from '@/services/recordService';
import type { DashboardStats } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Records', value: stats?.totalRecords ?? 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Subjects', value: stats?.totalSubjects ?? 0, icon: BookOpen, color: 'text-emerald-500' },
    { label: 'Experiments', value: stats?.totalExperiments ?? 0, icon: FlaskConical, color: 'text-violet-500' },
    { label: 'QR Scans', value: stats?.qrScans ?? 0, icon: QrCode, color: 'text-amber-500' },
  ];

  const chartData =
    stats?.qrAnalytics?.slice(0, 5).map((q) => ({
      name: q.shortId,
      scans: q.totalScans,
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your lab records</p>
        </div>
        <Link to="/records/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Record
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-muted p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              QR Scan Analytics
            </CardTitle>
            <CardDescription>Top scanned short links</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="scans" fill="oklch(0.45 0.2 264)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scan data yet. Share your QR codes to see analytics.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Generated Record</CardTitle>
            <CardDescription>Most recent export</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.lastRecord ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{stats.lastRecord.subjectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.lastRecord.subjectCode} · {stats.lastRecord.experiments.length} experiments
                  </p>
                </div>
                <div className="flex gap-2">
                  {stats.lastRecord.pdfUrl && (
                    <a href={stats.lastRecord.pdfUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                    </a>
                  )}
                  {stats.lastRecord.docxUrl && (
                    <a href={stats.lastRecord.docxUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3 w-3" /> DOCX
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No records generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentSubjects?.length ? (
            <div className="divide-y divide-border">
              {stats.recentSubjects.map((s) => (
                <Link
                  key={s._id}
                  to={`/subjects/${s._id}/experiments`}
                  className="flex items-center justify-between py-3 transition-colors hover:text-primary"
                >
                  <div>
                    <p className="font-medium">{s.subjectName}</p>
                    <p className="text-sm text-muted-foreground">{s.subjectCode}</p>
                  </div>
                  <Badge variant="secondary">{s.experimentCount ?? 0} experiments</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Create your first subject to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
