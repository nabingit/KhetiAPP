import { Job } from '../types';
import { jobStorage } from './storage';

export class JobStatusManager {
  /**
   * Updates job status based on accepted workers and job date
   */
  static updateJobStatus(job: Job): Job {
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
      const updatedJob = { ...job, status: newStatus };
      jobStorage.updateJob(job.id, { status: newStatus });
      return updatedJob;
    }
    
    return job;
  }
  
  /**
   * Updates all jobs' statuses based on current conditions
   */
  static updateAllJobStatuses(): Job[] {
    const allJobs = jobStorage.getJobs();
    const updatedJobs = allJobs.map(job => this.updateJobStatus(job));
    
    // Save all updated jobs at once if any changed
    const hasChanges = updatedJobs.some((job, index) => job.status !== allJobs[index].status);
    if (hasChanges) {
      localStorage.setItem('kheticulture_jobs', JSON.stringify(updatedJobs));
    }
    
    return updatedJobs;
  }
  
  /**
   * Checks if a job should automatically change status when workers are accepted
   */
  static checkStatusAfterWorkerAccepted(jobId: string): void {
    const allJobs = jobStorage.getJobs();
    const job = allJobs.find(j => j.id === jobId);
    
    if (job) {
      this.updateJobStatus(job);
    }
  }
}