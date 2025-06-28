import { supabase } from '../lib/supabase';
import { Job, Application, User } from '../types';

// Job storage functions
export const jobStorage = {
  getJobs: async (): Promise<Job[]> => {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        farmer:user_profiles!jobs_farmer_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    // Transform data to match the existing Job interface
    return (jobs || []).map(job => ({
      id: job.id,
      farmerId: job.farmer_id,
      farmerName: job.farmer?.name || 'Unknown Farmer',
      title: job.title,
      description: job.description,
      preferredDate: job.preferred_date,
      wage: job.wage,
      duration: job.duration,
      durationType: job.duration_type,
      location: job.location,
      requiredWorkers: job.required_workers,
      acceptedWorkerIds: [], // We'll calculate this from applications
      status: job.status,
      createdAt: job.created_at
    }));
  },

  saveJob: async (job: Omit<Job, 'id' | 'createdAt' | 'farmerName' | 'acceptedWorkerIds'>): Promise<string | null> => {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        farmer_id: job.farmerId,
        title: job.title,
        description: job.description,
        preferred_date: job.preferredDate,
        wage: job.wage,
        duration: job.duration,
        duration_type: job.durationType,
        location: job.location,
        required_workers: job.requiredWorkers,
        status: job.status
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving job:', error);
      return null;
    }

    return data.id;
  },

  updateJob: async (jobId: string, updates: Partial<Job>): Promise<boolean> => {
    const updateData: any = {};
    
    if (updates.wage !== undefined) updateData.wage = updates.wage;
    if (updates.requiredWorkers !== undefined) updateData.required_workers = updates.requiredWorkers;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.preferredDate !== undefined) updateData.preferred_date = updates.preferredDate;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.durationType !== undefined) updateData.duration_type = updates.durationType;
    if (updates.location !== undefined) updateData.location = updates.location;

    const { error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job:', error);
      return false;
    }

    return true;
  },

  deleteJob: async (jobId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting job:', error);
      return false;
    }

    return true;
  },

  getJobsWithAcceptedWorkers: async (): Promise<Job[]> => {
    // First get all jobs
    const jobs = await jobStorage.getJobs();
    
    // Then get all accepted applications
    const { data: acceptedApps, error } = await supabase
      .from('applications')
      .select('job_id, worker_id')
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching accepted applications:', error);
      return jobs;
    }

    // Group accepted workers by job_id
    const acceptedWorkersByJob = (acceptedApps || []).reduce((acc, app) => {
      if (!acc[app.job_id]) {
        acc[app.job_id] = [];
      }
      acc[app.job_id].push(app.worker_id);
      return acc;
    }, {} as Record<string, string[]>);

    // Add accepted worker IDs to jobs
    return jobs.map(job => ({
      ...job,
      acceptedWorkerIds: acceptedWorkersByJob[job.id] || []
    }));
  }
};

// Application storage functions
export const applicationStorage = {
  getApplications: async (): Promise<Application[]> => {
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        worker:user_profiles!applications_worker_id_fkey(name, email)
      `)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return [];
    }

    return (applications || []).map(app => ({
      id: app.id,
      jobId: app.job_id,
      workerId: app.worker_id,
      workerName: app.worker?.name || 'Unknown Worker',
      workerEmail: app.worker?.email || '',
      message: app.message || undefined,
      status: app.status,
      appliedAt: app.applied_at,
      rejectedAt: app.rejected_at || undefined
    }));
  },

  saveApplication: async (application: Omit<Application, 'id' | 'appliedAt'>): Promise<string | null> => {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id: application.jobId,
        worker_id: application.workerId,
        message: application.message || null,
        status: application.status
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving application:', error);
      return null;
    }

    return data.id;
  },

  updateApplication: async (applicationId: string, updates: Partial<Application>): Promise<boolean> => {
    const updateData: any = {};
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.rejectedAt !== undefined) updateData.rejected_at = updates.rejectedAt;
    if (updates.appliedAt !== undefined) updateData.applied_at = updates.appliedAt;

    const { error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', applicationId);

    if (error) {
      console.error('Error updating application:', error);
      return false;
    }

    return true;
  },

  deleteApplicationsByJobId: async (jobId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', jobId);

    if (error) {
      console.error('Error deleting applications:', error);
      return false;
    }

    return true;
  }
};

// User profile functions
export const userProfileStorage = {
  getUserProfile: async (userId: string): Promise<User | null> => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      email: '', // We'll get this from auth.user
      contactNumber: profile.contact_number,
      userType: profile.user_type,
      location: profile.location || undefined,
      dateOfBirth: profile.date_of_birth || undefined,
      weight: profile.weight || undefined,
      height: profile.height || undefined,
      profilePicture: profile.profile_picture || undefined,
      workingPicture: profile.working_picture || undefined,
      createdAt: profile.created_at
    };
  },

  createUserProfile: async (profile: Omit<User, 'createdAt'>): Promise<boolean> => {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: profile.id,
        name: profile.name,
        contact_number: profile.contactNumber,
        user_type: profile.userType,
        location: profile.location || null,
        date_of_birth: profile.dateOfBirth || null,
        weight: profile.weight || null,
        height: profile.height || null,
        profile_picture: profile.profilePicture || null,
        working_picture: profile.workingPicture || null
      });

    if (error) {
      console.error('Error creating user profile:', error);
      return false;
    }

    return true;
  },

  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.contactNumber !== undefined) updateData.contact_number = updates.contactNumber;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.height !== undefined) updateData.height = updates.height;
    if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture;
    if (updates.workingPicture !== undefined) updateData.working_picture = updates.workingPicture;

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  },

  getAllUserProfiles: async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user profiles:', error);
      return [];
    }

    return (profiles || []).map(profile => ({
      id: profile.id,
      name: profile.name,
      email: '', // We don't store email in profiles
      contactNumber: profile.contact_number,
      userType: profile.user_type,
      location: profile.location || undefined,
      dateOfBirth: profile.date_of_birth || undefined,
      weight: profile.weight || undefined,
      height: profile.height || undefined,
      profilePicture: profile.profile_picture || undefined,
      workingPicture: profile.working_picture || undefined,
      createdAt: profile.created_at
    }));
  }
};