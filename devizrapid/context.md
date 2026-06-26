# Tarifator — Context Proiect

## Stack
- Next.js 15 + TypeScript + Tailwind v4
- Supabase (ID: vsszvxnxrdpvjbexltcd)
- Groq (llama-3.3-70b-versatile)
- jsPDF

## Structură tabele
- profiles (id, company_name, account_type, cui, address, phone, email, bank, iban, vat_rate)
- companies (id, user_id, name, cui, reg_com, address, phone, email, bank, iban, vat_rate)
- clients (id, user_id, name, phone, email, address, contact_person, cui)
- quotes (id, user_id, company_id, client_id, quote_number, title, status, total, vat_rate, vat_amount, total_with_vat, created_at)
- quote_items (id, quote_id, service_id, description, quantity, unit_price, total*)
- services (id, user_id, name, unit, price_per_unit)
- counters + fn increment_counter(counter_key)
- *total = coloană generată, NU se inserează manual

## Reguli importante
- Nu folosi heredoc în terminal (corupe fișierele)
- Editare doar prin VS Code (Ctrl+A, paste, Ctrl+S)
- Supabase client: import { supabase } from '@/lib/supabase'
- TVA: doar 0% și 21%
- Număr document: TS-YYYYMM-NNN
- total în quote_items = computed column
- nu folosi diacritice, exceptie meseriaș
 
## Tipuri cont
- meseriaș: fără TVA, fără firme, document = Fișă de servicii
- pro: TVA opțional, firme multiple, document = Raport de activitate

## Stare curentă
- activeCompanyId salvat în localStorage
- FAB microfon fix în layout.tsx
- Banner firmă activă în components/ActiveCompanyBanner.tsx