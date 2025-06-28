import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Sprout, Eye, EyeOff, MapPin, Calendar, Phone } from 'lucide-react';
import { testSupabaseConnection } from '../lib/supabase';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: '',
    userType: 'worker' as 'farmer' | 'worker',
    location: '',
    dateOfBirth: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Test connection on component mount
    testSupabaseConnection().then(isConnected => {
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    });
  }, []);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getMaxDate = (): string => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  const formatContactNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX if more than 6 digits, or XXX-XXX if more than 3 digits
    if (limitedDigits.length > 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    } else if (limitedDigits.length > 3) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    }
    return limitedDigits;
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatContactNumber(e.target.value);
    setFormData({ ...formData, contactNumber: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(formData.email, formData.password);
        if (!success) {
          setError('Invalid email or password');
        }
      } else {
        if (!formData.name.trim()) {
          setError('Name is required');
          return;
        }

        if (!formData.contactNumber.trim()) {
          setError('Contact number is required');
          return;
        }

        // Validate worker-specific fields
        if (formData.userType === 'worker') {
          if (!formData.location.trim()) {
            setError('Location is required for workers');
            return;
          }
          
          if (!formData.dateOfBirth) {
            setError('Date of birth is required for workers');
            return;
          }

          const age = calculateAge(formData.dateOfBirth);
          if (age < 16) {
            setError('Workers must be at least 16 years old to register');
            return;
          }
        }

        const result = await signup(
          formData.name, 
          formData.email, 
          formData.password, 
          formData.contactNumber,
          formData.userType,
          formData.userType === 'worker' ? formData.location : undefined,
          formData.userType === 'worker' ? formData.dateOfBirth : undefined
        );
        
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else {
          success = true;
        }
      }

      if (success) {
        navigate('/');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeChange = (newUserType: 'farmer' | 'worker') => {
    setFormData({ 
      ...formData, 
      userType: newUserType,
      // Clear worker-specific fields when switching to farmer
      location: newUserType === 'farmer' ? '' : formData.location,
      dateOfBirth: newUserType === 'farmer' ? '' : formData.dateOfBirth
    });
    setError(''); // Clear any existing errors
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <Sprout className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kheticulture</h1>
          <p className="text-gray-600">Connect farmers with local workers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-colors ${
                isLogin ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-colors ${
                !isLogin ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-green-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={handleContactNumberChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter 10-digit mobile number"
                    maxLength={12} // XXX-XXX-XXXX format
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter a valid 10-digit Indian mobile number
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    I am a: *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex-1">
                      <input
                        type="radio"
                        value="farmer"
                        checked={formData.userType === 'farmer'}
                        onChange={(e) => handleUserTypeChange(e.target.value as 'farmer' | 'worker')}
                        className="sr-only"
                      />
                      <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                        formData.userType === 'farmer' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 hover:border-green-300'
                      }`}>
                        <div className="font-medium">Farmer</div>
                        <div className="text-xs text-gray-600">Post jobs</div>
                      </div>
                    </label>
                    <label className="flex-1">
                      <input
                        type="radio"
                        value="worker"
                        checked={formData.userType === 'worker'}
                        onChange={(e) => handleUserTypeChange(e.target.value as 'farmer' | 'worker')}
                        className="sr-only"
                      />
                      <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                        formData.userType === 'worker' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 hover:border-green-300'
                      }`}>
                        <div className="font-medium">Worker</div>
                        <div className="text-xs text-gray-600">Find jobs</div>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.userType === 'worker' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Village/Town, District"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          max={getMaxDate()}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You must be at least 16 years old to register as a worker
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Debug Section - Only show in development */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Connection Status: 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                    connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {connectionStatus}
                  </span>
                </div>
                <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</div>
                <div>API Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'}</div>
                {error && <div className="text-red-600">Error: {error}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}