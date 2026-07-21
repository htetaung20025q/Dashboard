import datetime
import io
import csv
from fastapi import FastAPI, Depends, HTTPException, status, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
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
app = FastAPI(title="Company Management Dashboard API")

# Enable CORS for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite local server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
models.Base.metadata.create_all(bind=engine)

# Helper function for OAuth2 user authentication
def authenticate_user(db: Session, username: str, password: str):
    user = crud.get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


# --- AUTHENTICATION ENDPOINTS ---

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
    # If the user is an Employee, we can mask salary details, but let's return it or allow it
    # to be read based on role. The requirement states: Role-based access control (RBAC): 'Admin' (full access) and 'Employee' (limited access).
    # Admin can perform CRUD, Employee can view directory. Let's populate total_salary for serialization.
    for emp in employees:
        emp.total_salary = emp.base_salary + emp.bonus
    return employees

@app.post("/api/employees", response_model=schemas.EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_new_employee(
    employee: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    # Check email duplicate
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
    current_user: models.User = Depends(get_current_active_admin)
):
    emp = crud.update_employee(db=db, employee_id=id, employee_update=employee_update)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.total_salary = emp.base_salary + emp.bonus
    return emp

@app.delete("/api/employees/{id}")
def delete_employee_record(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
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

    if attendance:
        is_checked_in = attendance.check_out is None
        last_check_in = attendance.check_in
        last_check_out = attendance.check_out
        attendance_id = attendance.id

    return {
        "is_checked_in": is_checked_in,
        "last_check_in": last_check_in,
        "last_check_out": last_check_out,
        "attendance_id": attendance_id
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
    if current_user.role == "Admin":
        history = crud.get_all_attendance_history(db, skip=skip, limit=limit)
    else:
        if not current_user.employee_id:
            return []
        history = crud.get_employee_attendance_history(db, current_user.employee_id, skip=skip, limit=limit)

    # Attach employee names to attendance responses
    response_history = []
    for att in history:
        emp = att.employee
        name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        resp = schemas.AttendanceResponse.from_orm(att)
        resp.employee_name = name
        response_history.append(resp)
        
    return response_history


# --- FINANCE ENDPOINTS ---

@app.get("/api/finance/records", response_model=List[schemas.FinancialRecordResponse])
def read_financial_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    return crud.get_financial_records(db, skip=skip, limit=limit)

@app.post("/api/finance/records", response_model=schemas.FinancialRecordResponse, status_code=status.HTTP_201_CREATED)
def create_financial_record(
    record: schemas.FinancialRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    return crud.create_financial_record(db=db, record=record)

@app.delete("/api/finance/records/{id}")
def delete_financial_record_endpoint(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    success = crud.delete_financial_record(db=db, record_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Financial record not found")
    return {"detail": "Financial record deleted successfully"}

@app.get("/api/finance/stats", response_model=schemas.FinancialStatsResponse)
def get_financial_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    return crud.get_financial_stats(db)


# --- EXPORT / REPORT GENERATION ENDPOINTS ---

class PDFReport(FPDF):
    def __init__(self, title_text: str):
        super().__init__()
        self.title_text = title_text

    def header(self):
        # Draw background or clean brand mark
        self.set_fill_color(248, 250, 252) # sleek background grey
        self.rect(0, 0, 210, 297, "F")
        
        # Brand title banner
        self.set_fill_color(79, 70, 229) # Indigo accent
        self.rect(0, 0, 210, 35, "F")
        
        self.set_text_color(255, 255, 255)
        self.set_font("helvetica", "B", 20)
        self.cell(0, 15, "COMPANY DASHBOARD SYSTEM", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "", 12)
        self.cell(0, 5, self.title_text.upper(), align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(12)

    def footer(self):
        self.set_y(-20)
        self.set_font("helvetica", "I", 9)
        self.set_text_color(148, 163, 184) # slate-400
        self.cell(0, 10, f"Generated automatically on {datetime.date.today().strftime('%B %d, %Y')} | Page {self.page_no()}/{{nb}}", align="C")

@app.get("/api/reports/export/pdf")
def export_pdf_report(
    type: str = Query(..., description="Must be 'finance' or 'payroll'"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    pdf = PDFReport(f"{type} management report")
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_margins(15, 45, 15)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.ln(10)

    # Base text styles
    pdf.set_text_color(15, 23, 42) # Slate-900

    if type == "finance":
        records = db.query(models.FinancialRecord).order_by(models.FinancialRecord.date.desc()).all()
        
        # Summary widgets
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

        # Table Header
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 10, "TRANSACTION REGISTER", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(224, 231, 255) # light indigo
        pdf.cell(30, 8, "Date", border=1, fill=True)
        pdf.cell(30, 8, "Type", border=1, fill=True)
        pdf.cell(40, 8, "Category", border=1, fill=True)
        pdf.cell(50, 8, "Description", border=1, fill=True)
        pdf.cell(30, 8, "Amount", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
        
        # Table Rows
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

        # Table Header
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(224, 231, 255) # light indigo
        pdf.cell(45, 8, "Employee Name", border=1, fill=True)
        pdf.cell(40, 8, "Position", border=1, fill=True)
        pdf.cell(30, 8, "Base Salary", border=1, fill=True)
        pdf.cell(30, 8, "Bonus", border=1, fill=True)
        pdf.cell(35, 8, "Total Salary", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        # Table Rows
        pdf.set_font("helvetica", "", 9)
        total_payroll = 0.0
        for e in employees:
            total_salary = e.base_salary + e.bonus
            total_payroll += total_salary
            name = f"{e.first_name} {e.last_name}"
            pdf.cell(45, 7, name, border=1)
            pdf.cell(40, 7, e.position, border=1)
            pdf.cell(30, 7, f"${e.base_salary:,.2f}", border=1)
            pdf.cell(30, 7, f"${e.bonus:,.2f}", border=1)
            pdf.cell(35, 7, f"${total_salary:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")
            
        # Summary Row
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(145, 8, "TOTAL MONTHLY PAYROLL LIABILITY", border=1, align="R")
        pdf.cell(35, 8, f"${total_payroll:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    # Output PDF to memory buffer
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename={type}_report.pdf"
    })

@app.get("/api/reports/export/csv")
def export_csv_report(
    type: str = Query(..., description="Must be 'finance' or 'payroll'"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
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
        writer.writerow(["Employee Name", "Position", "Base Salary", "Bonus", "Total Salary"])
        for e in employees:
            writer.writerow([
                f"{e.first_name} {e.last_name}",
                e.position,
                e.base_salary,
                e.bonus,
                e.base_salary + e.bonus
            ])
    else:
         raise HTTPException(status_code=400, detail="Invalid report type")

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={type}_report.csv"}
    )
