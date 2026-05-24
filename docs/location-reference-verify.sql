-- Verification queries for the Thailand location reference tables.
-- Expected province count: 77
-- Expected district count: 928

select count(*) as province_count from public.provinces;
select count(*) as district_count from public.districts;

select d.id, d.name_th
from public.districts d
left join public.provinces p on p.id = d.province_id
where p.id is null;

select count(*) as courts_missing_province_id
from public.courts
where province_id is null;

select count(*) as courts_missing_district_id
from public.courts
where district_id is null;
