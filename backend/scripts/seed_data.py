"""
Seed data generation script for AI Governance Platform.

This script creates realistic dummy data including:
- Organization
- Teams and users with hierarchical structure
- Usage logs
- Prompt history with quality scores and PII detection
- Alerts
- Policies
"""

import sys
import os
from datetime import datetime, timedelta
import random
import json
from typing import List, Tuple
import io

# Fix encoding for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import (
    Base, engine, SessionLocal, Organization, Team, User, UsageLog,
    PromptHistory, Alert, Policy, UserRole
)

# Seed for reproducible randomness (comment out for true randomness)
random.seed(42)


# ============================================
# DATA DEFINITIONS
# ============================================

TEAM_NAMES = [
    "Development Team",
    "Testing Team",
    "Prod Support Team",
    "Administration Team",
    "Security Team"
]

USERS_BY_TEAM = {
    "Development Team": [
        ("David", "Kim", "security"),
        ("Emily", "Thompson", "employee"),
        ("Raj", "Sharma", "employee"),
        ("Maria", "Garcia", "employee"),
        ("Kevin", "Nguyen", "employee"),
    ],
    "Testing Team": [
        ("Lisa", "Wang", "security"),
        ("Carlos", "Santos", "employee"),
        ("Fatima", "Ali", "employee"),
        ("Robert", "Anderson", "employee"),
        ("Mei", "Lin", "employee"),
    ],
    "Prod Support Team": [
        ("John", "Martinez", "security"),
        ("Samantha", "Lee", "employee"),
        ("Ahmed", "Hassan", "employee"),
        ("Jennifer", "Brown", "employee"),
        ("Vikram", "Singh", "employee"),
    ],
    "Administration Team": [
        ("Amanda", "Davis", "security"),
        ("Daniel", "Park", "employee"),
        ("Sophia", "Lopez", "employee"),
        ("Ryan", "O'Brien", "employee"),
        ("Yuki", "Tanaka", "employee"),
    ],
    "Security Team": [
        ("Sarah", "Chen", "security_team"),  # The organization security officer
        ("Michael", "Rodriguez", "security"),
        ("Priya", "Patel", "employee"),
        ("James", "Wilson", "employee"),
        ("Aisha", "Kumar", "employee"),
    ],
}

TOOLS = ["ChatGPT", "Claude", "Gemini"]
TOOL_DISTRIBUTION = {"ChatGPT": 0.50, "Claude": 0.35, "Gemini": 0.15}

CODE_PROMPTS = [
    "Write a Python function to validate email addresses using regex",
    "How do I implement JWT authentication in FastAPI?",
    "Debug this SQL query that's running slow: SELECT * FROM users WHERE status='active' ORDER BY created_at",
    "Create a React component for a login form with validation",
    "Explain how to use Docker Compose for local development",
    "Write a JavaScript function to debounce API calls",
    "How do I implement pagination in a REST API?",
    "Create a database migration for adding a new column",
    "Explain the difference between let, const, and var in JavaScript",
    "Write a function to handle error responses in async/await",
]

ANALYSIS_PROMPTS = [
    "Analyze the following sales data and identify trends: Q1 revenue up 15%, Q2 down 5%, Q3 stable",
    "What are the main differences between REST and GraphQL?",
    "Summarize the key points from this project meeting notes",
    "Compare the performance of PostgreSQL vs MongoDB for time-series data",
    "What are best practices for database indexing?",
    "Analyze this performance bottleneck in our application",
    "How should we approach scaling our infrastructure?",
    "What are the trade-offs between microservices and monolithic architecture?",
]

WRITING_PROMPTS = [
    "Write a professional email to a client about a delayed project",
    "Create a project proposal for implementing AI governance",
    "Draft technical documentation for our API endpoints",
    "Compose a weekly status report for the team",
    "Write a job description for a Software Engineer role",
    "Create a user guide for our new feature",
    "Draft release notes for version 2.0",
    "Write an incident report for a system outage",
]

LOW_QUALITY_PROMPTS = [
    "write code",
    "help",
    "how to do this",
    "fix bug",
    "database",
    "api",
    "error",
    "test this",
]

PII_PROMPTS = [
    "My SSN is 123-45-6789, can you help me fill out this form?",
    "Contact me at john.personal@gmail.com with the results",
    "Call me at (408) 555-1234 when you're ready",
    "Use my credit card 4111-1111-1111-1111 for the payment",
    "Here's my employee ID: EMP-2024-5678 and SSN: 987-65-4321",
    "My phone number is (650) 253-0000 for verification",
    "Email me at sarah.work@example.com or call 415-555-0123",
    "Can you process this: visa 4532-1234-5678-9010",
]

PII_TYPES_OPTIONS = [
    ["email"],
    ["ssn"],
    ["phone"],
    ["credit_card"],
    ["email", "ssn"],
    ["phone", "credit_card"],
    ["ssn", "credit_card"],
]

ALERT_TYPES = ["pii_detected", "policy_violation", "quality_concern"]
SEVERITY_LEVELS = ["low", "medium", "high", "critical"]

POLICY_DATA = [
    {
        "name": "No PII in Prompts",
        "policy_type": "data_privacy",
        "description": "Prohibits submission of personally identifiable information in AI prompts",
        "is_active": True,
    },
    {
        "name": "Quality Score Minimum",
        "policy_type": "quality_standard",
        "description": "Prompts must maintain a minimum quality score of 70 to be considered approved",
        "is_active": True,
    },
    {
        "name": "Tool Usage Policy",
        "policy_type": "acceptable_use",
        "description": "Guidelines for appropriate use of AI tools in the organization",
        "is_active": True,
    },
    {
        "name": "Data Retention",
        "policy_type": "data_privacy",
        "description": "All prompt history and usage logs must be retained for 90 days minimum",
        "is_active": True,
    },
    {
        "name": "Confidential Information Protection",
        "policy_type": "data_privacy",
        "description": "Employees must not share proprietary or confidential company information with AI tools",
        "is_active": True,
    },
    {
        "name": "Bias and Fairness",
        "policy_type": "quality_standard",
        "description": "AI outputs should be reviewed for bias and fairness before use in decision-making",
        "is_active": True,
    },
    {
        "name": "Audit Logging",
        "policy_type": "acceptable_use",
        "description": "All AI tool usage must be logged and auditable for compliance purposes",
        "is_active": True,
    },
    {
        "name": "Deprecated: Legacy AI Tools",
        "policy_type": "acceptable_use",
        "description": "This policy is deprecated - use updated AI tools list",
        "is_active": False,
    },
]


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_random_tool() -> str:
    """Get random tool based on distribution"""
    rand = random.random()
    cumulative = 0
    for tool, prob in TOOL_DISTRIBUTION.items():
        cumulative += prob
        if rand <= cumulative:
            return tool
    return "ChatGPT"


def generate_session_id() -> str:
    """Generate a realistic session ID"""
    return f"sess_{random.randint(100000, 999999)}"


def get_random_prompt_tuple() -> Tuple[str, int, bool, List[str] | None]:
    """
    Returns (prompt_text, quality_score, has_pii, pii_types)
    """
    rand = random.random()

    # 10-15% have PII
    if rand < 0.12:
        prompt = random.choice(PII_PROMPTS)
        quality = random.randint(30, 70)
        pii_types = random.choice(PII_TYPES_OPTIONS)
        return prompt, quality, True, pii_types

    # 10% low quality
    if rand < 0.22:
        prompt = random.choice(LOW_QUALITY_PROMPTS)
        quality = random.randint(30, 50)
        return prompt, quality, False, None

    # 60% good quality with mix of topics
    if rand < 0.82:
        topic_choice = random.random()
        if topic_choice < 0.4:
            prompt = random.choice(CODE_PROMPTS)
        elif topic_choice < 0.65:
            prompt = random.choice(ANALYSIS_PROMPTS)
        else:
            prompt = random.choice(WRITING_PROMPTS)
        quality = random.randint(65, 90)
        return prompt, quality, False, None

    # 18% excellent quality
    prompt = random.choice(CODE_PROMPTS + ANALYSIS_PROMPTS + WRITING_PROMPTS)
    quality = random.randint(85, 100)
    return prompt, quality, False, None


def get_session_hour_distribution() -> int:
    """Get hour based on distribution: 40% work hours, 30% early/late, 20% evening, 10% other"""
    rand = random.random()
    if rand < 0.40:  # Work hours 9-17
        return random.randint(9, 16)
    elif rand < 0.70:  # Early/late 7-9, 17-19
        return random.choice(list(range(7, 9)) + list(range(17, 20)))
    elif rand < 0.90:  # Evening 19-22
        return random.randint(19, 21)
    else:  # Other
        return random.randint(0, 6)


def get_user_activity_level() -> Tuple[int, int]:
    """
    Returns (session_count_min, session_count_max) based on distribution:
    - 3-5 power users: 60-80 sessions
    - 10-12 active users: 30-50 sessions
    - 7-8 moderate users: 15-30 sessions
    - 3-5 light users: 5-15 sessions
    """
    rand = random.random()
    if rand < 0.15:  # Power users
        return (60, 80)
    elif rand < 0.65:  # Active users
        return (30, 50)
    elif rand < 0.95:  # Moderate users
        return (15, 30)
    else:  # Light users
        return (5, 15)


# ============================================
# SEED FUNCTIONS
# ============================================

def create_organization(db) -> Organization:
    """Create the main organization"""
    print("Creating organization...")
    org = Organization(
        name="San Jose State University",
        short_name="SJSU",
        domain="sjsu.edu",
    )
    db.add(org)
    db.flush()
    print(f"OK Organization created: {org.name} (ID: {org.id})")
    return org


def create_teams(db, org: Organization) -> dict:
    """Create all teams"""
    print("Creating teams...")
    teams = {}
    for team_name in TEAM_NAMES:
        team = Team(
            name=team_name,
            description=f"{team_name} for {org.name}",
            org_id=org.id,
        )
        db.add(team)
        db.flush()
        teams[team_name] = team
        print(f"OK Team created: {team_name} (ID: {team.id})")
    return teams


def create_users(db, org: Organization, teams: dict) -> tuple:
    """Create all users with hierarchical structure"""
    print("Creating users with hierarchy...")

    users = {}
    security_team_member_id = None  # Will hold the ID of the security team member

    # First pass: Create all users and identify security_team member
    for team_name, team_obj in teams.items():
        users[team_name] = []

        for first_name, last_name, role_type in USERS_BY_TEAM[team_name]:
            email = f"{first_name.lower()}.{last_name.lower()}@sjsu.edu"

            # Determine actual role
            if role_type == "security_team":
                role = UserRole.SECURITY_TEAM.value
                security_team_member_id = None  # Will be set after creation
            elif role_type == "security":
                role = UserRole.TEAM_LEAD.value
            else:
                role = UserRole.EMPLOYEE.value

            user = User(
                name=f"{first_name} {last_name}",
                email=email,
                role=role,
                org_id=org.id,
                team_id=team_obj.id,
                reports_to=None,  # Will set after all users created
            )
            db.add(user)
            db.flush()
            users[team_name].append(user)
            print(f"OK User created: {user.name} ({role}) - {email}")

    # Save security_team_member ID before second pass
    for team_name, user_list in users.items():
        for user in user_list:
            if user.role == UserRole.SECURITY_TEAM.value:
                security_team_member_id = user.id
                break
        if security_team_member_id:
            break

    if not security_team_member_id:
        raise ValueError("No security_team member found!")

    # Second pass: Set reporting structure
    print("Setting reporting structure...")
    for team_name, user_list in users.items():
        if len(user_list) > 0:
            team_lead = user_list[0]  # First user is team lead

            # Team lead reports to security team member
            team_lead.reports_to = security_team_member_id

            # Other users report to team lead
            for employee in user_list[1:]:
                employee.reports_to = team_lead.id

            print(f"OK {team_name}: {team_lead.name} (lead) -> {security_team_member_id}")

    db.commit()
    return users, security_team_member_id


def create_usage_logs(db, users: dict, org: Organization) -> None:
    """Create usage logs with realistic distribution"""
    print("Creating usage logs...")

    total_logs = 0
    now = datetime.utcnow()

    for team_name, user_list in users.items():
        for user in user_list:
            # Get activity level for this user
            min_sessions, max_sessions = get_user_activity_level()
            session_count = random.randint(min_sessions, max_sessions)

            for _ in range(session_count):
                # Random time in last 30 days
                days_ago = random.randint(0, 29)
                hours = get_session_hour_distribution()
                minutes = random.randint(0, 59)

                timestamp = now - timedelta(days=days_ago, hours=hours, minutes=minutes)

                log = UsageLog(
                    user_id=user.id,
                    tool=get_random_tool(),
                    risk_level=random.choice(["low", "low", "low", "medium", "high"]),
                    timestamp=timestamp,
                )
                db.add(log)
                total_logs += 1

    db.commit()
    print(f"OK Created {total_logs} usage logs")


def create_prompt_history(db, users: dict, org: Organization) -> None:
    """Create prompt history with quality scores and PII detection"""
    print("Creating prompt history...")

    total_prompts = 0
    now = datetime.utcnow()

    for team_name, user_list in users.items():
        for user in user_list:
            # Create multiple sessions per user
            sessions_per_user = random.randint(3, 8)

            for _ in range(sessions_per_user):
                session_id = generate_session_id()
                session_timestamp = now - timedelta(days=random.randint(0, 29))

                # 3-8 prompts per session
                prompts_in_session = random.randint(3, 8)

                for i in range(prompts_in_session):
                    prompt_text, quality_score, has_pii, pii_types = get_random_prompt_tuple()

                    # Slightly improved final prompt
                    if quality_score < 75:
                        final_prompt = f"Improved: {prompt_text[:50]}..."
                        final_score = quality_score + random.randint(5, 15)
                        improvement_delta = final_score - quality_score
                    else:
                        final_prompt = prompt_text
                        final_score = quality_score
                        improvement_delta = 0

                    history = PromptHistory(
                        user_id=user.id,
                        original_prompt=prompt_text,
                        final_prompt=final_prompt,
                        tool=get_random_tool(),
                        original_score=float(quality_score),
                        final_score=float(final_score),
                        improvement_delta=float(improvement_delta),
                        had_pii=has_pii,
                        pii_types=pii_types if has_pii else None,
                        session_id=session_id,
                        timestamp=session_timestamp + timedelta(minutes=i * 2),
                    )
                    db.add(history)
                    total_prompts += 1

    db.commit()
    print(f"OK Created {total_prompts} prompt history entries")


def create_alerts(db, users: dict, org: Organization, security_member_id: int) -> None:
    """Create alerts with mixed resolution states"""
    print("Creating alerts...")

    now = datetime.utcnow()
    alert_count = 0

    # Get all users
    all_users = []
    for team_name, user_list in users.items():
        all_users.extend(user_list)

    # Create 15-25 alerts
    num_alerts = random.randint(15, 25)

    for _ in range(num_alerts):
        user = random.choice(all_users)
        violation_type = random.choice(ALERT_TYPES)
        severity = random.choice(SEVERITY_LEVELS)

        # 60% resolved, 40% unresolved
        is_resolved = random.random() < 0.60

        alert_timestamp = now - timedelta(days=random.randint(0, 29))

        alert = Alert(
            user_id=user.id,
            violation_type=violation_type,
            details={
                "severity": severity,
                "description": f"Alert for {violation_type}",
                "reference": f"REF-{random.randint(100000, 999999)}"
            },
            resolved=is_resolved,
            timestamp=alert_timestamp,
            resolved_at=alert_timestamp + timedelta(hours=random.randint(1, 72)) if is_resolved else None,
            resolved_by=security_member_id if is_resolved else None,
        )
        db.add(alert)
        alert_count += 1

    db.commit()
    print(f"OK Created {alert_count} alerts (60% resolved, 40% unresolved)")


def create_policies(db, org: Organization, security_member_id: int) -> None:
    """Create organizational policies"""
    print("Creating policies...")

    for policy_data in POLICY_DATA:
        policy = Policy(
            org_id=org.id,
            name=policy_data["name"],
            description=policy_data["description"],
            policy_type=policy_data["policy_type"],
            is_active=policy_data["is_active"],
            created_by=security_member_id,
            rules={
                "enforcement": "strict" if policy_data["is_active"] else "deprecated",
                "applicable_to": "all_employees",
                "review_frequency": "quarterly",
            }
        )
        db.add(policy)

    db.commit()
    print(f"OK Created {len(POLICY_DATA)} policies ({sum(1 for p in POLICY_DATA if p['is_active'])} active)")


def seed_database():
    """Main seeding function"""
    # Create database tables
    print("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if data already exists
        org_count = db.query(Organization).count()
        if org_count > 0:
            print("Database already contains data. Clearing existing data...")
            # Clear in reverse dependency order
            db.query(Alert).delete()
            db.query(PromptHistory).delete()
            db.query(UsageLog).delete()
            db.query(Policy).delete()
            db.query(User).delete()
            db.query(Team).delete()
            db.query(Organization).delete()
            db.commit()
            print("OK Existing data cleared")

        # Seed data
        org = create_organization(db)
        teams = create_teams(db, org)
        users, security_member_id = create_users(db, org, teams)
        create_usage_logs(db, users, org)
        create_prompt_history(db, users, org)
        create_alerts(db, users, org, security_member_id)
        create_policies(db, org, security_member_id)

        print("=" * 60)
        print("DUMMY DATA CREATED SUCCESSFULLY!")
        print("=" * 60)

        # Print summary statistics
        print("Summary Statistics:")
        print(f"  Organizations: {db.query(Organization).count()}")
        print(f"  Teams: {db.query(Team).count()}")
        print(f"  Users: {db.query(User).count()}")
        print(f"  Usage Logs: {db.query(UsageLog).count()}")
        print(f"  Prompts: {db.query(PromptHistory).count()}")
        print(f"  Alerts: {db.query(Alert).count()}")
        print(f"  Policies: {db.query(Policy).count()}")

        # Print quality distribution
        print("Quality Score Distribution:")
        quality_ranges = [
            ("Low (< 50)", 0, 50),
            ("Medium (50-70)", 50, 70),
            ("Good (70-90)", 70, 90),
            ("Excellent (90+)", 90, 101),
        ]
        for label, min_q, max_q in quality_ranges:
            count = db.query(PromptHistory).filter(
                PromptHistory.original_score >= min_q,
                PromptHistory.original_score < max_q
            ).count()
            print(f"  {label}: {count}")

        # Print PII detection
        pii_count = db.query(PromptHistory).filter(PromptHistory.had_pii == True).count()
        print("PII Detection:")
        print(f"  Prompts with PII: {pii_count} ({100*pii_count/db.query(PromptHistory).count():.1f}%)")

        # Print role distribution
        print("Role Distribution:")
        for role in [UserRole.SECURITY_TEAM.value, UserRole.TEAM_LEAD.value, UserRole.EMPLOYEE.value]:
            count = db.query(User).filter(User.role == role).count()
            print(f"  {role}: {count}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
