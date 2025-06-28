import { Job } from '../types';
import { jobStorage } from './supabase-storage';

export class SupabaseJobStatusManager {
  /**
   * Updates job status based on accepted workers and job date
   */
  static async updateJobStatus(job: Job): Promise<Job> {
    const today = new Date();
    const jobDate = new Date(job.preferredDate);
    const acceptedWorkers = job.acceptedWorkerIds?.length || 0;
    
    let newStatus = job.status;
    
    // Auto-change to 'filled' when required workers are reached
    if (acceptedWorkers >= job.requiredWorkers && job.status === 'open') {
      newStatus = 'filled';
    }
    
    // Auto-change to 'in-progress' if job date has arrived and workers are accepted
    if (jobDate <= today && acceptedWorkers > 0 && (job.status === 'open' || job.status === 'filled')) {
      newStatus = 'in-progress';
    }
    
    // If status changed, update the job
    if (newStatus !== job.status) {
      await jobStorage.updateJob(job.id, { status: newStatus });
      return { ...job, status: newStatus };
    }
    
    return job;
  }
  
  /**
   * Updates all jobs' statuses based on current conditions
   */
  static async updateAllJobStatuses(): Promise<Job[]> {
    const allJobs = await jobStorage.getJobsWithAcceptedWorkers();
    const updatedJobs = await Promise.all(
      allJobs.map(job => this.updateJobStatus(job))
    );
    
    return updatedJobs;
  }
  
  /**
   * Checks if a job should automatically change status when workers are accepted
   */
  static async checkStatusAfterWorkerAccepted(jobId: string): Promise<void> {
    const allJobs = await jobStorage.getJobsWithAcceptedWorkers();
    const job = allJobs.find(j => j.id === jobId);
    
    if (job) {
      await this.updateJobStatus(job);
    }
  }
}