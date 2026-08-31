import csv
import io
from datetime import datetime, timezone
from fpdf import FPDF
from typing import Dict, Any

class ReportService:
    def _create_pdf_base(self, title: str, period_str: str) -> FPDF:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "SmartAttend Report", ln=True, align='C')
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, title, ln=True, align='C')
        
        pdf.set_font("Helvetica", "", 10)
        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        pdf.cell(0, 6, f"Generated: {generated_at}", ln=True, align='C')
        pdf.cell(0, 6, f"Period: {period_str}", ln=True, align='C')
        pdf.ln(5)
        return pdf

    # --- Student Reports ---
    def generate_student_csv(self, data: Dict[str, Any]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Summary
        writer.writerow(["Student Attendance Report"])
        writer.writerow(["Total Classes", data.get("total_classes", 0)])
        writer.writerow(["Present", data.get("present_count", 0)])
        writer.writerow(["Absent", data.get("absent_count", 0)])
        writer.writerow(["Percentage", f"{data.get('attendance_percentage', 0.0)}%"])
        writer.writerow([])
        
        # History Table
        writer.writerow(["Date", "Status", "Session ID"])
        for record in data.get("history", []):
            writer.writerow([record.get("date"), record.get("status"), record.get("session_id")])
            
        return output.getvalue()

    def generate_student_pdf(self, data: Dict[str, Any]) -> bytes:
        pdf = self._create_pdf_base("Student Attendance Report", "All Time")
        
        # Summary
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(50, 6, f"Total Classes: {data.get('total_classes', 0)}", ln=True)
        pdf.cell(50, 6, f"Present: {data.get('present_count', 0)}", ln=True)
        pdf.cell(50, 6, f"Absent: {data.get('absent_count', 0)}", ln=True)
        pdf.cell(50, 6, f"Percentage: {data.get('attendance_percentage', 0.0)}%", ln=True)
        pdf.ln(5)
        
        # Table Header
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 8, "Date", border=1)
        pdf.cell(60, 8, "Status", border=1)
        pdf.cell(60, 8, "Session ID", border=1, ln=True)
        
        # Table Rows
        pdf.set_font("Helvetica", "", 10)
        for record in data.get("history", []):
            pdf.cell(60, 8, str(record.get("date")), border=1)
            pdf.cell(60, 8, str(record.get("status")).capitalize(), border=1)
            pdf.cell(60, 8, str(record.get("session_id")), border=1, ln=True)
            
        return bytes(pdf.output())

    # --- Teacher Reports ---
    def generate_teacher_csv(self, data: Dict[str, Any], period_str: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Class Attendance Report"])
        writer.writerow(["Period", period_str])
        writer.writerow(["Total Sessions", data.get("total_sessions", 0)])
        writer.writerow(["Total Records", data.get("total_records", 0)])
        writer.writerow(["Present", data.get("present_count", 0)])
        writer.writerow(["Absent", data.get("absent_count", 0)])
        writer.writerow(["Overall Percentage", f"{data.get('attendance_percentage', 0.0)}%"])
        writer.writerow([])
        
        writer.writerow(["USN", "Name", "Total Classes", "Present", "Absent", "Percentage"])
        for student in data.get("student_stats", []):
            writer.writerow([
                student.get("usn"), student.get("name"), student.get("total_classes"),
                student.get("present_count"), student.get("absent_count"), f"{student.get('attendance_percentage')}%"
            ])
            
        return output.getvalue()

    def generate_teacher_pdf(self, data: Dict[str, Any], period_str: str) -> bytes:
        pdf = self._create_pdf_base("Class Attendance Report", period_str)
        
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(60, 6, f"Total Sessions: {data.get('total_sessions', 0)}", ln=False)
        pdf.cell(60, 6, f"Total Records: {data.get('total_records', 0)}", ln=True)
        pdf.cell(60, 6, f"Present: {data.get('present_count', 0)}", ln=False)
        pdf.cell(60, 6, f"Absent: {data.get('absent_count', 0)}", ln=True)
        pdf.cell(60, 6, f"Overall Percentage: {data.get('attendance_percentage', 0.0)}%", ln=True)
        pdf.ln(5)
        
        # Table Header
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(35, 8, "USN", border=1)
        pdf.cell(60, 8, "Name", border=1)
        pdf.cell(20, 8, "Total", border=1, align='C')
        pdf.cell(20, 8, "Present", border=1, align='C')
        pdf.cell(20, 8, "Absent", border=1, align='C')
        pdf.cell(20, 8, "Perc (%)", border=1, ln=True, align='C')
        
        # Table Rows
        pdf.set_font("Helvetica", "", 10)
        for student in data.get("student_stats", []):
            pdf.cell(35, 8, str(student.get("usn")), border=1)
            pdf.cell(60, 8, str(student.get("name"))[:25], border=1)
            pdf.cell(20, 8, str(student.get("total_classes")), border=1, align='C')
            pdf.cell(20, 8, str(student.get("present_count")), border=1, align='C')
            pdf.cell(20, 8, str(student.get("absent_count")), border=1, align='C')
            pdf.cell(20, 8, f"{student.get('attendance_percentage')}%", border=1, ln=True, align='C')
            
        return bytes(pdf.output())

    # --- HOD Reports ---
    def generate_hod_csv(self, data: Dict[str, Any], period_str: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Department Attendance Report"])
        writer.writerow(["Period", period_str])
        writer.writerow(["Total Sessions", data.get("total_sessions", 0)])
        writer.writerow(["Overall Percentage", f"{data.get('attendance_percentage', 0.0)}%"])
        writer.writerow([])
        
        writer.writerow(["Section Breakdown"])
        writer.writerow(["Semester", "Section", "Total Classes", "Present", "Absent", "Percentage"])
        for sec in data.get("section_stats", []):
            writer.writerow([
                sec.get("semester"), sec.get("section"), sec.get("total_classes"),
                sec.get("present_count"), sec.get("absent_count"), f"{sec.get('attendance_percentage')}%"
            ])
        writer.writerow([])
            
        writer.writerow(["Student Breakdown"])
        writer.writerow(["USN", "Name", "Total Classes", "Present", "Absent", "Percentage"])
        for student in data.get("student_stats", []):
            writer.writerow([
                student.get("usn"), student.get("name"), student.get("total_classes"),
                student.get("present_count"), student.get("absent_count"), f"{student.get('attendance_percentage')}%"
            ])
            
        return output.getvalue()

    def generate_hod_pdf(self, data: Dict[str, Any], period_str: str) -> bytes:
        pdf = self._create_pdf_base("Department Attendance Report", period_str)
        
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(60, 6, f"Total Sessions: {data.get('total_sessions', 0)}", ln=False)
        pdf.cell(60, 6, f"Overall Percentage: {data.get('attendance_percentage', 0.0)}%", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Section Breakdown", ln=True)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(30, 8, "Semester", border=1)
        pdf.cell(30, 8, "Section", border=1)
        pdf.cell(30, 8, "Total", border=1, align='C')
        pdf.cell(30, 8, "Present", border=1, align='C')
        pdf.cell(30, 8, "Absent", border=1, align='C')
        pdf.cell(30, 8, "Perc (%)", border=1, ln=True, align='C')
        
        pdf.set_font("Helvetica", "", 10)
        for sec in data.get("section_stats", []):
            pdf.cell(30, 8, str(sec.get("semester")), border=1)
            pdf.cell(30, 8, str(sec.get("section")), border=1)
            pdf.cell(30, 8, str(sec.get("total_classes")), border=1, align='C')
            pdf.cell(30, 8, str(sec.get("present_count")), border=1, align='C')
            pdf.cell(30, 8, str(sec.get("absent_count")), border=1, align='C')
            pdf.cell(30, 8, f"{sec.get('attendance_percentage')}%", border=1, ln=True, align='C')
            
        return bytes(pdf.output())

    # --- Admin Reports ---
    def generate_admin_csv(self, data: Dict[str, Any], period_str: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["System Attendance Report"])
        writer.writerow(["Period", period_str])
        writer.writerow(["Total Active Departments", data.get("total_departments_active", 0)])
        writer.writerow(["Total Sessions", data.get("total_sessions", 0)])
        writer.writerow(["Overall Percentage", f"{data.get('attendance_percentage', 0.0)}%"])
        writer.writerow([])
        
        writer.writerow(["Department Breakdown"])
        writer.writerow(["Department ID", "Department Name", "Total Sessions", "Present", "Absent", "Percentage"])
        for dept in data.get("department_stats", []):
            writer.writerow([
                dept.get("department_id"), dept.get("department_name"), dept.get("total_sessions"),
                dept.get("present_count"), dept.get("absent_count"), f"{dept.get('attendance_percentage')}%"
            ])
            
        return output.getvalue()

    def generate_admin_pdf(self, data: Dict[str, Any], period_str: str) -> bytes:
        pdf = self._create_pdf_base("System Attendance Report", period_str)
        
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(60, 6, f"Active Departments: {data.get('total_departments_active', 0)}", ln=False)
        pdf.cell(60, 6, f"Total Sessions: {data.get('total_sessions', 0)}", ln=True)
        pdf.cell(60, 6, f"Overall Percentage: {data.get('attendance_percentage', 0.0)}%", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Department Breakdown", ln=True)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(20, 8, "ID", border=1)
        pdf.cell(65, 8, "Department Name", border=1)
        pdf.cell(25, 8, "Total", border=1, align='C')
        pdf.cell(25, 8, "Present", border=1, align='C')
        pdf.cell(25, 8, "Absent", border=1, align='C')
        pdf.cell(25, 8, "Perc (%)", border=1, ln=True, align='C')
        
        pdf.set_font("Helvetica", "", 10)
        for dept in data.get("department_stats", []):
            pdf.cell(20, 8, str(dept.get("department_id")), border=1)
            pdf.cell(65, 8, str(dept.get("department_name"))[:30], border=1)
            pdf.cell(25, 8, str(dept.get("total_sessions")), border=1, align='C')
            pdf.cell(25, 8, str(dept.get("present_count")), border=1, align='C')
            pdf.cell(25, 8, str(dept.get("absent_count")), border=1, align='C')
            pdf.cell(25, 8, f"{dept.get('attendance_percentage')}%", border=1, ln=True, align='C')
            
        return bytes(pdf.output())

report_service = ReportService()
