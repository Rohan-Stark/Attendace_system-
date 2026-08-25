import { get } from '../lib/api-client';
import type { 
  StudentAnalyticsResponse, 
  TeacherAnalyticsResponse, 
  HodAnalyticsResponse, 
  AdminAnalyticsResponse 
} from '../types/api';

export const analyticsService = {
  getStudentAnalytics: () => 
    get<StudentAnalyticsResponse>('/analytics/student'),

  getTeacherAnalytics: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return get<TeacherAnalyticsResponse>(`/analytics/teacher${queryString}`);
  },

  getHodAnalytics: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return get<HodAnalyticsResponse>(`/analytics/hod${queryString}`);
  },

  getAdminAnalytics: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return get<AdminAnalyticsResponse>(`/analytics/admin${queryString}`);
  }
};
