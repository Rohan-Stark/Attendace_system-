class ReportService {
  private async downloadBlob(endpoint: string, filename: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private buildQueryString(fromDate?: string, toDate?: string) {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  // Student
  async downloadStudentCsv() {
    await this.downloadBlob('/reports/student/csv', 'student_report.csv');
  }
  async downloadStudentPdf() {
    await this.downloadBlob('/reports/student/pdf', 'student_report.pdf');
  }

  // Teacher
  async downloadTeacherCsv(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/teacher/csv${this.buildQueryString(fromDate, toDate)}`, 'class_attendance_report.csv');
  }
  async downloadTeacherPdf(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/teacher/pdf${this.buildQueryString(fromDate, toDate)}`, 'class_attendance_report.pdf');
  }

  // HOD
  async downloadHodCsv(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/hod/csv${this.buildQueryString(fromDate, toDate)}`, 'department_report.csv');
  }
  async downloadHodPdf(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/hod/pdf${this.buildQueryString(fromDate, toDate)}`, 'department_report.pdf');
  }

  // Admin
  async downloadAdminCsv(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/admin/csv${this.buildQueryString(fromDate, toDate)}`, 'system_report.csv');
  }
  async downloadAdminPdf(fromDate?: string, toDate?: string) {
    await this.downloadBlob(`/reports/admin/pdf${this.buildQueryString(fromDate, toDate)}`, 'system_report.pdf');
  }
}

export const reportService = new ReportService();
