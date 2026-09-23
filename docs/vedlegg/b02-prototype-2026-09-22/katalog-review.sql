SELECT jsonb_build_object(
'roller',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT rolname,rolsuper,rolcreaterole,rolreplication,rolbypassrls,rolcanlogin,rolinherit FROM pg_roles WHERE rolname IN ('postgres','supabase_admin','authenticator','service_role','anon','authenticated')) r),
'medlemskap',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT r.rolname AS rolle,m.rolname AS medlem,a.admin_option,a.inherit_option,a.set_option,g.rolname AS giver FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor WHERE m.rolname IN ('authenticator','postgres','service_role')) r),
'skjema_create',(SELECT jsonb_agg(nspname) FROM pg_namespace WHERE has_schema_privilege('service_role',oid,'CREATE')),
'tabeller',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT relname,pg_get_userbyid(relowner) AS eier,relrowsecurity,relforcerowsecurity,relacl FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r') r),
'standardrettigheter',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT pg_get_userbyid(defaclrole) AS eier,n.nspname,defaclobjtype,defaclacl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' OR d.defaclnamespace=0) r),
'policyer',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public') r),
'triggere',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT c.relname,pg_get_triggerdef(t.oid) AS definisjon FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal) r)
) AS katalog;

SELECT p.oid::regprocedure::text AS funksjon, pg_get_userbyid(p.proowner) AS eier, p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) AS definisjon FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY 1;

SELECT jsonb_build_object(
'nettroller_tabeller',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT rolname, c.relname, v.rettighet FROM pg_roles CROSS JOIN pg_class c CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('TRIGGER'),('REFERENCES')) v(rettighet) WHERE rolname IN ('anon','authenticated') AND c.relnamespace='public'::regnamespace AND c.relkind='r' AND has_table_privilege(rolname,c.oid,v.rettighet)) r),
'nettroller_funksjoner',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT rolname,p.oid::regprocedure::text AS funksjon FROM pg_roles CROSS JOIN pg_proc p WHERE rolname IN ('anon','authenticated') AND p.pronamespace='public'::regnamespace AND has_function_privilege(rolname,p.oid,'EXECUTE')) r),
'kolonner_medlemskap',(SELECT jsonb_agg(attname ORDER BY attnum) FROM pg_attribute WHERE attrelid='public.app_project_memberships'::regclass AND attnum>0 AND NOT attisdropped),
'rolleoppsett',(SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT r.rolname, s.setdatabase, x.innstilling FROM pg_db_role_setting s JOIN pg_roles r ON r.oid=s.setrole CROSS JOIN LATERAL unnest(s.setconfig) x(innstilling) WHERE r.rolname IN ('authenticator','postgres') AND x.innstilling LIKE 'pgrst.db_%') r),
'server',(SELECT setting FROM pg_settings WHERE name='server_version'),
'preload',(SELECT setting FROM pg_settings WHERE name='shared_preload_libraries'),
'pgaudit',(SELECT count(*) FROM pg_extension WHERE extname='pgaudit'),
'sr_replikering',has_parameter_privilege('service_role','session_replication_role','SET')
) AS katalog;

SELECT has_database_privilege('service_role',current_database(),'TEMP') AS service_role_temp, has_database_privilege('service_role',current_database(),'CREATE') AS service_role_create;
