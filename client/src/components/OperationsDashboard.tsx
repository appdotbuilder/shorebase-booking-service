
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { BookingStats } from '../../../server/src/schema';

export function OperationsDashboard() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.getBookingStats.query({});
      setStats(result);
    } catch (error) {
      console.error('Failed to load booking stats:', error);
      setError('Failed to load dashboard data.');
      // Provide fallback stats for demo
      setStats({
        total_bookings: 0,
        pending: 0,
        confirmed: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        total_revenue: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (error) {
    return (
      <div className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button onClick={loadStats} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Retry'}
        </Button>
      </div>
    );
  }

  if (isLoading && !stats) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(7)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Operations Dashboard</h2>
          <p className="text-gray-600">Real-time booking statistics and management overview</p>
        </div>
        <Button onClick={loadStats} disabled={isLoading} variant="outline">
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </Button>
      </div>

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Bookings */}
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-600 font-medium">Total Bookings</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-900">{stats.total_bookings}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">All time bookings</p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-600 font-medium">Total Revenue</CardDescription>
                <CardTitle className="text-3xl font-bold text-green-900">
                  ${stats.total_revenue.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">All time earnings</p>
              </CardContent>
            </Card>

            {/* Pending Bookings */}
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-yellow-600 font-medium">Pending</CardDescription>
                <CardTitle className="text-3xl font-bold text-yellow-900">{stats.pending}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  ⏳ Needs attention
                </Badge>
              </CardContent>
            </Card>

            {/* Active Services */}
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-600 font-medium">Active Now</CardDescription>
                <CardTitle className="text-3xl font-bold text-purple-900">{stats.ongoing}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  🔄 In progress
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Booking Status Breakdown
                </CardTitle>
                <CardDescription>Current distribution of booking statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>
                    </div>
                    <span className="font-bold">{stats.pending}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">✅ Confirmed</Badge>
                    </div>
                    <span className="font-bold">{stats.confirmed}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">🔄 Ongoing</Badge>
                    </div>
                    <span className="font-bold">{stats.ongoing}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-800">✔️ Completed</Badge>
                    </div>
                    <span className="font-bold">{stats.completed}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800">❌ Cancelled</Badge>
                    </div>
                    <span className="font-bold">{stats.cancelled}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚡ Quick Actions
                </CardTitle>
                <CardDescription>Common operations management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    📋 View All Bookings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    ⏳ Review Pending Bookings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    🔄 Monitor Active Services
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    📊 Generate Reports
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    🔧 Manage Services
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Indicators */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total_bookings > 0 ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {((stats.completed / stats.total_bookings) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {stats.completed} of {stats.total_bookings} completed
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bookings yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cancellation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total_bookings > 0 ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-600">
                      {((stats.cancelled / stats.total_bookings) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {stats.cancelled} of {stats.total_bookings} cancelled
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bookings yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total_bookings > 0 ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(stats.total_revenue / stats.total_bookings).toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600">Per booking</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bookings yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
