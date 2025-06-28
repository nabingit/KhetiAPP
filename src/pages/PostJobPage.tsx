import React, { useState } from 'react';
import { useAuth } from '../context/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { jobStorage } from '../utils/supabase-storage';
import { ArrowLeft, MapPin, Users } from 'lucide-react';

export function PostJobPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preferredDate: '',
    wage: '',
    duration: '',
    durationType: 'hours' as 'hours' | 'days',
    location: '',
    requiredWorkers: '1'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.userType !== 'farmer') {
      setError('Only farmers can post jobs');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.wage || parseFloat(formData.wage) <= 0) {
      setError('Please enter a valid wage amount');
      return;
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      setError('Please enter a valid duration');
      return;
    }

    if (!formData.requiredWorkers || parseInt(formData.requiredWorkers) <= 0) {
      setError('Please enter a valid number of workers needed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const jobData = {
        farmerId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        preferredDate: formData.preferredDate,
        wage: parseFloat(formData.wage),
        duration: parseInt(formData.duration),
        durationType: formData.durationType,
        location: formData.location.trim(),
        requiredWorkers: parseInt(formData.requiredWorkers),
        status: 'open'
      };

      const jobId = await jobStorage.saveJob(jobData);
      
      if (jobId) {
        navigate('/');
      } else {
        setError('Failed to create job. Please try again.');
      }
    } catch (err) {
      setError('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Post a Job</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., Wheat Harvesting, Irrigation Setup"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Describe the work to be done, skills required, and any special instructions..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workers Needed *
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="number"
              value={formData.requiredWorkers}
              onChange={(e) => setFormData({ ...formData, requiredWorkers: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="1"
              min="1"
              max="50"
              required
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">How many workers do you need for this job?</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Start Date
          </label>
          <input
            type="date"
            value={formData.preferredDate}
            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wage (₹) *
            </label>
            <input
              type="number"
              value={formData.wage}
              onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="500"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per
            </label>
            <select
              value={formData.durationType}
              onChange={(e) => setFormData({ ...formData, durationType: e.target.value as 'hours' | 'days' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="hours">Hour</option>
              <option value="days">Day</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Duration *
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="8"
              min="1"
              required
            />
            <span className="text-gray-600">{formData.durationType}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
          {loading ? 'Posting Job...' : 'Post Job'}
        </button>
      </form>
    </div>
  );
}