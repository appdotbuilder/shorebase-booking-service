
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { AuthForm } from '@/components/AuthForm';
import { BookingForm } from '@/components/BookingForm';
import { BookingList } from '@/components/BookingList';
import { OperationsDashboard } from '@/components/OperationsDashboard';
import { RatingForm } from '@/components/RatingForm';
import type { User, Service, BookingWithDetails } from '../../server/src/schema';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false
  });
  const [services, setServices] = useState<Service[]>([]);
  const [userBookings, setUserBookings] = useState<BookingWithDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('book');
  const [servicesLoaded, setServicesLoaded] = useState(false);

  // Load services - only called after authentication
  const loadServices = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    
    try {
      setError(null);
      const result = await trpc.getServices.query();
      setServices(result);
      setServicesLoaded(true);
      
      // If no services, try to seed sample data
      if (result.length === 0) {
        try {
          await trpc.seedSampleData.mutate();
          const refreshedServices = await trpc.getServices.query();
          setServices(refreshedServices);
        } catch (seedError) {
          console.warn('Failed to seed sample data:', seedError);
          // Create some demo services for the frontend to work with
          const demoServices: Service[] = [
            {
              id: 1,
              name: 'Standard Meeting Room',
              type: 'meeting_room',
              subtype: 'standard_room',
              capacity: 4,
              hourly_rate: 25,
              description: 'Perfect for small team meetings',
              is_active: true,
              created_at: new Date()
            },
            {
              id: 2,
              name: 'Conference Room',
              type: 'meeting_room',
              subtype: 'conference_room',
              capacity: 8,
              hourly_rate: 50,
              description: 'Ideal for larger presentations',
              is_active: true,
              created_at: new Date()
            },
            {
              id: 3,
              name: '110 Ton Crane',
              type: 'crane_service',
              subtype: '110_ton_crane',
              capacity: 110,
              hourly_rate: 200,
              description: 'Heavy-duty crane for major operations',
              is_active: true,
              created_at: new Date()
            },
            {
              id: 4,
              name: '5 Ton Forklift',
              type: 'forklift_service',
              subtype: '5_ton_forklift',
              capacity: 5,
              hourly_rate: 75,
              description: 'Heavy-duty forklift for warehouse operations',
              is_active: true,
              created_at: new Date()
            }
          ];
          setServices(demoServices);
        }
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      setError('Unable to connect to services. Using demo data for preview.');
      
      // Provide demo services as fallback
      const fallbackServices: Service[] = [
        {
          id: 1,
          name: 'Standard Meeting Room',
          type: 'meeting_room',
          subtype: 'standard_room',
          capacity: 4,
          hourly_rate: 25,
          description: 'Perfect for small team meetings',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 2,
          name: 'Conference Room',
          type: 'meeting_room',
          subtype: 'conference_room',
          capacity: 8,
          hourly_rate: 50,
          description: 'Ideal for larger presentations',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 3,
          name: 'Executive Room',
          type: 'meeting_room',
          subtype: 'executive_room',
          capacity: 12,
          hourly_rate: 100,
          description: 'Premium boardroom for executive meetings',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 4,
          name: '110 Ton Crane',
          type: 'crane_service',
          subtype: '110_ton_crane',
          capacity: 110,
          hourly_rate: 200,
          description: 'Heavy-duty crane for major operations',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 5,
          name: '220 Ton Crane',
          type: 'crane_service',
          subtype: '220_ton_crane',
          capacity: 220,
          hourly_rate: 350,
          description: 'Ultra heavy-duty crane for the biggest jobs',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 6,
          name: '1 Ton Forklift',
          type: 'forklift_service',
          subtype: '1_ton_forklift',
          capacity: 1,
          hourly_rate: 35,
          description: 'Light-duty forklift for smaller loads',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 7,
          name: '3 Ton Forklift',
          type: 'forklift_service',
          subtype: '3_ton_forklift',
          capacity: 3,
          hourly_rate: 55,
          description: 'Medium-duty forklift for standard operations',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 8,
          name: '5 Ton Forklift',
          type: 'forklift_service',
          subtype: '5_ton_forklift',
          capacity: 5,
          hourly_rate: 75,
          description: 'Heavy-duty forklift for warehouse operations',
          is_active: true,
          created_at: new Date()
        }
      ];
      setServices(fallbackServices);
      setServicesLoaded(true);
    }
  }, [auth.isAuthenticated]);

  // Load user bookings
  const loadUserBookings = useCallback(async () => {
    if (!auth.user) return;
    
    try {
      const result = await trpc.getUserBookings.query({ userId: auth.user.id });
      setUserBookings(result);
    } catch (error) {
      console.error('Failed to load user bookings:', error);
      // Provide empty array as fallback for user bookings
      setUserBookings([]);
    }
  }, [auth.user]);

  // Load services and bookings after authentication
  useEffect(() => {
    if (auth.isAuthenticated && !servicesLoaded) {
      loadServices();
    }
  }, [auth.isAuthenticated, servicesLoaded, loadServices]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadUserBookings();
    }
  }, [auth.isAuthenticated, loadUserBookings]);

  const handleLogin = (user: User) => {
    setAuth({ user, isAuthenticated: true });
    setActiveTab(user.role === 'operations' ? 'dashboard' : 'book');
    setError(null); // Clear any previous errors
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
    setUserBookings([]);
    setServices([]);
    setServicesLoaded(false);
    setActiveTab('book');
    setError(null);
  };

  const handleBookingCreated = () => {
    loadUserBookings();
    setActiveTab('my-bookings');
  };

  const handleBookingUpdated = () => {
    loadUserBookings();
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🏢 ShoreBase Services</h1>
            <p className="text-gray-600">Professional booking management system</p>
          </div>
          
          <AuthForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  const isOperations = auth.user?.role === 'operations';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">🏢 ShoreBase Services</h1>
              {auth.user && (
                <Badge variant={isOperations ? "destructive" : "default"}>
                  {isOperations ? '👔 Operations' : '👤 User'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {auth.user && (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, <strong>{auth.user.username}</strong>
                  </span>
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {!isOperations && (
              <>
                <TabsTrigger value="book">📅 Book Service</TabsTrigger>
                <TabsTrigger value="my-bookings">📋 My Bookings</TabsTrigger>
              </>
            )}
            {isOperations && (
              <>
                <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
                <TabsTrigger value="all-bookings">📋 All Bookings</TabsTrigger>
              </>
            )}
            <TabsTrigger value="services">🔧 Services</TabsTrigger>
            <TabsTrigger value="ratings">⭐ Ratings</TabsTrigger>
          </TabsList>

          {/* Book Service Tab */}
          {!isOperations && (
            <TabsContent value="book" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📅 Book a Service</CardTitle>
                  <CardDescription>
                    Select from our available services and schedule your booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {auth.user && servicesLoaded && (
                    <BookingForm
                      services={services}
                      userId={auth.user.id}
                      onBookingCreated={handleBookingCreated}
                    />
                  )}
                  {!servicesLoaded && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Loading services...</p>
                      <Button onClick={loadServices} variant="outline">
                        Retry Loading Services
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* My Bookings Tab */}
          {!isOperations && (
            <TabsContent value="my-bookings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📋 My Bookings</CardTitle>
                  <CardDescription>
                    View and manage your service reservations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingList
                    bookings={userBookings}
                    isOperations={false}
                    currentUserId={auth.user?.id}
                    onBookingUpdated={handleBookingUpdated}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Operations Dashboard */}
          {isOperations && (
            <TabsContent value="dashboard" className="space-y-6">
              <OperationsDashboard />
            </TabsContent>
          )}

          {/* All Bookings (Operations) */}
          {isOperations && (
            <TabsContent value="all-bookings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📋 All Bookings</CardTitle>
                  <CardDescription>
                    Manage all customer bookings and their statuses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingList
                    bookings={[]} // Will be loaded by the component
                    isOperations={true}
                    onBookingUpdated={() => {}} // Component handles its own updates
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🔧 Available Services</CardTitle>
                <CardDescription>
                  Browse our comprehensive service offerings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!servicesLoaded ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Loading services...</p>
                    <Button onClick={loadServices} variant="outline">
                      Load Services
                    </Button>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No services available yet</p>
                    <Button onClick={loadServices}>Refresh Services</Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((service: Service) => (
                      <Card key={service.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <CardDescription className="capitalize">
                            {service.type.replace('_', ' ')} • {service.subtype.replace('_', ' ')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {service.capacity && (
                              <p className="text-sm text-gray-600">
                                <strong>Capacity:</strong> {service.capacity} {service.type === 'meeting_room' ? 'people' : 'tons'}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <strong>Rate:</strong> ${service.hourly_rate}/hour
                            </p>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>⭐ Service Ratings</CardTitle>
                <CardDescription>
                  {isOperations ? 'View customer feedback and ratings' : 'Rate your completed bookings'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isOperations && auth.user && (
                  <RatingForm
                    userId={auth.user.id}
                    userBookings={userBookings}
                    onRatingSubmitted={loadUserBookings}
                  />
                )}
                {isOperations && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Rating analytics will be displayed here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
