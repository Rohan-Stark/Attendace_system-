# SmartAttend Demo Guide

This document outlines the standard demonstration flow to showcase the full capabilities of SmartAttend. 

> **Important**: This guide relies on the `DEMO_MODE=True` backend configuration, which enables simplified provisioning of sample HODs, Teachers, and Students without requiring real mailing services.

## Preparation
1. Ensure Docker (PostgreSQL) is running.
2. Ensure Backend (`uvicorn`) and Frontend (`npm run dev`) are running.
3. Ensure you have the `admin` account created (e.g. `admin@smartattend.edu`).

---

## 1. Admin Demonstration
*Goal: Show high-level management and provisioning.*

1. **Login** as Admin (`admin@smartattend.edu`).
2. Navigate to **Departments**. Create a new department (e.g. "Computer Science").
3. Navigate to **HODs**. Create a new Head of Department. 
   - Assign them to "Computer Science".
   - Note the generated email and password.
4. Navigate to **Analytics**. Briefly show the Admin-level global statistics across all departments.
5. **Logout**.

---

## 2. HOD Demonstration
*Goal: Show departmental isolation and staff management.*

1. **Login** using the HOD credentials created in Step 1.
2. Navigate to **Teachers**. Create a new Teacher. 
   - Note the generated email/password.
3. Navigate to **Students**. Create 2-3 Students.
   - Note the generated credentials.
4. **Logout**.

---

## 3. Student Demonstration (Face Registration)
*Goal: Show the biometric onboarding process.*

1. **Login** using one of the Student credentials created in Step 2.
2. The dashboard will show `Face Not Registered` in red.
3. Click **Register Face** (or navigate to Face Registration).
4. Allow camera permissions. 
5. Position your face clearly in the camera and click **Register**.
6. The dashboard will now show `Face Registered` in green.
7. **Logout**.

---

## 4. Teacher Demonstration (Attendance Flow)
*Goal: Show the core facial recognition attendance loop.*

1. **Login** using the Teacher credentials created in Step 2.
2. Click **Start Attendance Session**.
3. Select the subject, semester, and section.
4. Grant camera permissions. Have the registered student (from Step 3) visible in the camera frame.
5. Click **Capture & Recognize**.
6. Review the results on the **Review Attendance** screen:
   - The student from Step 3 should be marked **Present** automatically.
   - The other students (who were not in the camera) will be marked **Absent**.
7. *Manual Correction*: Toggle one of the Absent students to Present manually to demonstrate override capabilities.
8. Click **Submit Attendance**.
9. Navigate to **Analytics** or **Reports** to show that the submitted session is immediately reflected in the statistics.
10. Generate a **PDF Report** for the class to demonstrate export functionality.
11. **Logout**.

---

## 5. Student Demonstration (Verification)
*Goal: Show transparency and student visibility.*

1. **Login** as the Student from Step 3.
2. Navigate to **My Attendance**.
3. Observe the newly submitted session by the teacher is now visible on their timeline.
4. View the updated overall percentage on their Dashboard.

---

## End of Demo
This concludes the primary loop of the SmartAttend platform.
