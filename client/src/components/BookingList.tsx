
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { BookingWithDetails } from '../../../server/src/schema';

interface BookingListProps {
  bookings: BookingWithDetails[];
  isOperations: boolean;
  currentUserId?: number;
  onBookingUpdated?: () => void;
}

type BookingStatus = 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';

export function BookingList({ bookings: initialBookings, isOperations, currentUserId, onBookingUpdated }: BookingListProps) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>(initialBookings);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>(initialBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load all bookings for operations view
  const loadAllBookings = useCallback(async () => {
    if (!isOperations) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.getBookings.query({});
      setBookings(result);
      setFilteredBookings(result);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setError('Failed to load bookings.');
      // Use empty array as fallback for operations
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOperations]);

  useEffect(() => {
    if (isOperations) {
      loadAllBookings();
    } else {
      setBookings(initialBookings);
      setFilteredBookings(initialBookings);
    }
  }, [isOperations, loadAllBookings, initialBookings]);

  // Filter bookings based on status
  useEffect(() => {
    let filtered = bookings;
    if (statusFilter !== 'all') {
      filtered = bookings.filter((booking: BookingWithDetails) => booking.status === statusFilter);
    }
    setFilteredBookings(filtered);
  }, [bookings, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      ongoing: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };

    const statusIcons = {
      pending: '⏳',
      confirmed: '✅',
      ongoing: '🔄',
      completed: '✔️',
      cancelled: '❌'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {statusIcons[status as keyof typeof statusIcons]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await trpc.updateBookingStatus.mutate({
        id: bookingId,
        status: newStatus as BookingStatus
      });

      // Update local state
      setBookings((prev: BookingWithDetails[]) =>
        prev.map((booking: BookingWithDetails) =>
          booking.id === bookingId ? { ...booking, status: newStatus as BookingStatus } : booking
        )
      );

      if (onBookingUpdated) {
        onBookingUpdated();
      }
    } catch (error) {
      console.error('Failed to update booking status:', error);
      setError('Failed to update booking status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!currentUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      await trpc.cancelBooking.mutate({
        bookingId,
        userId: currentUserId
      });

      // Update local state
      setBookings((prev: BookingWithDetails[]) =>
        prev.map((booking: BookingWithDetails) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );

      if (onBookingUpdated) {
        onBookingUpdated();
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      setError('Failed to cancel booking.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppLink = async (bookingId: number) => {
    try {
      await trpc.getWhatsAppBookingLink.query({ bookingId });
      // In a real implementation, this would return a WhatsApp link
      window.open(`https://wa.me/?text=Booking%20ID%20${bookingId}%20details`, '_blank');
    } catch (error) {
      console.error('Failed to get WhatsApp link:', error);
    }
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="confirmed">✅ Confirmed</SelectItem>
            <SelectItem value="ongoing">🔄 Ongoing</SelectItem>
            <SelectItem value="completed">✔️ Completed</SelectItem>
            <SelectItem value="cancelled">❌ Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {isOperations && (
          <Button onClick={loadAllBookings} disabled={isLoading} variant="outline">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        )}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">
            {bookings.length === 0 ? 'No bookings found' : 'No bookings match the current filter'}
          </p>
          {!isOperations && (
            <p className="text-sm text-gray-400">Your bookings will appear here once you make them</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking: BookingWithDetails) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {booking.service?.type === 'meeting_room' && '🏢'}
                      {booking.service?.type === 'crane_service' && '🏗️'}
                      {booking.service?.type === 'forklift_service' && '🚜'}
                      {booking.service?.name || 'Unknown Service'}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {booking.service?.subtype?.replace('_', ' ')} • Booking #{booking.id}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(booking.status)}
                    <div className="text-lg font-bold text-green-600">
                      ${booking.total_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Booking Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">📅 Start Time</p>
                    <p className="text-sm">{booking.start_time.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">📅 End Time</p>
                    <p className="text-sm">{booking.end_time.toLocaleString()}</p>
                  </div>
                </div>

                {isOperations && booking.user && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">👤 Customer</p>
                    <p className="text-sm">{booking.user.username} ({booking.user.email})</p>
                  </div>
                )}

                {booking.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">📝 Notes</p>
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}

                {booking.rating && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">⭐ Rating</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{'⭐'.repeat(booking.rating.rating)}</span>
                      <span className="text-sm text-gray-600">({booking.rating.rating}/5)</span>
                    </div>
                    {booking.rating.feedback && (
                      <p className="text-sm text-gray-700 mt-1">{booking.rating.feedback}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* Operations Actions */}
                  {isOperations && (
                    <>
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                          disabled={isLoading}
                        >
                          ✅ Confirm
                        </Button>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'ongoing')}
                          disabled={isLoading}
                        >
                          🔄 Start Service
                        </Button>
                      )}
                      {booking.status === 'ongoing' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'completed')}
                          disabled={isLoading}
                        >
                          ✔️ Complete
                        </Button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          disabled={isLoading}
                        >
                          ❌ Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsAppLink(booking.id)}
                      >
                        💬 WhatsApp
                      </Button>
                    </>
                  )}

                  {/* User Actions */}
                  {!isOperations && (booking.status === 'pending' || booking.status === 'confirmed') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={isLoading}
                    >
                      ❌ Cancel Booking
                    </Button>
                  )}

                  {/* Booking Details Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        📋 View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Booking #{booking.id}</DialogTitle>
                        <DialogDescription>
                          Complete booking information
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium">Service</p>
                          <p className="text-sm text-gray-600">{booking.service?.name}</p>
                        </div>
                        <div>
                          <p className="font-medium">Duration</p>
                          <p className="text-sm text-gray-600">
                            {booking.start_time.toLocaleString()} - {booking.end_time.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Status</p>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div>
                          <p className="font-medium">Total Amount</p>
                          <p className="text-lg font-bold text-green-600">${booking.total_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Created</p>
                          <p className="text-sm text-gray-600">{booking.created_at.toLocaleString()}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
