# ExpenseSplit

A lightweight personal and group expense dashboard. It has a daily personal report plus a Splitwise-style group expense tab.

## Open

Use the local server URL:

```text
http://127.0.0.1:4173
```

Personal expenses stay in your browser using `localStorage`. Groups and car logs sync to Supabase in the hosted version.

## Files

- `index.html` - app structure
- `styles.css` - dashboard design
- `app.js` - personal expenses, group expenses, equal split math, balances, filters, chart, and CSV export
- `supabase-schema.sql` - starter database schema for a hosted shared version
- `expense-split:car:v1` - browser storage key for the car expenses tab
- `supabase-migration-car.sql` - extra Supabase migration for the car log and mileage fields

## Daily Flow

1. Add amount, category, description, date, and payment method.
2. Review today total, monthly total, category breakdown, and budget pace.
3. Export CSV whenever you want a backup.

## Group Flow

1. Open the Groups tab.
2. Create a group.
3. Add people.
4. Add shared expenses with category, payer, and split members.
5. Check category dashboard and "Who Owes Whom" for settlement.
6. Delete a group when it is no longer needed.

## Car Flow

1. Open the Car tab.
2. Add car expenses like petrol, service, insurance, PUCC, toll, or repair.
3. For petrol fills, optionally add odometer KM and liters to track mileage and price per litre.
4. Add petrol-sharing income as an income entry.
5. Watch yearly totals for expense, income, net car cost, mileage, and fuel log updates on the dashboard.

## Free Hosting Path

For a simple public link, deploy the folder to Vercel or Netlify:

1. Put these files in a GitHub repository.
2. Import that repository in Vercel or Netlify.
3. Keep the build command empty.
4. Use `/` or the project root as the publish directory.

For real sharing across 2-3 people, create a free Supabase project and run `supabase-schema.sql` in the SQL editor. If you already have the earlier schema installed, also run `supabase-migration-car.sql`. The Groups tab and Car tab are wired to Supabase in `app.js`; personal expenses still stay private in each browser.
