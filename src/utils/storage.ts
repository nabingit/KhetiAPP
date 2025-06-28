import { Job, Application } from '../types';

export const jobStorage = {
  getJobs: (): Job[] => {
    return JSON.parse(localStorage.getItem('kheticulture_jobs') || '[]');
  },
  
  saveJob: (job: Job): void => {
    const jobs = jobStorage.getJobs();
    jobs.push(job);
    localStorage.setItem('kheticulture_jobs', JSON.stringify(jobs));
  },
  
  updateJob: (jobId: string, updates: Partial<Job>): void => {
    const jobs = jobStorage.getJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index] = { ...jobs[index], ...updates };
      localStorage.setItem('kheticulture_jobs', JSON.stringify(jobs));
    }
  },

  deleteJob: (jobId: string): void => {
    const jobs = jobStorage.getJobs();
    const updatedJobs = jobs.filter(j => j.id !== jobId);
    localStorage.setItem('kheticulture_jobs', JSON.stringify(updatedJobs));
  }
};

export const applicationStorage = {
  getApplications: (): Application[] => {
    return JSON.parse(localStorage.getItem('kheticulture_applications') || '[]');
  },
  
  saveApplication: (application: Application): void => {
    const applications = applicationStorage.getApplications();
    applications.push(application);
    localStorage.setItem('kheticulture_applications', JSON.stringify(applications));
  },
  
  updateApplication: (applicationId: string, updates: Partial<Application>): void => {
    const applications = applicationStorage.getApplications();
    const index = applications.findIndex(a => a.id === applicationId);
    if (index !== -1) {
      applications[index] = { ...applications[index], ...updates };
      localStorage.setItem('kheticulture_applications', JSON.stringify(applications));
    }
  },

  deleteApplicationsByJobId: (jobId: string): void => {
    const applications = applicationStorage.getApplications();
    const updatedApplications = applications.filter(a => a.jobId !== jobId);
    localStorage.setItem('kheticulture_applications', JSON.stringify(updatedApplications));
  }
};