
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Service, CreateBookingInput } from '../../../server/src/schema';

interface BookingFormProps {
  services: Service[];
  userId: number;
  onBookingCreated: () => void;
}

export function BookingForm({ services, userId, onBookingCreated }: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<CreateBookingInput>({
    user_id: userId,
    service_id: 0,
    start_time: new Date(),
    end_time: new Date(),
    notes: null
  });

  // Calculate total amount when service or time changes
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (selectedService && formData.start_time && formData.end_time) {
      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);
      const durationHours = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)));
      setTotalAmount(durationHours * selectedService.hourly_rate);
    }
  }, [selectedService, formData.start_time, formData.end_time]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s: Service) => s.id === parseInt(serviceId));
    setSelectedService(service || null);
    setFormData((prev: CreateBookingInput) => ({
      ...prev,
      service_id: parseInt(serviceId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validate dates
    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    
    if (startTime >= endTime) {
      setError('End time must be after start time.');
      setIsLoading(false);
      return;
    }

    if (startTime < new Date()) {
      setError('Start time cannot be in the past.');
      setIsLoading(false);
      return;
    }

    try {
      await trpc.createBooking.mutate(formData);
      setSuccess(`Booking created successfully! Total amount: $${totalAmount.toFixed(2)}`);
      
      // Reset form
      setFormData({
        user_id: userId,
        service_id: 0,
        start_time: new Date(),
        end_time: new Date(),
        notes: null
      });
      setSelectedService(null);
      
      onBookingCreated();
    } catch (error) {
      console.error('Failed to create booking:', error);
      setError('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current date and time for input defaults
  const now = new Date();
  const currentDateTime = now.toISOString().slice(0, 16);
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

  // Group services by type
  const servicesByType = services.reduce((acc: Record<string, Service[]>, service: Service) => {
    if (!acc[service.type]) {
      acc[service.type] = [];
    }
    acc[service.type].push(service);
    return acc;
  }, {});

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

      {/* Service Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(servicesByType).map(([type, typeServices]) => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                {type === 'meeting_room' && '🏢'}
                {type === 'crane_service' && '🏗️'}
                {type === 'forklift_service' && '🚜'}
                {type.replace('_', ' ')}
              </CardTitle>
              <CardDescription>
                {typeServices.length} service{typeServices.length !== 1 ? 's' : ''} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {typeServices.map((service: Service) => (
                  <div
                    key={service.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleServiceChange(service.id.toString())}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {service.subtype.replace('_', ' ')}
                        </p>
                        {service.capacity && (
                          <p className="text-xs text-gray-500">
                            Capacity: {service.capacity} {type === 'meeting_room' ? 'people' : 'tons'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${service.hourly_rate}/hr</p>
                        <Badge variant={service.is_active ? "default" : "secondary"} className="text-xs">
                          {service.is_active ? 'Available' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-xs text-gray-600 mt-2">{service.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Form */}
      {selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>📅 Complete Your Booking</CardTitle>
            <CardDescription>
              Booking: <strong>{selectedService.name}</strong> at ${selectedService.hourly_rate}/hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={formData.start_time instanceof Date ? formData.start_time.toISOString().slice(0, 16) : currentDateTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateBookingInput) => ({
                        ...prev,
                        start_time: new Date(e.target.value)
                      }))
                    }
                    min={currentDateTime}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={formData.end_time instanceof Date ? formData.end_time.toISOString().slice(0, 16) : nextHour}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateBookingInput) => ({
                        ...prev,
                        end_time: new Date(e.target.value)
                      }))
                    }
                    min={currentDateTime}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateBookingInput) => ({
                      ...prev,
                      notes: e.target.value || null
                    }))
                  }
                  placeholder="Any special requirements or notes..."
                  rows={3}
                />
              </div>

              {/* Total Amount Display */}
              {totalAmount > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estimated Total:</span>
                    <span className="text-xl font-bold text-green-600">${totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Duration calculated from start to end time
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !selectedService}>
                {isLoading ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
