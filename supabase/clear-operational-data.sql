-- Clears fake/test operating data from the Rooted dashboard.
-- This intentionally leaves website content, availability settings, auth users,
-- and other configuration tables alone.
truncate table
  payments,
  expenses,
  time_entries,
  tasks,
  notifications,
  invoices,
  jobs,
  quotes,
  estimate_requests,
  customers
restart identity cascade;
