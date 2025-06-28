import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/SupabaseAuthContext';
import { JobCard } from '../components/JobCard';
import { Job, Application, User } from '../types';
import { jobStorage, applicationStorage, userProfileStorage } from '../utils/supabase-storage';
import { SupabaseJobStatusManager } from '../utils/supabase-job-status-manager';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, DollarSign, X, Save, Users, User as UserIcon, Mail, MapPin, Calendar, Camera, Phone } from 'lucide-react';

export function MyJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [editData, setEditData] = useState({
    wage: '',
    requiredWorkers: '',
    status: 'open' as 'open' | 'filled' | 'in-progress' | 'completed'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const [dataLoading, setDataLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;

    // Update all job statuses first
    const updatedJobs = await SupabaseJobStatusManager.updateAllJobStatuses();

    if (user.userType === 'farmer') {
      setJobs(updatedJobs.filter(job => job.farmerId === user.id));
    } else {
      const allApplications = await applicationStorage.getApplications();
      const userApplications = allApplications.filter(app => app.workerId === user.id);
      setApplications(userApplications);

      // Filter jobs to only include those that still exist AND have user applications
      const appliedJobs = updatedJobs.filter(job => 
        userApplications.some(app => app.jobId === job.id)
      );
      setJobs(appliedJobs);
      setApplications(userApplications);
    }
    setDataLoading(false);
  };

  const getJobApplications = async (jobId: string): Promise<Application[]> => {
    const allApplications = await applicationStorage.getApplications();
    return allApplications.filter(app => app.jobId === jobId);
  };

  const hasApplications = async (jobId: string): Promise<boolean> => {
    const apps = await getJobApplications(jobId);
    return apps.length > 0;
  };

  const getAcceptedApplicationsCount = async (jobId: string): Promise<number> => {
    const allApplications = await applicationStorage.getApplications();
    return allApplications.filter(app => app.jobId === jobId && app.status === 'accepted').length;
  };

  const getFarmerProfile = async (farmerId: string): Promise<User | null> => {
    return await userProfileStorage.getUserProfile(farmerId);
  };

  const handleViewFarmerProfile = async (farmerId: string) => {
    const farmerProfile = await getFarmerProfile(farmerId);
    if (farmerProfile) {
      setSelectedFarmer(farmerProfile);
      setShowFarmerModal(true);
    }
  };

  const handleEditJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setEditData({
      wage: job.wage?.toString() || '',
      requiredWorkers: job.requiredWorkers?.toString() || '',
      status: job.status
    });
    setEditingJob(jobId);
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;

    const job = jobs.find(j => j.id === editingJob);
    if (!job) return;

    // Validate wage
    const newWage = parseFloat(editData.wage);
    if (isNaN(newWage) || newWage <= 0) {
      alert('Please enter a valid wage amount');
      return;
    }

    // Validate required workers
    const newRequiredWorkers = parseInt(editData.requiredWorkers);
    if (isNaN(newRequiredWorkers) || newRequiredWorkers <= 0) {
      alert('Please enter a valid number of workers');
      return;
    }

    // Check if we can edit wage (no applications allowed)
    if ((await hasApplications(editingJob)) && newWage !== job.wage) {
      alert('Cannot change wage when there are applications for this job');
      return;
    }

    // Check if we can reduce required workers below accepted count
    const acceptedCount = await getAcceptedApplicationsCount(editingJob);
    if (newRequiredWorkers < acceptedCount) {
      alert(`Cannot reduce workers below ${acceptedCount} as you have already accepted ${acceptedCount} worker${acceptedCount !== 1 ? 's' : ''}`);
      return;
    }

    // Update job
    const success = await jobStorage.updateJob(editingJob, {
      wage: newWage,
      requiredWorkers: newRequiredWorkers,
      status: editData.status
    });

    if (success) {
      // Check if status should auto-update after manual changes
      await SupabaseJobStatusManager.checkStatusAfterWorkerAccepted(editingJob);

      setEditingJob(null);
      await loadData();
    } else {
      alert('Failed to update job. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditData({ wage: '', requiredWorkers: '', status: 'open' });
  };

  const handleDeleteJob = (jobId: string) => {
    setShowDeleteConfirm(jobId);
  };

  const confirmDeleteJob = async () => {
    if (!showDeleteConfirm) return;

    const success = await jobStorage.deleteJob(showDeleteConfirm);

    if (success) {
      setShowDeleteConfirm(null);
      await loadData();
    } else {
      alert('Failed to delete job. Please try again.');
    }
  };

  const getApplicationStatus = (jobId: string) => {
    return applications.find(app => app.jobId === jobId)?.status || 'pending';
  };

  const canReapply = (jobId: string): boolean => {
    const application = applications.find(app => app.jobId === jobId);
    if (!application || application.status !== 'rejected' || !application.rejectedAt) {
      return false;
    }
    
    const rejectedTime = new Date(application.rejectedAt).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - rejectedTime) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

  const getTimeUntilReapply = (jobId: string): string => {
    const application = applications.find(app => app.jobId === jobId);
    if (!application || application.status !== 'rejected' || !application.rejectedAt) {
      return '';
    }
    
    const rejectedTime = new Date(application.rejectedAt).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - rejectedTime) / (1000 * 60 * 60);
    const hoursLeft = Math.ceil(24 - hoursPassed);
    
    if (hoursLeft <= 0) return '';
    return `Can reapply in ${hoursLeft} hours`;
  };

  const handleViewApplicants = (jobId: string) => {
    navigate(`/applicants/${jobId}`);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDisplayContactNumber = (contactNumber: string): string => {
    if (contactNumber.length === 10) {
      return `${contactNumber.slice(0, 3)}-${contactNumber.slice(3, 6)}-${contactNumber.slice(6)}`;
    }
    return contactNumber;
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'filled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'filled':
        return 'Filled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const DeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;

    const job = jobs.find(j => j.id === showDeleteConfirm);
    const jobApplications = getJobApplications(showDeleteConfirm);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Job</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete "{job?.title}"? This action cannot be undone.
          </p>
          
          {jobApplications.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle size={16} className="text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">
                  This job has {jobApplications.length} application{jobApplications.length !== 1 ? 's' : ''}. 
                  Deleting will also remove all applications.
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteJob}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete Job
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FarmerProfileModal = () => {
    if (!selectedFarmer || !showFarmerModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                  {selectedFarmer.profilePicture ? (
                    <img 
                      src={selectedFarmer.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={32} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFarmer.name}</h2>
                  <div className="flex items-center text-green-100">
                    <span className="capitalize">{selectedFarmer.userType}</span>
                    {selectedFarmer.dateOfBirth && (
                      <span className="ml-2">• {calculateAge(selectedFarmer.dateOfBirth)} years old</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFarmerModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center py-2">
                <Mail size={16} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{selectedFarmer.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <div className="flex items-center py-2">
                <Phone size={16} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{formatDisplayContactNumber(selectedFarmer.contactNumber)}</span>
              </div>
            </div>

            {selectedFarmer.location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Location</label>
                <div className="flex items-center py-2">
                  <MapPin size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">{selectedFarmer.location}</span>
                </div>
              </div>
            )}

            {selectedFarmer.dateOfBirth && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="flex items-center py-2">
                  <Calendar size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {formatDate(selectedFarmer.dateOfBirth)} ({calculateAge(selectedFarmer.dateOfBirth)} years old)
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <div className="flex items-center py-2">
                <span className="text-gray-900">
                  {formatDate(selectedFarmer.createdAt)}
                </span>
              </div>
            </div>

            {/* Farmer's Job Statistics */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Farmer Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {jobStorage.getJobs().filter(job => job.farmerId === selectedFarmer.id).length}
                  </div>
                  <div className="text-xs text-gray-600">Jobs Posted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {jobStorage.getJobs()
                      .filter(job => job.farmerId === selectedFarmer.id)
                      .reduce((total, job) => total + (job.acceptedWorkerIds?.length || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-600">Workers Hired</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Briefcase className="text-green-600 mr-3" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
          <p className="text-gray-600">
            {user.userType === 'farmer' 
              ? 'Manage your job postings and applicants'
              : 'Track your job applications'
            }
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Briefcase size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {user.userType === 'farmer' ? 'No jobs posted yet' : 'No applications yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {user.userType === 'farmer' 
              ? 'Create your first job post to start finding workers'
              : 'Browse available jobs and start applying'
            }
          </p>
          <button
            onClick={() => navigate(user.userType === 'farmer' ? '/post-job' : '/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            {user.userType === 'farmer' ? 'Post a Job' : 'Browse Jobs'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {user.userType === 'farmer' && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  {jobs.filter(job => job.status === 'open').length}
                </div>
                <div className="text-xs text-green-700">Open</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {jobs.filter(job => job.status === 'filled').length}
                </div>
                <div className="text-xs text-blue-700">Filled</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {jobs.filter(job => job.status === 'in-progress').length}
                </div>
                <div className="text-xs text-yellow-700">In Progress</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-600">
                  {jobs.filter(job => job.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-700">Completed</div>
              </div>
            </div>
          )}

          {jobs.map(job => (
            <div key={job.id}>
              {user.userType === 'worker' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Application Status:</span>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(getApplicationStatus(job.id))
                    }`}>
                      {getStatusIcon(getApplicationStatus(job.id))}
                      <span className="ml-1 capitalize">{getApplicationStatus(job.id)}</span>
                    </div>
                  </div>
                  
                  {getApplicationStatus(job.id) === 'rejected' && !canReapply(job.id) && (
                    <div className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <AlertCircle size={14} className="mr-1" />
                      {getTimeUntilReapply(job.id)}
                    </div>
                  )}
                  
                  {getApplicationStatus(job.id) === 'rejected' && canReapply(job.id) && (
                    <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      <CheckCircle size={14} className="mr-1" />
                      You can reapply to this job now
                    </div>
                  )}
                </div>
              )}
              
              {user.userType === 'farmer' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">Job Status:</span>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getJobStatusColor(job.status)
                      }`}>
                        <span>{getJobStatusText(job.status)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditJob(job.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit job"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete job"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editingJob === job.id && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <h4 className="font-medium text-gray-900 mb-3">Edit Job</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wage (₹)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="number"
                              value={editData.wage}
                              onChange={(e) => setEditData({ ...editData, wage: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              placeholder="500"
                              min="1"
                              disabled={hasApplications(job.id)}
                            />
                          </div>
                          {hasApplications(job.id) && (
                            <p className="text-xs text-orange-600 mt-1">
                              Cannot edit wage when there are applications
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Workers Needed
                          </label>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="number"
                              value={editData.requiredWorkers}
                              onChange={(e) => setEditData({ ...editData, requiredWorkers: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              placeholder="1"
                              min="1"
                              max="50"
                            />
                          </div>
                          {getAcceptedApplicationsCount(job.id) > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Minimum {getAcceptedApplicationsCount(job.id)} worker{getAcceptedApplicationsCount(job.id) !== 1 ? 's' : ''} (already accepted)
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Status
                          </label>
                          <select
                            value={editData.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value as 'open' | 'filled' | 'in-progress' | 'completed' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="open">Open</option>
                            <option value="filled">Filled</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            <Save size={16} className="mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
                          >
                            <X size={16} className="mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Application count info */}
                  <div className="text-xs text-gray-500 mb-2">
                    {getJobApplications(job.id).length} application{getJobApplications(job.id).length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              
              <JobCard
                job={job}
                onViewApplicants={handleViewApplicants}
                onViewFarmerProfile={handleViewFarmerProfile}
                showActions={user.userType === 'farmer'}
                isOwner={user.userType === 'farmer'}
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal />

      {/* Farmer Profile Modal */}
      <FarmerProfileModal />
    </div>
  );
}