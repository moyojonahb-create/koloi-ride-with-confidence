# Task: Driver Registration Flow (Voyex)

## Frontend
- [ ] Fix Register button (add onClick)
- [ ] Add console.log to confirm click
- [ ] Create /driver/register page OR modal
- [ ] Build driver registration form:
  - Name
  - Phone
  - Car model
  - License number
- [ ] Add form validation
- [ ] Submit form to backend
- [ ] Show loading + success/error message

## Routes
- /driver → landing page
- /driver/register → registration form

## Backend (Supabase)
- [ ] Create drivers table:
  - id
  - name
  - phone
  - car_model
  - license_number
  - status (pending/approved)
  - created_at

- [ ] Add RLS policies
- [ ] Create API or Supabase insert

## Flow
1. User opens /driver
2. Clicks Register
3. Opens form
4. Submits form
5. Data saved (status = pending)
6. Admin approves
7. Driver can access dashboard