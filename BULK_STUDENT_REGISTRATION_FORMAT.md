# Bulk Student Registration – Excel Format

Use this format when importing students via **Admin → Students → Import from Excel** (`.xlsx` only).

## Required columns (first row = header)

| Column name   | Description                    | Example        |
|---------------|--------------------------------|----------------|
| **full_name** | Student's full name            | John Doe       |
| **roll_number** | Roll number (required)       | 20ABC123       |
| **email**     | Email (required, unique)       | john@example.com |
| **department** | Department/branch code        | CSE            |
| **section**   | Section(s); use **comma** or **semicolon** for multiple | `A` or `A,B` or `A; B` |
| **year**      | Academic year                  | 2              |

- Header names are **case-insensitive** (e.g. `Full_Name` or `full_name` both work).
- **Row 1 must be the header** with these exact column names.
- Data starts from **row 2**.

## Notes

- **roll_number** and **email** are required for each student; rows missing either are skipped.
- New students get their **initial password = roll_number** (they can change it after login).
- If a student with the same roll_number already exists, that row is skipped.
- **department** should match a branch code created under Admin → Branches (e.g. CSE, ECE, MECH).
- **section** can list multiple values so the student appears when marking attendance for any of those sections (e.g. `A,B` matches sections A and B).

## Example (first 2 rows)

| full_name | roll_number | email           | department | section | year |
|-----------|-------------|-----------------|------------|---------|------|
| John Doe  | 20ABC123    | john@example.com | CSE       | A       | 2    |
| Jane Smith| 20ABC124    | jane@example.com | CSE       | A       | 2    |

Save the file as **.xlsx** and use **Import from Excel** in the Students tab.

---

**Template file:** A sample file `bulk_student_registration_template.xlsx` is in the project root (and in `backend/`). Open it, add your student rows, and upload it via Admin → Students → Import from Excel.
