
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { BookingWithDetails, CreateRatingInput } from '../../../server/src/schema';

interface RatingFormProps {
  userId: number;
  userBookings: BookingWithDetails[];
  onRatingSubmitted: () => void;
}

export function RatingForm({ userId, userBookings, onRatingSubmitted }: RatingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  // Filter completed bookings that don't have ratings yet
  const ratableBookings = userBookings.filter((booking: BookingWithDetails) => 
    booking.status === 'completed' && !booking.rating
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || rating === 0) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const ratingData: CreateRatingInput = {
        booking_id: selectedBooking.id,
        user_id: userId,
        rating: rating,
        feedback: feedback || null
      };

      await trpc.createRating.mutate(ratingData);
      setSuccess('Rating submitted successfully! Thank you for your feedback.');
      
      // Reset form
      setSelectedBooking(null);
      setRating(0);
      setFeedback('');
      
      onRatingSubmitted();
    } catch (error) {
      console.error('Failed to submit rating:', error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Rating:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              } hover:text-yellow-400`}
            >
              ⭐
            </button>
          ))}
        </div>
        {rating > 0 && (
          <span className="text-sm text-gray-600">({rating}/5)</span>
        )}
      </div>
    );
  };

  // Show existing ratings for completed bookings
  const ratingsToShow = userBookings.filter((booking: BookingWithDetails) => 
    booking.status === 'completed' && booking.rating
  );

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* New Rating Form */}
      
      {ratableBookings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>⭐ Rate Your Experience</CardTitle>
            <CardDescription>
              Share your feedback for completed services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Booking Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Booking to Rate</label>
                <Select 
                  value={selectedBooking?.id.toString() || ''} 
                  onValueChange={(value) => {
                    const booking = ratableBookings.find((b: BookingWithDetails) => b.id.toString() === value);
                    setSelectedBooking(booking || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a completed booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratableBookings.map((booking: BookingWithDetails) => (
                      <SelectItem key={booking.id} value={booking.id.toString()}>
                        {booking.service?.name} - {booking.end_time.toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBooking && (
                <>
                  {/* Booking Details */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedBooking.service?.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedBooking.start_time.toLocaleDateString()} - 
                      {selectedBooking.end_time.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: ${selectedBooking.total_amount.toFixed(2)}
                    </p>
                  </div>

                  {/* Star Rating */}
                  {renderStarRating()}

                  {/* Feedback */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Feedback (Optional)</label>
                    <Textarea
                      value={feedback}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                      placeholder="Share your experience with this service..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || rating === 0}
                    className="w-full"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Rating'}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>⭐ Rate Your Experience</CardTitle>
            <CardDescription>
              Complete a service to rate your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-4">
              No completed bookings available for rating
            </p>
          </CardContent>
        </Card>
      )}

      {/* Existing Ratings */}
      {ratingsToShow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📝 Your Previous Ratings</CardTitle>
            <CardDescription>
              Ratings you've submitted for completed services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ratingsToShow.map((booking: BookingWithDetails) => (
                <div key={booking.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{booking.service?.name}</p>
                      <p className="text-sm text-gray-600">
                        {booking.end_time.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      ✔️ Rated
                    </Badge>
                  </div>
                  
                  {booking.rating && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{'⭐'.repeat(booking.rating.rating)}</span>
                        <span className="text-sm text-gray-600">
                          ({booking.rating.rating}/5)
                        </span>
                        <span className="text-xs text-gray-400">
                          {booking.rating.created_at.toLocaleDateString()}
                        </span>
                      </div>
                      
                      {booking.rating.feedback && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          "{booking.rating.feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
