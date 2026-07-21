import datetime
import io
import csv
import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, status, Query, Response, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from fpdf import FPDF

import models
import schemas
import crud
from database import engine, get_db
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
    get_current_active_admin
)

# Initialize FastAPI App
app = FastAPI(title="CorpManager Company Portal Dashboard API")

# Enable CORS for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables and directories on startup
models.Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper function for OAuth2 user authentication
def authenticate_user(db: Session, username: str, password: str):
    user = crud.get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# RBAC verification dependency builder
def verify_roles(allowed_roles: List[str]):
    async def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires role in {allowed_roles}"
            )
        return current_user
    return dependency


# --- AUTHENTICATION ENDPOINTS ---

@app.post("/api/auth/seed")
def trigger_seed_database():
    try:
        from seed import seed_db
        seed_db()
        return {"detail": "Database seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login", response_model=schemas.Token)
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=86400,
        samesite="lax",
        secure=False  # Change to True if HTTPS in prod
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"detail": "Successfully logged out"}

@app.post("/api/auth/register-employee", response_model=schemas.EmployeeResponse, status_code=status.HTTP_201_CREATED)
def register_new_employee(reg: schemas.EmployeeRegister, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, reg.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    db_emp = crud.get_employee_by_email(db, reg.email)
    if db_emp:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    emp = crud.register_employee(db=db, reg=reg)
    emp.total_salary = emp.base_salary + emp.bonus
    return emp

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# --- EMPLOYEE ENDPOINTS ---

@app.get("/api/employees", response_model=List[schemas.EmployeeResponse])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    employees = crud.get_employees(db, skip=skip, limit=limit)
    
    # Restrict granular salary metrics based on role
    # Super Admin, HR, and Managers can view salary details. Employees can view only if it's their own record.
    for emp in employees:
        has_access = current_user.role in ["Super Admin", "HR", "Manager"] or current_user.employee_id == emp.id
        if has_access:
            emp.total_salary = emp.base_salary + emp.bonus
        else:
            emp.base_salary = 0.0
            emp.bonus = 0.0
            emp.total_salary = 0.0
            
    return employees

@app.post("/api/employees", response_model=schemas.EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_new_employee(
    employee: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    db_emp = crud.get_employee_by_email(db, email=employee.email)
    if db_emp:
        raise HTTPException(status_code=400, detail="Email already registered")
    emp = crud.create_employee(db=db, employee=employee)
    emp.total_salary = emp.base_salary + emp.bonus
    return emp

@app.put("/api/employees/{id}", response_model=schemas.EmployeeResponse)
def update_employee_details(
    id: int,
    employee_update: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # HR/Super Admin/Manager can update anything. Users themselves can update phone/address.
    is_authorized_editor = current_user.role in ["Super Admin", "HR", "Manager"]
    is_self = current_user.employee_id == id
    
    if not is_authorized_editor and not is_self:
         raise HTTPException(status_code=403, detail="Unauthorized to modify this employee profile")
         
    # If self and not authorized, check they only modify phone, address, emergency info
    if not is_authorized_editor and is_self:
        # Enforce restricted fields
        employee_update.base_salary = None
        employee_update.bonus = None
        employee_update.position = None

    emp = crud.update_employee(db=db, employee_id=id, employee_update=employee_update)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.total_salary = emp.base_salary + emp.bonus
    return emp

@app.delete("/api/employees/{id}")
def delete_employee_record(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    success = crud.delete_employee(db=db, employee_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"detail": "Employee deleted successfully"}


# --- ATTENDANCE ENDPOINTS ---

@app.get("/api/attendance/status", response_model=schemas.AttendanceStatusResponse)
def check_attendance_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee_id:
         raise HTTPException(status_code=400, detail="User is not associated with an Employee profile")
        
    today = datetime.date.today()
    attendance = crud.get_attendance_today(db, current_user.employee_id, today)
    
    is_checked_in = False
    last_check_in = None
    last_check_out = None
    attendance_id = None
    overtime_hours = 0.0

    if attendance:
        is_checked_in = attendance.check_out is None
        last_check_in = attendance.check_in
        last_check_out = attendance.check_out
        attendance_id = attendance.id
        overtime_hours = attendance.overtime_hours

    return {
        "is_checked_in": is_checked_in,
        "last_check_in": last_check_in,
        "last_check_out": last_check_out,
        "attendance_id": attendance_id,
        "overtime_hours": overtime_hours
    }

@app.post("/api/attendance/check-in", response_model=schemas.AttendanceResponse)
def employee_check_in(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee_id:
         raise HTTPException(status_code=400, detail="User is not associated with an Employee profile")
    
    today = datetime.date.today()
    existing = crud.get_attendance_today(db, current_user.employee_id, today)
    if existing:
         raise HTTPException(status_code=400, detail="Already checked in today")
        
    attendance = crud.check_in_employee(db, current_user.employee_id)
    return attendance

@app.post("/api/attendance/check-out", response_model=schemas.AttendanceResponse)
def employee_check_out(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee_id:
         raise HTTPException(status_code=400, detail="User is not associated with an Employee profile")
        
    attendance = crud.check_out_employee(db, current_user.employee_id)
    if not attendance:
         raise HTTPException(status_code=400, detail="No active check-in found for today, or already checked out")
    return attendance

@app.get("/api/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Admins, HRs, Managers can view all. Employees see their own.
    if current_user.role in ["Super Admin", "HR", "Manager"]:
        history = crud.get_all_attendance_history(db, skip=skip, limit=limit)
    else:
        if not current_user.employee_id:
            return []
        history = crud.get_employee_attendance_history(db, current_user.employee_id, skip=skip, limit=limit)

    response_history = []
    for att in history:
        emp = att.employee
        name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        resp = schemas.AttendanceResponse.from_orm(att)
        resp.employee_name = name
        response_history.append(resp)
        
    return response_history


# --- LEAVE REQUESTS ENDPOINTS ---

@app.post("/api/leaves", response_model=schemas.LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def apply_leave(
    leave: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="Only mapped employee profiles can file leave requests")
    
    # Start date must be before end date
    if leave.start_date > leave.end_date:
        raise HTTPException(status_code=400, detail="Start date must occur before end date")
        
    db_leave = crud.create_leave_request(db, current_user.employee_id, leave)
    
    # Notify Managers / HR about the new leave request
    managers = db.query(models.User).filter(models.User.role.in_(["Super Admin", "HR", "Manager"])).all()
    emp = db_leave.employee
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Employee"
    for manager in managers:
        crud.create_notification(
            db, 
            user_id=manager.id, 
            title="Leave Request Filed", 
            message=f"{emp_name} requested leave: {leave.leave_type} ({leave.start_date} to {leave.end_date})"
        )
        
    return db_leave

@app.get("/api/leaves", response_model=List[schemas.LeaveRequestResponse])
def read_leaves(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role in ["Super Admin", "HR", "Manager"]:
        # Managers, Admins, HR view all
        leaves = crud.get_leave_requests(db, skip=skip, limit=limit)
    else:
        # Employee views self
        if not current_user.employee_id:
            return []
        leaves = crud.get_leave_requests(db, employee_id=current_user.employee_id, skip=skip, limit=limit)
        
    response_leaves = []
    for l in leaves:
        emp = l.employee
        name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        resp = schemas.LeaveRequestResponse.from_orm(l)
        resp.employee_name = name
        response_leaves.append(resp)
        
    return response_leaves

@app.put("/api/leaves/{id}/status", response_model=schemas.LeaveRequestResponse)
def update_leave_request_status(
    id: int,
    status_update: schemas.LeaveRequestUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    leave = crud.update_leave_status(db, id, status_update.status)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return leave


# --- DOCUMENTS UPLOAD & STORAGE ENDPOINTS ---

@app.post("/api/employees/{id}/documents", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_employee_document(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    emp = crud.get_employee(db, id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Create safe file path on server
    timestamp = int(datetime.datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Relative path save in database
    relative_path = f"/api/documents/file/{safe_filename}"
    doc = crud.create_document(db, employee_id=id, file_name=file.filename, file_path=relative_path)
    return doc

@app.get("/api/employees/{id}/documents", response_model=List[schemas.DocumentResponse])
def get_documents_list(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check permission: Admins or self
    if current_user.role not in ["Super Admin", "HR", "Manager"] and current_user.employee_id != id:
        raise HTTPException(status_code=403, detail="Unauthorized to view these documents")
        
    return crud.get_employee_documents(db, id)

@app.get("/api/documents/file/{filename}")
def get_uploaded_document_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
         raise HTTPException(status_code=404, detail="File does not exist")
    return FileResponse(file_path)


# --- NOTICE BOARD ANNOUNCEMENT ENDPOINTS ---

@app.post("/api/notices", response_model=schemas.NoticeResponse, status_code=status.HTTP_201_CREATED)
def post_notice_announcement(
    notice: schemas.NoticeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    db_notice = crud.create_notice(db, current_user.id, notice)
    db_notice.creator_name = current_user.username
    return db_notice

@app.get("/api/notices", response_model=List[schemas.NoticeResponse])
def read_announcements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notices = crud.get_notices(db, skip=skip, limit=limit)
    response_notices = []
    for n in notices:
        resp = schemas.NoticeResponse.from_orm(n)
        resp.creator_name = n.creator.username if n.creator else "System Admin"
        response_notices.append(resp)
    return response_notices

@app.delete("/api/notices/{id}")
def delete_notice_endpoint(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    success = crud.delete_notice(db=db, notice_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Notice announcement not found")
    return {"detail": "Notice deleted successfully"}


# --- IN-APP NOTIFICATIONS ENDPOINTS ---

@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def read_unread_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_notifications(db, current_user.id)

@app.put("/api/notifications/{id}/read")
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    crud.mark_notification_as_read(db, id)
    return {"detail": "Notification read"}


# --- EXPENSE TRACKING & REIMBURSEMENTS ENDPOINTS ---

@app.post("/api/expenses", response_model=schemas.ExpenseResponse, status_code=status.HTTP_201_CREATED)
def file_expense_reimbursement(
    amount: float = Query(...),
    category: str = Query(...),
    description: str = Query(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="Only employee accounts can file expense reimbursements")
        
    receipt_path = None
    if file:
        # Save attachment file
        timestamp = int(datetime.datetime.utcnow().timestamp())
        safe_filename = f"{timestamp}_expense_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
             shutil.copyfileobj(file.file, buffer)
        receipt_path = f"/api/documents/file/{safe_filename}"
        
    expense_in = schemas.ExpenseCreate(amount=amount, category=category, description=description)
    db_expense = crud.create_expense(db, current_user.employee_id, expense_in, receipt_path)
    
    # Notify Managers
    managers = db.query(models.User).filter(models.User.role.in_(["Super Admin", "HR", "Manager"])).all()
    emp = db_expense.employee
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Employee"
    for manager in managers:
        crud.create_notification(
            db,
            user_id=manager.id,
            title="Expense Reimbursement Filed",
            message=f"{emp_name} requested ${amount} for {category}."
        )
        
    return db_expense

@app.get("/api/expenses", response_model=List[schemas.ExpenseResponse])
def get_expenses_ledger(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role in ["Super Admin", "HR", "Manager"]:
        expenses = crud.get_expenses(db, skip=skip, limit=limit)
    else:
        if not current_user.employee_id:
            return []
        expenses = crud.get_expenses(db, employee_id=current_user.employee_id, skip=skip, limit=limit)
        
    response_expenses = []
    for ex in expenses:
        emp = ex.employee
        name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        resp = schemas.ExpenseResponse.from_orm(ex)
        resp.employee_name = name
        response_expenses.append(resp)
        
    return response_expenses

@app.put("/api/expenses/{id}/status", response_model=schemas.ExpenseResponse)
def update_expense_reimbursement_status(
    id: int,
    status_update: schemas.ExpenseUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    expense = crud.update_expense_status(db, id, status_update.status)
    if not expense:
         raise HTTPException(status_code=404, detail="Expense claim record not found")
    return expense


# --- FINANCE ENDPOINTS ---

@app.get("/api/finance/records", response_model=List[schemas.FinancialRecordResponse])
def read_financial_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    return crud.get_financial_records(db, skip=skip, limit=limit)

@app.post("/api/finance/records", response_model=schemas.FinancialRecordResponse, status_code=status.HTTP_201_CREATED)
def create_financial_record(
    record: schemas.FinancialRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR"]))
):
    return crud.create_financial_record(db=db, record=record)

@app.delete("/api/finance/records/{id}")
def delete_financial_record_endpoint(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR"]))
):
    success = crud.delete_financial_record(db=db, record_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Financial record not found")
    return {"detail": "Financial record deleted successfully"}

@app.get("/api/finance/stats", response_model=schemas.FinancialStatsResponse)
def get_financial_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    return crud.get_financial_stats(db)


# --- EXPORT / REPORT GENERATION ENDPOINTS ---

class PDFReport(FPDF):
    def __init__(self, title_text: str):
        super().__init__()
        self.title_text = title_text

    def header(self):
        self.set_fill_color(248, 250, 252)
        self.rect(0, 0, 210, 297, "F")
        self.set_fill_color(79, 70, 229)
        self.rect(0, 0, 210, 35, "F")
        
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 20)
        self.cell(0, 15, "CORPMANAGER PORTAL SYSTEM", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "", 12)
        self.cell(0, 5, self.title_text.upper(), align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(12)

    def footer(self):
        self.set_y(-20)
        self.set_font("helvetica", "I", 9)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Generated automatically on {datetime.date.today().strftime('%B %d, %Y')} | Page {self.page_no()}/{{nb}}", align="C")

@app.get("/api/reports/export/pdf")
def export_pdf_report(
    type: str = Query(..., description="Must be 'finance' or 'payroll'"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    pdf = PDFReport(f"{type} management report")
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_margins(15, 45, 15)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.ln(10)
    pdf.set_text_color(15, 23, 42)

    if type == "finance":
        records = db.query(models.FinancialRecord).order_by(models.FinancialRecord.date.desc()).all()
        stats = crud.get_financial_stats(db)
        pdf.set_font("helvetica", "B", 13)
        pdf.cell(0, 10, "FINANCIAL METRICS SUMMARY", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.cell(60, 8, f"Total Income: ${stats.total_income:,.2f}", border=1, align="C")
        pdf.cell(60, 8, f"Total Expenses: ${stats.total_expenses:,.2f}", border=1, align="C")
        pdf.cell(60, 8, f"Net Profit: ${stats.net_profit:,.2f}", border=1, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(90, 8, f"Profit Margin: {stats.profit_margin}%", border=1, align="C")
        pdf.cell(90, 8, f"MoM Growth Rate: {stats.mom_growth_rate}%", border=1, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 10, "TRANSACTION REGISTER", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(224, 231, 255)
        pdf.cell(30, 8, "Date", border=1, fill=True)
        pdf.cell(30, 8, "Type", border=1, fill=True)
        pdf.cell(40, 8, "Category", border=1, fill=True)
        pdf.cell(50, 8, "Description", border=1, fill=True)
        pdf.cell(30, 8, "Amount", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("helvetica", "", 9)
        for r in records:
            pdf.cell(30, 7, str(r.date), border=1)
            pdf.cell(30, 7, r.type.upper(), border=1)
            pdf.cell(40, 7, r.category, border=1)
            pdf.cell(50, 7, r.description or "-", border=1)
            pdf.cell(30, 7, f"${r.amount:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

    elif type == "payroll":
        employees = db.query(models.Employee).all()
        pdf.set_font("helvetica", "B", 13)
        pdf.cell(0, 10, "PAYROLL DETAILS", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(224, 231, 255)
        pdf.cell(40, 8, "Employee Name", border=1, fill=True)
        pdf.cell(35, 8, "Position", border=1, fill=True)
        pdf.cell(25, 8, "Base Salary", border=1, fill=True)
        pdf.cell(20, 8, "Bonus", border=1, fill=True)
        pdf.cell(25, 8, "OT hours", border=1, fill=True)
        pdf.cell(35, 8, "Total Salary", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", "", 9)
        total_payroll = 0.0
        for e in employees:
            # Overtime rate is $25 per hour
            overtime_hours = sum(a.overtime_hours for a in e.attendance)
            ot_pay = overtime_hours * 25.0
            total_salary = e.base_salary + e.bonus + ot_pay
            total_payroll += total_salary
            name = f"{e.first_name} {e.last_name}"
            pdf.cell(40, 7, name, border=1)
            pdf.cell(35, 7, e.position, border=1)
            pdf.cell(25, 7, f"${e.base_salary:,.2f}", border=1)
            pdf.cell(20, 7, f"${e.bonus:,.2f}", border=1)
            pdf.cell(25, 7, f"{overtime_hours} hrs", border=1)
            pdf.cell(35, 7, f"${total_salary:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")
            
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(145, 8, "TOTAL MONTHLY PAYROLL LIABILITY", border=1, align="R")
        pdf.cell(35, 8, f"${total_payroll:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename={type}_report.pdf"
    })

@app.get("/api/reports/export/csv")
def export_csv_report(
    type: str = Query(..., description="Must be 'finance' or 'payroll'"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_roles(["Super Admin", "HR", "Manager"]))
):
    output = io.StringIO()
    writer = csv.writer(output)

    if type == "finance":
        records = db.query(models.FinancialRecord).order_by(models.FinancialRecord.date.desc()).all()
        writer.writerow(["ID", "Date", "Type", "Category", "Description", "Amount"])
        for r in records:
            writer.writerow([r.id, r.date, r.type, r.category, r.description, r.amount])
            
    elif type == "payroll":
        employees = db.query(models.Employee).all()
        writer.writerow(["Employee Name", "Position", "Base Salary", "Bonus", "Overtime Hours", "Total Salary"])
        for e in employees:
            overtime_hours = sum(a.overtime_hours for a in e.attendance)
            ot_pay = overtime_hours * 25.0
            writer.writerow([
                f"{e.first_name} {e.last_name}",
                e.position,
                e.base_salary,
                e.bonus,
                overtime_hours,
                e.base_salary + e.bonus + ot_pay
            ])
    else:
         raise HTTPException(status_code=400, detail="Invalid report type")

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={type}_report.csv"}
    )
