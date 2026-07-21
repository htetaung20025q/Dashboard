import datetime
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
import models
import schemas
from auth import get_password_hash

# --- User CRUD ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_pw,
        role=user.role,
        employee_id=user.employee_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Employee CRUD ---
def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employee_by_email(db: Session, email: str):
    return db.query(models.Employee).filter(models.Employee.email == email).first()

def get_employees(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Employee).offset(skip).limit(limit).all()

def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        position=employee.position,
        base_salary=employee.base_salary,
        bonus=employee.bonus,
        phone=employee.phone,
        address=employee.address,
        emergency_contact_name=employee.emergency_contact_name,
        emergency_contact_phone=employee.emergency_contact_phone
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)

    # Automatically create a corresponding user login for the employee
    username = f"{employee.first_name.lower()}.{employee.last_name.lower()}"
    # check unique
    idx = 1
    original_username = username
    while get_user_by_username(db, username):
        username = f"{original_username}{idx}"
        idx += 1

    user_in = schemas.UserCreate(
        username=username,
        password="employee123",
        role="Employee",
        employee_id=db_employee.id
    )
    create_user(db, user_in)
    
    return db_employee

def register_employee(db: Session, reg: schemas.EmployeeRegister):
    db_employee = models.Employee(
        first_name=reg.first_name,
        last_name=reg.last_name,
        email=reg.email,
        position=reg.position,
        base_salary=0.0,
        bonus=0.0
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)

    hashed_pw = get_password_hash(reg.password)
    db_user = models.User(
        username=reg.username,
        hashed_password=hashed_pw,
        role="Employee",
        employee_id=db_employee.id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_employee

def update_employee(db: Session, employee_id: int, employee_update: schemas.EmployeeUpdate):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    update_data = employee_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee, key, value)
        
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    db.delete(db_employee)
    db.commit()
    return True


# --- Attendance CRUD ---
def get_attendance_today(db: Session, employee_id: int, today: datetime.date):
    return db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id,
        models.Attendance.date == today
    ).first()

def check_in_employee(db: Session, employee_id: int):
    today = datetime.date.today()
    now = datetime.datetime.now()
    
    # Check if already checked in today
    attendance = get_attendance_today(db, employee_id, today)
    if attendance:
        return attendance
        
    db_attendance = models.Attendance(
        employee_id=employee_id,
        check_in=now,
        date=today,
        overtime_hours=0.0
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def check_out_employee(db: Session, employee_id: int):
    today = datetime.date.today()
    now = datetime.datetime.now()
    
    # Find active check-in for today
    attendance = get_attendance_today(db, employee_id, today)
    if not attendance or attendance.check_out:
        return None
        
    attendance.check_out = now
    
    # Calculate OT hours (Standard shift = 8 hours)
    duration_delta = now - attendance.check_in
    duration_hours = duration_delta.total_seconds() / 3600.0
    if duration_hours > 8.0:
        attendance.overtime_hours = round(duration_hours - 8.0, 2)
    else:
        attendance.overtime_hours = 0.0

    db.commit()
    db.refresh(attendance)
    return attendance

def get_employee_attendance_history(db: Session, employee_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id
    ).order_by(models.Attendance.check_in.desc()).offset(skip).limit(limit).all()

def get_all_attendance_history(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Attendance).order_by(models.Attendance.check_in.desc()).offset(skip).limit(limit).all()


# --- Leave Requests CRUD ---
def create_leave_request(db: Session, employee_id: int, leave: schemas.LeaveRequestCreate):
    db_leave = models.LeaveRequest(
        employee_id=employee_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status="Pending"
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

def get_leave_requests(db: Session, employee_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(models.LeaveRequest)
    if employee_id:
        query = query.filter(models.LeaveRequest.employee_id == employee_id)
    return query.order_by(models.LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()

def update_leave_status(db: Session, leave_id: int, status: str):
    db_leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if not db_leave:
        return None
    db_leave.status = status
    db.commit()
    db.refresh(db_leave)
    
    # Notify employee user
    user = db.query(models.User).filter(models.User.employee_id == db_leave.employee_id).first()
    if user:
        create_notification(
            db, 
            user_id=user.id, 
            title="Leave Request Updated", 
            message=f"Your {db_leave.leave_type} leave request has been {status.lower()}."
        )
    return db_leave


# --- Document CRUD ---
def create_document(db: Session, employee_id: int, file_name: str, file_path: str):
    db_doc = models.Document(
        employee_id=employee_id,
        file_name=file_name,
        file_path=file_path
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def get_employee_documents(db: Session, employee_id: int):
    return db.query(models.Document).filter(models.Document.employee_id == employee_id).all()


# --- Notice Board CRUD ---
def create_notice(db: Session, user_id: int, notice: schemas.NoticeCreate):
    db_notice = models.Notice(
        title=notice.title,
        content=notice.content,
        created_by=user_id
    )
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    
    # Notify all users about the new notice
    users = db.query(models.User).all()
    for u in users:
        create_notification(
            db, 
            user_id=u.id, 
            title="New Announcement", 
            message=f"Notice: {notice.title}"
        )
    return db_notice

def get_notices(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Notice).order_by(models.Notice.created_at.desc()).offset(skip).limit(limit).all()

def delete_notice(db: Session, notice_id: int) -> bool:
    db_notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not db_notice:
        return False
    db.delete(db_notice)
    db.commit()
    return True


# --- Notifications CRUD ---
def create_notification(db: Session, user_id: int, title: str, message: str):
    db_notif = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif

def get_notifications(db: Session, user_id: int):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).all()

def mark_notification_as_read(db: Session, notification_id: int):
    db_notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if db_notif:
        db_notif.is_read = True
        db.commit()
        db.refresh(db_notif)
    return db_notif


# --- Expense Tracking CRUD ---
def create_expense(db: Session, employee_id: int, expense: schemas.ExpenseCreate, receipt_path: str = None):
    db_expense = models.Expense(
        employee_id=employee_id,
        amount=expense.amount,
        category=expense.category,
        description=expense.description,
        receipt_path=receipt_path,
        status="Pending"
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def get_expenses(db: Session, employee_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Expense)
    if employee_id:
        query = query.filter(models.Expense.employee_id == employee_id)
    return query.order_by(models.Expense.created_at.desc()).offset(skip).limit(limit).all()

def update_expense_status(db: Session, expense_id: int, status: str):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        return None
    db_expense.status = status
    db.commit()
    db.refresh(db_expense)

    # Notify employee user
    user = db.query(models.User).filter(models.User.employee_id == db_expense.employee_id).first()
    if user:
        create_notification(
            db, 
            user_id=user.id, 
            title="Reimbursement Update", 
            message=f"Your expense request of ${db_expense.amount} has been {status.lower()}."
        )

    # Automatically post to general FinancialRecord if APPROVED
    if status == "Approved":
        emp = db_expense.employee
        emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Staff"
        db_record = models.FinancialRecord(
            type="expense",
            amount=db_expense.amount,
            category="Expenses",
            description=f"Reimbursement: {db_expense.description} ({emp_name})",
            date=datetime.date.today()
        )
        db.add(db_record)
        db.commit()
        
    return db_expense


# --- Financial CRUD ---
def get_financial_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.FinancialRecord).order_by(models.FinancialRecord.date.desc()).offset(skip).limit(limit).all()

def create_financial_record(db: Session, record: schemas.FinancialRecordCreate):
    db_record = models.FinancialRecord(
        type=record.type,
        amount=record.amount,
        category=record.category,
        description=record.description,
        date=record.date
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_financial_record(db: Session, record_id: int) -> bool:
    db_record = db.query(models.FinancialRecord).filter(models.FinancialRecord.id == record_id).first()
    if not db_record:
        return False
    db.delete(db_record)
    db.commit()
    return True

def get_financial_stats(db: Session):
    # Total Income and Expenses
    income_records = db.query(models.FinancialRecord).filter(models.FinancialRecord.type == "income").all()
    expense_records = db.query(models.FinancialRecord).filter(models.FinancialRecord.type == "expense").all()

    total_income = sum(r.amount for r in income_records)
    total_expenses = sum(r.amount for r in expense_records)
    net_profit = total_income - total_expenses
    
    profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0.0

    # Calculate MoM Net Profit Growth Rate
    today = datetime.date.today()
    current_month_start = datetime.date(today.year, today.month, 1)
    
    # Previous Month Start & End
    if today.month == 1:
        prev_month_start = datetime.date(today.year - 1, 12, 1)
        prev_month_end = datetime.date(today.year - 1, 12, 31)
    else:
        prev_month_start = datetime.date(today.year, today.month - 1, 1)
        prev_month_end = current_month_start - datetime.timedelta(days=1)

    # Current Month Stats
    current_income = sum(r.amount for r in db.query(models.FinancialRecord).filter(
        models.FinancialRecord.type == "income",
        models.FinancialRecord.date >= current_month_start,
        models.FinancialRecord.date <= today
    ).all())
    
    current_expense = sum(r.amount for r in db.query(models.FinancialRecord).filter(
        models.FinancialRecord.type == "expense",
        models.FinancialRecord.date >= current_month_start,
        models.FinancialRecord.date <= today
    ).all())
    current_net = current_income - current_expense

    # Previous Month Stats
    prev_income = sum(r.amount for r in db.query(models.FinancialRecord).filter(
        models.FinancialRecord.type == "income",
        models.FinancialRecord.date >= prev_month_start,
        models.FinancialRecord.date <= prev_month_end
    ).all())
    
    prev_expense = sum(r.amount for r in db.query(models.FinancialRecord).filter(
        models.FinancialRecord.type == "expense",
        models.FinancialRecord.date >= prev_month_start,
        models.FinancialRecord.date <= prev_month_end
    ).all())
    prev_net = prev_income - prev_expense

    mom_growth = 0.0
    if prev_net != 0:
        mom_growth = ((current_net - prev_net) / abs(prev_net)) * 100
    elif current_net > 0:
        mom_growth = 100.0

    income_change = 0.0
    if prev_income > 0:
         income_change = ((current_income - prev_income) / prev_income) * 100

    # Build Chart Data: last 6 months
    chart_data = []
    months_to_fetch = []
    temp_date = today
    for _ in range(6):
        months_to_fetch.append((temp_date.year, temp_date.month))
        if temp_date.month == 1:
            temp_date = datetime.date(temp_date.year - 1, 12, 1)
        else:
            temp_date = datetime.date(temp_date.year, temp_date.month - 1, 1)
    
    months_to_fetch.reverse()

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    for year, month in months_to_fetch:
        month_label = f"{month_names[month-1]} {str(year)[2:]}"
        m_income = db.query(func.sum(models.FinancialRecord.amount)).filter(
            models.FinancialRecord.type == "income",
            extract('year', models.FinancialRecord.date) == year,
            extract('month', models.FinancialRecord.date) == month
        ).scalar() or 0.0

        m_expense = db.query(func.sum(models.FinancialRecord.amount)).filter(
            models.FinancialRecord.type == "expense",
            extract('year', models.FinancialRecord.date) == year,
            extract('month', models.FinancialRecord.date) == month
        ).scalar() or 0.0

        chart_data.append(schemas.ChartDataPoint(
            name=month_label,
            income=float(m_income),
            expenses=float(m_expense)
        ))

    # Calculate Expense Categories Distribution (For Pie Chart)
    # Aggregate values by category
    categories_distribution = []
    cats_sum = db.query(
        models.FinancialRecord.category, 
        func.sum(models.FinancialRecord.amount)
    ).filter(
        models.FinancialRecord.type == "expense"
    ).group_by(models.FinancialRecord.category).all()
    
    for cat_name, sum_val in cats_sum:
        categories_distribution.append(schemas.ExpenseCategoryData(
            name=cat_name,
            value=float(sum_val or 0.0)
        ))

    return schemas.FinancialStatsResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        profit_margin=round(profit_margin, 2),
        mom_growth_rate=round(mom_growth, 2),
        income_change=round(income_change, 2),
        chart_data=chart_data,
        category_distribution=categories_distribution
    )
